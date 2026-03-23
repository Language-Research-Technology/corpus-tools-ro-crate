/**
 * Test file: CommonJS require usage
 * Run with: node test-require.cjs
 */

const { convertRoCrateToOcfl } = require('./dist/cjs/lib/index.cjs');

console.log('\n✓ CommonJS require successful!');
console.log('  Function required:', typeof convertRoCrateToOcfl);
console.log('  Function name:', convertRoCrateToOcfl.name);

// Show usage example
console.log('\nCommonJS Usage Example:');
console.log('  const { convertRoCrateToOcfl } = require("corpus-tools-ro-crate");');
console.log('  await convertRoCrateToOcfl({ ... });');
