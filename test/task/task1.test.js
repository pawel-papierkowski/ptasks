// Import task1 for testing from tasks.js file, their test suite will likely do something similar.
const { task1 } = require('../../src/task/tasks');

describe('Task 1 Tests', () => {
    // Test for zero data.
    test('Case: zero data.', () => {
        const search = { key1: 'a', key2: 'b' };
        const data = 'key1,key2,value'; // header only, no data lines
        expect(task1(search, data)).toBe('-1');
    });

    // Test for successful match.
    test('Case: full match.', () => {
        const search = { key1: 'a', key2: 'b' };
        const data = 'key1,key2,value\n' +
                    'a,b,10\n' + // should match this line
                    'c,d,20';
        expect(task1(search, data)).toBe('10');
    });

    // Test for successful match with different search criteria order.
    test('Case: different search criteria order.', () => {
        const search = { key2: 'd', key1: 'c' };
        const data = 'key1,key2,value\n' +
                    'a,b,10\n' +
                    'c,d,20'; // should match this line
        expect(task1(search, data)).toBe('20');
    });

    // Test for successful match when `value` is in middle.
    test('Case: `value` key is in middle.', () => {
        const search = { key1: 'c', key2: 'd' };
        const data = 'key1,value,key2\n' +
                    'a,10,b\n' +
                    'c,20,d\n' + // should match this line
                    'e,30,f';
        expect(task1(search, data)).toBe('20');
    });

    // Test for successful match when `value` is at start.
    test('Case:  `value` key is at start.', () => {
        const search = { key1: 'c', key2: 'd' };
        const data = 'value,key1,key2\n' +
                    '10,a,b\n' +
                    '20,c,d\n' + // should match this line
                    '30,e,f';
        expect(task1(search, data)).toBe('20');
    });

    // Test from example: success.
    test('Case: example 1 from task description.', () => {
        const search = { side: 'IN', currency: 'PLN' };
        const data = 'side,currency,value\nIN,PLN,1\nIN,EUR,2\nOUT,ANY,3';
        expect(task1(search, data)).toBe('1');
    });

    // Test from example: failed.
    test('Case: example 2 from task description.', () => {
        const search = { side: 'IN', currency: 'GBP' };
        const data = 'side,currency,value\nIN,PLN,1\nIN,EUR,2\nOUT,ANY,3';
        expect(task1(search, data)).toBe('-1');
    });

    //

    // Test for successful match in presence of corrupted data.
    test('Case: ignore corrupted lines.', () => {
        const search = { key1: 'a', key2: 'd' };
        const data = 'key1,key2,value\n' +
                    'a,b,10\n' + 
                    'a,20\n' + // missing key2
                    'a,b,\n' + // misssing value
                    '\n' +  // empty line
                    ',,\n' + // all keys missing
                    'a,d,w,50\n' + // too many keys
                    'a,d,30'; // should match this line
        expect(task1(search, data)).toBe('30');
    });

    //

    // Test for failed match.
    test('Case: failed match.', () => {
        const search = { key1: 'e', key2: 'b' };
        const data = 'key1,key2,value\n' + // there is no line with `e,b,value`
                    'a,b,10\n' +
                    'c,d,20';
        expect(task1(search, data)).toBe('-1');
    });

    //

    // Test for failure when header has too few columns.
    test('Case: header has too few columns.', () => {
        const search = { key1: 'a' };
        const data = 'value\n' + // header with only 'value' column
                    '3\n' +
                    '4';
        expect(() => task1(search, data)).toThrow("At least one other column besides `value` is expected!");
    });

    // Test for failure when header is missing 'value' column.
    test('Case: header has no `value` key.', () => {
        const search = { key1: 'a' };
        const data = 'key1, key2\n' + // header without 'value' column
                    'a, b\n' +
                    'c, d';
        expect(() => task1(search, data)).toThrow("Header has missing `value` column!");
    });

    // Test for failure when search is invalid.
    test('Case: search is invalid value.', () => {
        const search = undefined;
        const data = 'key1,key2,value\n' +
                    'a, b, 3\n';
        expect(() => task1(search, data)).toThrow("Key mismatch");
    });

    // Test for failure when search is empty.
    test('Case: search is empty.', () => {
        const search = { };
        const data = 'key1,key2,value\n' +
                    'a, b, 3\n';
        expect(() => task1(search, data)).toThrow("Key mismatch");
    });

    // Test for failure when search has a key not in header.
    test('Case: search has a key not in header.', () => {
        const search = { key1: 'a', key3: 'x' };
        const data = 'key1,value\n' + // header without 'key3' column
                    'a,10\n' +
                    'c,20';
        expect(() => task1(search, data)).toThrow("Key mismatch");
    });

    // Test for failure when search has missing key compared to header.
    test('Case: search has missing key that is present in header.', () => {
        const search = { key1: 'a' };
        const data = 'key1,key2,value\n' + // header has 'key2' column, but search does not have 'key2' key
                    'a,b,10\n' +
                    'c,d,20';
        expect(() => task1(search, data)).toThrow("Key mismatch");
    });

    // Test for failure when data is invalid.
    test('Case: invalid data.', () => {
        const search = { key1: 'a', key2: 'b' };
        const data = undefined;
        expect(() => task1(search, data)).toThrow("Missing data!");
    });
});