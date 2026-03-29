import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test credentials from .env.test.local (gitignored)
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') });

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
