
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
            this.generateSpiralPoints();
            this.initialized = true;
        }
    }

    resize(w, h) {
        this.centerX = w / 2;
        this.centerY = h / 2;

        let minDim = Math.min(w, h);
        let radius = minDim / 2;

        // ORIGINAL RATIOS from sketch.js reInit()
        // ClockDiameter = radius * 1.78
        // HourNumbersRadius = radius * 0.83
        // InnerFaceRadius = HourNumbersRadius * 0.93 = 0.7719 * radius
        // Spiral Start/End (from genSpiral with smallerDim=radius): 0.24 to 0.6

        this.clockDiameter = radius * 1.78;
        this.diameter = this.clockDiameter; // Critical fix: Initialize diameter for drawHands
        this.faceDiameter = (radius * 0.83 * 0.93) * 2; // InnerFaceRadius * 2
        this.numbersRadius = radius * 0.83;

        // Spiral settings
        let startRadius = radius * 0.24;
        let endRadius = radius * 0.60;
        let nTurns = 2;
        let deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;

        this.spiralStrokeWeight = deltaRadiusPerTurn * 0.66;
        this.secondaryStrokeWeight = this.spiralStrokeWeight * 0.33;

        // Font size from original: SpiralFontSize = SpiralStrokeWeight * 0.66
        // But for hour numbers, they might use a different size?
        // reInit says: RefFontSize = 40; FontScaleFactor = smallerDim / 950;
        let fontScale = (minDim) / 950; // smallerDim is minDim here? No, smallerDim in reInit was min(w,h).
        this.fontSize = 40 * fontScale;

        // Generate spiral
        this.generateSpiralPoints(startRadius, endRadius);
    }

    update(timeKeeper, locManager) {
        if (!this.active) return;

        // p5.js drawing calls
        background(this.bkColor);

        // Draw Outer Face Background (White Ring)
        noStroke();
        fill(255);
        // Original ClockDiameter is the white circle
        ellipse(this.centerX, this.centerY, this.clockDiameter, this.clockDiameter);

        // Draw Inner Face (Dark Gray)
        fill(100);
        ellipse(this.centerX, this.centerY, this.faceDiameter, this.faceDiameter);

        // Draw Ticks - small white dots marking number positions
        fill(255);
        noStroke();
        for (let b = 0; b < 360; b += 30) {
            let angle = radians(b);
            // Place dots at OUTER edge of gray face (visible against gray, near white)
            let dotRadius = (this.faceDiameter / 2) * 0.98;
            let x = this.centerX + cos(angle) * dotRadius;
            let y = this.centerY + sin(angle) * dotRadius;
            // Larger dots as requested
            let dotSize = this.fontSize * 0.25;
            ellipse(x, y, dotSize, dotSize);
        }

        this.drawHourLabels();
        this.drawSpiral(timeKeeper, locManager);
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
        let dayColor = color(0x84, 0xd2, 0xf1);
        let nightColor = color(20, 80, 100);
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

    drawDayLabels(tk) {
        // Hide DOW labels if GMT is shown
        if (typeof IsGmtShown !== 'undefined' && IsGmtShown) return;

        if (!this.xSpiral || this.xSpiral.length === 0) return;

        let dayNames = ["su", "m", "tu", "w", "th", "f", "sa"];
        let todayIdx = tk.dayOfWeek;
        let nextDayIdx = (todayIdx + 1) % 7;

        let labelColor = color(255, 255, 0); // Yellow
        fill(labelColor);
        noStroke();
        textSize(this.fontSize);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);

        // Start of spiral (Outer) - Represents 0:00 Today
        let idxStart = 0;
        text(dayNames[todayIdx], this.centerX + this.xSpiral[idxStart], this.centerY + this.ySpiral[idxStart]);

        // End of spiral (Inner) - Represents 24:00 Today
        let idxEnd = this.xSpiral.length - 1;
        text(dayNames[nextDayIdx], this.centerX + this.xSpiral[idxEnd], this.centerY + this.ySpiral[idxEnd]);
    }

    // Draw GMT hours on the spiral
    drawGMT(loc) {
        if (!this.xSpiral || this.xSpiral.length === 0) return;

        let gmtColor = color(255, 255, 0); // Yellow
        fill(gmtColor);
        noStroke();
        textSize(this.fontSize * 0.9);
        textStyle(BOLD);

        let totalPoints = this.numPointsPerTurn * this.numTurns;

        for (let h = 0; h <= 24; h++) {
            // Find spiral index for this hour (0..24)
            let idx = Math.floor((h / 24.0) * totalPoints);
            if (idx >= this.xSpiral.length) idx = this.xSpiral.length - 1;

            // Calc GMT Hour
            let gmtH = h - loc.tzOffset;
            gmtH = gmtH % 24;
            if (gmtH < 0) gmtH += 24;

            let label = str(Math.floor(gmtH));
            let x = this.centerX + this.xSpiral[idx];
            let y = this.centerY + this.ySpiral[idx];

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
    }

    drawHands(tk) {
        push(); // Isolate state

        // Hands: White
        let handColor = color(255);

        stroke(handColor);
        strokeCap(ROUND);

        // Angles
        // Discrete second movement as requested ("moves the second hand once per second")
        let secAngle = map(Math.floor(tk.seconds), 0, 60, 0, TWO_PI) - HALF_PI;
        let minAngle = map(tk.minutes + tk.seconds / 60, 0, 60, 0, TWO_PI) - HALF_PI;
        let hourAngle = map(tk.hours + tk.minutes / 60, 0, 24, 0, TWO_PI * 2) - HALF_PI;

        // Radii
        // "Second hand should be just a bit shorter than the radius of the main gray clock circle"
        // faceRadius = faceDiameter / 2.
        let faceRadius = this.faceDiameter / 2;
        let rSec = faceRadius * 0.96;

        // "Minute hand should be lengthened by about 15%, keeping it about 10% shorter than the second hand"
        // If rSec is ~0.74 radius, previous rMin was ~0.61. 
        // Let's use 0.9 * rSec.
        let rMin = rSec * 0.90;

        // Second Hand: Thinner
        strokeWeight(Math.max(1.2, this.secondaryStrokeWeight * 0.35));
        line(this.centerX, this.centerY, this.centerX + cos(secAngle) * rSec, this.centerY + sin(secAngle) * rSec);

        // Minute Hand: Thinner
        strokeWeight(Math.max(2.2, this.secondaryStrokeWeight * 0.7));
        line(this.centerX, this.centerY, this.centerX + cos(minAngle) * rMin, this.centerY + sin(minAngle) * rMin);

        // Hour Hand
        let totalPoints = this.numPointsPerTurn * 2;
        let hourProgress = (tk.totalSecondsToday / 86400);

        let idx = Math.floor(hourProgress * totalPoints);
        if (idx < 0) idx = 0;
        if (idx >= this.radiusSpiral.length) idx = this.radiusSpiral.length - 1;

        let rHour = this.radiusSpiral[idx];

        let hWeight = Math.max(6, this.secondaryStrokeWeight * 1.2);

        stroke(255);
        strokeWeight(hWeight);
        strokeCap(SQUARE);

        // User: "hour hand doesn't protrude into the center of the tip circle... subtle shortening"
        // Stop at the edge of the tip circle
        let tipDiam = hWeight * 1.66;
        let rHourStop = rHour - tipDiam / 2;
        line(this.centerX, this.centerY, this.centerX + cos(hourAngle) * rHourStop, this.centerY + sin(hourAngle) * rHourStop);

        // Tip Circle
        // User: "radius too large, reduce by 15%, and reduce line weight by 15%"
        // Previous diam factor 1.95 * 0.85 = 1.6575
        // Previous weight factor 0.6 * 0.85 = 0.51
        noFill();
        stroke(255);
        strokeWeight(Math.max(3, hWeight * 0.51));

        // tipDiam already calculated above
        ellipse(this.centerX + cos(hourAngle) * rHour, this.centerY + sin(hourAngle) * rHour, tipDiam, tipDiam);

        // Center Circle
        fill(255);
        noStroke();
        ellipse(this.centerX, this.centerY, hWeight * 1.1, hWeight * 1.1);

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
