// Import task1 and task2 for testing from tasks.js file, their test suite will likely do something similar.
const { task1, task2 } = require('../../src/task/tasks');

// For profiling.
const fs = require('fs');
const path = require('path');
const util = require('util');
const inspector = require('inspector');

//

jest.setTimeout(300000); // 5 minutes for all tests in this file

describe('Testing example data for profiler', () => {
    // Test for extremely stripped down version of large data file.
    // Also, this file is corrupted.
    test('Calc weighted average for relatively small amount of data.', () => {
        // should find two matching entries: 766473 and 586870
        testDataFromFile('./data/examples/', 'ex1', null, 646737.7, true);
        // if not weighted average, it would be (766473 + 586870) / 2 = 676171.5
    });

    // Test for large amount of data.
    // NOTE: missing from GitHub as for some reason it does not like 400mb files. Go figure.
    test('Calc weighted average for enormous amount of data.', () => {
        testDataFromFile('./data/examples/', 'ex2', null, 608384.2, true);
    });

    // Test for corrupted data. Type: corrupted.
    test('Calc weighted average for heavily corrupted file. Type: corrupted.', () => {
        testDataFromFile('./data/examples/', 'corrupt_01', null, 879.7, true);
    });
});

describe('Testing generated data for profiler', () => {
    // Test for generated data. Type: very small.
    test('Calc weighted average. Type: very small.', () => {
        testDataFromFile('./data/gen/', 'vsmall', null, 472063.5, true);
    });

    // Test for generated data. Type: small.
    test('Calc weighted average. Type: small.', () => {
        testDataFromFile('./data/gen/', 'small', null, 589543.4, true);
    });

    // Test for generated data. Type: medium.
    test('Calc weighted average. Type: medium.', () => {
        testDataFromFile('./data/gen/', 'medium', null, 504232.5, true);
    });

    // Test for generated data. Type: large.
    // NOTE: not present in GitHub due to size.
    test('Calc weighted average. Type: large.', () => {
        testDataFromFile('./data/gen/', 'large', null, 5060.8, true);
    });

    // Test for generated data. Type: very large.
    // NOTE: not present in GitHub due to size.
    test('Calc weighted average. Type: very large.', () => {
        testDataFromFile('./data/gen/', 'vlarge', null, 5013, true);
    });

    // Test for generated data. Type: wide. Size is almost at standard limit.
    // Wide means large amount of columns (500).
    // Additionally it has small integers.
    // NOTE: not present in GitHub due to size.
    test('Calc weighted average. Type: wide.', () => {
        testDataFromFile('./data/gen/', 'wide', null, 48.8, true);
    });

    // Test for generated data. Type: tall.
    // Tall means small amount of columns, but large amount of rows (50 mln).
    // Additionally it has small integers.
    // NOTE: not present in GitHub due to size.
    test('Calc weighted average. Type: tall.', () => {
        testDataFromFile('./data/gen/', 'tall', null, 4.3, true);
    });

    // Test for generated data. Type: finder.
    // Finder means large amount of search criteria.
    test('Calc weighted average. Type: finder.', () => {
        testDataFromFile('./data/gen/', 'finder', null, 497.7, true);
    });
});

// ////////////////////////////////////////////////////////////////////////////

/**
 * Helper to load data from file, process it and compare to expected result.
 * Can optionally profile.
 * 
 * @param {string} dirPath - Directory path.
 * @param {string} fileName - Base file name. Name of data files will be derived from it.
 * @param {Object[]} searches - Array of search criteria objects. If null, will load it from file.
 * @param {number} expectedResult - Expected result to compare to.
 * @param {boolean} doProfiling - If true, execute with profiling.
 */
async function testDataFromFile(dirPath, fileName, searches, expectedResult, doProfiling=false) {
    // Load data from file to string. Note files can be heavily corrupted.
    // We assume task do not require streaming that file line by line.
    // We just operate on string.
    const dataPath = path.join(__dirname, dirPath) + fileName + '\\' + fileName + '.csv';
    if (!fs.existsSync(dataPath))
        throw new Error('Data file "'+dataPath+'" for test not found!');

    const searchPath = path.join(__dirname, dirPath) + fileName + '\\' + fileName + '.search.json';
    if (searches === null && !fs.existsSync(searchPath))
        throw new Error('Search file "'+searchPath+'" for test not found!');

    if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf8');
        if (searches === null) {
            rawSearches = fs.readFileSync(searchPath, 'utf8');
            searches = JSON.parse(rawSearches);
        }

        let actualResult;
        if (doProfiling) actualResult = await runWithProfiling(dirPath, fileName, task2, searches, data);
        else actualResult = task2(searches, data);

        expect(actualResult).toBe(expectedResult);
    } else {
        throw new Error('Data file "'+dataPath+'" for test not found!');
    }
}

// profiling functions

/**
 * Runs given taskFn with given arguments with CPU profiler.
 * Results will be saved to profileName.cpuprofile.
 * 
 * @param {string} dirPath - Directory path.
 * @param {string} fileName - Base file name.
 * @param {function} taskFn - Function to execute and profile.
 * @param {...any} args - Arguments for function above.
 * @returns Result of executing taskFn.
 */
async function runWithProfiling(dirPath, fileName, taskFn, ...args) {
    const session = new inspector.Session();
    session.connect();
    
    // Promisify session.post so we can await it
    const post = util.promisify(session.post.bind(session));

    try {
        console.log(`[Profiler] Starting: ${fileName}`);

        // Enable Profiler.
        await post('Profiler.enable');
        await post('Profiler.start');

        // Run your task here and capture the result.
        const result = await taskFn(...args);

        // Stop and get result
        const { profile } = await post('Profiler.stop');

        // Save to file
        const fileNamePath = path.join(__dirname, dirPath) + fileName + '\\' + fileName + '.cpuprofile';
        //const filename = `profiles/${profileName}.cpuprofile`;
        fs.writeFileSync(fileNamePath, JSON.stringify(profile));
        console.log(`[Profiler] Saved to: ${fileNamePath}`);

        // Return the result to the caller
        return result;
    } catch (err) {
        console.error('[Profiler] Error:', err);
    } finally {
        session.disconnect();
    }
}