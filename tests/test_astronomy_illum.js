const Astronomy = require('astronomy-engine');

const date = new Date('2026-03-01T12:00:00-08:00');
const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
console.log(illum);
