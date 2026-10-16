import { describe, it, expect } from 'vitest';
import { generateSecurePassword, generateSecureToken, generateCredentialKey } from '../electron/utils/credentials';
import { generateEmailAddress, validateEmail, parseEmail, provisionEmailCustomDomain } from '../electron/services/email';
import { buildWorkerScript, generateBPBSettings } from '../electron/services/deployment';
import { createSuccessResponse, createErrorResponse } from '../shared/ipc';

describe('Credential utilities', () => {
  it('should generate secure passwords of expected length', () => {
    const pw = generateSecurePassword(32);
    expect(pw.length).toBeGreaterThanOrEqual(32);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
  });

  it('should generate credential keys with prefix', () => {
    const key = generateCredentialKey('cf', 'test-user');
    expect(key.startsWith('cf_')).toBe(true);
    expect(key.length).toBeGreaterThan(4);
  });

  it('should generate secure tokens', () => {
    const t = generateSecureToken(43);
    expect(t.length).toBeGreaterThanOrEqual(43);
  });
});

describe('Email service', () => {
  it('should generate readable email local parts', () => {
    const result = generateEmailAddress();
    expect(result.localPart).toBeTruthy();
    expect(result.password).toBeTruthy();
    expect(result.localPart).toContain('-');
  });

  it('should validate email formats', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('bad')).toBe(false);
    expect(validateEmail('a@b.c')).toBe(true);
  });

  it('should parse email into parts', () => {
    const p = parseEmail('user@domain.com');
    expect(p).not.toBeNull();
    expect(p?.localPart).toBe('user');
    expect(p?.domain).toBe('domain.com');
  });

  it('should provision custom domain email', async () => {
    const result = await provisionEmailCustomDomain('example.com', 'alias', 'secret');
    expect(result.email).toBe('alias@example.com');
    expect(result.provider).toBe('custom-domain');
  });
});

describe('Deployment engine', () => {
  it('should generate BPB settings with required fields', () => {
    const settings = generateBPBSettings('acct-123', 'test@test.com', 'token', 'worker', 'sub.domain.dev');
    expect(settings.accID).toBe('acct-123');
    expect(settings.vlUUID).toBeTruthy();
    expect(settings.trPass).toBeTruthy();
    expect(settings.securePath).toBeTruthy();
    expect(settings.mainDomain).toContain('sub.domain.dev');
  });

  it('should build worker script with embedded settings', () => {
    const settings = generateBPBSettings('acct', 'email', 'token', 'name', 'sub');
    const base = 'export default {};';
    const built = buildWorkerScript(settings, base);
    expect(built).toContain('EMBEDDED_SETTINGS');
    expect(built).toContain(settings.vlUUID);
    expect(built).toContain('across'); // from embedded account info
  });
});

describe('IPC helpers', () => {
  it('should create success responses', () => {
    const res = createSuccessResponse({ foo: 'bar' });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ foo: 'bar' });
  });

  it('should create error responses', () => {
    const res = createErrorResponse('Something went wrong');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Something went wrong');
  });
});
