
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
                // Keep references to others for dual calculation if needed
                otherSunriseTime: timeKeeper.otherSunriseTime,
                otherSunsetTime: timeKeeper.otherSunsetTime
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

        this.drawSpiral(activeTk, locManager, showMode);

        // Draw hands - hide during dual mode transition
        const shouldHideHands = this.isAnimatingDualMode && this.animationStage >= 2 && this.animationStage <= 5;
        if (!shouldHideHands) {
            this.drawHands(activeTk, showMode);
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
        let nightColor = color(20, 80, 100);
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
                dayColor, nightColor, baseColor, true, 0, sw);
        }

        // 2. Draw Inner Spiral (Dual Mode ONLY)
        if (isDual && this.isDualLocationMode && (!this.isAnimatingDualMode || this.animationStage >= 4)) {
            const tzDiffHours = locManager.getTimezoneOffsetDifference();

            if (this.isAnimatingDualMode && this.animationStage === 4) {
                const progress = this.getAnimationProgress();
                const cyanHighlight = color(200, 255, 255);
                this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                    cyanHighlight, cyanHighlight, baseColor, true, tzDiffHours, this.innerStrokeWeight, progress, cyanHighlight);
            } else if (this.isAnimatingDualMode && this.animationStage === 5) {
                const progress = this.getAnimationProgress();
                const cyanHighlight = color(200, 255, 255);
                const curDay = lerpColor(cyanHighlight, dayColor, progress);
                const curNight = lerpColor(cyanHighlight, nightColor, progress);
                const curBase = lerpColor(cyanHighlight, baseColor, progress);
                this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                    curDay, curNight, curBase, true, tzDiffHours, this.innerStrokeWeight);
            } else {
                this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                    dayColor, nightColor, baseColor, true, tzDiffHours, this.innerStrokeWeight);
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
    _drawSpiralTrack(xArray, yArray, sunriseTime, sunsetTime, dayColor, nightColor, baseColor, hasValidLocation, tzOffsetHours, weight = null, limitProgress = 1.0, tintColor = null) {
        // 1. Draw Base Track (Gray)
        if (weight !== null) strokeWeight(weight);
        else strokeWeight(this.spiralStrokeWeight);

        stroke((tintColor !== null) ? tintColor : baseColor);
        this._applyShadow(12, 0, 4, 'rgba(0,0,0,0.3)');
        beginShape();
        let currentLen = Math.floor(xArray.length * limitProgress);
        for (let i = 0; i < currentLen; i++) {
            vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
        }
        endShape();

        // Calculate sunset/sunrise indices with timezone offset adjustment
        let riseSeconds = 6 * 3600; // 6 AM default
        let setSeconds = 18 * 3600; // 6 PM default

        if (hasValidLocation && typeof sunriseTime.totalSeconds === 'number') {
            riseSeconds = sunriseTime.totalSeconds;
            setSeconds = sunsetTime.totalSeconds;

            // Apply timezone rotation offset (shift the times by the timezone difference)
            if (tzOffsetHours !== 0) {
                const offsetSeconds = tzOffsetHours * 3600;
                riseSeconds -= offsetSeconds;
                setSeconds -= offsetSeconds;

                // Wrap to 0-86400 range (24 hours)
                if (riseSeconds < 0) riseSeconds += 86400;
                if (riseSeconds >= 86400) riseSeconds -= 86400;
                if (setSeconds < 0) setSeconds += 86400;
                if (setSeconds >= 86400) setSeconds -= 86400;
            }
        }

        let len = xArray.length;
        let totalDailyPts = this.numPointsPerTurn * 2;

        let idxRise = Math.floor((riseSeconds / 86400) * totalDailyPts);
        let idxSet = Math.floor((setSeconds / 86400) * totalDailyPts);

        // Clamp
        idxRise = Math.max(0, Math.min(idxRise, len - 1));
        idxSet = Math.max(0, Math.min(idxSet, len - 1));

        // Only draw day/night colors if we are NOT waiting for location data
        // Explicitly check the global variable (accessible in browser environment)
        if (typeof IsLoadingLocation === 'undefined' || !IsLoadingLocation) {
            if (idxRise < idxSet) {
                // NORMAL CASE: Sunrise occurs before Sunset in the 24-hour spiral
                // 2. Draw Night (Midnight -> Sunrise)
                stroke((tintColor !== null) ? tintColor : nightColor);
                if (idxRise > 0) {
                    beginShape();
                    for (let i = 0; i <= idxRise; i++) {
                        if (i < currentLen) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }

                // 3. Draw Day (Sunrise -> Sunset)
                stroke((tintColor !== null) ? tintColor : dayColor);
                beginShape();
                for (let i = idxRise; i <= idxSet; i++) {
                    if (i < currentLen) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                }
                endShape();

                // 4. Draw Night (Sunset -> Midnight)
                stroke((tintColor !== null) ? tintColor : nightColor);
                if (idxSet < len - 1) {
                    beginShape();
                    for (let i = idxSet; i < len; i++) {
                        if (i < currentLen) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }
            } else if (idxRise > idxSet) {
                // WRAPPED CASE: Sunset occurs before Sunrise in terms of circular index
                // (This happens when the other location's daylight period crosses our local midnight)

                // 2. Draw Day (Midnight -> Sunset)
                stroke(tintColor || dayColor);
                if (idxSet > 0) {
                    beginShape();
                    for (let i = 0; i <= idxSet; i++) {
                        if (i < currentLen) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }

                // 3. Draw Night (Sunset -> Sunrise)
                stroke(tintColor || nightColor);
                beginShape();
                for (let i = idxSet; i <= idxRise; i++) {
                    if (i < currentLen) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                }
                endShape();

                // 4. Draw Day (Sunrise -> Midnight)
                stroke(tintColor || dayColor);
                if (idxRise < len - 1) {
                    beginShape();
                    for (let i = idxRise; i < len; i++) {
                        if (i < currentLen) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }
            } else {
                // SPECIAL CASE: Sun never rises/sets or indices are identical
                // Default to night for now (matches 0 rise/set indices for "always dark")
                stroke((tintColor !== null) ? tintColor : nightColor);
                beginShape();
                for (let i = 0; i < currentLen; i++) {
                    vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                }
                endShape();
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

        // 1. Label for Outer Spiral ("Local")
        // Only show from Stage 5 onwards (after migration and drawing)
        // HIDE if in 'local' mode (restoring single-mode look)
        if (showMode === 'dual' && (!this.isAnimatingDualMode || this.animationStage >= 5)) {
            textSize(outerFontSize);
            let x1 = this.centerX + this.xSpiral[0] - margin;
            let y1 = this.centerY + this.ySpiral[0];
            text("Local", x1, y1);
        }

        if (showMode !== 'dual') return; // Don't show city label in local or other mode

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

    drawHands(tk, showMode = 'dual') {
        if (this.style === 'SpiralHours') {
            this.drawHandsLegacySpiral(tk, showMode);
        } else {
            this.drawHandsDial(tk, showMode);
        }
    }

    drawHandsDial(tk, showMode = 'dual') {
        push();
        let handColor = color(255);
        stroke(handColor);
        strokeCap(ROUND);
        this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)'); // Hand shadows

        // Dial logic (Time on the outer ring mostly, but Hour hand follows spiral? 
        // Actually DaySpiral description says "Hour hand tip follows the day spiral")
        // So Dial should ALSO follow the spiral for the hour hand?
        // "Hour hand tip follows the day spiral, making 1 turn for AM and 1 for PM."

        // Yes, even in Dial mode, the hour hand tracks the spiral.
        // The difference is mainly the face/ticks style.

        // Let's use the unified logic but cleaner.

        let secAngle = map(Math.floor(tk.seconds), 0, 60, 0, TWO_PI) - HALF_PI;
        let minAngle = map(tk.minutes + tk.seconds / 60, 0, 60, 0, TWO_PI) - HALF_PI;
        // Hour angle (0-24 mapped to 0-4PI)
        let hourAngle = map(tk.hours + tk.minutes / 60, 0, 24, 0, TWO_PI * 2) - HALF_PI;

        // Radii for Dial:
        let faceRadius = this.faceDiameter / 2;
        let rSec = faceRadius * 0.96;
        let rMin = rSec * 0.90;

        // Draw Second Hand
        strokeWeight(Math.max(1.2, this.secondaryStrokeWeight * 0.35));
        line(this.centerX, this.centerY, this.centerX + cos(secAngle) * rSec, this.centerY + sin(secAngle) * rSec);

        // Draw Minute Hand
        strokeWeight(Math.max(2.2, this.secondaryStrokeWeight * 0.7));
        line(this.centerX, this.centerY, this.centerX + cos(minAngle) * rMin, this.centerY + sin(minAngle) * rMin);

        // Draw Hour Hand (Two-Pass: Shadow then Clean)
        let totalPoints = this.numPointsPerTurn * 2;
        let hIdx = Math.floor((tk.hours + tk.minutes / 60) / 24.0 * totalPoints);
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        let radii = this._getOvalTipRadii(hIdx, showMode);
        let handWeight = Math.max(3, this.secondaryStrokeWeight * 1.2);

        // Pass 1: Shadow (and Base Body)
        // Shadow is already active from top of function
        let connR = this._drawHourHandOvalTip(hourAngle, radii.min, radii.max);
        this._drawHourHandGeometry(hourAngle, connR, handWeight);

        // Pass 2: Clean Body (Covers shadow artifacts)
        this._resetShadow();
        this._drawHourHandOvalTip(hourAngle, radii.min, radii.max);
        this._drawHourHandGeometry(hourAngle, connR, handWeight);

        this._resetShadow();
        pop();
    }

    drawHandsLegacySpiral(tk, showMode = 'dual') {
        // Legacy "Hours in Spiral" Hand Logic
        push();
        let handColor = color(255);
        stroke(handColor);
        this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)'); // Hand shadows

        // Legacy hand weights (scaled)
        // Sec: 4 * FontScaleFactor
        // Min: 8 * FontScaleFactor
        // Hour: 19 * FontScaleFactor
        let scale = this.fontScale || 1; // Need to ensure fontScale is set in resize
        // Actually this.fontSize is ~ 40*fontScale. So fontScale ~ fontSize/40.
        let localScale = this.fontSize / 40.0;

        let secWeight = 4 * localScale;
        let minWeight = 8 * localScale;
        let hourWeight = 19 * localScale;

        // Time Values
        let theSec = tk.seconds; // float
        let theMin = tk.minutes + theSec / 60;
        let theHour = tk.hours + theMin / 60;

        let secRads = map(theSec, 0, 60, 0, TWO_PI) - HALF_PI;
        let minRads = map(theMin, 0, 60, 0, TWO_PI) - HALF_PI;
        let hourRads = map(theHour, 0, 24, 0, TWO_PI * 2) - HALF_PI;

        // --- Calculate Radii using Legacy Logic ---

        // Spiral Array Indexing
        // iiSpiral = int((Val / Max) * NumSpiralPointsPerTurn [ * 2 if 24h]);

        let idxMax = this.numPointsPerTurn * this.numTurns; // total valid points

        // 1. Hour Radius
        let iiHour = Math.floor((theHour / 24) * this.numPointsPerTurn * 2);
        let hoursRadius = this.clockDiameter / 4; // Fallback

        if (iiHour < idxMax && this.radiusSpiral[iiHour]) {
            // HoursRadius = RadiusSpiralArray[iiSpiral] - ClockDiameter * 0.035;
            hoursRadius = this.radiusSpiral[iiHour] - this.clockDiameter * 0.035;
        }

        // 2. Minute Radius
        // iiSpiral = int((theMin / 60) * NumSpiralPointsPerTurn);
        let iiMin = Math.floor((theMin / 60) * this.numPointsPerTurn);
        if (tk.hours >= 12) { // IsPM
            iiMin += this.numPointsPerTurn;
        }
        let minutesRadius = 0;
        if (iiMin < idxMax && this.radiusSpiral[iiMin]) {
            // MinutesRadius = RadiusSpiralArray[iiSpiral] + 0.4 * SpiralLineWidth / 2;
            minutesRadius = this.radiusSpiral[iiMin] + 0.4 * (this.spiralStrokeWeight / 2);
        } else {
            minutesRadius = this.clockDiameter * 0.35; // Fallback
        }

        // 3. Second Radius
        // iiSpiral = int((theSec / 60) * NumSpiralPointsPerTurn);
        let iiSec = Math.floor((theSec / 60) * this.numPointsPerTurn);
        if (tk.hours >= 12) { // IsPM
            iiSec += this.numPointsPerTurn;
        }
        let secondsRadius = 0;
        if (iiSec < idxMax && this.radiusSpiral[iiSec]) {
            // SecondsRadius = RadiusSpiralArray[iiSpiral] + 0.7 * SpiralLineWidth / 2;
            secondsRadius = this.radiusSpiral[iiSec] + 0.7 * (this.spiralStrokeWeight / 2);
        } else {
            secondsRadius = this.clockDiameter * 0.4; // Fallback
        }

        // --- Draw Hands ---

        // Second Hand
        strokeWeight(secWeight);
        line(this.centerX, this.centerY, this.centerX + cos(secRads) * secondsRadius, this.centerY + sin(secRads) * secondsRadius);

        // Minute Hand
        strokeWeight(minWeight);
        line(this.centerX, this.centerY, this.centerX + cos(minRads) * minutesRadius, this.centerY + sin(minRads) * minutesRadius);

        // Hour Hand (Two-Pass: Shadow then Clean)
        let totalPointsH = this.numPointsPerTurn * 2;
        let hIdx = Math.floor((theHour / 24.0) * totalPointsH);
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        let radii = this._getOvalTipRadii(hIdx, showMode);

        // Pass 1: Shadow
        let connR = this._drawHourHandOvalTip(hourRads, radii.min, radii.max);
        this._drawHourHandGeometry(hourRads, connR, hourWeight);

        // Pass 2: Clean
        this._resetShadow();
        this._drawHourHandOvalTip(hourRads, radii.min, radii.max);
        this._drawHourHandGeometry(hourRads, connR, hourWeight);


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
    _drawHourHandOvalTip(hourAngle, rMin, rMax) {
        push();
        noFill();
        stroke(255);
        strokeWeight(Math.max(1.2, this.secondaryStrokeWeight * 0.35));
        strokeCap(ROUND);

        let spiralWidth = rMax - rMin;
        let w = this.fontSize * 1.1; // Restored original width (tangential)

        translate(this.centerX, this.centerY);
        rotate(hourAngle);

        rectMode(CORNERS);
        let halfW = w / 2;
        // User confirmed 15% padding on each side is correct for length
        let extra = spiralWidth * 0.15;

        let startX = rMin - extra;
        let endX = rMax + extra;

        rect(startX, -halfW, endX, halfW, halfW);

        pop();

        return startX; // Return where the hand should stop
    }

    // Helper to draw the hour hand geometry (Round Center, Square Tip)
    _drawHourHandGeometry(hourAngle, length, weight) {
        push();
        stroke(255);
        strokeWeight(weight);

        // Round Center (Point) - drawn as a zero-length line with ROUND cap? 
        // Or actually just a point. Point with weight works.
        strokeCap(ROUND);
        point(this.centerX, this.centerY);

        // Square Tip (Line)
        strokeCap(SQUARE); // Square end at the tip
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

        if (sunRise && typeof sunRise.totalSeconds === 'number') {
            let idxRise = Math.floor((sunRise.totalSeconds / 86400) * totalDailyPts);
            this._drawSpiralTime(idxRise, "Rise", sunRise, currentX, currentY);
        }

        if (sunSet && typeof sunSet.totalSeconds === 'number') {
            let idxSet = Math.floor((sunSet.totalSeconds / 86400) * totalDailyPts);
            this._drawSpiralTime(idxSet, "Set", sunSet, currentX, currentY);
        }

        pop();
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
            if (tk.sunriseTime && typeof tk.sunriseTime.totalSeconds === 'number') {
                this._drawRibbonTime(tk.sunriseTime, this.xSpiral, this.ySpiral, this.radiusSpiral,
                    false, this.spiralStrokeWeight, 0, showMode);
            }
            if (tk.sunsetTime && typeof tk.sunsetTime.totalSeconds === 'number') {
                this._drawRibbonTime(tk.sunsetTime, this.xSpiral, this.ySpiral, this.radiusSpiral,
                    false, this.spiralStrokeWeight, 0, showMode);
            }
        }

        // Draw other times on inner track ONLY in dual mode
        if (this.isDualLocationMode && isDual) {
            const tzDiffHours = locManager.getTimezoneOffsetDifference();

            if (tk.otherSunriseTime && typeof tk.otherSunriseTime.totalSeconds === 'number') {
                this._drawRibbonTime(tk.otherSunriseTime, this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, this.innerStrokeWeight, tzDiffHours, showMode);
            }
            if (tk.otherSunsetTime && typeof tk.otherSunsetTime.totalSeconds === 'number') {
                this._drawRibbonTime(tk.otherSunsetTime, this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, this.innerStrokeWeight, tzDiffHours, showMode);
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
        let fontScale = isInner ? 0.32 : 0.55; // Inner: 0.58 * 0.55 ≈ 0.32
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
}
