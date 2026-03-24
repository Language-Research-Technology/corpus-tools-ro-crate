/**
 * Test file: ESM import usage
 * Run with: node test-import.mjs
 */

import { convertRoCrateToOcfl } from './lib/index.js';

console.log('\n✓ ESM import successful!');
console.log('  Function imported:', typeof convertRoCrateToOcfl);
console.log('  Function name:', convertRoCrateToOcfl.name);

// Show usage example
console.log('\nESM Usage Example:');
console.log('  import { convertRoCrateToOcfl } from "corpus-tools-ro-crate";');
console.log('  await convertRoCrateToOcfl({ ... });');
