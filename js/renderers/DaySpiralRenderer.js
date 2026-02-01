
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
        this.hourDigitColor = [25, 25, 25];

        // Style: 'Classic' (default) or 'SpiralHours' (Legacy V3)
        this.style = 'Classic';

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

    resize(w, h) {
        this.centerX = w / 2;
        this.centerY = h / 2;

        let minDim = Math.min(w, h);
        let radius = minDim / 2;

        this.clockDiameter = radius * 1.78;
        this.diameter = this.clockDiameter;
        this.faceDiameter = (radius * 0.83 * 0.93) * 2;
        this.numbersRadius = radius * 0.83;

        // Spiral settings default (Classic)
        let startRadius = radius * 0.24;
        let endRadius = radius * 0.66; // Increased by 10% (from 0.60) to reduce outer gap

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

            if (this.isDualLocationMode) {
                this.outerStrokeWeight = radius * 0.14;
                this.innerStrokeWeight = this.outerStrokeWeight * 0.3;
                this.spiralStrokeWeight = this.outerStrokeWeight;
            } else {
                this.spiralStrokeWeight = radius * 0.18; // Original
            }
        } else {
            // Classic
            let nTurns = 2;
            let deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;

            if (this.isDualLocationMode) {
                this.outerStrokeWeight = deltaRadiusPerTurn * 0.42;
                this.innerStrokeWeight = deltaRadiusPerTurn * 0.35;
                this.spiralStrokeWeight = this.outerStrokeWeight;
            } else {
                // Single mode uses 66% of space per turn
                this.spiralStrokeWeight = deltaRadiusPerTurn * 0.66;
            }
        }

        this.secondaryStrokeWeight = this.spiralStrokeWeight * 0.33;

        let fontScale = (minDim) / 950;
        this.fontSize = 40 * fontScale;

        // Generate spiral
        this.generateSpiralPoints(startRadius, endRadius);
    }

    update(timeKeeper, locManager) {
        if (!this.active) return;

        // p5.js drawing calls
        clear(); // Transparent background to let CSS show through

        // Draw Face Components - Only for Classic
        if (this.style === 'Classic') {
            noStroke();

            // 1. Draw Inner Face Background (Dark Gray) FIRST 
            // This is so the "inner" shadow of the ring above it will bleed onto this surface.
            fill(100);
            ellipse(this.centerX, this.centerY, this.faceDiameter, this.faceDiameter);

            // 2. Draw Outer Face Background (White Ring) as a DONUT with shadow
            fill(255);
            // Light from top-left: shadow offsets to bottom-right
            // This casts shadow OUTSIDE (bottom-right) and INSIDE (top-left of hole)
            this._applyShadow(20, 6, 6, 'rgba(0,0,0,0.5)');

            beginShape();
            // Outer Ring Circle
            let outerR = this.clockDiameter / 2;
            let innerR = this.faceDiameter / 2;

            // Outer boundary (Clockwise)
            for (let a = 0; a < TWO_PI; a += 0.05) {
                vertex(this.centerX + cos(a) * outerR, this.centerY + sin(a) * outerR);
            }

            // Inner boundary (Counter-clockwise for hole)
            beginContour();
            for (let a = TWO_PI; a > 0; a -= 0.05) {
                vertex(this.centerX + cos(a) * innerR, this.centerY + sin(a) * innerR);
            }
            endContour();
            endShape(CLOSE);

            this._resetShadow();

            // 3. Draw Ticks on the face
            fill(255);
            noStroke();
            for (let b = 0; b < 360; b += 30) {
                let angle = radians(b);
                let dotRadius = (this.faceDiameter / 2) * 0.98;
                let x = this.centerX + cos(angle) * dotRadius;
                let y = this.centerY + sin(angle) * dotRadius;
                let dotSize = this.fontSize * 0.25;
                ellipse(x, y, dotSize, dotSize);
            }
        } else {
            // SpiralHours Mode Background...
        }

        if (this.style === 'Classic') {
            this.drawHourLabels();
        }

        this.drawSpiral(timeKeeper, locManager);

        // Draw spiral hours in Classic mode
        if (this.style === 'Classic') {
            // Always draw outer spiral hours (local time)
            this.drawOuterSpiralHours(locManager);

            // Draw inner spiral hours only in dual mode
            if (this.isDualLocationMode) {
                this.drawInnerSpiralHours(locManager);
            }
        }

        if (this.style === 'SpiralHours') {
            this.drawSpiralTicks();
            // Draw outer spiral hours
            this.drawSpiralHours(this.xSpiral, this.ySpiral, this.radiusSpiral, false, locManager);

            // Draw inner spiral hours if in dual mode
            if (this.isDualLocationMode) {
                this.drawSpiralHours(this.xSpiralInner, this.ySpiralInner, this.radiusSpiralInner, true, locManager);
            }
        }

        if (this.isDualLocationMode) {
            this.drawSpiralLabels(locManager);
        }

        this.drawDayLabels(timeKeeper, locManager);

        if (typeof IsGmtShown !== 'undefined' && IsGmtShown) {
            this.drawGMT(locManager);
        }
        this.drawHands(timeKeeper);
    }

    drawHourLabels() {
        noStroke();
        fill(this.hourDigitColor);
        textSize(this.fontSize);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        let radius = this.numbersRadius;

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.6)'); // Shadow for Classic hour numbers

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

    drawSpiral(tk, loc) {
        // Color scheme
        // Even closer to legacy blue for better contrast
        let dayColor = color(92, 171, 226); // Halfway between current and legacy darker blue
        let nightColor = color(20, 80, 100); // Dark blue for night
        let baseColor = color(90); // Dark Gray for the track

        strokeWeight(this.spiralStrokeWeight);
        strokeCap(SQUARE);
        noFill();

        if (!this.isDualLocationMode) {
            // SINGLE-LOCATION MODE: Draw one spiral as before
            // 1. Draw Base Track (Gray)
            stroke(baseColor);
            this._applyShadow(12, 0, 4, 'rgba(0,0,0,0.3)');
            beginShape();
            for (let i = 0; i < this.xSpiral.length; i++) {
                vertex(this.centerX + this.xSpiral[i], this.centerY + this.ySpiral[i]);
            }
            endShape();

            // Calculate sunset/sunrise indices
            let riseSeconds = 6 * 3600; // 6 AM
            let setSeconds = 18 * 3600; // 6 PM

            if (typeof tk.sunriseTime.totalSeconds === 'number') {
                riseSeconds = tk.sunriseTime.totalSeconds;
                setSeconds = tk.sunsetTime.totalSeconds;
            }

            stroke(nightColor);

            // Midnight to Sunrise
            let len = this.xSpiral.length;
            let totalDailyPts = this.numPointsPerTurn * 2;

            let idxRise = Math.floor((riseSeconds / 86400) * totalDailyPts);
            let idxSet = Math.floor((setSeconds / 86400) * totalDailyPts);

            // Clamp
            idxRise = Math.max(0, Math.min(idxRise, len - 1));
            idxSet = Math.max(0, Math.min(idxSet, len - 1));

            // 2. Draw Night (Midnight -> Sunrise)
            // Only draw day/night colors if we are NOT waiting for location data
            if (!window.IsLoadingLocation) {
                stroke(nightColor);
                if (idxRise > 0) {
                    beginShape();
                    for (let i = 0; i <= idxRise; i++) {
                        if (i < len) vertex(this.centerX + this.xSpiral[i], this.centerY + this.ySpiral[i]);
                    }
                    endShape();
                }

                // 3. Draw Day (Sunrise -> Sunset)
                stroke(dayColor);
                if (idxSet > idxRise) {
                    beginShape();
                    for (let i = idxRise; i <= idxSet; i++) {
                        if (i < len) vertex(this.centerX + this.xSpiral[i], this.centerY + this.ySpiral[i]);
                    }
                    endShape();
                }

                // 4. Draw Night (Sunset -> Midnight)
                stroke(nightColor);
                if (idxSet < len - 1) {
                    beginShape();
                    for (let i = idxSet; i < len; i++) {
                        vertex(this.centerX + this.xSpiral[i], this.centerY + this.ySpiral[i]);
                    }
                    endShape();
                }
            }
        } else {
            // DUAL-LOCATION MODE: Draw outer and inner spirals

            // Draw outer spiral (user location)
            this._drawSpiralTrack(this.xSpiral, this.ySpiral, tk.sunriseTime, tk.sunsetTime,
                dayColor, nightColor, baseColor, true, 0, this.outerStrokeWeight);

            // Draw inner spiral (other location) with rotation offset
            const tzDiffHours = locManager.getTimezoneOffsetDifference();
            this._drawSpiralTrack(this.xSpiralInner, this.ySpiralInner, tk.otherSunriseTime, tk.otherSunsetTime,
                dayColor, nightColor, baseColor, true, tzDiffHours, this.innerStrokeWeight);
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
    _drawSpiralTrack(xArray, yArray, sunriseTime, sunsetTime, dayColor, nightColor, baseColor, hasValidLocation, tzOffsetHours, weight = null) {
        // 1. Draw Base Track (Gray)
        if (weight !== null) strokeWeight(weight);
        else strokeWeight(this.spiralStrokeWeight);

        stroke(baseColor);
        this._applyShadow(12, 0, 4, 'rgba(0,0,0,0.3)');
        beginShape();
        for (let i = 0; i < xArray.length; i++) {
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

                // Log removed to avoid console spam in draw loop
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
        if (!window.IsLoadingLocation) {
            if (idxRise < idxSet) {
                // NORMAL CASE: Sunrise occurs before Sunset in the 24-hour spiral
                // 2. Draw Night (Midnight -> Sunrise)
                stroke(nightColor);
                if (idxRise > 0) {
                    beginShape();
                    for (let i = 0; i <= idxRise; i++) {
                        if (i < len) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }

                // 3. Draw Day (Sunrise -> Sunset)
                stroke(dayColor);
                beginShape();
                for (let i = idxRise; i <= idxSet; i++) {
                    if (i < len) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                }
                endShape();

                // 4. Draw Night (Sunset -> Midnight)
                stroke(nightColor);
                if (idxSet < len - 1) {
                    beginShape();
                    for (let i = idxSet; i < len; i++) {
                        vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }
            } else if (idxRise > idxSet) {
                // WRAPPED CASE: Sunset occurs before Sunrise in terms of circular index
                // (This happens when the other location's daylight period crosses our local midnight)

                // 2. Draw Day (Midnight -> Sunset)
                stroke(dayColor);
                if (idxSet > 0) {
                    beginShape();
                    for (let i = 0; i <= idxSet; i++) {
                        if (i < len) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }

                // 3. Draw Night (Sunset -> Sunrise)
                stroke(nightColor);
                beginShape();
                for (let i = idxSet; i <= idxRise; i++) {
                    if (i < len) vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                }
                endShape();

                // 4. Draw Day (Sunrise -> Midnight)
                stroke(dayColor);
                if (idxRise < len - 1) {
                    beginShape();
                    for (let i = idxRise; i < len; i++) {
                        vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                    }
                    endShape();
                }
            } else {
                // SPECIAL CASE: Sun never rises/sets or indices are identical
                // Default to night for now (matches 0 rise/set indices for "always dark")
                stroke(nightColor);
                beginShape();
                for (let i = 0; i < len; i++) {
                    vertex(this.centerX + xArray[i], this.centerY + yArray[i]);
                }
                endShape();
            }
        }
    }

    // Draw tick marks along the spiral for 'SpiralHours' style
    // Based on legacy implementation: circles for hours, line segments for minutes
    drawSpiralTicks() {
        if (!this.xSpiral || this.xSpiral.length === 0) return;
        push();
        let localScale = this.fontSize / 40.0;
        let ww = this.spiralStrokeWeight;

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
    drawSpiralHours(xArray, yArray, rArray, isInner, locManager) {
        if (!xArray || xArray.length === 0) return;

        // Color differentiation: light green for inner spiral, yellow for outer
        if (isInner) {
            fill(150, 255, 150); // Light green for inner spiral
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

                // Logic to shift first hour label rightward in dual mode
                let shift = 0;
                let currentTextAlign = CENTER;
                if (h === 0 && this.isDualLocationMode) {
                    shift = (this.fontSize * scale) * 0.5;
                    currentTextAlign = LEFT;
                }

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

                // Logic to shift first hour label rightward in dual mode
                let shift = 0;
                let currentTextAlign = CENTER;
                if (h === 0 && this.isDualLocationMode) {
                    shift = (this.fontSize * scale) * 0.1; // Small shift for AM/PM layout
                    currentTextAlign = LEFT;
                }

                // Removed 1.008 tweak for true centering
                let ri2 = r;

                // Calculate x,y with tweak
                let x = this.centerX + cos(theta) * ri2;
                let y = this.centerY + sin(theta) * ri2;

                // Halved margin for tighter AM/PM grouping; suffix increased for inner spiral readability
                let hourStr = str(hour12);
                let ampmSize = (this.fontSize * scale) * (isInner ? 0.65 : 0.45);
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
    drawInnerSpiralHours(locManager) {
        if (!this.xSpiralInner || this.xSpiralInner.length === 0) return;
        if (!locManager) return;

        // In dual mode, we always show hours for the inner spiral regardless of the toggle
        // because the toggle only applies to the primary/outer spiral in single mode.
        if (!locManager.hasOtherLocation()) return;

        fill(150, 255, 150); // Light green for inner spiral (distinct from day/night blues)
        noStroke();

        // Smaller text size for inner spiral (reduced by 20% from 0.7)
        let originalTextSize = this.fontSize;
        // textSize(this.fontSize * 0.56); // Removed, now calculated per part
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.7)'); // Shadow for inner spiral numbers

        // Calculate timezone difference
        const tzDiffHours = locManager.getTimezoneOffsetDifference();

        // For 24-hour mode or 12-hour mode
        for (let h = 0; h <= 24; h++) {
            // Calculate what hour this position represents at the "other" location
            let otherHour = (h + tzDiffHours + 24) % 24;

            // Calculate position on inner spiral
            let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));
            if (idx >= this.radiusSpiralInner.length) idx = this.radiusSpiralInner.length - 1;

            let r = this.radiusSpiralInner[idx];
            let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;
            let ri2 = r;

            let x = this.centerX + cos(theta) * ri2;
            let y = this.centerY + sin(theta) * ri2;

            // Shift 12 o'clock position (h===0) rightward to avoid spiral label collision
            let shift = 0;
            let currentTextAlign = CENTER;
            if (h === 0 && this.isDualLocationMode) {
                shift = (this.fontSize * 0.60) * 0.3; // Small shift to be just inside spiral
                currentTextAlign = LEFT;
            }

            if (this.timeFormat === '24') {
                // 24-hour mode: simple 0-23
                let displayStr = str(Math.floor(otherHour));
                let digitSize = this.fontSize * 0.60;

                textSize(digitSize);
                textAlign(currentTextAlign === LEFT ? LEFT : CENTER, CENTER);
                text(displayStr, x + shift, y);
            } else {
                // 12-hour mode: display with AM/PM
                let hour12 = otherHour % 12;
                if (hour12 === 0) hour12 = 12;
                let ampm = (otherHour < 12) ? 'A' : 'P';

                let hourStr = str(hour12);
                let digitSize = this.fontSize * 0.60;
                let ampmSize = this.fontSize * 0.65; // Increased from 0.44 for readability
                let margin = this.fontSize * 0.04;   // Halved from 0.08

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
     * Draw hour labels on the outer spiral for Classic mode
     * Shows the local/user location's time (works in both single and dual modes)
     */
    drawOuterSpiralHours(locManager) {
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        // Only draw if hours are enabled OR we are in dual mode (where clarification is needed)
        if (!this.hoursVisible && !this.isDualLocationMode) return;

        fill(255, 235, 120); // Yellow for outer spiral
        noStroke();

        let originalTextSize = this.fontSize;
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

            // Shift 12 o'clock position (h===0) rightward in both single and dual modes
            let shift = 0;
            let currentTextAlign = CENTER;
            if (h === 0) {
                shift = (this.fontSize * 0.63) * 0.3; // Small shift to be just inside spiral
                currentTextAlign = LEFT;
            }

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
    drawSpiralLabels(locManager) {
        if (!this.xSpiral || this.xSpiral.length === 0) return;
        if (!this.xSpiralInner || this.xSpiralInner.length === 0) return;

        let labelColor = color(255, 235, 120);
        fill(labelColor);
        noStroke();
        textStyle(BOLD);
        textAlign(RIGHT, CENTER);

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.8)');

        let margin = this.fontSize * 0.2;

        // Determine font sizes based on style (match hour numbers)
        let outerFontSize = this.fontSize * 0.63; // Classic default
        let innerFontSize = this.fontSize * 0.50; // Classic inner default

        if (this.style === 'SpiralHours') {
            outerFontSize = this.fontSize * 1.02; // Reduced further to match new HIS hours
            innerFontSize = this.fontSize * 0.58; // matching HIS inner digitSize
        }

        // 1. Label for Outer Spiral ("Local")
        textSize(outerFontSize);
        let x1 = this.centerX + this.xSpiral[0] - margin;
        let y1 = this.centerY + this.ySpiral[0];
        text("Local", x1, y1);

        // 2. Label for Inner Spiral (City Name or "Other") - use light green to match inner spiral hours
        fill(150, 255, 150); // Light green for inner spiral label
        textSize(innerFontSize);
        let cityName = locManager.otherLocation.cityName || "Other";
        // Extract just the city name if comma-separated
        if (cityName.includes(',')) cityName = cityName.split(',')[0].trim();

        let x2 = this.centerX + this.xSpiralInner[0] - margin;
        let y2 = this.centerY + this.ySpiralInner[0];
        text(cityName, x2, y2);

        this._resetShadow();
        textStyle(NORMAL);
    }


    drawDayLabels(tk, locManager) {
        // Only show day labels in Classic mode
        if (this.style !== 'Classic') return;

        // Hide DOW abbreviations in dual mode as requested
        if (this.isDualLocationMode) return;

        if (typeof IsGmtShown !== 'undefined' && IsGmtShown) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        // ... existing day label logic ...
        // (It was at the bottom of the previous file view, assuming it's correct)

        // Just redundant check removal for safely rendering:
        let dayNames = ["su", "m", "tu", "w", "th", "f", "sa"];
        let todayIdx = tk.dayOfWeek;
        let nextDayIdx = (todayIdx + 1) % 7;

        let labelColor = color(255, 235, 120); // Softer yellow
        fill(labelColor);
        noStroke();
        textSize(this.fontSize);
        textStyle(BOLD);
        textAlign(RIGHT, CENTER); // RIGHT align so text appears to the left of the spiral start

        this._applyShadow(6, 0, 3, 'rgba(0,0,0,0.8)'); // More visible shadow for text

        let xOffset = -5; // Small negative offset to position just outside spiral start

        // Start (Outer) - show today's day abbreviation
        let idxStart = 0;
        text(dayNames[todayIdx], this.centerX + this.xSpiral[idxStart] + xOffset, this.centerY + this.ySpiral[idxStart]);

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

    drawHands(tk) {
        if (this.style === 'SpiralHours') {
            this.drawHandsLegacySpiral(tk);
        } else {
            this.drawHandsClassic(tk);
        }
    }

    drawHandsClassic(tk) {
        push();
        let handColor = color(255);
        stroke(handColor);
        strokeCap(ROUND);
        this._applyShadow(10, 0, 4, 'rgba(0,0,0,0.5)'); // Hand shadows

        // Classic logic (Time on the outer ring mostly, but Hour hand follows spiral? 
        // Actually DaySpiral description says "Hour hand tip follows the day spiral")
        // So Classic should ALSO follow the spiral for the hour hand?
        // "Hour hand tip follows the day spiral, making 1 turn for AM and 1 for PM."

        // Yes, even in Classic mode, the hour hand tracks the spiral.
        // The difference is mainly the face/ticks style.

        // Let's use the unified logic but cleaner.

        let secAngle = map(Math.floor(tk.seconds), 0, 60, 0, TWO_PI) - HALF_PI;
        let minAngle = map(tk.minutes + tk.seconds / 60, 0, 60, 0, TWO_PI) - HALF_PI;
        // Hour angle (0-24 mapped to 0-4PI)
        let hourAngle = map(tk.hours + tk.minutes / 60, 0, 24, 0, TWO_PI * 2) - HALF_PI;

        // Radii for Classic:
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

        let radii = this._getOvalTipRadii(hIdx);
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

    drawHandsLegacySpiral(tk) {
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

        let radii = this._getOvalTipRadii(hIdx);

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
                // Existing percentages for Classic
                outerStrokeWeight = spacePerTurn * 0.42;
                gapBetweenSpirals = spacePerTurn * 0.02; // increased from 0.01 to prevent touching
                innerStrokeWeight = spacePerTurn * 0.35;
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
    _getOvalTipRadii(hIdx) {
        // Clamp index
        if (hIdx < 0) hIdx = 0;
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        // Default to Outer/Single Spiral center
        let rCenter = this.radiusSpiral[hIdx];
        let rMin, rMax;

        if (this.isDualLocationMode && this.radiusSpiralInner && this.radiusSpiralInner[hIdx]) {
            let rInnerCenter = this.radiusSpiralInner[hIdx];

            // Bounds: Inner Edge of Inner Spiral -> Outer Edge of Outer Spiral
            // Sync with generateSpiralPoints weights
            let innerW = this.innerStrokeWeight || this.spiralStrokeWeight;
            let outerW = this.outerStrokeWeight || this.spiralStrokeWeight;

            rMin = rInnerCenter - (innerW / 2);
            rMax = rCenter + (outerW / 2);

        } else {
            // Single Mode
            let w = this.spiralStrokeWeight;
            rMin = rCenter - (w / 2);
            rMax = rCenter + (w / 2);
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

        let w = this.fontSize * 1.1; // Width of capsule (tangential)

        translate(this.centerX, this.centerY);
        rotate(hourAngle);

        rectMode(CORNERS);
        let padding = 4;
        // Reduced extra padding further as requested (0.48 -> 0.32)
        let extra = (this.fontSize * 0.32) + padding;

        let startX = rMin - extra;
        let endX = rMax + extra;
        let halfW = w / 2;

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
}
