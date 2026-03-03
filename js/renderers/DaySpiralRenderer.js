
/**
 * DaySpiralRenderer.js
 * Implements the Day Spiral Clock visualization using p5.js.
 * 
 * Assumes p5.js is running in global mode (or functions are available globally).
 */

class DaySpiralRenderer extends ClockRenderer {
    constructor(containerId) {
        super(containerId);

        // Visual Parameters
        this.centerX = 0;
        this.centerY = 0;
        this.diameter = 0;
        this.innerRadius = 0;
        this.spiralStrokeWeight = 2;
        this.secondaryStrokeWeight = 1;
        this.fontSize = 12;
        this.fontScale = 1;

        this.bkColor = 57; // Reverted to original lighter background as requested
        this.hourDigitColor = [255, 255, 255]; // Change to white - was dark gray [25, 25, 25];

        // Style: 'Dial' (default) or 'SpiralHours' (Legacy V3)
        this.style = 'Dial';

        // Time Format: '12' (AM/PM) or '24' (0-23)
        this.timeFormat = '12';

        // Spiral Data
        this.xSpiral = [];
        this.ySpiral = [];
        this.radiusSpiral = [];
        this.numPointsPerTurn = 300;
        this.numTurns = 2;

        // Inner Spiral Data (for dual-location mode)
        this.xSpiralInner = [];
        this.ySpiralInner = [];
        this.radiusSpiralInner = [];
        this.isDualLocationMode = false;
        this.hoursVisible = false;

        // Stroke weights for animation transitions
        this.singleModeStrokeWeight = 2;
        this.dualModeStrokeWeight = 1;
        this.innerStrokeWeight = 1;

        // Dual Mode Transition Animation State
        this.dualModeAnimationEnabled = true; // Enable/disable animation feature (future: settings + URL hash)
        this.isAnimatingDualMode = false; // Currently animating flag
        this.animationStartTime = 0; // Timestamp when animation started (millis)
        this.animationStage = 0; // Current stage (0 = not animating, 1-5 = stages)
        this.animationElapsed = 0; // Elapsed time since animation start (ms)

        // Animation Stage Durations (milliseconds)
        this.STAGE_1_DURATION = 1000; // Horizontal shake (3 cycles)
        this.STAGE_2_DURATION = 700;  // City migration
        this.STAGE_3_DURATION = 500;  // Pause before drawing
        this.STAGE_4_DURATION = 1400; // Inner spiral drawing (50% slower)
        this.STAGE_5_DURATION = 400;  // Inner spiral styling
        this.STAGE_6_DURATION = 200;  // Finalization
        this.TOTAL_ANIMATION_DURATION = 4200; // Total duration (sum of stages)

        this.initialized = false;
    }

    init() {
        super.init();
        if (!this.initialized) {
            // Initial generation will happen in resize/setStyle
            this.initialized = true;
        }
    }

    setStyle(styleName) {
        if (this.style !== styleName) {
            this.style = styleName;
            // Trigger resize to recalc dimensions and regenerate spiral
            this.resize(width, height);
        }
    }

    setTimeFormat(format) {
        this.timeFormat = format;
    }

    toggleHours() {
        this.hoursVisible = !this.hoursVisible;
    }

    setHoursVisible(visible) {
        this.hoursVisible = visible;
    }

    /**
     * Start the dual mode transition animation
     * Called when entering dual mode from single mode
     */
    startDualModeAnimation() {
        // Check if animation is enabled
        if (!this.dualModeAnimationEnabled) {
            console.log('Dual mode animation disabled, skipping transition');
            return;
        }

        console.log('🎬 Starting dual mode transition animation');
        this.isAnimatingDualMode = true;
        this.animationStartTime = millis();
        this.animationStage = 1;
        this.animationElapsed = 0;
    }

    /**
     * Update animation state based on elapsed time
     * Called from update() when isAnimatingDualMode is true
     */
    updateAnimationState() {
        this.animationElapsed = millis() - this.animationStartTime;

        // Determine current stage based on elapsed time (6 stages)
        if (this.animationElapsed < this.STAGE_1_DURATION) {
            this.animationStage = 1;
        } else if (this.animationElapsed < this.STAGE_1_DURATION + this.STAGE_2_DURATION) {
            this.animationStage = 2;
        } else if (this.animationElapsed < this.STAGE_1_DURATION + this.STAGE_2_DURATION + this.STAGE_3_DURATION) {
            this.animationStage = 3;
        } else if (this.animationElapsed < this.STAGE_1_DURATION + this.STAGE_2_DURATION + this.STAGE_3_DURATION + this.STAGE_4_DURATION) {
            this.animationStage = 4;
        } else if (this.animationElapsed < this.STAGE_1_DURATION + this.STAGE_2_DURATION + this.STAGE_3_DURATION + this.STAGE_4_DURATION + this.STAGE_5_DURATION) {
            this.animationStage = 5;
        } else if (this.animationElapsed < this.TOTAL_ANIMATION_DURATION) {
            this.animationStage = 6;
        } else {
            // Animation complete
            console.log('✅ Dual mode animation complete');
            this.isAnimatingDualMode = false;
            this.animationStage = 0;
            this.animationElapsed = 0;
        }

        // Log stage transitions
        if (this.animationStage > 0) {
            const progress = this.getAnimationProgress();
            console.log(`Stage ${this.animationStage} - Elapsed: ${this.animationElapsed}ms - Progress: ${(progress * 100).toFixed(1)}%`);
        }
    }

    /**
     * Get animation progress within current stage (0.0 to 1.0)
     * Uses ease-in-out for smooth transitions
     */
    getAnimationProgress() {
        if (this.animationStage === 0) return 0;

        // Calculate stage start time
        let stageStart = 0;
        let stageDuration = 0;

        switch (this.animationStage) {
            case 1:
                stageStart = 0;
                stageDuration = this.STAGE_1_DURATION;
                break;
            case 2:
                stageStart = this.STAGE_1_DURATION;
                stageDuration = this.STAGE_2_DURATION;
                break;
            case 3:
                stageStart = this.STAGE_1_DURATION + this.STAGE_2_DURATION;
                stageDuration = this.STAGE_3_DURATION;
                break;
            case 4:
                stageStart = this.STAGE_1_DURATION + this.STAGE_2_DURATION + this.STAGE_3_DURATION;
                stageDuration = this.STAGE_4_DURATION;
                break;
            case 5:
                stageStart = this.STAGE_1_DURATION + this.STAGE_2_DURATION + this.STAGE_3_DURATION + this.STAGE_4_DURATION;
                stageDuration = this.STAGE_5_DURATION;
                break;
        }

        // Calculate linear progress within stage
        const stageElapsed = this.animationElapsed - stageStart;
        let progress = stageElapsed / stageDuration;
        progress = Math.max(0, Math.min(1, progress)); // Clamp to [0, 1]

        // Apply ease-in-out easing
        // Formula: t < 0.5 ? 2*t^2 : 1 - 2*(1-t)^2
        if (progress < 0.5) {
            return 2 * progress * progress;
        } else {
            return 1 - 2 * (1 - progress) * (1 - progress);
        }
    }

    resize(w, h) {
        this.centerX = w / 2;
        this.centerY = h / 2;

        let minDim = Math.min(w, h);
        let radius = minDim / 2;

        this.clockDiameter = radius * 1.912;
        this.diameter = this.clockDiameter;
        this.faceDiameter = radius * 1.66;
        this.numbersRadius = radius * 0.893;

        // Spiral settings default (Dial)
        // Spiral settings default (Dial)
        let startRadius = radius * 0.40;
        let endRadius = radius * 0.74;

        // Check if we're in dual-location mode to set visual weights
        const isDualMode = (typeof locManager !== 'undefined' && locManager.hasOtherLocation());
        this.isDualLocationMode = isDualMode;

        if (this.style === 'SpiralHours') {
            // Shift center to balance gaps (Horizontal -0.06, Vertical +0.08)
            this.centerX -= radius * 0.06;
            this.centerY += radius * 0.08;

            // Legacy V3 settings for 'Hours in Spiral'
            startRadius = radius * 0.39;
            endRadius = radius * 0.935; // Increased overall size further

            this.singleModeStrokeWeight = radius * 0.18;
            this.dualModeStrokeWeight = radius * 0.14;
            this.innerStrokeWeight = this.dualModeStrokeWeight * 0.3;
        } else {
            // Dial
            let nTurns = 2;
            let deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;

            this.singleModeStrokeWeight = deltaRadiusPerTurn * 0.66;
            this.dualModeStrokeWeight = deltaRadiusPerTurn * 0.462;
            this.innerStrokeWeight = deltaRadiusPerTurn * 0.308;
        }

        // Default to whichever is appropriate for current mode
        this.spiralStrokeWeight = this.isDualLocationMode ? this.dualModeStrokeWeight : this.singleModeStrokeWeight;

        this.secondaryStrokeWeight = this.spiralStrokeWeight * 0.33;

        let fontScale = (minDim) / 950;
        this.fontSize = 40 * fontScale;

        // Generate spiral
        this.generateSpiralPoints(startRadius, endRadius);
    }

    update(timeKeeper, locManager, showMode = 'dual') {
        if (!this.active) return;

        // Update animation state if animating
        if (this.isAnimatingDualMode) {
            this.updateAnimationState();
        }

        // --- PRE-PROCESSING FOR SHOW MODE ---
        let activeTk = timeKeeper;
        const isOtherOnly = (showMode === 'other');
        const isLocalOnly = (showMode === 'local');
        const isDual = (showMode === 'dual');

        // Create a proxy TimeKeeper for "Other Only" mode to swap sun times
        if (isOtherOnly && locManager.hasOtherLocation()) {
            // Note: tk already contains the otherCity's time since sketch.js passes targetTz to timeKeeper.update
            activeTk = {
                ...timeKeeper,
                // Time is already shifted, so no need to offset hours/minutes
                // Swap solar times to be the "primary" for this frame
                sunriseTime: timeKeeper.otherSunriseTime,
                sunsetTime: timeKeeper.otherSunsetTime,
                // Swap lunar times to be the "primary" for this frame
                moonRiseTime: timeKeeper.otherMoonRiseTime,
                moonSetTime: timeKeeper.otherMoonSetTime,
                moonIllum: timeKeeper.otherMoonIllum,
                // Keep references to others for dual calculation if needed
                otherSunriseTime: timeKeeper.otherSunriseTime,
                otherSunsetTime: timeKeeper.otherSunsetTime,
                otherMoonRiseTime: timeKeeper.otherMoonRiseTime,
                otherMoonSetTime: timeKeeper.otherMoonSetTime,
                otherMoonIllum: timeKeeper.otherMoonIllum
            };
        }

        // p5.js drawing calls
        clear(); // Transparent background to let CSS show through

        // Draw Face Components - Only for Dial
        if (this.style === 'Dial') {
            noStroke();

            // 1. Draw Inner Face Background (Dark Gray) FIRST 
            fill(100);
            ellipse(this.centerX, this.centerY, this.faceDiameter, this.faceDiameter);

            // 2. Draw Ticks on the face (with shadow)
            this._applyShadow(20, 6, 6, 'rgba(0,0,0,0.5)');
            fill(255);
            noStroke();
            for (let b = 0; b < 360; b += 30) {
                let angle = radians(b);
                let dotRadius = (this.faceDiameter / 2);
                let x = this.centerX + cos(angle) * dotRadius;
                let y = this.centerY + sin(angle) * dotRadius;
                let dotSize = this.fontSize * 0.25;
                ellipse(x, y, dotSize, dotSize);
            }
            this._resetShadow();
        }

        // Show large hour labels (Dial style)
        if (this.style === 'Dial') {
            this.drawHourLabels();
        }

        // Draw hands - hide during dual mode transition
        const shouldHideHands = this.isAnimatingDualMode && this.animationStage >= 2 && this.animationStage <= 5;

        // Draw moon BEFORE clock hands
        if (typeof ShowMoon !== 'undefined' && ShowMoon) {
            this._drawMoonPhase(activeTk, showMode);
        }

        // INTERWEAVING LAYER 1: Leading edge of capsule (BENEATH spiral)
        if (!shouldHideHands) {
            this.drawHands(activeTk, showMode, 'leading');
        }

        this.drawSpiral(activeTk, locManager, showMode);

        // INTERWEAVING LAYER 2: Trailing edge of capsule, stem, and other hands (ABOVE spiral)
        if (!shouldHideHands) {
            this.drawHands(activeTk, showMode, 'trailing');
        }

        this.drawAmPmIndicators(showMode);
        this.drawRiseSetTimes(activeTk, showMode);

        // Draw spiral hours in Dial mode
        if (this.style === 'Dial') {
            if (isDual || isLocalOnly) {
                this.drawOuterSpiralHours(locManager, showMode);
            }

            const showInnerHours = isOtherOnly || (isDual && (!this.isAnimatingDualMode || this.animationStage >= 5));
            if (this.isDualLocationMode && showInnerHours) {
                this.drawInnerSpiralHours(locManager, showMode);
            }
        }

        if (this.style === 'SpiralHours') {
            let spiralSw = this.singleModeStrokeWeight;
            if (isDual && this.isDualLocationMode) {
                if (this.isAnimatingDualMode && this.animationStage === 2) {
                    spiralSw = lerp(this.singleModeStrokeWeight, this.dualModeStrokeWeight, this.getAnimationProgress());
                } else if (!this.isAnimatingDualMode || this.animationStage >= 4) {
                    spiralSw = this.dualModeStrokeWeight;
                }
            }
            this.drawSpiralTicks(spiralSw);

            if (isDual || isLocalOnly || isOtherOnly) {
                this.drawSpiralHours(this.xSpiral, this.ySpiral, this.radiusSpiral, false, locManager, showMode);
            }

            const showInnerHoursSpiral = (isDual && (!this.isAnimatingDualMode || this.animationStage >= 5));
            if (this.isDualLocationMode && showInnerHoursSpiral) {
                this.drawSpiralHours(this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, locManager, showMode);
            }
        }

        // Draw awakeness line only in DUAL mode
        if (isDual && this.isDualLocationMode && (!this.isAnimatingDualMode || this.animationStage >= 5)) {
            this.drawAwakenessArc(locManager);
        }

        // Draw rise/set times for Ribbon style
        if (this.style === 'SpiralHours') {
            this.drawRibbonRiseSetTimes(activeTk, locManager, showMode);
        }

        if (this.isDualLocationMode) {
            this.drawSpiralLabels(locManager, showMode);
        }

        this.drawDayLabels(activeTk, locManager);

        if (typeof IsGmtShown !== 'undefined' && IsGmtShown) {
            this.drawGMT(locManager);
        }
    }

    /**
     * Draw a bright green arc between inner and outer spirals
     * to indicate when both locations are "awake" (9am - 8pm)
     */
    drawAwakenessArc(locManager) {
        if (!this.isDualLocationMode || !locManager.hasOtherLocation()) return;

        const tzDiff = locManager.getTimezoneOffsetDifference();
        const awakeStart = 9;
        const awakeEnd = 20;

        push();
        stroke(0, 255, 0); // Semantic Green (OK to interact)
        strokeWeight(this.secondaryStrokeWeight * 0.225); // Weight kept from previous refinement
        noFill();
        strokeCap(ROUND);

        const totalDailyPts = this.numPointsPerTurn * 2;
        let inArc = false;

        for (let i = 0; i < totalDailyPts; i++) {
            const hour = (i / totalDailyPts) * 24;
            const otherHour = (hour + tzDiff + 24) % 24;

            // Define "awake" as between 9am and 8pm (20:00) inclusive
            const isLocalAwake = (hour >= awakeStart && hour <= awakeEnd);
            const isOtherAwake = (otherHour >= awakeStart && otherHour <= awakeEnd);

            if (isLocalAwake && isOtherAwake) {
                if (!inArc) {
                    beginShape();
                    inArc = true;
                }
                const rOuter = this.radiusSpiral[i];
                const rInner = this.radiusSpiralInner[i];
                // Center the arc in the gap by accounting for the difference in track widths
                const midR = (rOuter + rInner) / 2 + ((this.innerStrokeWeight - this.outerStrokeWeight) / 4);
                const theta = (TWO_PI * (i / this.numPointsPerTurn)) - HALF_PI;
                vertex(this.centerX + midR * cos(theta), this.centerY + midR * sin(theta));
            } else {
                if (inArc) {
                    endShape();
                    inArc = false;
                }
            }
        }
        if (inArc) endShape();
        pop();
    }

    drawHourLabels() {
        noStroke();
        fill(this.hourDigitColor); // color of hour digits
        textSize(this.fontSize);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        let radius = this.numbersRadius;

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.6)'); // Shadow for Dial hour numbers

        // 12 is at -90 deg (top)
        this._drawLabel("12", -90, radius);
        this._drawLabel("1", -60, radius);
        this._drawLabel("2", -30, radius);
        this._drawLabel("3", 0, radius);
        this._drawLabel("4", 30, radius);
        this._drawLabel("5", 60, radius);
        this._drawLabel("6", 90, radius);
        this._drawLabel("7", 120, radius);
        this._drawLabel("8", 150, radius);
        this._drawLabel("9", 180, radius);
        this._drawLabel("10", 210, radius);
        this._drawLabel("11", 240, radius);

        this._resetShadow();
        textStyle(NORMAL);
    }

    _drawLabel(str, angleDeg, r) {
        let angle = radians(angleDeg);
        let x = this.centerX + cos(angle) * r;
        let y = this.centerY + sin(angle) * r;
        text(str, x, y);
    }

    drawSpiral(tk, loc, showMode = 'dual') {
        let dayColor = color(80, 155, 210);

        // 1. Make moonDownColor 10% darker than (15, 65, 85) -> (13.5, 58.5, 76.5) -> round to (14, 59, 77)
        let moonDownColor = color(14, 59, 77); // Darker blue for moonless night

        // 2. Define extremes for moon-up (nightColor)
        // Minimum lightness for new moon (visibly distinct from moonDownColor)
        let minMoonUpColor = color(19, 72, 92);
        // Maximum lightness for full moon (much darker than dayColor [80,155,210])
        let maxMoonUpColor = color(28, 100, 120);

        // Get moon fraction
        let f = 0.5;
        if (showMode === 'other' && tk.otherMoonIllum) {
            f = tk.otherMoonIllum.fraction;
        } else if (tk.moonIllum) {
            f = tk.moonIllum.fraction;
        }

        // Dynamically interpolate the night color (moon-up)
        let nightColor = lerpColor(minMoonUpColor, maxMoonUpColor, f);

        let baseColor = color(90);

        const isOtherOnly = (showMode === 'other');
        const isLocalOnly = (showMode === 'local');
        const isDual = (showMode === 'dual');

        // Choose Stroke Weight
        let sw = this.singleModeStrokeWeight;
        if (isDual && this.isDualLocationMode) {
            if (this.isAnimatingDualMode && this.animationStage === 2) {
                sw = lerp(this.singleModeStrokeWeight, this.dualModeStrokeWeight, this.getAnimationProgress());
            } else if (!this.isAnimatingDualMode || this.animationStage >= 4) {
                sw = this.dualModeStrokeWeight;
            }
        }

        strokeWeight(sw);
        strokeCap(SQUARE);
        noFill();

        // 1. Draw Main (Outer) Spiral
        const shouldDrawMain = isLocalOnly || isOtherOnly || isDual;
        if (shouldDrawMain) {
            // In "Other Only" mode, we treat it as a true local clock for the other city.
            // This means 0 rotation offset because the "0" of the spiral is now that city's midnight.
            // Note: tk already contains the otherCity's sunTimes if isOtherOnly (via proxy update)
            this._drawSpiralTrack(this.xSpiral, this.ySpiral, tk.sunriseTime, tk.sunsetTime,
                dayColor, nightColor, baseColor, true, 0, sw, 1.0, null,
                tk.moonRiseTime, tk.moonSetTime, moonDownColor);
        }

        // 2. Draw Inner Spiral (Dual Mode ONLY)
        if (isDual && this.isDualLocationMode && (!this.isAnimatingDualMode || this.animationStage >= 4)) {
            const tzDiffHours = locManager.getTimezoneOffsetDifference();

            if (this.isAnimatingDualMode && this.animationStage === 4) {
                const progress = this.getAnimationProgress();
                const cyanHighlight = color(200, 255, 255);
                this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                    cyanHighlight, cyanHighlight, baseColor, true, tzDiffHours, this.innerStrokeWeight, progress, cyanHighlight,
                    tk.otherMoonRiseTime, tk.otherMoonSetTime, cyanHighlight);
            } else if (this.isAnimatingDualMode && this.animationStage === 5) {
                const progress = this.getAnimationProgress();
                const cyanHighlight = color(200, 255, 255);
                const curDay = lerpColor(cyanHighlight, dayColor, progress);
                const curNight = lerpColor(cyanHighlight, nightColor, progress);
                const curMoonDown = lerpColor(cyanHighlight, moonDownColor, progress);
                const curBase = lerpColor(cyanHighlight, baseColor, progress);
                this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                    curDay, curNight, curBase, true, tzDiffHours, this.innerStrokeWeight, 1.0, null,
                    tk.otherMoonRiseTime, tk.otherMoonSetTime, curMoonDown);
            } else {
                this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                    dayColor, nightColor, baseColor, true, tzDiffHours, this.innerStrokeWeight, 1.0, null,
                    tk.otherMoonRiseTime, tk.otherMoonSetTime, moonDownColor);
            }
        }
        this._resetShadow();
    }

    /**
         * Helper method to draw a single spiral track with day/night colors
         * @param {Array} xArray - X coordinates of spiral
         * @param {Array} yArray - Y coordinates of spiral
         * @param {Object} sunriseTime - Sunrise time object {hour, minute, totalSeconds}
         * @param {Object} sunsetTime - Sunset time object {hour, minute, totalSeconds}
         * @param {Object} dayColor - p5.Color for daytime
         * @param {Object} nightColor - p5.Color for nighttime
         * @param {Object} baseColor - p5.Color for base track
         * @param {boolean} hasValidLocation - Whether location data is valid
         * @param {number} tzOffsetHours - Timezone offset in hours (for rotation adjustment)
         */
    _drawSpiralTrack(xArray, yArray, sunriseTime, sunsetTime, dayColor, nightColor, baseColor, hasValidLocation, tzOffsetHours, weight = null, limitProgress = 1.0, tintColor = null, moonRiseTime = null, moonSetTime = null, moonDownColor = null) {
        if (weight !== null) strokeWeight(weight);
        else strokeWeight(this.spiralStrokeWeight);

        strokeCap(SQUARE);
        noFill();

        let currentLen = Math.floor(xArray.length * limitProgress);
        let len = xArray.length;
        let totalDailyPts = this.numPointsPerTurn * 2;

        const getIdx = (timeObj) => {
            if (!timeObj || typeof timeObj.totalSeconds !== 'number') return null;
            let secs = timeObj.totalSeconds;
            if (tzOffsetHours !== 0) {
                secs -= tzOffsetHours * 3600;
                if (secs < 0) secs += 86400;
                if (secs >= 86400) secs -= 86400;
            }
            let idx = Math.floor((secs / 86400) * totalDailyPts);
            return Math.max(0, Math.min(idx, len - 1));
        };

        const idxRise = getIdx(sunriseTime) ?? Math.floor((6 * 3600 / 86400) * totalDailyPts);
        const idxSet = getIdx(sunsetTime) ?? Math.floor((18 * 3600 / 86400) * totalDailyPts);

        const isNight = (i) => {
            if (idxRise < idxSet) return (i <= idxRise || i >= idxSet);
            if (idxRise > idxSet) return (i >= idxSet && i <= idxRise);
            return true; // default
        };

        const idxMRise = getIdx(moonRiseTime);
        const idxMSet = getIdx(moonSetTime);

        const isMoonDown = (i) => {
            if (typeof ShowMoon !== 'undefined' && !ShowMoon) return false;
            if (idxMRise === null && idxMSet === null) return false;
            if (idxMRise !== null && idxMSet !== null) {
                if (idxMRise < idxMSet) {
                    return (i <= idxMRise || i >= idxMSet);
                } else if (idxMRise > idxMSet) {
                    return (i >= idxMSet && i <= idxMRise);
                }
                return false;
            } else if (idxMRise !== null) {
                return i <= idxMRise;
            } else if (idxMSet !== null) {
                return i >= idxMSet;
            }
            return false;
        };

        const getColorForIndex = (i) => {
            if (tintColor !== null) return tintColor;
            if (typeof IsLoadingLocation !== 'undefined' && IsLoadingLocation) return baseColor;

            if (!hasValidLocation) return nightColor;

            if (!isNight(i)) return dayColor;
            if (moonDownColor && isMoonDown(i)) return moonDownColor;
            return nightColor;
        };

        this._applyShadow(12, 0, 4, 'rgba(0,0,0,0.3)');

        if (currentLen > 0) {
            let startIdx = 0;
            let currentColor = getColorForIndex(0);

            for (let i = 1; i <= currentLen; i++) {
                let nextColor = (i < currentLen) ? getColorForIndex(i) : null;
                if (nextColor !== currentColor || i === currentLen) {
                    stroke(currentColor);
                    beginShape();
                    // Draw up to `i` so contiguous segments share the boundary vertex exactly,
                    // preventing anti-aliasing gaps between segments.
                    let endNode = (i < currentLen) ? i : i - 1;
                    for (let j = startIdx; j <= endNode; j++) {
                        vertex(this.centerX + xArray[j], this.centerY + yArray[j]);
                    }
                    endShape();

                    if (nextColor !== null) {
                        currentColor = nextColor;
                        startIdx = i;
                    }
                }
            }
        }
    }

    // Draw tick marks along the spiral for 'SpiralHours' style
    // Based on legacy implementation: circles for hours, line segments for minutes
    drawSpiralTicks(activeStrokeWeight = this.spiralStrokeWeight) {
        if (!this.xSpiral || this.xSpiral.length === 0) return;
        push();
        let localScale = this.fontSize / 40.0;
        let ww = activeStrokeWeight;

        // Draw minute ticks (line segments) - 60 per turn
        // With 300 points per turn, that's every 5 points (300/60=5)
        // Skip positions where hour ticks are (every 25 points)
        stroke(230); // Light gray
        strokeWeight(2 * localScale);
        strokeCap(SQUARE);

        let startIndex = 0;
        let endIndex = this.numPointsPerTurn * 2; // Full 24 hours

        for (let vv = startIndex; vv <= endIndex; vv += 5) {
            // Skip if this is an hour tick position (every 25 points)
            if (vv % 25 === 0) continue;

            if (vv >= this.radiusSpiral.length) continue;

            let ri = this.radiusSpiral[vv];
            let theta = (TWO_PI * (vv / this.numPointsPerTurn)) - HALF_PI;

            // Inner point
            let axi1 = (ri + (ww / 2.1)) * cos(theta);
            let ayi1 = (ri + (ww / 2.1)) * sin(theta);

            // Outer point
            let axi2 = (ri + (ww / 2.5)) * cos(theta);
            let ayi2 = (ri + (ww / 2.5)) * sin(theta);

            line(this.centerX + axi1, this.centerY + ayi1,
                this.centerX + axi2, this.centerY + ayi2);
        }

        // Draw hour ticks (circles/points) - 12 per turn
        // With 300 points per turn, that's every 25 points (300/12=25)
        stroke(230); // Light gray
        strokeWeight(8 * localScale);

        for (let vv = startIndex; vv <= endIndex; vv += 25) {
            if (vv >= this.radiusSpiral.length) continue;

            let ri = this.radiusSpiral[vv];
            let theta = (TWO_PI * (vv / this.numPointsPerTurn)) - HALF_PI;
            let axi = (ri + (ww / 2.24)) * cos(theta);
            let ayi = (ri + (ww / 2.24)) * sin(theta);

            point(this.centerX + axi, this.centerY + ayi);
        }

        pop();
    }

    // Draw 0-23 hour labels on the spiral for 'SpiralHours' style
    drawSpiralHours(xArray, yArray, rArray, isInner, locManager, showMode = 'dual') {
        if (!xArray || xArray.length === 0) return;

        // For SpiralHours style, we almost ALWAYS want hours because it's the primary dial.
        // We removed the hoursVisible toggle check here so the numbers always show in Ribbon mode.

        // Color differentiation: cyan for inner spiral OR when showing only "other" location
        if (isInner || showMode === 'other') {
            fill(200, 255, 255); // Light Cyan
        } else {
            fill(255, 235, 120); // Yellow for outer spiral
        }
        noStroke();

        // Adjusted scales: Outer reduced by another 10% (1.134 -> 1.02), Inner increased by 10% (0.385 -> 0.42)
        let originalTextSize = this.fontSize;
        let scale = isInner ? 0.58 : 1.02; // Inner font scale increased for visibility (0.42 -> 0.58)
        textSize(this.fontSize * scale);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        let tzDiffHours = (isInner && locManager) ? locManager.getTimezoneOffsetDifference() : 0;

        this._applyShadow(8, 0, 4, 'rgba(0,0,0,0.7)'); // Pronounced shadow for spiral numbers

        if (this.timeFormat === '24') {
            // 24-hour mode: Display 0-23
            for (let h = 0; h <= 23; h++) {
                let hourVal = (h + (isInner ? tzDiffHours : 0) + 24) % 24;
                let displayStr = str(Math.floor(hourVal));

                // Calculate index in the spiral array
                let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));

                // Clamp
                if (idx >= rArray.length) idx = rArray.length - 1;

                let r = rArray[idx];

                // Calculate angle
                let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;

                // Removed rightward shift logic to center on leading edge
                let shift = 0;
                let currentTextAlign = CENTER;

                // Removed 1.008 tweak for true centering on spiral track
                let ri2 = r;

                // Calculate x,y with tweak
                let x = this.centerX + cos(theta) * ri2;
                let y = this.centerY + sin(theta) * ri2;

                textAlign(currentTextAlign, CENTER);
                text(displayStr, x + shift, y);
            }
        } else {
            // 12-hour mode: Display with AM/PM stacked

            for (let h = 0; h <= 23; h++) {
                let hourVal = (h + (isInner ? tzDiffHours : 0) + 24) % 24;
                let hour12 = Math.floor(hourVal) % 12;
                if (hour12 === 0) hour12 = 12; // 0 -> 12, 12 -> 12

                let ampm = (hourVal < 12) ? 'A' : 'P';

                // Calculate index in the spiral array
                let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));

                // Clamp
                if (idx >= rArray.length) idx = rArray.length - 1;

                let r = rArray[idx];

                // Calculate angle
                let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;

                // Removed rightward shift logic for AM/PM layout
                let shift = 0;
                let currentTextAlign = CENTER;

                // Removed 1.008 tweak for true centering
                let ri2 = r;

                // Calculate x,y with tweak
                let x = this.centerX + cos(theta) * ri2;
                let y = this.centerY + sin(theta) * ri2;

                // Halved margin for tighter AM/PM grouping; suffix increased for inner spiral readability
                let hourStr = str(hour12);
                let ampmSize = (this.fontSize * scale) * (isInner ? 0.55 : 0.45);
                let margin = (this.fontSize * scale) * 0.05; // reduced from 0.1

                textSize(this.fontSize * scale);
                let hourWidth = textWidth(hourStr);
                textSize(ampmSize);
                let ampmWidth = textWidth(ampm);
                let totalW = hourWidth + margin + ampmWidth;

                // Determine start position for unified LEFT alignment drawing
                let startX = x - totalW / 2 + shift;
                if (currentTextAlign === LEFT) {
                    startX = x + shift;
                }

                // Draw hour number
                textAlign(LEFT, CENTER);
                textSize(this.fontSize * scale);
                text(hourStr, startX, y);

                // Draw single 'A'/'P' indicator
                push();
                textSize(ampmSize);
                textStyle(BOLD);
                text(ampm, startX + hourWidth + margin, y);
                pop();
            }
        }

        // Restore
        this._resetShadow();
        textStyle(NORMAL);
        textSize(originalTextSize);
    }

    /**
     * Draw hour labels on the inner spiral for dual-location mode
     * Shows the "other" location's local time
     */
    drawInnerSpiralHours(locManager, showMode = 'dual') {
        // In 'other' only mode, the 'inner' spiral data (other location) 
        // is actually drawn on the OUTER track for prominence.
        const useOuterTrack = (showMode === 'other');
        const xArr = useOuterTrack ? this.xSpiral : this.xSpiralInner;
        const yArr = useOuterTrack ? this.ySpiral : this.ySpiralInner;
        const rArr = useOuterTrack ? this.radiusSpiral : this.radiusSpiralInner;

        if (!xArr || xArr.length === 0) return;

        // Visibility Rule: 
        // 1. Always show in DUAL spiral view (to identify inner track)
        // 2. In other views (like "Other Only"), respect the toggle.
        const isDualView = (showMode === 'dual');
        if (!isDualView && !this.hoursVisible) return;

        fill(200, 255, 255); // Light Cyan for inner spiral label
        const isSingleRendering = (showMode !== 'dual');
        textSize(this.fontSize * (isSingleRendering ? 0.63 : 0.45));
        noStroke();

        // Smaller text size for inner spiral (reduced by 20% from 0.7)
        let originalTextSize = this.fontSize;
        // textSize(this.fontSize * 0.56); // Removed, now calculated per part
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.7)'); // Shadow for inner spiral numbers

        // Calculate timezone difference
        // If in "Other Only" mode, treat as local (tzDiff = 0)
        const tzDiffHours = (showMode === 'other') ? 0 : locManager.getTimezoneOffsetDifference();

        // For 24-hour mode or 12-hour mode
        for (let h = 0; h <= 24; h++) {
            // Calculate what hour this position represents
            let hourLabelValue = (h + tzDiffHours + 24) % 24;

            // Calculate position on inner spiral
            let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));
            if (idx >= this.radiusSpiralInner.length) idx = this.radiusSpiralInner.length - 1;

            let r = rArr[idx];
            let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;
            let ri2 = r;

            let x = this.centerX + cos(theta) * ri2;
            let y = this.centerY + sin(theta) * ri2;

            // Removed rightward shift logic
            let shift = 0;
            let currentTextAlign = CENTER;

            if (this.timeFormat === '24') {
                // 24-hour mode: simple 0-23
                let displayStr = str(Math.floor(hourLabelValue));
                let digitSize = this.fontSize * 0.50;

                textSize(digitSize);
                textAlign(currentTextAlign === LEFT ? LEFT : CENTER, CENTER);
                text(displayStr, x + shift, y);
            } else {
                // 12-hour mode: display with AM/PM
                let hour12 = hourLabelValue % 12;
                if (hour12 === 0) hour12 = 12;
                let ampm = (hourLabelValue < 12) ? 'A' : 'P';

                let hourStr = str(hour12);
                let digitSize = this.fontSize * (isSingleRendering ? 0.63 : 0.50);
                let ampmSize = this.fontSize * (isSingleRendering ? 0.46 : 0.40);
                let margin = this.fontSize * 0.04;

                textSize(digitSize);
                let hourWidth = textWidth(hourStr);
                textSize(ampmSize);
                let ampmWidth = textWidth(ampm);
                let totalW = hourWidth + margin + ampmWidth;

                // Start position for the combined label to be centered at (x,y)
                let startX = x - totalW / 2 + shift;
                if (currentTextAlign === LEFT) {
                    startX = x + shift;
                }

                // Draw hour number
                textAlign(LEFT, CENTER);
                textSize(digitSize);
                text(hourStr, startX, y);

                // Draw AM/PM indicator
                textSize(ampmSize);
                text(ampm, startX + hourWidth + margin, y);
            }
        }

        // Restore
        this._resetShadow();
        textStyle(NORMAL);
        textSize(originalTextSize);
    }

    /**
     * Draw hour labels on the outer spiral for Dial mode
     * Shows the local/user location's time (works in both single and dual modes)
     */
    drawOuterSpiralHours(locManager, showMode = 'dual') {
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        // Visibility Rule:
        // 1. Always show in DUAL spiral view
        // 2. In other views (Single, Local Only, Other Only), respect the toggle.
        const isDualView = (showMode === 'dual' && this.isDualLocationMode);
        if (!isDualView && !this.hoursVisible) return;

        fill(255, 235, 120); // Yellow for outer spiral
        noStroke();

        let originalTextSize = this.fontSize;
        const isSingleRendering = (showMode !== 'dual');
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.7)'); // Shadow for outer spiral numbers

        // For 24-hour mode or 12-hour mode
        for (let h = 0; h <= 24; h++) {
            // Outer spiral shows local time (no timezone offset)
            let localHour = h % 24;

            // Calculate position on outer spiral
            let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));
            if (idx >= this.radiusSpiral.length) idx = this.radiusSpiral.length - 1;

            let r = this.radiusSpiral[idx];
            let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;
            let ri2 = r;

            let x = this.centerX + cos(theta) * ri2;
            let y = this.centerY + sin(theta) * ri2;

            // Removed rightward shift logic
            let shift = 0;
            let currentTextAlign = CENTER;

            if (this.timeFormat === '24') {
                // 24-hour mode: simple 0-23
                let displayStr = str(Math.floor(localHour));
                let digitSize = this.fontSize * 0.63;

                textSize(digitSize);
                textAlign(currentTextAlign === LEFT ? LEFT : CENTER, CENTER);
                text(displayStr, x + shift, y);
            } else {
                // 12-hour mode: display with AM/PM
                let hour12 = localHour % 12;
                if (hour12 === 0) hour12 = 12;
                let ampm = (localHour < 12) ? 'A' : 'P';

                let hourStr = str(hour12);
                let digitSize = this.fontSize * 0.63;
                let ampmSize = this.fontSize * 0.46;
                let margin = this.fontSize * 0.04;

                textSize(digitSize);
                let hourWidth = textWidth(hourStr);
                textSize(ampmSize);
                let ampmWidth = textWidth(ampm);
                let totalW = hourWidth + margin + ampmWidth;

                // Start position for the combined label to be centered at (x,y)
                let startX = x - totalW / 2 + shift;
                if (currentTextAlign === LEFT) {
                    startX = x + shift;
                }

                // Draw hour number
                textAlign(LEFT, CENTER);
                textSize(digitSize);
                text(hourStr, startX, y);

                // Draw AM/PM indicator
                textSize(ampmSize);
                text(ampm, startX + hourWidth + margin, y);
            }
        }

        // Restore
        this._resetShadow();
        textStyle(NORMAL);
        textSize(originalTextSize);
    }

    /**
     * Draw labels to identify the spirals in dual mode
     * "Local" for outer spiral, City Name for inner spiral
     */
    drawSpiralLabels(locManager, showMode = 'dual') {
        if (!this.xSpiral || this.xSpiral.length === 0) return;
        if (!this.xSpiralInner || this.xSpiralInner.length === 0) return;

        // Animation logic for city label handled below in highlight/migration block

        let labelColor = color(255, 235, 120);
        fill(labelColor);
        noStroke();
        textStyle(BOLD);
        textAlign(RIGHT, CENTER);

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.8)');

        let margin = (this.style === 'SpiralHours') ? this.fontSize * 1.1 : this.fontSize * 0.7;

        // Determine font sizes based on style (match hour numbers)
        let outerFontSize = this.fontSize * 0.63; // Dial default
        let innerFontSize = this.fontSize * 0.50; // Dial inner default

        if (this.style === 'SpiralHours') {
            outerFontSize = this.fontSize * 1.02; // Reduced further to match new Ribbon hours
            innerFontSize = this.fontSize * 0.58; // matching Ribbon inner digitSize
        }

        // 1. Label for Outer Spiral ("Local" or city name depending on mode)
        // Only show from Stage 5 onwards (after migration and drawing)
        if (showMode === 'dual' && (!this.isAnimatingDualMode || this.animationStage >= 5)) {
            // Dual: show "Local" in yellow next to outer spiral start
            textSize(outerFontSize);
            let x1 = this.centerX + this.xSpiral[0] - margin;
            let y1 = this.centerY + this.ySpiral[0];
            text("Local", x1, y1);
        } else if (showMode === 'local') {
            // Local-only with an other location set: still label the spiral "Local" in yellow
            textSize(outerFontSize);
            let x1 = this.centerX + this.xSpiral[0] - margin;
            let y1 = this.centerY + this.ySpiral[0];
            text("Local", x1, y1);
        }

        if (showMode !== 'dual' && showMode !== 'other') return; // Nothing more for local mode

        if (showMode === 'other') {
            // Other-only: show city name in cyan next to the (outer) spiral start
            fill(200, 255, 255);
            textSize(outerFontSize);
            let cityName = locManager.otherLocation.cityName || "Other";
            if (cityName.includes(',')) cityName = cityName.split(',')[0].trim();
            let x1 = this.centerX + this.xSpiral[0] - margin;
            let y1 = this.centerY + this.ySpiral[0];
            text(cityName, x1, y1);
            this._resetShadow();
            textStyle(NORMAL);
            return;
        }

        // 2. Label for Inner Spiral (City Name)
        fill(200, 255, 255); // Light Cyan for inner spiral label
        textSize(innerFontSize);
        let cityName = locManager.otherLocation.cityName || "Other";
        if (cityName.includes(',')) cityName = cityName.split(',')[0].trim();

        let targetX = this.centerX + this.xSpiralInner[0] - margin;
        let targetY = this.centerY + this.ySpiralInner[0];

        // --- ANIMATION: Highlight, Shake, and Migration Logic ---
        if (this.isAnimatingDualMode && (this.animationStage >= 1 && this.animationStage <= 6)) {
            const progress = this.getAnimationProgress();

            // Starting position for migration (roughly where DOM text used to be)
            // FIXED: startY adjusted from 82 to 68 to match final DOM position (no jump)
            let startX = width - 40; // Align with the container's right-aligned text
            let startY = 68;

            let fullLocation = locManager.otherLocation.cityName || "Other";
            let otherTimeStr = TimeKeeper.getFormattedTimeForOffset(locManager.otherLocation.tzOffset, false);

            let cityPart = fullLocation;
            let remainderPart = "";
            let splitIdx = fullLocation.indexOf(',');

            if (splitIdx !== -1) {
                cityPart = fullLocation.substring(0, splitIdx).trim();
                remainderPart = fullLocation.substring(splitIdx + 1); // Skip comma
            }

            // Inclusion of time in the remainder part as requested
            remainderPart += " " + otherTimeStr;

            let curX = targetX;
            let curY = targetY;

            // Highlight Color: Cyan (rgb(180, 255, 255))
            let highlightColor = color(200, 255, 255);
            fill(highlightColor);

            if (this.animationStage === 1) {
                // Stage 1: Horizontal Shake & Comma Disappearance
                let shakeDist = innerFontSize * 1.5;
                let shakeOffset = sin(progress * TWO_PI * 3) * shakeDist;

                let commaWidth = textWidth(", "); // Comma is being dissolved
                let remainderWidth = textWidth(remainderPart);
                let cityStartX = startX - remainderWidth - commaWidth;

                // City part shakes around its original position
                textAlign(RIGHT, CENTER);
                text(cityPart, cityStartX + shakeOffset, startY);

                // Remainder part (including time) stays fixed at the original right edge in Cyan
                if (remainderPart) {
                    fill(highlightColor);
                    textAlign(RIGHT, CENTER);
                    text(remainderPart, startX, startY);
                }
            } else if (this.animationStage === 2) {
                // Stage 2: Migration position
                let commaWidth = textWidth(", ");
                let remainderWidth = textWidth(remainderPart);
                let cityStartX = startX - remainderWidth - commaWidth;

                curX = lerp(cityStartX, targetX, progress);
                curY = lerp(startY, targetY, progress);
                textAlign(RIGHT, CENTER);
                text(cityPart, curX, curY);

                // Remainder remains at start position in Cyan
                if (remainderPart) {
                    fill(highlightColor);
                    textAlign(RIGHT, CENTER);
                    text(remainderPart, startX, startY);
                }
            } else {
                // Stage 3, 4, 5, 6: Arrived at target or paused
                textAlign(RIGHT, CENTER);
                text(cityPart, targetX, targetY);

                // Keep drawing remainder (including time) at the top-right until animation ends
                if (remainderPart) {
                    fill(highlightColor);
                    textAlign(RIGHT, CENTER);
                    text(remainderPart, startX, startY);
                }
            }
        } else if (!this.isAnimatingDualMode) {
            // Non-animating: Final Cyan (Shortened city name only near spiral)
            fill(200, 255, 255);
            text(cityName, targetX, targetY);
        }

        this._resetShadow();
        textStyle(NORMAL);
    }


    drawDayLabels(tk, locManager) {
        // Only show day labels in Dial mode
        if (this.style !== 'Dial') return;

        // Hide DOW abbreviations in dual mode as requested
        if (this.isDualLocationMode) return;

        if (typeof IsGmtShown !== 'undefined' && IsGmtShown) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        // ... existing day label logic ...
        // (It was at the bottom of the previous file view, assuming it's correct)

        // Just redundant check removal for safely rendering:
        let dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let todayIdx = tk.dayOfWeek;
        let nextDayIdx = (todayIdx + 1) % 7;

        let labelColor = color(255, 235, 120); // Softer yellow
        fill(labelColor);
        noStroke();
        textSize(this.fontSize);
        textStyle(BOLD);
        textAlign(RIGHT, CENTER); // RIGHT align so text appears to the left of the spiral start

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.8)'); // More visible shadow for text

        // Shifted further left to avoid crowding "12A" label (was -0.55)
        let xOffset = -(this.fontSize * 0.9);
        let yOffset = this.fontSize * 0.12;   // Reduced (about 1/8 character height)

        // Start (Outer) - show today's day abbreviation
        let idxStart = 0;
        text(dayNames[todayIdx], this.centerX + this.xSpiral[idxStart] + xOffset, this.centerY + this.ySpiral[idxStart] + yOffset);

        // End label removed - was colliding with last hour label and not adding much value

        this._resetShadow();
        textStyle(NORMAL);
    }

    drawGMT(locManager) {
        if (!locManager || !locManager.hasValidLocation) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        fill(255, 235, 120); // Softer yellow
        noStroke();
        textSize(this.fontSize * 0.9);
        textStyle(BOLD);

        let totalPoints = this.numPointsPerTurn * this.numTurns;

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.6)'); // Shadow for GMT numbers and labels

        for (let h = 0; h <= 24; h++) {
            // Find spiral index for this hour (0..24)
            let idx = Math.floor((h / 24.0) * totalPoints);
            if (idx >= this.radiusSpiral.length) idx = this.radiusSpiral.length - 1;

            // Calc GMT Hour
            let gmtH = h - locManager.tzOffset;
            gmtH = gmtH % 24;
            if (gmtH < 0) gmtH += 24;

            let label = str(Math.floor(gmtH));
            let r = this.radiusSpiral[idx];
            let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;

            // Legacy tweak
            let ri2 = r * 1.008;
            let x = this.centerX + cos(theta) * ri2;
            let y = this.centerY + sin(theta) * ri2;

            // Special case for start of spiral: Right justify "GMT" to the left
            if (h === 0) {
                textAlign(CENTER, CENTER);
                text(label, x, y);

                // Draw "GMT " to the left of the centered number
                textAlign(RIGHT, CENTER);
                let spacing = textWidth(label) / 2 + 2;
                text("GMT ", x - spacing, y);
            } else {
                textAlign(CENTER, CENTER);
                text(label, x, y);
            }
        }

        this._resetShadow();
        textStyle(NORMAL);
    }

    // ... (GMT, etc)

    drawHands(tk, showMode = 'dual', layer = 'trailing') {
        if (this.style === 'SpiralHours') {
            this.drawHandsLegacySpiral(tk, showMode, layer);
        } else {
            this.drawHandsDial(tk, showMode, layer);
        }
    }

    drawHandsDial(tk, showMode = 'dual', layer = 'trailing') {
        push();
        let handColor = color(255);
        stroke(handColor);
        strokeCap(ROUND);

        let secAngle = map(Math.floor(tk.seconds), 0, 60, 0, TWO_PI) - HALF_PI;
        let minAngle = map(tk.minutes + tk.seconds / 60, 0, 60, 0, TWO_PI) - HALF_PI;
        let hourAngle = map(tk.hours + tk.minutes / 60, 0, 24, 0, TWO_PI * 2) - HALF_PI;

        let faceRadius = this.faceDiameter / 2;
        let rSec = faceRadius * 0.96;
        let rMin = rSec * 0.90;

        // Hour Hand Calculations
        let totalPoints = this.numPointsPerTurn * 2;
        let hIdx = Math.floor((tk.hours + tk.minutes / 60) / 24.0 * totalPoints);
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        let radii = this._getOvalTipRadii(hIdx, showMode);
        let handWeight = Math.max(3, this.secondaryStrokeWeight * 1.2);

        if (layer === 'leading') {
            // Draw leading side underneath spiral
            this._resetShadow();
            this._drawHourHandOvalTip(hourAngle, radii.min, radii.max, 'leading');
        } else {
            // Layer-specific rendering (trailing)
            this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)'); // Hand shadows

            // Draw Hour Hand FIRST (bottom)
            // Pass 1: Shadow
            let connR = this._drawHourHandOvalTip(hourAngle, radii.min, radii.max, 'trailing');
            this._drawHourHandGeometry(hourAngle, connR, handWeight, true);

            // Pass 2: Clean
            this._resetShadow();
            this._drawHourHandGeometry(hourAngle, connR, handWeight, true);
            this._drawHourHandOvalTip(hourAngle, radii.min, radii.max, 'trailing');
            this._drawHourHandOvalTip(hourAngle, radii.min, radii.max, 'leading-mask');

            // Draw Minute Hand ABOVE hour hand
            this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)');
            strokeWeight(Math.max(2.2, this.secondaryStrokeWeight * 0.7));
            line(this.centerX, this.centerY, this.centerX + cos(minAngle) * rMin, this.centerY + sin(minAngle) * rMin);

            // Draw Second Hand ABOVE minute hand (topmost)
            strokeWeight(Math.max(1.2, this.secondaryStrokeWeight * 0.35));
            line(this.centerX, this.centerY, this.centerX + cos(secAngle) * rSec, this.centerY + sin(secAngle) * rSec);
        }

        this._resetShadow();
        pop();
    }

    drawHandsLegacySpiral(tk, showMode = 'dual', layer = 'trailing') {
        // Legacy "Hours in Spiral" Hand Logic
        push();
        let handColor = color(255);
        stroke(handColor);

        // Time Values
        let theSec = tk.seconds; // float
        let theMin = tk.minutes + theSec / 60;
        let theHour = tk.hours + theMin / 60;

        let secRads = map(theSec, 0, 60, 0, TWO_PI) - HALF_PI;
        let minRads = map(theMin, 0, 60, 0, TWO_PI) - HALF_PI;
        let hourRads = map(theHour, 0, 24, 0, TWO_PI * 2) - HALF_PI;

        let localScale = this.fontSize / 40.0;
        let secWeight = 4 * localScale;
        let minWeight = 8 * localScale;
        let hourWeight = 19 * localScale;

        // Radii Calculations
        let idxMax = this.numPointsPerTurn * this.numTurns;
        let iiSec = Math.floor((theSec / 60) * this.numPointsPerTurn);
        if (tk.hours >= 12) iiSec += this.numPointsPerTurn;
        let secondsRadius = (iiSec < idxMax && this.radiusSpiral[iiSec]) ?
            this.radiusSpiral[iiSec] + 0.7 * (this.spiralStrokeWeight / 2) : this.clockDiameter * 0.4;

        let iiMin = Math.floor((theMin / 60) * this.numPointsPerTurn);
        if (tk.hours >= 12) iiMin += this.numPointsPerTurn;
        let minutesRadius = (iiMin < idxMax && this.radiusSpiral[iiMin]) ?
            this.radiusSpiral[iiMin] + 0.4 * (this.spiralStrokeWeight / 2) : this.clockDiameter * 0.35;

        // Hour Hand
        let totalPointsH = this.numPointsPerTurn * 2;
        let hIdx = Math.floor((theHour / 24.0) * totalPointsH);
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        let radii = this._getOvalTipRadii(hIdx, showMode);

        if (layer === 'leading') {
            this._resetShadow();
            this._drawHourHandOvalTip(hourRads, radii.min, radii.max, 'leading');
        } else {
            // Trailing layer: draw hour FIRST (bottom), then minute, then second (top)
            this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)'); // Hand shadows

            // Hour Hand FIRST (bottommost of the three)
            // Pass 1: Shadow
            let connR = this._drawHourHandOvalTip(hourRads, radii.min, radii.max, 'trailing');
            this._drawHourHandGeometry(hourRads, connR, hourWeight, true);

            // Pass 2: Clean
            this._resetShadow();
            this._drawHourHandGeometry(hourRads, connR, hourWeight, true);
            this._drawHourHandOvalTip(hourRads, radii.min, radii.max, 'trailing');
            this._drawHourHandOvalTip(hourRads, radii.min, radii.max, 'leading-mask');

            // Minute Hand ABOVE hour hand
            this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)');
            strokeWeight(minWeight);
            line(this.centerX, this.centerY, this.centerX + cos(minRads) * minutesRadius, this.centerY + sin(minRads) * minutesRadius);

            // Second Hand ABOVE minute hand (topmost)
            strokeWeight(secWeight);
            line(this.centerX, this.centerY, this.centerX + cos(secRads) * secondsRadius, this.centerY + sin(secRads) * secondsRadius);
        }

        this._resetShadow();
        pop();
    }



    generateSpiralPoints(startRadius, endRadius) {
        // Check if we're in dual-location mode
        this.isDualLocationMode = (typeof locManager !== 'undefined' && locManager.hasOtherLocation());

        if (!this.isDualLocationMode) {
            // Single-location mode: generate one spiral as before
            this.xSpiral = [];
            this.ySpiral = [];
            this.radiusSpiral = [];

            let totalPoints = this.numPointsPerTurn * this.numTurns;
            let deltaRadiusPerTurn = (endRadius - startRadius) / this.numTurns;

            for (let i = 0; i <= totalPoints; i++) {
                let theta = TWO_PI * (i / this.numPointsPerTurn) - HALF_PI;
                let r = endRadius - deltaRadiusPerTurn * (i / this.numPointsPerTurn);

                this.xSpiral.push(r * cos(theta));
                this.ySpiral.push(r * sin(theta));
                this.radiusSpiral.push(r);
            }
        } else {
            // Dual-location mode: generate outer and inner spirals that run PARALLEL (interleaved)

            // Calculate radial space distribution
            const totalSpace = endRadius - startRadius;
            const spacePerTurn = totalSpace / this.numTurns;

            let outerStrokeWeight, innerStrokeWeight, gapBetweenSpirals;

            if (this.style === 'SpiralHours') {
                // Custom interleaving for SpiralHours: Inner +50% width, Outer -same amt
                outerStrokeWeight = spacePerTurn * 0.5525;
                gapBetweenSpirals = spacePerTurn * 0.01;
                innerStrokeWeight = spacePerTurn * 0.2925;
            } else {
                // Existing percentages for Dial
                outerStrokeWeight = spacePerTurn * 0.462;
                gapBetweenSpirals = spacePerTurn * 0.02; // increased from 0.01 to prevent touching
                innerStrokeWeight = spacePerTurn * 0.308;
            }

            // Sync with member variables (Weight is preferred naming)
            this.outerStrokeWeight = outerStrokeWeight;
            this.innerStrokeWeight = innerStrokeWeight;
            this.gapBetweenSpirals = gapBetweenSpirals;

            // Sync current spiralStrokeWeight for track drawing
            this.spiralStrokeWeight = this.outerStrokeWeight;

            // Calculate start/end radii for outer spiral
            // Outer spiral starts at endRadius and progresses inward by totalSpace
            const outerStart = endRadius;
            const outerEnd = startRadius;

            // Calculate start/end radii for inner spiral
            // Inner spiral starts just inside the outer spiral
            // For zero gap, the center distance is (outerW + innerW) / 2
            const centerDist = (outerStrokeWeight + innerStrokeWeight) / 2;
            const innerStart = outerStart - centerDist - gapBetweenSpirals;

            // Inner spiral progresses inward by the SAME total distance as outer
            const innerEnd = innerStart - totalSpace;

            // Generate outer spiral (user location)
            this.xSpiral = [];
            this.ySpiral = [];
            this.radiusSpiral = [];

            let totalPoints = this.numPointsPerTurn * this.numTurns;

            // Outer spiral: starts at outerStart, decreases to outerEnd
            for (let i = 0; i <= totalPoints; i++) {
                let theta = TWO_PI * (i / this.numPointsPerTurn) - HALF_PI;
                let progress = i / totalPoints; // 0 to 1
                let r = outerStart - (totalSpace * progress);

                this.xSpiral.push(r * cos(theta));
                this.ySpiral.push(r * sin(theta));
                this.radiusSpiral.push(r);
            }

            // Generate inner spiral (other location) - NO rotation offset in generation
            this.xSpiralInner = [];
            this.ySpiralInner = [];
            this.radiusSpiralInner = [];

            // Inner spiral: starts at innerStart, decreases to innerEnd
            for (let i = 0; i <= totalPoints; i++) {
                let theta = TWO_PI * (i / this.numPointsPerTurn) - HALF_PI;
                let progress = i / totalPoints; // 0 to 1
                let r = innerStart - (totalSpace * progress); // CRITICAL: subtract to spiral INWARD

                this.xSpiralInner.push(r * cos(theta));
                this.ySpiralInner.push(r * sin(theta));
                this.radiusSpiralInner.push(r);
            }
        }
    }

    // Helper to calculate the min/max radii for the oval tip at a given time index
    _getOvalTipRadii(hIdx, showMode = 'dual') {
        const isDual = (showMode === 'dual');

        // Clamp index
        if (hIdx < 0) hIdx = 0;
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        let rMin, rMax;

        if (isDual && this.isDualLocationMode && this.radiusSpiralInner && this.radiusSpiralInner[hIdx]) {
            // DUAL MODE: Span FROM Inner Edge of Inner Spiral TO Outer Edge of Outer Spiral
            let rOuterCenter = this.radiusSpiral[hIdx];
            let rInnerCenter = this.radiusSpiralInner[hIdx];

            let innerW = this.innerStrokeWeight || this.secondaryStrokeWeight;
            let outerW = this.dualModeStrokeWeight;

            rMin = rInnerCenter - (innerW / 2);
            rMax = rOuterCenter + (outerW / 2);
        } else {
            // SINGLE MODE: Span only the active spiral (Local-Only or Other-Only)
            // In 'Other Only' mode, it uses the outer track (radiusSpiral)
            let rCenter = this.radiusSpiral[hIdx];
            let weight = this.singleModeStrokeWeight;

            rMin = rCenter - (weight / 2);
            rMax = rCenter + (weight / 2);
        }

        return { min: rMin, max: rMax };
    }

    // Helper to draw the rounded rectangle tip
    _drawHourHandOvalTip(hourAngle, rMin, rMax, layer = 'trailing') {
        push();
        noFill();
        stroke(255);
        let weight = Math.max(1.2, this.secondaryStrokeWeight * 0.35);
        strokeWeight(weight);
        strokeCap(ROUND);

        let spiralWidth = rMax - rMin;
        let w = this.fontSize * 1.1;

        translate(this.centerX, this.centerY);
        rotate(hourAngle);

        let halfW = w / 2;
        let extra = spiralWidth * 0.15;

        let startX = rMin - extra;
        let endX = rMax + extra;
        let radius = halfW;

        // Calculate angular offset to compensate for the ROUND cap's overhang
        // The cap extends by weight/2, which corresponds to an angle of (weight/2)/radius on the arc.
        let capOffsetAngle = (weight / 2) / radius;

        if (layer === 'leading') {
            // Leading edge (clockwise-side, y > 0, beneath spiral)
            // Left Arc (from inner-straight-edge PI + offset to bottom-edge HALF_PI)
            arc(startX + radius, 0, radius * 2, radius * 2, HALF_PI, PI + capOffsetAngle);
            // Bottom edge
            line(startX + radius, radius, endX - radius, radius);
            // Right Arc (from bottom-edge HALF_PI to outer-straight-edge 0 - offset)
            arc(endX - radius, 0, radius * 2, radius * 2, -capOffsetAngle, HALF_PI);
        } else if (layer === 'leading-mask') {
            // ONLY redraw a very tiny portion of the leading edge arcs right at the joints (PI and 0).
            // This small segment purely masks the shadow from the trailing edge endpoints.
            // By keeping the `maskAngle` extremely small, it naturally won't reach the curved spiral track.
            let maskAngle = 0.65; // ~37 degrees, wide enough to symmetrically cover the thick square endcap of the hour hand stub

            // Left joint
            arc(startX + radius, 0, radius * 2, radius * 2, PI - maskAngle, PI + maskAngle);

            // Right joint
            arc(endX - radius, 0, radius * 2, radius * 2, -maskAngle, maskAngle);
        } else {
            // Trailing edge (counter-clockwise-side, y < 0, above spiral)
            // Left Arc (from inner-straight-edge PI - offset to top-edge 1.5*PI)
            arc(startX + radius, 0, radius * 2, radius * 2, PI - capOffsetAngle, PI + HALF_PI);
            // Top edge
            line(startX + radius, -radius, endX - radius, -radius);
            // Right Arc (from top-edge 1.5*PI to outer-straight-edge TWO_PI/0 + offset)
            arc(endX - radius, 0, radius * 2, radius * 2, PI + HALF_PI, TWO_PI + capOffsetAngle);
        }

        pop();

        return startX;
    }


    // Helper to draw the hour hand geometry (Round Center, Square Tip)
    _drawHourHandGeometry(hourAngle, length, weight, isStem = false) {
        if (!isStem) return; // Only draw the stem when explicitly requested

        push();
        stroke(255);
        strokeWeight(weight);

        // Round Center (Point)
        strokeCap(ROUND);
        point(this.centerX, this.centerY);

        // Square Tip (Line) - drawn as a single stem connecting to the capsule
        strokeCap(SQUARE);
        line(this.centerX, this.centerY, this.centerX + cos(hourAngle) * length, this.centerY + sin(hourAngle) * length);

        pop();
    }

    // --- Shadow Helpers ---
    _applyShadow(blur, x, y, color) {
        drawingContext.shadowBlur = blur;
        drawingContext.shadowOffsetX = x;
        drawingContext.shadowOffsetY = y;
        drawingContext.shadowColor = color;
    }

    _resetShadow() {
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetX = 0;
        drawingContext.shadowOffsetY = 0;
    }

    // Draw AM/PM indicators and separator line for Dial mode when numbers are hidden
    drawAmPmIndicators(showMode = 'dual') {
        // Only show if: style is Dial, hours are hidden
        if (this.style !== 'Dial' || this.hoursVisible) return;

        // Hide in DUAL mode (to avoid timezone complexity for now)
        // User requested restoration for "Local Only" mode.
        if (showMode === 'dual' && this.isDualLocationMode) return;

        // Don't show during transition
        if (this.isAnimatingDualMode) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        push();
        // Color: Same as day labels (255, 235, 120) with 75% opacity
        let c = color(255, 235, 120, 192);
        fill(c);
        noStroke();

        // Font size reduced by another 10% from previous step (0.9 * 0.9 = 0.81)
        // Let's use 0.8 to be safe and clear. CW: reduce further to 0.75.
        let indicatorSize = this.fontSize * 0.75;
        textSize(indicatorSize);
        textStyle(BOLD);

        // Center text on the spiral track point
        textAlign(CENTER, CENTER);

        // Calculate angular offsets into index offsets
        // 360 degrees = numPointsPerTurn indices

        // AM: 7 degrees offset
        let amAngleDeg = 7;
        let amIndexOffset = Math.round((amAngleDeg / 360) * this.numPointsPerTurn);

        // PM: 10 degrees offset
        let pmAngleDeg = 10;
        let pmIndexOffset = Math.round((pmAngleDeg / 360) * this.numPointsPerTurn);

        // AM Indicator - Top Outer Ring
        // Base Index 0 (Top) + offset
        let amIdx = amIndexOffset;
        if (amIdx < this.xSpiral.length) {
            let amX = this.centerX + this.xSpiral[amIdx];
            let amY = this.centerY + this.ySpiral[amIdx];
            text("AM", amX, amY);
        }

        // PM Indicator - Top Inner Ring
        // Base Index numPointsPerTurn (Top of 2nd turn) + offset
        let pmIdx = this.numPointsPerTurn + pmIndexOffset;
        if (pmIdx < this.xSpiral.length) {
            let pmX = this.centerX + this.xSpiral[pmIdx];
            let pmY = this.centerY + this.ySpiral[pmIdx];
            text("PM", pmX, pmY);
        }

        // Vertical Separator Line
        // Position: At the top of the "first turn" (Outer/AM turn). 
        // User clarification: "top of the first turn... dividing line between AM and PM"
        // This implies the 12:00 PM mark (Index 300), which is the end of the AM turn and start of PM turn.
        // It should coincide with the second hand at 12 (centerX).

        stroke(c);
        // Weight: About half of the second hand line weight
        let lineWeight = Math.max(0.6, this.secondaryStrokeWeight * 0.175);
        strokeWeight(lineWeight);
        strokeCap(SQUARE);

        // X Position: Center (matches 12 o'clock second hand)
        let lineX = this.centerX;

        // Y Position: At 12:00 PM (Index 300)
        // PM Spiral Index is numPointsPerTurn.
        let targetIdx = this.numPointsPerTurn;
        if (targetIdx < this.ySpiral.length) {
            let spiralCenterY = this.centerY + this.ySpiral[targetIdx];

            // Length: Width of the spiral line itself
            let halfLen = this.spiralStrokeWeight / 2;

            line(lineX, spiralCenterY - halfLen, lineX, spiralCenterY + halfLen);
        }

        pop();
    }

    drawRiseSetTimes(tk, showMode = 'dual') {
        // Skip in dual mode unless a single-location showMode is active
        if (this.style !== 'Dial' || this.hoursVisible) return;
        if (this.isDualLocationMode && showMode === 'dual') return;
        if (this.isAnimatingDualMode) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        // Use standard Yellow text color (255, 235, 120) at 90% opacity
        let c = color(255, 235, 120, 230);

        push();
        fill(c);
        noStroke();

        // Reduced by 30% from previous 0.75 -> approx 0.55
        textSize(this.fontSize * 0.55);
        textStyle(BOLD);

        // Indices - totalDailyPts is 2 * numPointsPerTurn (24 hours)
        let totalDailyPts = this.numPointsPerTurn * 2;

        // Rise/Set
        const sunRise = tk.sunriseTime;
        const sunSet = tk.sunsetTime;
        const currentX = this.xSpiral;
        const currentY = this.ySpiral;

        // In the proxy tk, sunriseTime/sunsetTime are already swapped if showMode === 'other'.
        // And tzRotation is now 0 (true local clock).

        if (sunRise && typeof sunRise.totalSeconds === 'number' && sunRise.hour >= 0) {
            let idxRise = Math.floor((sunRise.totalSeconds / 86400) * totalDailyPts);
            this._drawSpiralTime(idxRise, "Rise", sunRise, currentX, currentY);
        }

        if (sunSet && typeof sunSet.totalSeconds === 'number' && sunSet.hour >= 0) {
            let idxSet = Math.floor((sunSet.totalSeconds / 86400) * totalDailyPts);
            this._drawSpiralTime(idxSet, "Set", sunSet, currentX, currentY);
        }

        // Moon times mapping based on showMode
        let moonRise, moonSet;
        if (showMode === 'other') {
            moonRise = tk.otherMoonRiseTime;
            moonSet = tk.otherMoonSetTime;
        } else {
            moonRise = tk.moonRiseTime;
            moonSet = tk.moonSetTime;
        }

        if (typeof ShowMoon !== 'undefined' && ShowMoon) {
            if (moonRise && typeof moonRise.totalSeconds === 'number') {
                if (!this._isTimeTooClose(moonRise, sunRise) && !this._isTimeTooClose(moonRise, sunSet) && this._isNighttime(moonRise, sunRise, sunSet)) {
                    let idxMoonRise = Math.floor((moonRise.totalSeconds / 86400) * totalDailyPts);
                    this._drawSpiralTime(idxMoonRise, "Moon ↑", moonRise, currentX, currentY);
                }
            }

            if (moonSet && typeof moonSet.totalSeconds === 'number') {
                if (!this._isTimeTooClose(moonSet, sunRise) && !this._isTimeTooClose(moonSet, sunSet) && this._isNighttime(moonSet, sunRise, sunSet)) {
                    let idxMoonSet = Math.floor((moonSet.totalSeconds / 86400) * totalDailyPts);
                    this._drawSpiralTime(idxMoonSet, "Moon ↓", moonSet, currentX, currentY);
                }
            }
        }

        pop();
    }

    _isNighttime(timeObj, sunriseObj, sunsetObj) {
        if (!timeObj || !sunriseObj || !sunsetObj) return true; // Default show if missing data
        if (sunriseObj.hour === -1) return true;  // Always dark
        if (sunriseObj.hour === -2) return false; // Always light

        const t = timeObj.totalSeconds;
        const sr = sunriseObj.totalSeconds;
        const ss = sunsetObj.totalSeconds;

        if (sr < ss) {
            // Normal day (e.g. sunrise 6am, sunset 6pm)
            return t < sr || t > ss;
        } else {
            // Wrapped day (e.g. sunset 1am, sunrise 8am - night is between them)
            return t > ss && t < sr;
        }
    }

    _isTimeTooClose(t1, t2, thresholdSeconds = 1800) {
        if (!t1 || !t2 || typeof t1.totalSeconds !== 'number' || typeof t2.totalSeconds !== 'number') return false;
        let diff = Math.abs(t1.totalSeconds - t2.totalSeconds);
        // Handle midnight wrap-around
        if (diff > 43200) { // 12 hours
            diff = 86400 - diff;
        }
        return diff < thresholdSeconds;
    }

    _drawSpiralTime(idx, label, timeObj, xArray, yArray) {
        if (!xArray || idx < 0 || idx >= xArray.length) return;

        // Coordinate
        let x = this.centerX + xArray[idx];
        let y = this.centerY + yArray[idx];

        // Calculate Tangent Angle (Rotation)
        // Use +/- 2 points for a smoother tangent
        let idxPrev = Math.max(0, idx - 2);
        let idxNext = Math.min(xArray.length - 1, idx + 2);

        let dx = xArray[idxNext] - xArray[idxPrev];
        let dy = yArray[idxNext] - yArray[idxPrev];
        let angle = Math.atan2(dy, dx);

        // Time String Formatting
        let h = timeObj.hour;
        let m = timeObj.minute;
        let ampm = (h >= 12) ? "P" : "A";
        let h12 = (h % 12);
        if (h12 === 0) h12 = 12;
        let mStr = (m < 10) ? "0" + m : "" + m;
        let timeStr = `${h12}:${mStr}${ampm}`;

        push();
        translate(x, y);
        rotate(angle);

        // Verify flip logic:
        // Text is drawn along the tangent.
        // If the tangent points LEFT (cos(angle) < 0), the text might be upside down?
        // Let's test:
        // Angle 0 (Right): "Rise" above, Time below. Readable.
        // Angle PI (Left): "Rise" is now below (in screen space), Time is above. Text is upside down.
        // So if abs(angle) > PI/2, we should rotate by PI.
        if (Math.abs(angle) > HALF_PI) {
            rotate(PI);
        }

        textAlign(CENTER, BOTTOM);
        text(label, 0, -2); // Rise/Set label above line

        textAlign(CENTER, TOP);
        text(timeStr, 0, 2); // Time below line


        pop();
    }

    // Draw Rise/Set times on the spiral for Ribbon (SpiralHours) mode
    drawRibbonRiseSetTimes(tk, locManager, showMode = 'dual') {
        if (this.style !== 'SpiralHours') return;

        // Hide during dual mode animation (stages 2-5)
        if (this.isAnimatingDualMode && this.animationStage >= 2 && this.animationStage <= 5) return;

        const isOtherOnly = (showMode === 'other');
        const isLocalOnly = (showMode === 'local');
        const isDual = (showMode === 'dual');

        // Draw local times on main track if in dual or local or other-only mode
        const shouldDrawMain = isLocalOnly || isOtherOnly || isDual;
        if (shouldDrawMain) {
            let sunRise = tk.sunriseTime;
            let sunSet = tk.sunsetTime;
            let mRise = tk.moonRiseTime;
            let mSet = tk.moonSetTime;

            // In other-only mode, the proxy tk passes local variables, but we are drawing the "main" outer track with them.
            if (isOtherOnly) {
                sunRise = tk.otherSunriseTime || tk.sunriseTime; // fallback if proxy handling differs
                sunSet = tk.otherSunsetTime || tk.sunsetTime;
                mRise = tk.otherMoonRiseTime || tk.moonRiseTime;
                mSet = tk.otherMoonSetTime || tk.moonSetTime;
            }

            if (sunRise && typeof sunRise.totalSeconds === 'number' && sunRise.hour >= 0) {
                this._drawRibbonTime(sunRise, this.xSpiral, this.ySpiral, this.radiusSpiral,
                    false, this.spiralStrokeWeight, 0, showMode);
            }
            if (sunSet && typeof sunSet.totalSeconds === 'number' && sunSet.hour >= 0) {
                this._drawRibbonTime(sunSet, this.xSpiral, this.ySpiral, this.radiusSpiral,
                    false, this.spiralStrokeWeight, 0, showMode);
            }
            if (typeof ShowMoon !== 'undefined' && ShowMoon) {
                if (mRise && typeof mRise.totalSeconds === 'number') {
                    if (!this._isTimeTooClose(mRise, sunRise) && !this._isTimeTooClose(mRise, sunSet) && this._isNighttime(mRise, sunRise, sunSet)) {
                        this._drawRibbonTime(mRise, this.xSpiral, this.ySpiral, this.radiusSpiral,
                            false, this.spiralStrokeWeight, 0, showMode);
                    }
                }
                if (mSet && typeof mSet.totalSeconds === 'number') {
                    if (!this._isTimeTooClose(mSet, sunRise) && !this._isTimeTooClose(mSet, sunSet) && this._isNighttime(mSet, sunRise, sunSet)) {
                        this._drawRibbonTime(mSet, this.xSpiral, this.ySpiral, this.radiusSpiral,
                            false, this.spiralStrokeWeight, 0, showMode);
                    }
                }
            }
        }

        // Draw other times on inner track ONLY in dual mode
        if (this.isDualLocationMode && isDual) {
            const tzDiffHours = locManager.getTimezoneOffsetDifference();
            let oSunRise = tk.otherSunriseTime;
            let oSunSet = tk.otherSunsetTime;

            if (oSunRise && typeof oSunRise.totalSeconds === 'number' && oSunRise.hour >= 0) {
                this._drawRibbonTime(oSunRise, this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, this.innerStrokeWeight, tzDiffHours, showMode);
            }
            if (oSunSet && typeof oSunSet.totalSeconds === 'number' && oSunSet.hour >= 0) {
                this._drawRibbonTime(oSunSet, this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, this.innerStrokeWeight, tzDiffHours, showMode);
            }
            if (typeof ShowMoon !== 'undefined' && ShowMoon) {
                if (tk.otherMoonRiseTime && typeof tk.otherMoonRiseTime.totalSeconds === 'number') {
                    if (!this._isTimeTooClose(tk.otherMoonRiseTime, oSunRise) && !this._isTimeTooClose(tk.otherMoonRiseTime, oSunSet) && this._isNighttime(tk.otherMoonRiseTime, oSunRise, oSunSet)) {
                        this._drawRibbonTime(tk.otherMoonRiseTime, this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, this.innerStrokeWeight, tzDiffHours, showMode);
                    }
                }
                if (tk.otherMoonSetTime && typeof tk.otherMoonSetTime.totalSeconds === 'number') {
                    if (!this._isTimeTooClose(tk.otherMoonSetTime, oSunRise) && !this._isTimeTooClose(tk.otherMoonSetTime, oSunSet) && this._isNighttime(tk.otherMoonSetTime, oSunRise, oSunSet)) {
                        this._drawRibbonTime(tk.otherMoonSetTime, this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, this.innerStrokeWeight, tzDiffHours, showMode);
                    }
                }
            }
        }
    }

    // Helper to draw a single rise/set time on the Ribbon spiral
    _drawRibbonTime(timeObj, xArray, yArray, rArray, isInner, strokeWeight, tzOffsetHours = 0, showMode = 'dual') {
        if (!xArray || xArray.length === 0) return;

        // Calculate index in spiral based on time
        let totalDailyPts = this.numPointsPerTurn * 2;
        let timeSeconds = timeObj.totalSeconds;

        // Apply timezone offset for inner spiral
        if (tzOffsetHours !== 0) {
            const offsetSeconds = tzOffsetHours * 3600;
            timeSeconds -= offsetSeconds;

            // Wrap to 0-86400 range (24 hours)
            if (timeSeconds < 0) timeSeconds += 86400;
            if (timeSeconds >= 86400) timeSeconds -= 86400;
        }

        let idx = Math.floor((timeSeconds / 86400) * totalDailyPts);

        // Clamp to valid range
        if (idx < 0 || idx >= rArray.length) return;

        // Get position on inner edge of spiral track
        let r = rArray[idx] - (strokeWeight / 2);

        let fontScale = isInner ? 0.32 : 0.55; // Inner: 0.58 * 0.55 ≈ 0.32

        // Move outer spiral annotations slightly outward in dual mode
        if (!isInner && this.isDualLocationMode && showMode === 'dual') {
            r += (this.fontSize * fontScale) * 0.33;
        }

        // Calculate angle for rotation
        let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;

        // Calculate tangent angle for text rotation
        let idxPrev = Math.max(0, idx - 2);
        let idxNext = Math.min(xArray.length - 1, idx + 2);
        let dx = xArray[idxNext] - xArray[idxPrev];
        let dy = yArray[idxNext] - yArray[idxPrev];
        let tangentAngle = Math.atan2(dy, dx);

        // Format time string (time only, no label)
        let h = timeObj.hour;
        let m = timeObj.minute;
        let ampm = (h >= 12) ? "P" : "A";
        let h12 = (h % 12);
        if (h12 === 0) h12 = 12;
        let mStr = (m < 10) ? "0" + m : "" + m;
        let timeStr = `${h12}:${mStr}${ampm}`;

        push();

        // Set color to match spiral hour numbers
        if (isInner || showMode === 'other') {
            fill(200, 255, 255); // Light Cyan
        } else {
            fill(255, 235, 120); // Yellow for outer spiral
        }
        noStroke();

        // Match Ribbon hour number styling
        // Font size matches hour numbers: smaller for inner spiral
        textSize(this.fontSize * fontScale);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        this._applyShadow(8, 0, 4, 'rgba(0,0,0,0.7)'); // Same shadow as hour numbers

        // Position at inner edge
        let x = this.centerX + cos(theta) * r;
        let y = this.centerY + sin(theta) * r;

        translate(x, y);
        rotate(tangentAngle);

        // Flip text if it would be upside down
        if (Math.abs(tangentAngle) > HALF_PI) {
            rotate(PI);
        }

        text(timeStr, 0, 0);

        this._resetShadow();
        pop();
    }

    _drawMoonPhase(tk, showMode = 'dual') {
        if (!tk || !tk.moonIllum) return;

        let f = tk.moonIllum.fraction;
        let phase = tk.moonIllum.phase; // 0.0 to 1.0 (new -> full -> new)
        let lat = tk.latitude;

        // Determine if waxing (0.0 to 0.5)
        let isWaxing = (phase < 0.5);

        // On the day of the new moon (0%), let the lit portion disappear entirely.
        // On the day of the full moon (100%), draw perfectly full without artifacts.
        let fRound = Math.round(f * 100);
        if (fRound === 0) {
            f = 0.0;
        } else if (fRound === 100) {
            f = 1.0;
        } else if (f < 0.10) {
            // Broaden very thin crescents so they remain distinctly visible
            f = 0.10;
        }

        let isCrescent = (f < 0.5);

        // Position: centered horizontally, gap between center and top inner spiral
        let x = this.centerX;

        let innerR, sw;
        if (this.isDualLocationMode && showMode === 'dual') {
            innerR = (this.radiusSpiralInner && this.radiusSpiralInner.length > 0)
                ? this.radiusSpiralInner[this.radiusSpiralInner.length - 1]
                : this.ClockRadius;
            sw = this.innerStrokeWeight;
        } else {
            innerR = (this.radiusSpiral && this.radiusSpiral.length > 0)
                ? this.radiusSpiral[this.radiusSpiral.length - 1]
                : this.ClockRadius;
            sw = this.spiralStrokeWeight;
        }

        let edgeR = innerR - (sw / 2);
        let y = this.centerY - (edgeR / 2);
        let D = this.fontSize * 1.35;

        // Flip light direction if Southern Hemisphere
        if (lat < 0) {
            isWaxing = !isWaxing;
        }

        push();
        noStroke();

        // 1. Draw base unlit moon (dark grey)
        fill(85, 85, 80, 255);
        ellipse(x, y, D, D);

        // 2. Draw lit portion (soft yellow)
        if (f > 0.0) {
            fill(255, 235, 120, 255);

            if (isWaxing) {
                // Right half lit
                arc(x, y, D, D, -HALF_PI, HALF_PI);
                if (isCrescent) {
                    // Cover up inner part of right half with unlit
                    fill(85, 85, 80, 255);
                    ellipse(x, y, D * (1 - 2 * f), D);
                } else {
                    // Add to the right half with lit ellipse on left
                    fill(255, 235, 120, 255);
                    ellipse(x, y, D * (2 * f - 1), D);
                }
            } else {
                // Left half lit
                arc(x, y, D, D, HALF_PI, PI + HALF_PI);
                if (isCrescent) {
                    // Cover up inner part of left half with unlit
                    fill(85, 85, 80, 255);
                    ellipse(x, y, D * (1 - 2 * f), D);
                } else {
                    // Add to the left half with lit ellipse on right
                    fill(255, 235, 120, 255);
                    ellipse(x, y, D * (2 * f - 1), D);
                }
            }
        }

        pop();
    }
}
