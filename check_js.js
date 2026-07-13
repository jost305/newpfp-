const fs = require('fs');
const html = fs.readFileSync('game/Arena/index.html', 'utf8');
const scriptRegex = /<script.*?>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    const code = match[1];
    try {
        new Function(code);
    } catch (e) {
        console.error('Syntax error in script ' + count + ':', e.message);
        const lines = code.split('\n');
        // print a few lines around the error
        console.error('Check around here:');
    }
    count++;
}
