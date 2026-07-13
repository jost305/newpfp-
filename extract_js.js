const fs = require('fs');
const html = fs.readFileSync('game/Arena/index.html', 'utf8');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    fs.writeFileSync('script_' + count + '.js', match[1]);
    count++;
}
