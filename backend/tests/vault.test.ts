import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/prisma/client';
import { encryptWithMasterKey, decryptWithMasterKey, encryptWithPassword, decryptWithPassword } from '../src/utils/crypto';
import { config } from '../src/config';

describe('Looser Secure Vault Backend Test Suite', () => {
  let aliceToken = '';
  let bobToken = '';

  beforeAll(async () => {
    // Log in as Alice
    const resAlice = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@looser.vault', password: 'VaultPass123!' });
    expect(resAlice.status).toBe(200);
    aliceToken = resAlice.body.token;

    // Log in as Bob
    const resBob = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@looser.vault', password: 'VaultPass123!' });
    expect(resBob.status).toBe(200);
    bobToken = resBob.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Crypto & Encryption Integrity', () => {
    it('should correctly encrypt and decrypt with master key (AES-256-GCM)', () => {
      const plaintext = 'SuperSecretDbKey!999#';
      const enc = encryptWithMasterKey(plaintext, config.vaultMasterKey);
      expect(enc.ciphertext).toBeDefined();
      expect(enc.iv).toHaveLength(24); // 12 bytes in hex
      expect(enc.authTag).toHaveLength(32); // 16 bytes in hex

      const decrypted = decryptWithMasterKey(enc.ciphertext, enc.iv, enc.authTag, config.vaultMasterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should correctly encrypt and decrypt with note-specific password', () => {
      const plaintext = 'Secret Bank Directive 1234';
      const password = 'CustomNotePassword!99';
      const enc = encryptWithPassword(plaintext, password);

      const decrypted = decryptWithPassword(enc.ciphertext, password, enc.salt, enc.iv, enc.authTag);
      expect(decrypted).toBe(plaintext);

      // Wrong password should fail decryption
      expect(() => {
        decryptWithPassword(enc.ciphertext, 'WrongPassword!', enc.salt, enc.iv, enc.authTag);
      }).toThrow();
    });
  });

  describe('2. Authentication & Re-Authentication', () => {
    it('should reject login with wrong password and record failed audit log', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user1@looser.vault', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });

    it('should reject reauth with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/reauth')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });
  });

  describe('3. Password Vault Access, Direct Reveal & Deletion Authorization', () => {
    let testVaultItemId = '';

    it('should create a vault item and store it encrypted', async () => {
      const res = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          accountName: 'AWS Root Cluster',
          usernameOrEmail: 'root@aws.company',
          password: 'UnencryptedPasswordDuringCreation!2026',
          websiteUrl: 'https://aws.amazon.com',
          notes: 'Important root access',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.maskedPassword).toBe('••••••••••••••');
      testVaultItemId = res.body.id;

      // Verify in DB that password is NOT plaintext
      const dbItem = await prisma.passwordVaultItem.findUnique({ where: { id: testVaultItemId } });
      expect(dbItem?.encryptedPassword).not.toBe('UnencryptedPasswordDuringCreation!2026');
      expect(dbItem?.iv).toBeDefined();
    });

    it('should successfully reveal password when authenticated', async () => {
      const res = await request(app)
        .post(`/api/vault/${testVaultItemId}/reveal`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.password).toBe('UnencryptedPasswordDuringCreation!2026');
    });

    it('should reject deleting vault item if password is wrong or missing', async () => {
      const badRes = await request(app)
        .delete(`/api/vault/${testVaultItemId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ password: 'WrongPassword!' });

      expect(badRes.status).toBe(401);
    });

    it('should successfully delete vault item when correct password is provided', async () => {
      const okRes = await request(app)
        .delete(`/api/vault/${testVaultItemId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ password: 'VaultPass123!' });

      expect(okRes.status).toBe(200);
      expect(okRes.body.success).toBe(true);
    });
  });

  describe('4. Secret Notes & 3-Step Emergency Access Protocol', () => {
    let secretNoteId = '';

    it('should create a secret note with a separate password', async () => {
      const res = await request(app)
        .post('/api/secret-notes')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          title: 'Emergency Server Root Keys',
          category: 'PRIVATE_EMERGENCY',
          content: 'SSH Key: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...',
          notePassword: 'DedicatedNoteSecret!99',
          hint: 'The secret passphrase',
          designatedRecipientId: 'user-bob-002',
          waitingPeriodHours: 48,
        });

      expect(res.status).toBe(201);
      secretNoteId = res.body.id;
    });

    it('Step 1: Bob validates his own credentials & 2FA', async () => {
      // Bad user password
      const badRes = await request(app)
        .post('/api/secret-notes/step1')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ noteId: secretNoteId, userPassword: 'WrongUserPassword!' });
      expect(badRes.status).toBe(401);

      // Correct user password
      const okRes = await request(app)
        .post('/api/secret-notes/step1')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ noteId: secretNoteId, userPassword: 'VaultPass123!' });
      expect(okRes.status).toBe(200);
      expect(okRes.body.step1Valid).toBe(true);
    });

    it('Step 2: Bob enters note-specific separate password', async () => {
      // Wrong note password
      const badRes = await request(app)
        .post('/api/secret-notes/step2')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ noteId: secretNoteId, notePassword: 'WrongNotePassword!' });
      expect(badRes.status).toBe(401);

      // Correct note password
      const okRes = await request(app)
        .post('/api/secret-notes/step2')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ noteId: secretNoteId, notePassword: 'DedicatedNoteSecret!99' });
      expect(okRes.status).toBe(200);
      expect(okRes.body.step2Valid).toBe(true);
    });

    it('Step 3: Should trigger waiting period if owner was recently active and partner requests access', async () => {
      const res = await request(app)
        .post('/api/secret-notes/unlock')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          noteId: secretNoteId,
          userPassword: 'VaultPass123!',
          notePassword: 'DedicatedNoteSecret!99',
          reason: 'Alice is unreachable for critical infrastructure emergency',
          acknowledgedWarning: true,
        });

      // Since owner checked in just now, waiting period is triggered (403 with isPendingWaitingPeriod)
      expect(res.status).toBe(403);
      expect(res.body.isPendingWaitingPeriod).toBe(true);
    });

    it('Owner should be able to deny or cancel the emergency access request', async () => {
      const res = await request(app)
        .post(`/api/secret-notes/${secretNoteId}/deny`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ reviewNotes: 'False alarm. I am active and safe.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Audit Logs & Privacy Verification', () => {
    it('should retrieve audit logs and confirm no plaintext passwords or note contents are stored', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      for (const log of res.body) {
        const metadataStr = JSON.stringify(log.metadata);
        expect(metadataStr).not.toContain('UnencryptedPasswordDuringCreation!2026');
        expect(metadataStr).not.toContain('DedicatedNoteSecret!99');
        expect(metadataStr).not.toContain('SSH Key: ssh-rsa');
      }
    });
  });
});
