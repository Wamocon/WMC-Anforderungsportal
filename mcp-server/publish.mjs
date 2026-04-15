#!/usr/bin/env node
/**
 * Publish helper — run this script to publish to npm.
 *
 * Usage:
 *   node publish.mjs <OTP_CODE>
 *
 * Example:
 *   node publish.mjs 123456
 *
 * Prerequisites:
 *   1. npm login (already done as 'wamocon')
 *   2. 2FA enabled on npmjs.com/settings/wamocon/security
 *   3. Open your authenticator app, get the 6-digit code
 *   4. Run this script with the code
 */
import { execSync } from 'child_process';

const otp = process.argv[2];
if (!otp || !/^\d{6}$/.test(otp)) {
  console.error('❌ Usage: node publish.mjs <6-DIGIT-OTP>');
  console.error('   Get the code from your authenticator app.');
  process.exit(1);
}

console.log('📦 Publishing anforderungsportal-mcp@1.0.0 ...');
try {
  execSync(`npm publish --access public --otp=${otp}`, { stdio: 'inherit' });
  console.log('\n✅ Published! Install anywhere with:');
  console.log('   npm install -g anforderungsportal-mcp');
} catch {
  console.error('\n❌ Publish failed. Check if OTP is still valid (they expire in 30s).');
  process.exit(1);
}
