const c = require('fs').readFileSync('src/pages/Admin/AITestGenerator.jsx', 'utf8');

// Check what's in the \n locations
const idx = c.indexOf("pageText += '");
const snippet = c.substring(idx + 13, idx + 17);
console.log('Newline sequence bytes:');
for (let i = 0; i < snippet.length; i++) {
  console.log(i, '0x' + snippet.charCodeAt(i).toString(16), JSON.stringify(snippet[i]));
}

// Also check the merge regex on line 57
const idx57 = c.indexOf("result.replace(");
const regexLine = c.substring(idx57, c.indexOf('\n', idx57));
console.log('\nLine 57 regex:', regexLine);

// Test: does '\\n' in the file mean actual newline or literal \n?
console.log('\nTest: backslash-n in single quotes = actual newline?');
const testStr = '\\n';
console.log('Length:', testStr.length, '(should be 1 for newline, 2 for literal \\n)');
console.log('Char 0:', '0x' + testStr.charCodeAt(0).toString(16));
