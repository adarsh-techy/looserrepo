import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'looser_vault_super_secure_jwt_secret_key_2026_x89f!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  reauthSecret: process.env.REAUTH_SECRET || 'looser_vault_reauth_secret_key_99823_secure!',
  reauthExpiresIn: '5m', // 5 minutes valid for sensitive reveals
  vaultMasterKey: process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(','),
};
