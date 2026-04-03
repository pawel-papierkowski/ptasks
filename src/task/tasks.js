// Paweł Papierkowski
// Tasks to handle large csv files.

/**
 * @typedef {Object} MatchingLine
 * @property {number} endIx - End index of the line or -1 if last line.
 * @property {string[]} splitContent - Content of the line split by comma.
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} value - Value at full match or '-1' if no match.
 * @property {number} endIx - End index of the line or -1 if last line.
 */

/**
 * NOTES
 * Assumptions about environment:
 * - Use only stdlib functions.
 * - CommonJS (so no ES6 Modules)
 * 
 * Possible optimalizations:
 * - Treat data string as bytes (Uint8Array): avoids utf conversions and other overhead.
 *   Issue: we would need to convert entire string first, ouch. Big upfront cost.
 *   Also, manually find values instead of regexpr.
 * - Parallel processing: divide data string roughly equally (to nearest \n) between cores.
 *   Issue: would work well only for task2. Would also need ton of refactoring.
 */

// ////////////////////////////////////////////////////////////////////////////
// TASK 1
// ////////////////////////////////////////////////////////////////////////////

/**
 * Finds first match based on search criteria and provided data.
 * 
 * Assumptions for `data` (from task description):
 * - Has key `value` which should be returned at full match.
 * - Keys in `search` must be same as in header of data. If not, raise exception with message `Key mismatch`.
 * - Name (except for `value`) and order of columns are not fixed.
 * 
 * My additional assumptions:
 * - `value` column can appear at start or in middle of column list in header.
 * - You can have search criteria in different order than columns in header.
 * - Data parameter is just a string. No file streaming or anything like that,
 *   like it would be in real-life task of this kind. This string is in CVS-like format.
 *   First line is header (columns separated by comma). Rest is actual data, also separated by comma.
 * 
 * @example
 * const data = 'side,currency,value\nIN,PLN,1\nIN,EUR,2\nOUT,ANY,3';
 * const result1 = task1({'side': 'IN', 'currency': 'PLN'}, data); // result1 === '1'
 * const result2 = task1({'side': 'IN', 'currency': 'GBP'}, data); // result2 === '-1'
 * 
 * @param {Object} search - Contain single search criteria.
 * @param {string} data - CSV formatted data. Can be large.
 * @returns {string} Value at full match or '-1' if no match.
 */
function task1(search, data) {
    const searchArr = [search]; // safe, if search is invalid, will fail during verification later
    return findValue(searchArr, data);
}

/**
 * Finds first match based on search criteria and provided data.
 * 
 * @param {Object[]} searches - Search criteria. If at least one of them matches, key `value` is returned.
 * @param {string} data - CSV formatted data. Can be large.
 * @returns {string} Value at full match or '-1' if no match.
 */
function findValue(searches, data) {
    const header = getHeader(data);
    if (header === null) return '-1'; // no data lines present

    // Verify input.
    verify(searches, header, data);
    // Handle searches.
    criteria = processSearches(searches, header);
    // Generate regular expression that we will use for matching.
    regExp = genRegEx(criteria);

    // Now, search for the match.
    const valueIndex = header.indexOf('value');
    let result = findMatch(criteria, valueIndex, data, 0, regExp); // one-shot
    return result.value;
}

// ////////////////////////////////////////////////////////////////////////////
// TASK 2
// ////////////////////////////////////////////////////////////////////////////

/** 
 * Counts weighted average (one number) for given key list rounded to one decimal place as string.
 * Assume that value column is integer.
 * Weight is:
 * - 20 if value is even
 * - 10 if value is odd
 * 
 * @example
 * task2(
 *   [
 *     {'side': 'IN', 'currency': 'PLN'},
 *     {'side': 'OUT', 'currency': 'EUR'},
 *   ], 
 *   'side,currency,value\nIN,PLN,1\nIN,EUR,2\nOUT,ANY,3'
 * );
 * 
 * @param {Object[]} searches - Search criteria.
 * @param {string} data - CSV formatted data. Can be large.
 * @returns {number} Weighted average.
 */
function task2(searches, data) {
    const header = getHeader(data);
    if (header === null) return 0.0; // no data lines present

    // Verify input.
    verify(searches, header, data);
    // Handle searches.
    criteria = processSearches(searches, header);
    // Generate regular expression that we will use for matching.
    regExp = genRegEx(criteria);

    // Finally, find average.
    const valueIndex = header.indexOf('value');
    return findAverage(criteria, valueIndex, data, regExp);
}

/**
 * Finds weighted average based on search criteria and provided data.
 * Weight is:
 * - 20 if value is even
 * - 10 if value is odd
 * 
 * @param {Object[]} criteria - Optimized search criteria.
 * @param {number} valueIndex - Index of `value` column in line.
 * @param {string} data - CSV formatted data. Can be large.
 * @param {RegExp} regExp Regular expression to use for finding next line.
 * @returns {number} Weighted average.
 */
function findAverage(criteria, valueIndex, data, regExp) {
    let totalValue = 0;
    let totalWeight = 0;
    let currIx = 0;

    while (true) {
        let result = findMatch(criteria, valueIndex, data, currIx, regExp);
        if (result.value === '-1') break; // no more matches
        currIx = result.endIx;

        // Process the found value.
        const intValue = +result.value; // convert from string to integer

        // Optimization: Branchless weight calculation
        // (intValue & 1) returns 1 for odd, 0 for even.
        // If even (0), we want 20. If odd (1), we want 10.
        // Formula: 20 - (10 * (intValue & 1))
        //   Even: 20 - (10 * 0) = 20
        //   Odd:  20 - (10 * 1) = 10
        const weight = 20 - (10 * (intValue & 1));

        totalValue += intValue * weight;
        totalWeight += weight;
    }

    if (!Number.isFinite(totalValue)) throw new Error("Total value overflow!");

    if (totalWeight === 0) return 0.0;
    return roundToOneDecimal(totalValue / totalWeight);
}

// ////////////////////////////////////////////////////////////////////////////
// COMMON CODE
// ////////////////////////////////////////////////////////////////////////////

/**
 * Extract header from data. The header is on the first line and its columns are separated by comma.
 * 
 * @param {string} data - CSV formatted data. Can be large.
 * @returns {string[]|null} Header keys or null if failed to determine header.
 */
function getHeader(data) {
    if (typeof data !== 'string') return []; // will fail later during verification

    let ix = data.indexOf('\n'); // header is on first line
    if (ix === -1) return null; // no data or only first line present, bail out

    const headerLine = data.slice(0, ix);
    return headerLine.split(',').map(h => h.trim()); // make sure to cut out stray /r or spaces if present
}

/**
 * Process all search objects. Generates and returns optimized structure that contains pre-calculated data
 * for faster matching later in checkMatch().
 * 
 * @param {Object[]} searches - Search criteria.
 * @param {string[]} header - Keys in header.
 * @return {Object[]} Criteria with pre-calculated data.
 */
function processSearches(searches, header) {
    const criteria = [];
    for (const search of searches) {
        const criterium = processSearch(search, header);
        criteria.push(criterium);
    }
    return criteria;
}

/**
 * Process single search object. Generates optimized search data.
 * @param {Object} search - Search data as an object.
 * @param {string[]} header - Keys in header.
 * @returns {Array<{index: number, value: string}>} Single criterium. Optimized search data.
 */
function processSearch(search, header) {
    const criterium = [];
    const searchKeys = Object.keys(search);
    for (const key of searchKeys) {
        const idx = header.indexOf(key);
        if (idx !== -1) {
            // We store the exact index and value to check
            const currVal = search[key].toString();
            criterium.push({ index: idx, value: currVal });
        }
    }
    return criterium;
}

/**
 * Generate regular expressions that we will use for matching.
 * @param {Object[]} criteria - Optimized search criteria.
 * @returns {RegExp} Regular expression that contains first value from ALL criteria. Wow.
 */
function genRegEx(criteria) {
    // Extract all values we are looking for.
    // First, escape special regex characters just in case.
    const patterns = criteria.map(c => 
        c[0].value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    // Create one big OR regex: (val1|val2|val3)
    // The 'g' flag is important so we can set lastIndex.
    return new RegExp(`(${patterns.join('|')})`, 'g');
}

//

/**
 * Find first match based on search criteria and provided data. Return content of `value` column.
 * 
 * @param {Object[]} criteria - Optimized search criteria.
 * @param {number} valueIndex - Index of `value` column in line.
 * @param {string} data - CSV formatted data. Can be large.
 * @param {number} currIx - Current index.
 * @param {RegExp} regExp Regular expression to use for finding next line.
 * @returns {MatchResult} Result object.
 */
function findMatch(criteria, valueIndex, data, currIx, regExp) {
    if (currIx === -1) return { value: '-1', endIx: -1 }; // cannot continue
    if (currIx === 0) currIx = data.indexOf('\n') + 1; // Reposition to first data line, skipping the header.

    do {
        let lineData = findNextMatchingLine(data, currIx, regExp);
        if (lineData === null) {
            currIx = -1;
            break; // No more lines.
        }

        // Skip corrupted lines.
        if (isCorrupted(criteria, lineData.splitContent)) {
            if (lineData.endIx === -1) break; // Edge case: last line is corrupted.
            currIx = lineData.endIx + 1;
            continue;
        }

        let isMatch = checkMatches(criteria, lineData.splitContent);
        if (isMatch) {
            // Found a match, return the value. We need to continue from next line.
            currIx = lineData.endIx === -1 ? -1 : lineData.endIx + 1; // match on last line?
            return {
                value: lineData.splitContent[valueIndex],
                endIx: currIx
            };
        }
        if (lineData.endIx === -1) break; // No more lines.
        currIx = lineData.endIx + 1;
    } while (true);

    return { value: '-1', endIx: -1 }; // No match found.
}

//

/**
 * Finds next line matching any of the criteria and return processed result.
 * 
 * @param {string} data - CSV formatted data. Can be large.
 * @param {number} currIx - Current index.
 * @param {RegExp} regExp Regular expression to use for finding next line.
 * @returns {MatchingLine} Data about the next matching line. Can be null if no match found.
 */
function findNextMatchingLine(data, currIx, regExp) {
    // Find index of potential match.
    const nextDataIx = findNextIx(data, currIx, regExp);
    if (nextDataIx === -1) return null;

    // Find out current line around index. Note last line might still have some data.
    const lineStartIx = data.lastIndexOf('\n', nextDataIx) + 1;
    const lineEndIx = data.indexOf('\n', nextDataIx);
    const actualEndIx = lineEndIx === -1 ? data.length : lineEndIx;

    // We found the line. Now we need to parse it efficiently.
    // Instead of slice() and split(), we scan for commas manually.
    const splitContent = [];
    let currentStart = lineStartIx;
    
    // Manual CSV parser loop (much faster than split)
    for (let i = lineStartIx; i <= actualEndIx; i++) {
        const char = data[i];
        
        // Check for comma or end of line
        if (char === ',' || i === actualEndIx) {
            // Extract substring directly (no need to slice the whole line first).
            let val = data.substring(currentStart, i).trim();
            splitContent.push(val);
            currentStart = i + 1; // Skip comma
        }
    }

    return { endIx: lineEndIx, splitContent: splitContent };
}

/**
 * Find next index that contains value from search criteria.
 * 
 * @param {string} data - CSV formatted data. Can be large.
 * @param {number} currIx - Current index.
 * @param {RegExp} regExp Regular expression to use for finding next index.
 * @returns {number} Index or -1 if could not find value.
 */
function findNextIx(data, currIx, regExp) {
    // Start searching from the current known position.
    regExp.lastIndex = currIx;
    const match = regExp.exec(data);
    if (!match) return -1; // failed to find any match
    return match.index;
}

//

/**
 * Checks if at least one criterium matches given line.
 * 
 * @param {Object[]} criteria - Optimized search criteria.
 * @param {string[]} lineEntries - Entries in current line.
 * @returns {boolean} True if at least one criterium matches.
 */
function checkMatches(criteria, lineEntries) {
    // One match is enough.
    for (let i = 0; i < criteria.length; i++) {
        if (checkMatch(criteria[i], lineEntries)) return true;
    }
    return false;
}

/**
 * Checks if all properties in search object match all entries in current line. 
 * Used heavily if we have wide csv (tons of columns).
 *  
 * @param {Object[]} criterium - Optimized search criterium.
 * @param {string[]} lineEntries - Entries in current line.
 * @returns {boolean} True if all entries in criterium match all entries in current line.
 */
function checkMatch(criterium, lineEntries) {
    for (let i = 0; i < criterium.length; i++) {
        // Optimized: direct O(1) array access by index.
        if (lineEntries[criterium[i].index] !== criterium[i].value) return false;
    }
    return true;
}

/**
 * Checks if line entries are corrupted.
 * 
 * @param {Object[]} criteria - Optimized search criteria.
 * @param {string[]} lineEntries - Entries in current line.
 * @returns {boolean} - True if line entries are corrupted, false otherwise.
 */
function isCorrupted(criteria, lineEntries) {
    // Case 1: count of values different than count of header keys.
    // We take advantage of fact that lineEntries.length === count of params in criterium + 1.
    if (lineEntries.length !== criteria[0].length + 1) return true;
    // Line is OK.
    return false;
}

//

/**
 * Verify input data correctness.
 * 
 * @param {Object[]} searches - Search criteria.
 * @param {string[]} header - Keys in header.
 * @param {string} data - CSV formatted data. Can be large.
 */
function verify(searches, header, data) {
    verifyData(data);
    verifyHeader(header);
    verifySearches(searches, header);
}

/**
 * Verify correctness of data. It must be string.
 * 
 * @param {string} data - CSV formatted data. Can be large.
 */
function verifyData(data) {
    if (typeof data !== 'string') throw new Error("Missing data!");
}

/**
 * Verify correctness of header. It must contain `value` column and at least one other column.
 * 
 * @param {string[]} header - Keys in header.
 */
function verifyHeader(header) {
    if (!header.includes('value')) throw new Error("Header has missing `value` column!");
    if (header.length <= 1) throw new Error("At least one other column besides `value` is expected!");
}

/**
 * Verify that searches is valid array, every search is an object and all keys in search
 * (except `value`) are present in header.
 * 
 * @param {Object[]} searches - Search criteria.
 * @param {string[]} header - Keys in header.
 */
function verifySearches(searches, header) {
    if (!Array.isArray(searches)) throw new Error("Key mismatch");

    for (const search of searches) {
        // search has invalid value (must be object)
        if (typeof search !== 'object' || search === null || Array.isArray(search))
            throw new Error("Key mismatch");

        const searchKeys = Object.keys(search);
        
        // All search keys must be in data except for `value`.
        if (searchKeys.length !== header.length-1) throw new Error("Key mismatch");

        for (const key of searchKeys) {
            if (!header.includes(key)) throw new Error("Key mismatch");
        }
    }
}

/**
 * Round given number to one decimal.
 * @param {number} num - Number to be rounded.
 * @returns {number} Rounded number.
 */
function roundToOneDecimal(num) {
    return Math.round(num * 10) / 10;
}

module.exports = { task1, task2 }; // For test suite.