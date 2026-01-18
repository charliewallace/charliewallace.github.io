
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

        this.bkColor = 57; // #393939 (Middle ground between #222 and #505050)
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
        let endRadius = radius * 0.60;

        if (this.style === 'SpiralHours') {
            // Legacy V3 settings for 'Hours in Spiral'
            startRadius = radius * 0.39;
            endRadius = radius * 0.81;
            this.spiralStrokeWeight = radius * 0.2;

            // Adjust ClockDiameter/Face for this mode?
            // Legacy: InnerFaceRadius = ClockDiameter/2; 
            // In SpiralHours mode, the gray face background might need to behave differently,
            // but for now we'll stick to the spiral dimensions.
        } else {
            // Classic
            let nTurns = 2;
            let deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;
            this.spiralStrokeWeight = deltaRadiusPerTurn * 0.66;
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
        background(this.bkColor);

        // Draw Outer Face Background (White Ring) - Only for Classic
        if (this.style === 'Classic') {
            noStroke();
            fill(255);
            ellipse(this.centerX, this.centerY, this.clockDiameter, this.clockDiameter);

            // Draw Inner Face (Dark Gray)
            fill(100);
            ellipse(this.centerX, this.centerY, this.faceDiameter, this.faceDiameter);

            // Draw Ticks
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
            // SpiralHours Mode Background
            // Legacy had: fill(120) ellipse(CenterX, CenterY*0.95, InnerFaceRadius*2, ...)
            // We'll keep it simple or use current colors.
            // Maybe just a dark gray circle?
            /*
            noStroke();
            fill(this.bkColor); // or slightly lighter?
            ellipse(this.centerX, this.centerY, this.clockDiameter, this.clockDiameter);
            */
        }

        if (this.style === 'Classic') {
            this.drawHourLabels();
        }

        this.drawSpiral(timeKeeper, locManager);

        if (this.style === 'SpiralHours') {
            this.drawSpiralTicks();
            this.drawSpiralHours();
        }

        this.drawDayLabels(timeKeeper);

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

        // 1. Draw Base Track (Gray)
        stroke(baseColor);
        beginShape();
        for (let i = 0; i < this.xSpiral.length; i++) {
            vertex(this.centerX + this.xSpiral[i], this.centerY + this.ySpiral[i]);
        }
        endShape();

        // Calculate sunset/sunrise indices
        let riseSeconds = 6 * 3600; // 6 AM
        let setSeconds = 18 * 3600; // 6 PM

        if (loc.hasValidLocation && typeof tk.sunriseTime.totalSeconds === 'number') {
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
    drawSpiralHours() {
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        fill(255, 255, 0); // Yellow numbers for visibility
        noStroke();

        // Slightly larger text size for hour numbers
        let originalTextSize = this.fontSize;
        textSize(this.fontSize * 1.4); // Increased from 1.2
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        let totalPoints = this.radiusSpiral.length;

        if (this.timeFormat === '24') {
            // 24-hour mode: Display 0-23
            for (let h = 0; h <= 23; h++) {
                let displayStr = str(h);

                // Calculate index in the spiral array
                let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));

                // Clamp
                if (idx >= this.radiusSpiral.length) idx = this.radiusSpiral.length - 1;

                let r = this.radiusSpiral[idx];

                // Calculate angle
                let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;

                // Legacy tweak: ri2 = ri * 1.008;
                let ri2 = r * 1.008;

                // Calculate x,y with tweak
                let x = this.centerX + cos(theta) * ri2;
                let y = this.centerY + sin(theta) * ri2;

                text(displayStr, x, y);
            }
        } else {
            // 12-hour mode: Display with AM/PM stacked

            for (let h = 0; h <= 23; h++) {
                let hour12 = h % 12;
                if (hour12 === 0) hour12 = 12; // 0 -> 12, 12 -> 12

                let ampm = (h < 12) ? 'A' : 'P';

                // Calculate index in the spiral array
                let idx = Math.floor((h / 24.0) * (this.numPointsPerTurn * 2));

                // Clamp
                if (idx >= this.radiusSpiral.length) idx = this.radiusSpiral.length - 1;

                let r = this.radiusSpiral[idx];

                // Calculate angle
                let theta = (TWO_PI * (idx / this.numPointsPerTurn)) - HALF_PI;

                // Legacy tweak
                let ri2 = r * 1.008;

                // Calculate x,y with tweak
                let x = this.centerX + cos(theta) * ri2;
                let y = this.centerY + sin(theta) * ri2;

                // Draw hour number
                let hourStr = str(hour12);
                let hourWidth = textWidth(hourStr);
                text(hourStr, x, y);

                // Draw stacked AM/PM indicator - aligned to right edge of number
                push();
                let ampmSize = this.fontSize * 0.35;
                textSize(ampmSize);
                textStyle(BOLD); // Ensure bold for AM/PM too for consistency

                // Position AM/PM to the right of the number's right edge
                let margin = this.fontSize * 0.12;
                let offsetX = (hourWidth / 2) + margin;

                // Draw 'A' or 'P' slightly above middle, 'M' slightly below
                textAlign(LEFT, CENTER);
                let verticalSpacing = ampmSize * 0.42;

                text(ampm, x + offsetX, y - verticalSpacing);
                text('M', x + offsetX, y + verticalSpacing);

                pop();
            }
        }

        // Restore
        textStyle(NORMAL);
        textSize(originalTextSize);
    }

    drawDayLabels(tk) {
        // Only show day labels in Classic mode
        if (this.style !== 'Classic') return;

        if (typeof IsGmtShown !== 'undefined' && IsGmtShown) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        // ... existing day label logic ...
        // (It was at the bottom of the previous file view, assuming it's correct)

        // Just redundant check removal for safely rendering:
        let dayNames = ["su", "m", "tu", "w", "th", "f", "sa"];
        let todayIdx = tk.dayOfWeek;
        let nextDayIdx = (todayIdx + 1) % 7;

        let labelColor = color(255, 255, 0); // Yellow
        fill(labelColor);
        noStroke();
        textSize(this.fontSize);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        // Start (Outer)
        let idxStart = 0;
        text(dayNames[todayIdx], this.centerX + this.xSpiral[idxStart], this.centerY + this.ySpiral[idxStart]);

        // End (Inner)
        let idxEnd = this.xSpiral.length - 1;
        // Only draw inner label if spiral is fully generating 24h
        if (idxEnd > 0) {
            text(dayNames[nextDayIdx], this.centerX + this.xSpiral[idxEnd], this.centerY + this.ySpiral[idxEnd]);
        }

        textStyle(NORMAL);
    }

    drawGMT(locManager) {
        if (!locManager || !locManager.hasValidLocation) return;
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        fill(255, 255, 0); // Yellow
        noStroke();
        textSize(this.fontSize * 0.9);
        textStyle(BOLD);

        let totalPoints = this.numPointsPerTurn * this.numTurns;

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

        // Draw Hour Hand (Tracks Spiral)
        // Find radius at current hour
        let totalPoints = this.numPointsPerTurn * 2;
        let hIdx = Math.floor((tk.hours + tk.minutes / 60) / 24.0 * totalPoints);
        if (hIdx >= this.radiusSpiral.length) hIdx = this.radiusSpiral.length - 1;

        let rHour = this.radiusSpiral[hIdx];

        strokeWeight(Math.max(3, this.secondaryStrokeWeight * 1.2));
        line(this.centerX, this.centerY, this.centerX + cos(hourAngle) * rHour, this.centerY + sin(hourAngle) * rHour);

        // Classic mode has no circle at tip usually? 
        // The original DaySpiralRenderer I wrote didn't have it.

        pop();
    }

    drawHandsLegacySpiral(tk) {
        // Legacy "Hours in Spiral" Hand Logic
        push();
        let handColor = color(255);
        stroke(handColor);

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

        // Hour Hand
        strokeWeight(hourWeight);
        strokeCap(ROUND);
        line(this.centerX, this.centerY, this.centerX + cos(hourRads) * hoursRadius, this.centerY + sin(hourRads) * hoursRadius);

        // Circle at tip (Legacy Feature)
        noFill();
        strokeWeight(3);
        stroke(255);
        let tipSize = 32 * localScale;
        ellipse(this.centerX + cos(hourRads) * hoursRadius,
            this.centerY + sin(hourRads) * hoursRadius,
            tipSize, tipSize);

        pop();
    }



    generateSpiralPoints(startRadius, endRadius) {
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
    }
}
