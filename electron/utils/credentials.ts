import keytar from 'keytar';
import { createHash, randomBytes } from 'crypto';

const SERVICE_NAME = 'bpb-auto-setup';

export interface CredentialEntry {
  account: string;
  password: string;
}

export async function setCredential(account: string, password: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, account, password);
}

export async function getCredential(account: string): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, account);
}

export async function deleteCredential(account: string): Promise<boolean> {
  return keytar.deletePassword(SERVICE_NAME, account);
}

export async function findCredentials(): Promise<CredentialEntry[]> {
  return keytar.findCredentials(SERVICE_NAME);
}

export function generateCredentialKey(prefix: string, identifier: string): string {
  const hash = createHash('sha256').update(identifier).digest('hex').slice(0, 16);
  return `${prefix}_${hash}`;
}

export function generateSecurePassword(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

export function generateSecureToken(length: number = 43): string {
  // Cloudflare API token format compatible
  const bytes = randomBytes(length);
  return bytes.toString('base64url').slice(0, length);
}