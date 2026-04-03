const fs = require('fs');
const path = require('path');

// --- Main Execution ---
generateAllData();

// ////////////////////////////////////////////////////////////////////////////

/**
 * Generate all needed data based on the config file.
 * Generated data include:
 * - generated CSV file itself: [fileName].csv
 * - criteria file to use in tests for CSV file: [fileName].search.json
 * - configuration used to generate this file (so you can recreate it later): [fileName].config.json
 * 
 * Config file format:
 * - directory: Where to save generated files.
 * - fileName: Base name of files.
 * - totalColumns: Count of all columns. Note: last column 'value' do not count.
 * - totalRows: Count of rows to generate. Note: header do not count.
 * - searchCriteriaCount: Count of search criteria.
 * - matchChance: Chance that this row will match one of search criterias.
 * - maxInteger: Generated numbers are in range from 0 to this value.
 * 
 * How to use:
 * - Modify config.json as you need.
 * - Open Terminal. Navigate to test/csvgen.
 * - Type node gen-csv.js. This will automatically run generateAllData().
 */
function generateAllData() {
    const config = handleConfig();
    searches = generateSearchData(config);
    generateCsvData(config, searches);
}

//

/**
 * Generates the search data file based on the provided config object.
 * 
 * @param {Object} config Configuration.
 * @returns {Object[]} Search criteria data.
 */
function generateSearchData(config) {
    const { directory, fileName, totalColumns, searchCriteriaCount, maxInteger } = config;

    let searches = [];
    for (let i = 0; i < searchCriteriaCount; i++) {
        let search = {};
        for (let j = 0; j < totalColumns; j++) { // without `value`
            search[`c${j}`] = genRandomValue(maxInteger);
        }
        searches.push(search);
    }

    // save generated search criteria to file
    let fullPath = directory + fileName + '/' + fileName + '.search.json';
    try {
        // null, 2 makes it pretty-printed (readable)
        const jsonData = JSON.stringify(searches, null, 2);
        fs.writeFileSync(fullPath, jsonData, 'utf8');
        console.log(`Search data saved to ${fullPath}.`);
    } catch (err) {
        console.error(`Error writing ${fullPath}:`, err);
    }

    return searches;
}

//

/**
 * Generates the CSV file based on the provided config object.
 * 
 * @param {Object} config Configuration.
 * @param {Object[]} searches Search data.
 */
function generateCsvData(config, searches) {
    const { directory, fileName, totalColumns, totalRows, matchChance, maxInteger } = config;

    let fullPath = directory + fileName + '/' + fileName + '.csv';
    console.log(`Generating ${fullPath} with ${totalColumns} columns (plus 'value') and ${totalRows.toLocaleString()} rows...`);

    const stream = fs.createWriteStream(fullPath);
    writeHeader(stream, totalColumns);    

    let rowsWritten = 0;

    // Write data (with backpressure)
    function writeBatch() {
        let canWrite = true;

        while (rowsWritten < totalRows && canWrite) {
            const row = resolveRows(totalColumns, matchChance, maxInteger, searches);
            const line = row.join(',') + '\n';
            canWrite = stream.write(line);
            rowsWritten++;
        }

        if (rowsWritten < totalRows) {
            // Wait for drain to avoid memory overflow
            stream.once('drain', writeBatch);
        } else {
            stream.end();
            console.log("Generation Complete!");
        }
    }

    writeBatch();
}

/**
 * Write csv header. It is list of columns like "c0, c1, ..., value".
 * 
 * @param {*} stream File stream.
 * @param {number} totalColumns Count of columns (without 'value').
 */
function writeHeader(stream, totalColumns) {
    const headers = [];
    for (let i = 0; i < totalColumns; i++) {
        headers.push(`c${i}`);
    }
    headers.push('value'); // The mandatory last column
    stream.write(headers.join(',') + '\n');
}

/**
 * Resolve data for single row. It can be either random or from search criteria.
 * 
 * @param {number} totalColumns Count of columns (without 'value').
 * @param {number} matchChance Chance that we will use random search criteria instead of generating completely random row.
 * @param {number|null} maxInteger If not null, number will be in range 0 - maxInteger (exclusive).
 * @param {number[]} searches Search criteria.
 */
function resolveRows(totalColumns, matchChance, maxInteger, searches) {
    const row = [];
    const allColumns = totalColumns + 1; // including 'value'

    if (Math.random() > matchChance) {
        // random row
        for (let i = 0; i < allColumns; i++) {
            row.push(genRandomValue(maxInteger)); 
        }
    } else {
        // row exactly matching criteria picked at random
        let search = searches[getRandomInt(0, searches.length)];
        for (let key in search) {
            row.push(search[key]); 
        }
        row.push(genRandomValue(maxInteger)); // last column `value`
    }

    return row;
}

//

/**
 * Generate random number for csv data depending on config.
 * 
 * @param {number|null} maxInteger Maximum integer. If null, use default.
 * @returns {number} Random unsigned integer.
 */
function genRandomValue(maxInteger) {
    if (maxInteger === null) return genRandomNum();
    return getRandomInt(0, maxInteger);
}

/**
 * Generate random unsigned integer.
 * 
 * @returns {number} Random unsigned integer.
 */
function genRandomNum() {
    return (Math.random() * 1000000) | 0;
}

/**
 * Generate random unsigned integer between min and max.
 * 
 * @param {number} min Minimum integer, inclusive.
 * @param {number} max Maximum integer, exclusive.
 * @returns {number} Random unsigned integer.
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// ////////////////////////////////////////////////////////////////////////////
// CONFIG

/**
 * Handles configuration file. That includes copying it where needed and reading it as JSON.
 * 
 * @returns {Object} The configuration object.
 */
function handleConfig() {
    const configPath = path.join(__dirname, 'config.json');
    const config = loadConfig(configPath);
    saveConfig(config);
    return config;
}

/**
 * Save config data next to future csv file.
 * 
 * @param {Object} config The configuration object.
 */
function saveConfig(config) {
    const { directory, fileName } = config;
    // save config to file (will also create directory if needed)
    let fullPath = directory + fileName + '/' + fileName + '.config.json';
    const directoryPath = path.dirname(fullPath);

    try {
       if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath); // , { recursive: true }
    
        // null, 2 makes it pretty-printed (readable)
        const jsonData = JSON.stringify(config, null, 2);
        fs.writeFileSync(fullPath, jsonData, 'utf8');
        console.log(`Config data saved to ${fullPath}.`);
    } catch (err) {
        console.error(`Error writing ${fullPath}:`, err);
        process.exit(1); // Exit immediately.
    }
}

/**
 * Loads and validates configuration from a JSON file.
 * 
 * @param {string} configPath Path to the JSON config file.
 * @returns {Object} The configuration object.
 */
function loadConfig(configPath) {
    try {
        const rawData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(rawData);

        // Basic validation
        if (!config.directory || typeof config.directory !== 'string') {
            throw new Error("Config missing valid 'directory'");
        }
        if (!config.fileName || typeof config.fileName !== 'string') {
            throw new Error("Config missing valid 'fileName'");
        }

        if (!Number.isInteger(config.totalColumns) || config.totalColumns < 1) {
            throw new Error("Config 'totalColumns' must be a positive integer");
        }
        if (!Number.isInteger(config.totalRows) || config.totalRows < 1) {
            throw new Error("Config 'totalRows' must be a positive integer");
        }
        if (!Number.isInteger(config.searchCriteriaCount) || config.searchCriteriaCount < 1) {
            throw new Error("Config 'searchCriteriaCount' must be a positive integer");
        }
        if (!Number.isFinite(config.matchChance) || config.matchChance < 0) {
            throw new Error("Config 'matchChance' must be a positive number");
        }
        if (config.maxInteger !== null && (!Number.isInteger(config.maxInteger) || config.maxInteger < 0)) {
            throw new Error("Config 'maxInteger' must be a positive integer or null");
        }

        return config;
    } catch (error) {
        console.error(`Failed to load config from ${configPath}:`, error.message);
        process.exit(1); // Exit immediately if config is bad.
    }
}