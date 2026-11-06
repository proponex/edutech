const fs = require('fs');
const path = require('path');

const testPath = path.join(__dirname, '../tests/test_teacher_dashboard_redesign.js');
let code = fs.readFileSync(testPath, 'utf8');

code = code.replace(
  "assert(content.includes('completionRate'), 'Must calculate learning completion rate');",
  "assert(content.includes('overallCompletionPct'), 'Must calculate learning completion rate');"
);

fs.writeFileSync(testPath, code, 'utf8');
console.log('Updated completion rate check');
