const Astronomy = require('astronomy-engine');

const date = new Date('2026-03-01T12:00:00-08:00');
const lat = 33.158;
const lon = -117.350;

console.log("Date:", date.toString());

const observer = new Astronomy.Observer(lat, lon, 0);

// Search for moonrise and moonset
// Astronomy.SearchRiseSet(body, observer, direction, startTime, limitDays)
// direction: +1 for rise, -1 for set
try {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, date, 1);
    console.log("Rise:", rise ? rise.date.toString() : 'None');

    const set = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, date, 1);
    console.log("Set: ", set ? set.date.toString() : 'None');
} catch (e) {
    console.error(e);
}
