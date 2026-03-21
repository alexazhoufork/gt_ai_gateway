import { describe, expect, it } from 'vitest';
import { normalizeListResponse } from './listResponse';

describe('normalizeListResponse', () => {
    it('normalizes array results', () => {
        expect(normalizeListResponse([1, 2, 3])).toEqual({
            list: [1, 2, 3],
            total: 3,
        });
    });

    it('keeps paginated results intact', () => {
        expect(normalizeListResponse({
            list: [1, 2],
            total: 20,
        })).toEqual({
            list: [1, 2],
            total: 20,
        });
    });
});
