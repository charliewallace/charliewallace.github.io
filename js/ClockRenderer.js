
/**
 * ClockRenderer.js
 * Abstract base class for clock renderers.
 */

class ClockRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.active = false;
    }

    /**
     * Initialize the renderer (create canvas, setup scene, etc.)
     */
    init() {
        console.log("Renderer init");
    }

    /**
     * Called when this renderer becomes active
     */
    activate() {
        this.active = true;
        const el = document.getElementById(this.containerId);
        if (el) {
            el.classList.remove('hidden');
            // Remove inline style that might have been set previously or conflicts
            el.style.display = '';
        }
    }

    /**
     * Called when this renderer becomes inactive
     */
    deactivate() {
        this.active = false;
        const el = document.getElementById(this.containerId);
        if (el) {
            el.classList.add('hidden');
        }
    }

    /**
     * Update loop called every frame
     * @param {TimeKeeper} timeKeeper - Current time state
     * @param {LocationManager} locationManager - Current location state
     */
    update(timeKeeper, locationManager) {
        // Override me
    }

    /**
     * Handle window resize
     * @param {number} width 
     * @param {number} height 
     */
    resize(width, height) {
        // Override me
    }
}
