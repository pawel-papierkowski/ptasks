# Tasks

Purpose of task.js is to execute two tasks.

Intention is to show proper and optimized handling of large csv files and fast finding desired records.

Code is pure JavaScript. Node.js is present and used because test suite requires it and proper use of gen-csv.js from terminal also needs Node.

Assumptions:
- Use only stdlib functions.
- CommonJS (so no ES6 Modules)

## Basic info

Author: Paweł Papierkowski

Date: April 2026

## Task 1
Finds first match based on search criteria and provided data.
Assumptions for `data` (from task description):
- Has key `value` which should be returned at full match.
- Keys in `search` must be same as in header of data. If not, raise exception with message `Key mismatch`.
- Name (except for `value`) and order of columns are not fixed.
 
My additional assumptions:
- `value` column can appear at start or in middle of column list in header.
- You can have search criteria in different order than columns in header.
- Data parameter is just a string. No file streaming or anything like that, like it would be in real-life task of this kind.
  This string is in CVS-like format. First line is header (columns separated by comma). Rest is actual data, also separated by comma.

## Task 2
Counts weighted average (one number) for given key list rounded to one decimal place as string. Assume that value column is integer.
Weight is:
- 20 if value is even
- 10 if value is odd

Task 2 uses code from task 1.

Example of call:
task2(
  [
    {'side': 'IN', 'currency': 'PLN'},
    {'side': 'OUT', 'currency': 'EUR'},
  ], 
  'side,currency,value\nIN,PLN,1\nIN,EUR,2\nOUT,ANY,3'
);

## Other

Codebase also contains:
- gen-csv.js: code to generate test large csv files with parameters (like size or amount of search criteria) defined in config.json.
  Note: some generated files are not present, because they are too large for GitHub. You can easily generate them for yourself, though.
- Unit tests for both tasks and for profiling purposes. Requires Jest plugin to work in VS Code.
