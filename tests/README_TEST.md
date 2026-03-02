# CoolweirdClocks Test Suite

This directory contains standalone scripts for validating calculations in the CoolweirdClocks project, primarily focusing on astronomy and time-zone calculations.

### Included Tests

- **`test_timekeeper.js`**: 
  The primary integration test. This script artificially loads `TimeKeeper.js` and evaluates its output against the `astronomy-engine` library for specific target locations and dates. It verifies that the calculation wrapper properly applies time-zone offsets and handles absolute UTC conversions.
  
- **`test_astronomy_*.js` / `test_astro.js`**:
  Scratch scripts exploring the base APIs of `astronomy-engine` (e.g. fractional illumination, phase angle, and `SearchRiseSet` behavior).

### How to Run

You can run the main testing suite using npm from the project root:

```sh
npm test
```

Or you can run individual scripts directly using Node:

```sh
node tests/test_timekeeper.js
```
