import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.warn('Missing some of the environment variables.');
        process.exit(1);
    }
    return value;
}

export const APS_CLIENT_ID = requireEnv('APS_CLIENT_ID');
export const APS_CLIENT_SECRET = requireEnv('APS_CLIENT_SECRET');
export const LOGIN_PASSPHRASE = requireEnv('LOGIN_PASSPHRASE');
export const APS_BUCKET: string = process.env.APS_BUCKET || `${APS_CLIENT_ID.toLowerCase()}-basic-app`;
export const PORT = process.env.PORT || 8080;
export const SESSION_SECRET: string = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
