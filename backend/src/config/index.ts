import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'looser_vault_super_secure_jwt_secret_key_2026_x89f!',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m', // short-lived; renewed via refresh token
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),
  reauthSecret: process.env.REAUTH_SECRET || 'looser_vault_reauth_secret_key_99823_secure!',
  reauthExpiresIn: '5m', // 5 minutes valid for sensitive reveals
  vaultMasterKey: process.env.VAULT_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(','),
};

// The fallbacks above are public (they are in the source code). Running production on them
// means anyone can forge login tokens or decrypt the vault.
if (config.nodeEnv === 'production') {
  const missing = ['JWT_SECRET', 'REAUTH_SECRET', 'VAULT_MASTER_KEY'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`🚨 SECURITY: ${missing.join(', ')} not set — using insecure built-in defaults. Set them in the environment now.`);
  }
}
