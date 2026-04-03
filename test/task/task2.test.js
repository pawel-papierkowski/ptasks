// Import task2 for testing from tasks.js file, their test suite will likely do something similar.
const { task2 } = require('../../src/task/tasks');

describe('Task 2 Tests', () => {
    // Test for zero data.
    test('Case: zero data.', () => {
        const search = [{ key1: '0', key2: '1' }, { key1: '2', key2: '3' }];
        const data = 'key1,key2,value'; // header only, no data lines
        expect(task2(search, data)).toBe(0.0);
    });

    // Test for no matching entry.
    test('Case: no matching entries.', () => {
        const search = [{ key1: '0', key2: '1' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 3\n' +
                    '3,4, 4\n' +
                    '5,6, 5';
        expect(task2(search, data)).toBe(0.0);
    });

    //

    // Test for only one matching entry.
    test('Case: one matching entry.', () => {
        const search = [{ key1: '3', key2: '4' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 3\n' +
                    '3,4, 4\n' + // should match only this line
                    '5,6, 5';
        expect(task2(search, data)).toBe(4.0);
    });

    // Test for two matching entries.
    test('Case: two matching entries.', () => {
        const search = [{ key1: '3', key2: '4' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 3\n' +
                    '3,4, 2\n' + // should match this line
                    '5,6, 8\n' +
                    '3,4, 6\n' + // should match this line
                    '7,8, 5';
        expect(task2(search, data)).toBe(4.0); // average of 2 and 6 is 4
    });

    // Test for matching entries when search has multiple criteria.
    test('Case: search with multiple criteria.', () => {
        // Note: order of search criteria should not matter.
        const search = [{ key1: '7', key2: '8' }, { key1: '3', key2: '4' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 3\n' +
                    '3,4, 2\n' + // should match this line
                    '5,6, 8\n' +
                    '7,8, 4'; // should match this line
        expect(task2(search, data)).toBe(3.0); // average of 2 and 4 is 3
    });

    // Test for weighted average.
    test('Case: values with different weight.', () => {
        const search = [{ key1: '3', key2: '4' }, { key1: '7', key2: '8' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 55\n' +
                    '3,4, 22\n' + // should match this line (even weight)
                    '5,6, 88\n' +
                    '7,8, 33'; // should match this line (odd weight)
        expect(task2(search, data)).toBe(25.7);
        // correct weighted average: (22*20 + 33*10) / (20+10) = 25.6...67, rounded to 25.7
    });

    // Test for weighted average for many entries.
    test('Case: many entries.', () => {
        const search = [{ key1: '3', key2: '4' }, { key1: '7', key2: '8' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 13\n' +
                    '3,4, 55\n' + // should match this line (odd weight)
                    '5,6, 49\n' +
                    '3,3, 28\n' +
                    '7,8, 42\n' + // should match this line (even weight)
                    '5,6, 91\n' +
                    '3,4, 3\n'  + // should match this line (odd weight)
                    '8,8, 6\n'  +
                    '7,9, 38\n' +
                    '5,6, 53\n' +
                    '4,4, 61\n' +
                    '7,8, 74\n' + // should match this line (even weight)
                    '8,3, 88\n' +
                    '1,1, 33';
        expect(task2(search, data)).toBe(48.3);
    });

    // Test for 4 search criteria.
    test('Case: many search criteria.', () => {
        const search = [{ a: '20', b: '30' }, { a: '70', b: '80' }, { a: '50', b: '40' }, { a: '999', b: '666' }];
        const data = 'a,b,value\n' +
                    '1, 2, 13\n' +
                    '20,30,20\n' + // should match this line for 1st
                    '5, 6, 49\n' +
                    '20,30,30\n' + // should match this line for 1st
                    '7, 8, 42\n' + 
                    '20,30,40\n' + // should match this line for 1st
                    '3, 4, 3\n'  +
                    '70,80,10\n' + // should match this line for 2nd
                    '4, 4, 61\n' +
                    '70,80,30\n' + // should match this line for 2nd
                    '8, 3, 88\n' +
                    '50,40,10'; // should match this line for 3rd
        // note last search criteria won't match, it should have -1 in cache from beginning
        expect(task2(search, data)).toBe(23.3);
    });

    // Test for corrupted data at end (edge case).
    test('Case: corrupted data at end.', () => {
        const search = [{ key1: '3', key2: '4' }];
        const data = 'key1,key2,value\n' +
                    '1,2, 3\n' +
                    '3,4, 2\n' + // should match this line
                    '5,6, 8\n' +
                    'g,h, 5'; // corrupted line to be ignored
        expect(task2(search, data)).toBe(2.0);
    });
});