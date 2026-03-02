const Astronomy = require('astronomy-engine');

const date = new Date('2026-03-01T12:00:00-08:00');

console.log("Date:", date.toString());

const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
console.log("Illumination Fraction:", illum.mag); // wait mag is magnitude. 
// Let's use Astronomy.MoonPhase(date)
const phase = Astronomy.MoonPhase(date);
console.log("Moon Phase (degrees):", phase);
console.log("Illuminated fraction:", 0.5 * (1 - Math.cos(phase * Math.PI / 180)));
