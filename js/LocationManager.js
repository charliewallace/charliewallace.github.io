
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

        // Other location for dual-location mode
        this.otherLocation = {
            latitude: 99999,
            longitude: 99999,
            cityName: null,
            tzOffset: 0
        };

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
     * Set location manually (user's primary location)
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
     * Set the "other" location for dual-location mode
     */
    setOtherLocation(lat, lon, tz, city) {
        this.otherLocation.latitude = lat;
        this.otherLocation.longitude = lon;
        this.otherLocation.tzOffset = tz;
        this.otherLocation.cityName = city;
        console.log(`📍 Other location set: ${city} (${lat}, ${lon}, TZ: ${tz})`);
    }

    /**
     * Clear the "other" location (return to single-location mode)
     */
    clearOtherLocation() {
        this.otherLocation.latitude = 99999;
        this.otherLocation.longitude = 99999;
        this.otherLocation.cityName = null;
        this.otherLocation.tzOffset = 0;
        console.log('📍 Other location cleared (single-location mode)');
    }

    /**
     * Check if we have a valid "other" location (dual-location mode)
     */
    hasOtherLocation() {
        return this.otherLocation.latitude !== 99999 &&
            this.otherLocation.longitude !== 99999;
    }

    /**
     * Get timezone offset difference in hours (other - user)
     */
    getTimezoneOffsetDifference() {
        if (!this.hasOtherLocation()) return 0;
        return this.otherLocation.tzOffset - this.tzOffset;
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
