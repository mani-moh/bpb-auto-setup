import { generateSecurePassword } from '../utils/credentials';

export interface EmailProvider {
  id: string;
  name: string;
  description: string;
  supportsApi: boolean;
  requiresDomain: boolean;
}

export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'manual',
    name: 'Manual Signup (Any Provider)',
    description: 'Open provider signup page in browser and complete manually',
    supportsApi: false,
    requiresDomain: false,
  },
  {
    id: 'custom-domain',
    name: 'Custom Domain (Catch-all/Alias)',
    description: 'Use your own domain with catch-all or email aliases',
    supportsApi: false,
    requiresDomain: true,
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    description: 'Programmatic mailbox creation (requires paid plan)',
    supportsApi: true,
    requiresDomain: true,
  },
  {
    id: 'hostinger',
    name: 'Hostinger',
    description: 'Email aliases and catch-all via API',
    supportsApi: true,
    requiresDomain: true,
  },
];

export function generateEmailAddress(prefix?: string): { localPart: string; password: string } {
  const adjectives = ['swift', 'bright', 'calm', 'deep', 'fast', 'keen', 'quiet', 'sharp', 'warm', 'zest'];
  const nouns = ['fox', 'hawk', 'lion', 'owl', 'shark', 'tiger', 'wolf', 'bear', 'eagle', 'whale'];
  const num = Math.floor(Math.random() * 9000) + 1000;

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  const localPart = prefix ? `${prefix}-${adj}-${noun}-${num}` : `${adj}-${noun}-${num}`;
  const password = generateSecurePassword(24);

  return { localPart, password };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function parseEmail(email: string): { localPart: string; domain: string } | null {
  const match = email.match(/^([^@]+)@(.+)$/);
  if (!match) return null;
  return { localPart: match[1], domain: match[2] };
}

export interface ProvisionedEmail {
  email: string;
  password: string;
  provider: string;
  requiresVerification: boolean;
  verificationUrl?: string;
}

export async function provisionEmailManual(
  email: string,
  password: string,
  providerUrl: string
): Promise<ProvisionedEmail> {
  // For manual provisioning, we just return the info and let the browser handle the rest
  return {
    email,
    password,
    provider: 'manual',
    requiresVerification: true,
    verificationUrl: providerUrl,
  };
}

export async function provisionEmailCustomDomain(
  domain: string,
  localPart: string,
  password: string
): Promise<ProvisionedEmail> {
  // For custom domain, user needs to set up catch-all or alias in their email provider
  const email = `${localPart}@${domain}`;
  return {
    email,
    password,
    provider: 'custom-domain',
    requiresVerification: false, // Assuming catch-all is already configured
  };
}

export function getProviderSignupUrl(providerId: string): string {
  const urls: Record<string, string> = {
    manual: 'https://www.google.com/search?q=create+email+account',
    mailgun: 'https://app.mailgun.com/app/domains',
    hostinger: 'https://hpanel.hostinger.com/email',
    proton: 'https://account.proton.me/signup',
    tutanota: 'https://tutanota.com/signup',
    gmail: 'https://accounts.google.com/signup',
    outlook: 'https://signup.live.com/',
  };
  return urls[providerId] || urls.manual;
}