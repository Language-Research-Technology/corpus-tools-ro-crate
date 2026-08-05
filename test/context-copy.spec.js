import assert from 'node:assert';
import { copyCrateContext } from '../lib/convert.js';

describe('copyCrateContext', function () {
    it('Should add missing string and object @context entries without duplicating existing strings', function () {
        const existingContext = 'https://w3id.org/ro/crate/1.1/context';
        const customContext = 'https://example.org/context/custom-rocrate';
        const customContextBlock = {
            customtest: 'https://example.org/customtest#'
        };

        const sourceCrate = {
            toJSON() {
                return {
                    '@context': [existingContext, customContext, customContextBlock]
                };
            }
        };

        const targetCrate = {
            context: [existingContext],
            addContext(entry) {
                this.context.push(entry);
            }
        };

        copyCrateContext(sourceCrate, targetCrate);

        assert.deepEqual(targetCrate.context, [existingContext, customContext, customContextBlock]);
    });
});
