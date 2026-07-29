const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/Boutilimit Store/OneDrive/Desktop/ARAVA_APP';

const FILE_MAP = [
  { src: 'arava_admin_dashboard/public/dashboard.html', dst: 'dashboard.html' },
  { src: 'arava_admin_dashboard/public/js/app.js', dst: 'js/app.js' },
  { src: 'arava_admin_dashboard/public/js/login.js', dst: 'js/login.js' },
  { src: 'arava_admin_dashboard/public/css/style.css', dst: 'css/style.css' },
  { src: 'arava_admin_dashboard/public/index.html', dst: 'index.html' },
  { src: 'arava_admin_dashboard/public/img/arava.png', dst: 'img/arava.png' },
];

const files = {};
for (const f of FILE_MAP) {
  files[f.dst] = Buffer.from(execSync('git show main:"' + f.src + '"', { cwd: ROOT }));
}
execSync('git checkout gh-pages', { cwd: ROOT, stdio: 'pipe' });
for (const f of FILE_MAP) {
  const fullPath = path.join(ROOT, f.dst);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, files[f.dst]);
}
for (const f of FILE_MAP) execSync('git add ' + f.dst, { cwd: ROOT, stdio: 'pipe' });
const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
if (status) {
  execSync('git commit -m "fix: add missing dispatch panel elements that crashed JS"', { cwd: ROOT, stdio: 'pipe' });
  execSync('git push origin gh-pages', { cwd: ROOT, stdio: 'pipe' });
  console.log('PUSHED!');
} else {
  console.log('No changes');
}
execSync('git checkout main', { cwd: ROOT, stdio: 'pipe' });
console.log('Done');
