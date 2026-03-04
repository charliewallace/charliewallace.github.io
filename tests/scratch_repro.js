const path = require('path');
const fs = require('fs');

global.SunCalc = require(path.join(__dirname, '../js/suncalc.js'));
global.Astronomy = require('astronomy-engine');
global.EnableMoonCalcs = true;

const tkCode = fs.readFileSync(path.join(__dirname, '../js/TimeKeeper.js'), 'utf8');
const tkClass = eval(tkCode + ';\nTimeKeeper;');

const tk = new tkClass();
const tzOffset = 11; // Melbourne AEDT
// Provide simulated time for Mar 3 10:07 AEDT (which is Mar 2 23:07 UTC)
tk.currentDate = new Date('2026-03-02T23:07:09Z');
tk.calculateOtherLocationSunTimes(-37.8136, +144.9631, tzOffset, false);

console.log("Other Sunrise:", tk.otherSunriseTime);
console.log("Other Sunset:", tk.otherSunsetTime);
console.log("Other Moonrise:", tk.otherMoonRiseTime);
console.log("Other Moonset:", tk.otherMoonSetTime);
