const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/lib/student-service.ts');
let code = fs.readFileSync(file, 'utf8');

const isCRLF = code.includes('\r\n');
let norm = code.replace(/\r\n/g, '\n');

// Fix semicolons in return object
norm = norm.replace(
  'hasActiveSubscription: false;\n        isExpired: false;\n        subscription: null;',
  'hasActiveSubscription: false,\n        isExpired: false,\n        subscription: null,'
);

// Fix bad Math.max
const badMath = `    if (primarySub?.expires_at && hasActiveSubscription) {
      daysRemaining = Math.max(
        0;
        Math.ceil((new Date(primarySub.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        0,
    }`;

const goodMath = `    if (primarySub?.expires_at && hasActiveSubscription) {
      daysRemaining = Math.max(
        0,
        Math.ceil((new Date(primarySub.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }`;

norm = norm.replace(badMath, goodMath);

const result = isCRLF ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(file, result, 'utf8');
console.log('Successfully repaired student-service.ts');

