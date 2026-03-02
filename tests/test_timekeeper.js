const fs = require('fs');
const path = require('path');

// Mock browser globals
global.SunCalc = require('../js/suncalc.js');
global.Astronomy = require('astronomy-engine');
global.EnableMoonCalcs = true;

// Evaluate TimeKeeper
const timeKeeperCode = fs.readFileSync(path.join(__dirname, '../js/TimeKeeper.js'), 'utf8');
const tkClass = eval(timeKeeperCode + ';\nTimeKeeper;');

const tk = new tkClass();

// Set date to Mar 2, 2026, 2:00 PM Pacific Time (time of user report)
tk.currentDate = new Date('2026-03-02T14:00:00-08:00');

// Calculate for San Diego
console.log("Testing calculateSunTimes (San Diego)");
tk.calculateSunTimes(33.158, -117.350, -8, false);

console.log("Moon Rise:", tk._formatVisTime(tk.moonRiseTime?.hour || -1, tk.moonRiseTime?.minute || 0));
console.log("Moon Set: ", tk._formatVisTime(tk.moonSetTime?.hour || -1, tk.moonSetTime?.minute || 0));
console.log("Moon Illum:", tk.moonIllum);

// Calculate for Other location (Melbourne)
console.log('\nTesting calculateOtherLocationSunTimes (Melbourne AEDT)');
tk.calculateOtherLocationSunTimes(-37.8136, +144.9631, 11, false);
console.log('Other Sunrise: ', tk.otherSunriseTime);
console.log('Other Moon Rise:', tk.otherMoonRiseTime);
console.log('Other Moon Set: ', tk.otherMoonSetTime);
console.log('Other Moon Illum:', tk.otherMoonIllum);
