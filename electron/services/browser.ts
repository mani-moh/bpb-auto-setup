import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { app } from 'electron';
import { join } from 'path';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export class BrowserManager {
  private session: BrowserSession | null = null;
  private userDataDir: string;

  constructor() {
    this.userDataDir = join(app.getPath('userData'), 'playwright-profile');
  }

  async launch(headless: boolean = false, slowMo: number = 0): Promise<BrowserSession> {
    if (this.session) {
      return this.session;
    }

    const browser = await chromium.launchPersistentContext(this.userDataDir, {
      headless,
      slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      timezoneId: 'UTC',
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    this.session = { browser, context: browser, page };
    return this.session;
  }

  async getSession(): Promise<BrowserSession | null> {
    return this.session;
  }

  async navigate(url: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.goto(url, { waitUntil: 'networkidle' });
  }

  async fill(selector: string, value: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.fill(selector, value);
  }

  async click(selector: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.click(selector);
  }

  async waitForSelector(selector: string, timeout: number = 30000): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.waitForSelector(selector, { timeout });
  }

  async waitForUrl(urlPattern: string | RegExp, timeout: number = 60000): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.waitForURL(urlPattern, { timeout });
  }

  async screenshot(path: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.screenshot({ path, fullPage: true });
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.session) throw new Error('Browser not launched');
    return this.session.page.evaluate(fn);
  }

  async close(): Promise<void> {
    if (this.session) {
      await this.session.browser.close();
      this.session = null;
    }
  }

  isRunning(): boolean {
    return this.session !== null && this.session.browser.isConnected();
  }
}

// Cloudflare-specific page objects
export class CloudflarePages {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoSignup(email: string): Promise<void> {
    await this.page.goto(`https://dash.cloudflare.com/sign-up?email=${encodeURIComponent(email)}`, {
      waitUntil: 'networkidle',
    });
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto('https://dash.cloudflare.com/login', { waitUntil: 'networkidle' });
  }

  async gotoTokenCreation(): Promise<void> {
    await this.page.goto('https://dash.cloudflare.com/profile/api-tokens', { waitUntil: 'networkidle' });
  }

  async fillSignupForm(email: string, password: string): Promise<void> {
    await this.page.fill('input[name="email"], input[type="email"]', email);
    await this.page.fill('input[name="password"], input[type="password"]', password);
  }

  async submitSignup(): Promise<void> {
    await this.page.click('button[type="submit"], button:has-text("Create account"), button:has-text("Sign up")');
  }

  async waitForVerification(): Promise<boolean> {
    try {
      // Wait for either verification email sent page or dashboard
      await this.page.waitForURL(/dash\.cloudflare\.com/, { timeout: 300000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForDashboard(): Promise<boolean> {
    try {
      await this.page.waitForURL('**/dash.cloudflare.com/**', { timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  async createTokenWithPermissions(): Promise<string | null> {
    try {
      await this.page.goto('https://dash.cloudflare.com/profile/api-tokens', { waitUntil: 'networkidle' });
      await this.page.click('button:has-text("Create Token"), a:has-text("Create Token")');
      
      // Wait for token creation page
      await this.page.waitForSelector('text=Custom token', { timeout: 10000 });
      await this.page.click('text=Custom token');
      await this.page.click('button:has-text("Get started"), button:has-text("Continue to summary")');

      // This is complex - in practice, user should do this manually
      // We just guide them to the page
      return null;
    } catch {
      return null;
    }
  }

  async detectCaptcha(): Promise<boolean> {
    try {
      const captchaSelectors = [
        'iframe[src*="captcha"]',
        'iframe[src*="challenge"]',
        '.cf-challenge-form',
        '#challenge-form',
        'text=Checking your browser',
        'text=Verify you are human',
      ];
      for (const selector of captchaSelectors) {
        const element = await this.page.$(selector);
        if (element) return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export class EmailProviderPages {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoProviderSignup(providerUrl: string): Promise<void> {
    await this.page.goto(providerUrl, { waitUntil: 'networkidle' });
  }

  async detectCaptcha(): Promise<boolean> {
    try {
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        'iframe[src*="captcha"]',
        '.g-recaptcha',
        '#captcha',
        'text=I\'m not a robot',
        'text=Verify you are human',
      ];
      for (const selector of captchaSelectors) {
        const element = await this.page.$(selector);
        if (element) return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}