import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/prisma/client';

const PASSWORD = 'VaultPass123!';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return { token: res.body.token as string, id: res.body.user.id as string };
}

describe('Authorization & robustness fixes', () => {
  let alice = { token: '', id: '' }; // AD, owner
  let bob = { token: '', id: '' }; // NS, partner
  const createdNoteIds: string[] = [];
  const createdBusinessIds: string[] = [];

  const as = (who: { token: string }) => ({ Authorization: `Bearer ${who.token}` });

  beforeAll(async () => {
    alice = await login('user1@looser.vault');
    bob = await login('user2@looser.vault');
  });

  afterAll(async () => {
    await prisma.trashItem.deleteMany({ where: { originalId: { in: [...createdNoteIds, ...createdBusinessIds] } } });
    await prisma.secretNote.deleteMany({ where: { id: { in: createdNoteIds } } });
    await prisma.businessItem.deleteMany({ where: { id: { in: createdBusinessIds } } });
    await prisma.$disconnect();
  });

  async function createNote(category: 'PRIVATE_EMERGENCY' | 'POST_DEATH') {
    const res = await request(app)
      .post('/api/secret-notes')
      .set(as(alice))
      .send({
        title: `Security test ${category}`,
        category,
        content: 'top secret content',
        notePassword: 'NotePass!123',
        designatedRecipientId: bob.id,
        waitingPeriodHours: 48,
        recoveryQuestions: [{ id: 1, question: 'First pet?', answer: 'rex' }],
      });
    expect(res.status).toBe(201);
    createdNoteIds.push(res.body.id);
    return res.body.id as string;
  }

  describe('secret note password recovery is owner-only', () => {
    it('partner cannot read recovery questions or recover the note password', async () => {
      const noteId = await createNote('PRIVATE_EMERGENCY');

      expect((await request(app).get(`/api/secret-notes/${noteId}/recovery-question`).set(as(alice))).status).toBe(200);
      expect((await request(app).get(`/api/secret-notes/${noteId}/recovery-question`).set(as(bob))).status).toBe(404);

      const attempt = await request(app)
        .post(`/api/secret-notes/${noteId}/recover-password`)
        .set(as(bob))
        .send({ questionId: 1, recoveryAnswer: 'rex' });
      expect(attempt.status).toBe(404);
      expect(attempt.body.content).toBeUndefined();
      expect(attempt.body.recoveredPassword).toBeUndefined();
    });
  });

  describe('post-death verification', () => {
    it('reads the note id from the URL and never returns encrypted fields', async () => {
      const noteId = await createNote('POST_DEATH');
      const res = await request(app)
        .post(`/api/secret-notes/${noteId}/post-death-verify`)
        .set(as(bob))
        .send({ verificationNotes: 'REG-123' });
      expect(res.status).toBe(200);
      expect(res.body.note.postDeathVerified).toBe(true);
      expect(res.body.note.encryptedContent).toBeUndefined();
      expect(res.body.note.notePasswordHash).toBeUndefined();
      expect(res.body.note.recoveryQuestions).toBeUndefined();
    });

    it('returns 404 for an unknown note instead of crashing', async () => {
      const res = await request(app).post('/api/secret-notes/does-not-exist/post-death-verify').set(as(bob)).send({});
      expect(res.status).toBe(404);
    });
  });

  describe('trash', () => {
    it("hides the owner's deleted secret note from the partner and strips secrets from snapshots", async () => {
      const noteId = await createNote('PRIVATE_EMERGENCY');
      expect((await request(app).delete(`/api/secret-notes/${noteId}`).set(as(alice))).status).toBe(200);

      const trashItem = await prisma.trashItem.findFirst({ where: { originalId: noteId } });
      expect(trashItem).not.toBeNull();

      const aliceView = await request(app).get(`/api/trash/${trashItem!.id}`).set(as(alice));
      expect(aliceView.status).toBe(200);
      expect(aliceView.body.parsedData.title).toBe('Security test PRIVATE_EMERGENCY');
      for (const field of ['encryptedContent', 'notePasswordHash', 'recoveryQuestions', 'salt', 'authTag']) {
        expect(aliceView.body.parsedData[field]).toBeUndefined();
        expect(aliceView.body.itemData).not.toContain(`"${field}"`);
      }

      const bobList = await request(app).get('/api/trash').set(as(bob));
      expect(bobList.status).toBe(200);
      expect(bobList.body.items.some((i: any) => i.id === trashItem!.id)).toBe(false);

      expect((await request(app).get(`/api/trash/${trashItem!.id}`).set(as(bob))).status).toBe(404);
      expect((await request(app).post(`/api/trash/${trashItem!.id}/restore`).set(as(bob))).status).toBe(404);
      expect((await request(app).delete(`/api/trash/${trashItem!.id}`).set(as(bob))).status).toBe(404);
    });
  });

  describe('private business items', () => {
    it('are invisible and untouchable for the partner', async () => {
      const created = await request(app)
        .post('/api/business')
        .set(as(alice))
        .send({ title: 'Private biz', description: 'owner only', isShared: false });
      expect(created.status).toBe(201);
      const id = created.body.id;
      createdBusinessIds.push(id);

      const bobList = await request(app).get('/api/business').set(as(bob));
      expect(bobList.body.some((i: any) => i.id === id)).toBe(false);
      expect((await request(app).get(`/api/business/${id}`).set(as(bob))).status).toBe(404);
      expect((await request(app).put(`/api/business/${id}`).set(as(bob)).send({ title: 'hacked' })).status).toBe(404);
      expect((await request(app).delete(`/api/business/${id}`).set(as(bob))).status).toBe(404);

      expect((await request(app).get(`/api/business/${id}`).set(as(alice))).status).toBe(200);
    });
  });

  describe('bad input returns an error response instead of crashing the server', () => {
    it('empty emergency step1 body', async () => {
      const res = await request(app).post('/api/secret-notes/step1').set(as(bob)).send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });

    it('updating a missing day-to-day note', async () => {
      const res = await request(app).put('/api/day-to-day/does-not-exist').set(as(alice)).send({ content: 'x' });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });

    it('server still answers afterwards', async () => {
      expect((await request(app).get('/api/health')).status).toBe(200);
    });
  });

  describe('page permissions granted by the admin are honoured', () => {
    it('partner with /health permission can open the Health vault', async () => {
      const original = await prisma.user.findUnique({ where: { id: bob.id }, select: { pagePermissions: true } });
      try {
        await prisma.user.update({ where: { id: bob.id }, data: { pagePermissions: JSON.stringify(['/health']) } });
        expect((await request(app).get('/api/health/persons').set(as(bob))).status).toBe(200);

        await prisma.user.update({ where: { id: bob.id }, data: { pagePermissions: JSON.stringify(['/works']) } });
        expect((await request(app).get('/api/health/persons').set(as(bob))).status).toBe(403);
      } finally {
        await prisma.user.update({ where: { id: bob.id }, data: { pagePermissions: original!.pagePermissions } });
      }
    });
  });
});
