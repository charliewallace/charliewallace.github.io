const SunCalc = require('./js/suncalc.js');

const d = new Date('2026-03-01T12:00:00-08:00');
const lat = 33.158;
const lon = -117.350;

console.log("Date:", d.toString());
console.log("\nTesting Lon = -117 (Standard West)");
const t1 = SunCalc.getMoonTimes(d, lat, lon);
console.log("Rise:", t1.rise ? t1.rise.toString() : 'N/A');
console.log("Set: ", t1.set ? t1.set.toString() : 'N/A');

console.log("\nTesting Lon = +117 (Reversed West)");
const t2 = SunCalc.getMoonTimes(d, lat, -lon);
console.log("Rise:", t2.rise ? t2.rise.toString() : 'N/A');
console.log("Set: ", t2.set ? t2.set.toString() : 'N/A');
