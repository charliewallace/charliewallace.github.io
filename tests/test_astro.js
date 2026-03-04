const SunCalc = require('./js/suncalc.js');
const Astronomy = require('astronomy-engine');

const date = new Date('2026-03-02T12:00:00Z');
const lat = 37.7749; // SF
const lon = -122.4194;
const tzOffset = -8;

// SunCalc
console.log("Date:", date);
console.log("SunCalc:");
const scTimes = SunCalc.getMoonTimes(date, lat, lon, true);
console.log("Rise:", scTimes.rise);
console.log("Set:", scTimes.set);

// Astronomy
console.log("\nAstronomy Engine:");
const observer = new Astronomy.Observer(lat, lon, 0); // eval elevation 0

const astTime = new Astronomy.AstroTime(date);
const searchRise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, astTime, 1);
const searchSet = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, astTime, 1);

console.log("Rise:", searchRise ? searchRise.date : null);
console.log("Set:", searchSet ? searchSet.date : null);
