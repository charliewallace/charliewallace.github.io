
/**
 * LocationManager.js
 * Handles location fetching (IP, GPS) and stores location state.
 */

class LocationManager {
    constructor() {
        this.latitude = 99999;
        this.longitude = 99999;
        this.cityName = "Locating...";
        this.tzOffset = 0; // Default to neutral or browser
        this.isPrecise = false;

        // Callbacks
        this.onLocationUpdate = null; // function(lat, lon, tz, city)
        this.onError = null; // function(msg)
    }

    init() {
        // Initial setup - maybe try to read URL hash or IP?
        // For now, minimal init
        const browserOffset = -new Date().getTimezoneOffset() / 60;
        this.tzOffset = browserOffset;
    }

    /**
     * Set location manually
     */
    setLocation(lat, lon, tz, city) {
        this.latitude = lat;
        this.longitude = lon;
        this.tzOffset = tz;
        this.cityName = city;
        this.isPrecise = true;
        if (this.onLocationUpdate) this.onLocationUpdate(lat, lon, tz, city);
    }

    /**
     * Placeholder for the complex fetch logic from sketch.js
     * In a full refactor, we would move fetchIpLocation/fetchPreciseLocation here.
     * For the merge task, we might keep the heavy lifting in sketch.js initially
     * and just use this as a data store, OR port it all. 
     * Let's aim to port the essential data structure first.
     */

    get hasValidLocation() {
        return this.latitude !== 99999 && this.longitude !== 99999;
    }
}
