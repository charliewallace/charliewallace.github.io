
/**
 * TimeKeeper.js
 * Manages time calculations, including timezone adjustments and sunrise/sunset times.
 */

class TimeKeeper {
    constructor() {
        this.currentDate = new Date();
        this.timezoneOffset = 0; // The target timezone offset (hours)
        this.useCustomTimezone = false;

        // Time State
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
        this.millis = 0;
        this.dayOfWeek = 0;
        this.totalSecondsToday = 0; // Seconds since midnight

        // Sun State
        this.sunriseTime = { hour: 6, minute: 0, totalSeconds: 0 };
        this.sunsetTime = { hour: 18, minute: 0, totalSeconds: 0 };
        this.dayState = 0; // 0=unknown, 1=pre-sunrise, 2=day, 3=post-sunset
        this.isDay = true;
        this.sunriseHourString = "";
        this.sunsetHourString = "";

    }

    /**
     * Updates the current time state.
     * @param {number} forcedTimezoneOffset - Optional override for timezone (e.g. from LocationManager)
     */
    update(forcedTimezoneOffset = null) {
        let now = new Date();

        // Handle Timezone Offset
        // If a specific offset is provided (and we want to use it), we adjust the time.
        // The original logic checked if `TzOffset` != `localTz`.
        if (forcedTimezoneOffset !== null) {
            const browserOffset = -now.getTimezoneOffset() / 60;
            if (forcedTimezoneOffset !== browserOffset) {
                const diffHours = forcedTimezoneOffset - browserOffset;
                now = new Date(now.getTime() + diffHours * 60 * 60 * 1000);
            }
        }

        this.currentDate = now;
        this.hours = now.getHours();
        this.minutes = now.getMinutes();
        this.seconds = now.getSeconds();
        this.millis = now.getMilliseconds();
        this.dayOfWeek = now.getDay();

        // Calculate seconds since midnight including milliseconds
        const msSinceMidnight = (this.hours * 3600 * 1000) + (this.minutes * 60 * 1000) + (this.seconds * 1000) + this.millis;
        this.totalSecondsToday = msSinceMidnight / 1000;

        this.updateDayState();
    }

    /**
     * Calculates Sunrise and Sunset times based on location and date.
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} tzOffset - Timezone offset
     * @param {boolean} isDst - Is Daylight Savings Time?
     */
    calculateSunTimes(lat, lon, tzOffset, isDst) {
        // Wrapper for the astronomy logic
        const rise = this._calcRiseSet(true, 0, lat, lon, tzOffset, isDst);
        const set = this._calcRiseSet(false, 0, lat, lon, tzOffset, isDst);

        this.sunriseTime = rise;
        this.sunsetTime = set;

        if (rise.hour === -1) { // Always dark
            this.isDay = false;
        } else if (rise.hour === -2) { // Always light
            this.isDay = true;
        }

        // Format strings
        this.sunriseHourString = this._formatVisTime(rise.hour, rise.minute);
        this.sunsetHourString = this._formatVisTime(set.hour, set.minute);

        this.updateDayState(); // Re-evaluate day state with new sun times
    }

    updateDayState() {
        // Logic from sketch.js
        if (this.sunriseTime.hour < 0 || this.sunsetTime.hour < 0) {
            // Handled by calculateSunTimes flags for always/never day
            // But let's set dayState roughly
            return;
        }

        this.isDay = true;
        this.dayState = 2; // Default Day

        if (this.totalSecondsToday < this.sunriseTime.totalSeconds) {
            this.isDay = false;
            this.dayState = 1; // Pre-sunrise
        } else if (this.totalSecondsToday > this.sunsetTime.totalSeconds) {
            this.isDay = false;
            this.dayState = 3; // Post-sunset
        }
    }

    _formatVisTime(h, m) {
        if (h < 0) return "";
        const ampm = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        h12 = h12 ? h12 : 12;
        const mStr = m.toString().padStart(2, '0');
        return `${h12}:${mStr} ${ampm}`;
    }

    // --- Astronomy Math Ported from sketch.js ---
    _calcRiseSet(isSunrise, dayOffset, lat, lon, gmto, isDst) {
        // Math from sketch.js calcRiseSetTimeWithOffset
        const fLati = lat * (Math.PI / 180);
        const fLongi = lon * (Math.PI / 180);

        let fGmto;
        if (isDst) {
            fGmto = (-gmto - 1) * 2 * Math.PI / 24;
        } else {
            fGmto = -gmto * 2 * Math.PI / 24;
        }

        // Approx date
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const da = d.getDate();
        const mo = d.getMonth() + 1;

        const tmp = Math.floor((mo + 9) / 12);
        const daynum = Math.floor(275 * mo / 9) + da - tmp - 30;

        let jj = isSunrise ? Math.PI / 2 : Math.PI * 2;
        const kk = daynum + ((jj + fLongi) / (2 * Math.PI));
        const ll = kk * 0.017202 - 0.0574039;
        let mm = ll + 0.0334405 * Math.sin(ll) + 0.000349066 * Math.sin(2 * ll) + 4.93289;

        // normalize mm
        while (mm < 0) mm += 2 * Math.PI;
        while (mm >= 2 * Math.PI) mm -= 2 * Math.PI;

        if (Math.abs(2 * mm / Math.PI - Math.round(2 * mm / Math.PI)) < 0.00001) {
            mm += 4.84814E-06;
        }

        let pp = Math.atan(0.91746 * (Math.sin(mm) / Math.cos(mm)));
        if (mm > Math.PI / 2) {
            if (mm > 3 * Math.PI / 2) pp += 2 * Math.PI;
            else pp += Math.PI;
        }

        let qq = 0.39782 * Math.sin(mm);
        qq = Math.atan(qq / Math.sqrt(1 - (qq * qq)));

        let ss = (-0.014539 - (Math.sin(qq) * Math.sin(fLati))) / (Math.cos(qq) * Math.cos(fLati));

        if (ss > 1) return { hour: -1, minute: 0, totalSeconds: 0 }; // Always dark
        if (ss < -1) return { hour: -2, minute: 0, totalSeconds: 0 }; // Always light

        ss = -Math.atan(ss / Math.sqrt(1 - ss * ss)) + Math.PI / 2;
        if (isSunrise) ss = 2 * Math.PI - ss;

        const tt = ss + pp - 0.0172028 * kk - 1.73364;
        let vv = tt + fLongi - fGmto;
        let zz = vv;

        while (zz < 0) zz += 2 * Math.PI;
        while (zz >= 2 * Math.PI) zz -= 2 * Math.PI;

        zz *= 24 / (2 * Math.PI);
        vv = Math.floor(zz);
        const ww = (zz - vv) * 60;
        let xx = Math.floor(ww);
        const yy = ww - xx;

        if (yy >= 0.5) xx += 1;
        if (xx >= 60) {
            vv += 1;
            xx = 0;
        }

        return {
            hour: vv,
            minute: xx,
            totalSeconds: vv * 3600 + xx * 60
        };
    }
}
