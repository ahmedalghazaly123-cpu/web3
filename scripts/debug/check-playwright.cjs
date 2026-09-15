// helper: report whether Playwright's browser binaries are installed locally.
// usage: node scripts/debug/check-playwright.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
console.log(`browsers dir: ${root}`);
if (!fs.existsSync(root)) {
  console.log('installed: no (run: npx playwright install chromium)');
  process.exit(0);
}
const dirs = fs.readdirSync(root);
console.log(`installed: ${dirs.length ? dirs.join(', ') : 'none'}`);
const chromium = dirs.filter((d) => d.startsWith('chromium-')).sort().pop();
let exe = null;
if (chromium) {
  // Playwright renames this folder between releases (chrome-win / chrome-win64).
  for (const sub of ['chrome-win64', 'chrome-win']) {
    const candidate = path.join(root, chromium, sub, 'chrome.exe');
    if (fs.existsSync(candidate)) {
      exe = candidate;
      break;
    }
  }
  console.log(`chromium build: ${chromium}`);
}
console.log(`chromium exe: ${exe || '(missing)'}`);