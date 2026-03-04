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

### URL Hash Debugging Parameters

You can append test parameters to the URL hash when running the app in the browser to manually override certain calculated states, allowing for visual inspection of otherwise rare events:

- `#testMoonPhase=[0-100]`: Artificially overrides the moon phase calculation. `0` represents a perfectly new moon, while `100` represents a perfectly full moon. The Day Spiral's night section interpolation and the moon graphic will both reflect the overridden value.
- `#testvpn`: Mentioned in code comments to be preserved in the URL hash. While the logic to simulate VPN detection is not actively implemented in the IP fetching mechanism, it is ostensibly for simulating a timezone/IP mismatch to trigger the location permission prompt.
