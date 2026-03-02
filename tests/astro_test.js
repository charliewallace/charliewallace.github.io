const Astronomy = require('astronomy-engine');

const date = new Date('2026-03-02T23:07:09Z'); // March 3 10:07 AEDT
const observer = new Astronomy.Observer(-37.8136, +144.9631, 0);

console.log("Searching Moonset between Mar 2 00:00 UTC and Mar 4 00:00 UTC:");
const start = new Date(Date.UTC(2026, 2, 2));
const end = new Date(Date.UTC(2026, 2, 4));

let current = start;
while (current < end) {
    let evt = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, current, 1);
    if (!evt || !evt.date) break;
    // Shift the UTC date to AEDT to print easily
    let d = new Date(evt.date.getTime());
    console.log("Moonset found at UTC:", d.toISOString());
    console.log("Moonset found at AEDT:", new Date(d.getTime() + 11 * 3600 * 1000).toISOString().replace('Z', ' AEDT'));
    current = new Date(evt.date.getTime() + 60000);
}
