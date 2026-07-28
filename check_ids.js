const fs = require('fs');
const html = fs.readFileSync('C:/Users/Boutilimit Store/OneDrive/Desktop/KHALILY_APP/khalily_admin_dashboard/public/dashboard.html', 'utf8');
const js = fs.readFileSync('C:/Users/Boutilimit Store/OneDrive/Desktop/KHALILY_APP/khalily_admin_dashboard/public/js/app.js', 'utf8');

// Check HTML depth
const lines = html.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const opens = (lines[i].match(/<div[ >]/g) || []).length;
  const closes = (lines[i].match(/<\/div>/g) || []).length;
  depth += opens - closes;
}
console.log('HTML div depth:', depth, '(should be 0)');
console.log('HTML size:', html.length, 'bytes');

// Check all getElementById references exist in HTML
const jsLines = js.split('\n');
const missing = [];
for (let i = 0; i < jsLines.length; i++) {
    const matches = jsLines[i].matchAll(/getElementById\('([^']+)'\)/g);
    for (const m of matches) {
        if (!html.includes('id="' + m[1] + '"') && !html.includes("id='" + m[1] + "'")) {
            missing.push({ line: i + 1, id: m[1] });
        }
    }
}
if (missing.length === 0) {
    console.log('All getElementById references found in HTML');
} else {
    console.log('MISSING:', missing.map(m => '#' + m.id + ' (line ' + m.line + ')').join(', '));
}
console.log('JS size:', js.length, 'bytes');
