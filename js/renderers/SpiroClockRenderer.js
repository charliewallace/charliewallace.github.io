// SpiroClock - Web port of SteamPunkClock1 C# application
// Original: (c)2008 by Charles L. Wallace
// Ported to p5.js
//
// Interface follows ClockRenderer pattern for CoolweirdClocks integration:
//   constructor(options)  – configure without side-effects
//   init()                – one-time setup (no-op for now)
//   activate() / deactivate() – show/hide this renderer
//   resize(w, h)          – recompute layout for given dimensions
//   update()              – draw one frame (skipped when inactive)

// =============================================================================
// SpiroClock class — self-contained renderer for CoolweirdClocks integration
// =============================================================================
class SpiroClock {
  constructor(options = {}) {
    // Configuration constants (from C#)
    this.FIXED_RING_OUTER_RADIUS_FRAC = 0.95;
    this.HOUR12_RING_WIDTH_FRAC = 0.83;
    this.INNER_TWEAK_FRAC = 0.95;
    this.NUM_LABELS = 12;
    this.START_LABEL = 1;
    this.START_OFFSET = 1;

    // Label sets for each ring
    this.HOUR_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    this.MIN60_LABELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
    this.MIN5_LABELS = [1, 2, 3, 4, 5];
    this.SEC60_LABELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

    // Options (host app passes these; standalone bootstrap reads URL hash)
    this.keepNumbersHoriz = options.keepNumbersHoriz || false;

    // State
    this.active = false;

    // Layout (computed in resize / initLayout)
    this.clockCenter = { x: 0, y: 0 };
    this.clientRadius = 0;
    this.fixedRingOuterRadius = 0;
    this.fixedRingInnerRadius = 0;
    this.labelRadius = 0;
    this.labelHeight = 0;
    this.numberCenterArray = [];
  }

  // ---- ClockRenderer interface methods ----

  init() {
    // One-time initialization — no-op for now, ready for future use
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }

  resize(w, h) {
    this.initLayout(w, h);
  }

  // ---- Layout (ported from InitUnchangingClockValues) ----
  initLayout(w, h) {
    this.clockCenter = { x: w / 2, y: h / 2 };
    this.clientRadius = min(w, h) / 2;

    this.fixedRingOuterRadius = this.clientRadius * this.FIXED_RING_OUTER_RADIUS_FRAC;
    let innerFrac = this.FIXED_RING_OUTER_RADIUS_FRAC * this.HOUR12_RING_WIDTH_FRAC;
    this.fixedRingInnerRadius = this.clientRadius * innerFrac;
    this.labelRadius = (this.fixedRingOuterRadius + this.fixedRingInnerRadius) / 2;
    this.labelHeight = (this.fixedRingOuterRadius - this.fixedRingInnerRadius) * 0.7;
  }

  // ---- Main update (ported from timer1_Tick + UpdateClock) ----
  update() {
    if (!this.active) return;

    // Current time with fractional parts for smooth movement
    let now = new Date();
    let hour24 = now.getHours();
    let rawSec = now.getSeconds();
    let rawMin = now.getMinutes();
    let sec = rawSec + now.getMilliseconds() / 1000;
    let min = rawMin + sec / 60;
    let hour12 = (hour24 % 12) + min / 60;

    // Integer values for indicator labels
    let hourDisplay = hour24 % 12;
    if (hourDisplay === 0) hourDisplay = 12;
    let minDisplay = rawMin === 0 ? 60 : rawMin;
    let min5Display = ((rawMin - 1) % 5) + 1;
    if (rawMin === 0) min5Display = 5;
    let secDisplay = rawSec === 0 ? 60 : rawSec;

    // Rotation angles
    let hourAngle = (hour12 / 12) * TWO_PI;
    let minute60Angle = (min / 60) * TWO_PI;
    let minute5Angle = (minute60Angle * 12) % TWO_PI;
    let second60Angle = (sec / 60) * TWO_PI;
    minute60Angle -= HALF_PI;
    second60Angle -= HALF_PI;

    // Digital time (upper right)
    push();
    textAlign(RIGHT, TOP); textSize(16); textStyle(NORMAL);
    fill(0); noStroke();
    text(now.toLocaleTimeString(), width - 15, 12);
    pop();

    // --- Static hour ring ---
    push(); noFill(); stroke(0); strokeWeight(2);
    ellipse(this.clockCenter.x, this.clockCenter.y,
      this.fixedRingOuterRadius * 2, this.fixedRingOuterRadius * 2);
    pop();

    // Hour ring with 12 ticks (no indicator on static ring itself)
    this.drawRing(this.clockCenter,
      this.fixedRingOuterRadius, this.fixedRingInnerRadius,
      255, 128, 0,
      0, -HALF_PI, 12, 0, false, false, null, null,
      this.HOUR_LABELS, -HALF_PI);

    // --- Nested gears ---
    let twk = this.INNER_TWEAK_FRAC;
    let h12wf = this.HOUR12_RING_WIDTH_FRAC * twk;
    let m60wf = h12wf * twk;
    let m5wf = m60wf * twk;
    let s60wf = m5wf * twk;

    let r1 = this.drawSpiroRing(hourAngle - HALF_PI, 12, 12,
      this.clockCenter, this.fixedRingInnerRadius, h12wf, 0,
      this.MIN60_LABELS, str(hourDisplay));

    let r2 = this.drawSpiroRing(minute60Angle + HALF_PI, 12, 5,
      r1.center, r1.innerR, m60wf, r1.angle,
      this.MIN5_LABELS, str(minDisplay));

    let r3 = this.drawSpiroRing(minute5Angle, 5, 12,
      r2.center, r2.innerR, m5wf, r2.angle,
      this.SEC60_LABELS, str(min5Display));

    this.drawSpiroRing(second60Angle, 12, 0,
      r3.center, r3.innerR, s60wf, r3.angle + HALF_PI,
      null, str(secDisplay));
  }

  // ---- drawRing ----
  // Draws a white ring with tick-mark notches, optional indicator discs,
  // and optional labels at tick positions.
  drawRing(center, outerR, innerR, ringClr, bkgClr, discClr,
    gearRot, gearOrigin, nInner, nOuter, bInnerDisc, bOuterDisc,
    indicatorLabel, indicatorLabelInner,
    labels, labelAngleOrigin) {
    let midR = (outerR + innerR) / 2;
    let rw = outerR - innerR;
    let angle = gearRot + gearOrigin;
    let tickFrac = 0.2;
    let tickLen = tickFrac * rw;
    let discDiam = tickLen * 2 * outerR / innerR;

    // Shadow effect — draw a slightly offset darker ring underneath
    push(); noFill();
    stroke(0, 0, 0, 60);
    strokeWeight(rw);
    let shadowOff = max(2, rw * 0.06);
    ellipse(center.x + shadowOff, center.y + shadowOff, midR * 2, midR * 2);
    pop();

    // White ring
    push(); noFill(); stroke(ringClr); strokeWeight(rw);
    ellipse(center.x, center.y, midR * 2, midR * 2);
    pop();

    // Inner ticks
    if (nInner > 0) {
      let da = TWO_PI / nInner;
      push(); fill(bkgClr); noStroke();
      for (let ta = 0; ta < TWO_PI - 0.001; ta += da) {
        let tx = cos(angle + ta) * innerR + center.x;
        let ty = sin(angle + ta) * innerR + center.y;
        if (tickLen * 2 >= 1) ellipse(tx, ty, tickLen * 2, tickLen * 2);
      }
      pop();
    }

    // Outer ticks
    if (nOuter > 0) {
      let otl = tickLen * outerR / innerR;
      let da = TWO_PI / nOuter;
      push(); fill(bkgClr); noStroke();
      for (let ta = 0; ta < TWO_PI - 0.001; ta += da) {
        let tx = cos(angle + ta) * outerR + center.x;
        let ty = sin(angle + ta) * outerR + center.y;
        if (otl * 2 >= 1) ellipse(tx, ty, otl * 2, otl * 2);
      }
      pop();
    }

    // Labels at tick positions (rotate with the ring)
    if (labels && labels.length > 0 && rw > 8) {
      let n = labels.length;
      let da = TWO_PI / n;
      let fontSize = max(6, rw * 0.45);

      // Determine whether labels on this ring should rotate
      let isStaticRing = (labelAngleOrigin !== undefined && labelAngleOrigin !== null);
      let rotateLabels = !this.keepNumbersHoriz && !isStaticRing;

      // Shift moving-ring labels slightly inward for tick clearance
      let labelR = isStaticRing ? midR : midR - fontSize / 8;

      push();
      textAlign(CENTER, CENTER);
      textSize(fontSize);
      textStyle(BOLD);
      fill(0); noStroke();
      for (let i = 0; i < n; i++) {
        let la = angle + (i + 1) * da;
        // Use the label's angular origin if provided (for static ring)
        if (isStaticRing) {
          la = labelAngleOrigin + (i + 1) * da;
        }
        let lx = cos(la) * labelR + center.x;
        let ly = sin(la) * labelR + center.y;
        if (rotateLabels) {
          push();
          translate(lx, ly);
          rotate(la + HALF_PI);
          text(str(labels[i]), 0, 0);
          pop();
        } else {
          text(str(labels[i]), lx, ly);
        }
      }
      pop();
    }

    // Outer indicator disc with optional label
    if (bOuterDisc && discDiam >= 1) {
      let ix = cos(angle) * outerR + center.x;
      let iy = sin(angle) * outerR + center.y;
      push(); fill(discClr); noStroke();
      ellipse(ix, iy, discDiam, discDiam);
      // Yellow number inside indicator
      if (indicatorLabel && discDiam > 6) {
        fill(255, 255, 0);
        textAlign(CENTER, CENTER);
        textSize(max(6, discDiam * 0.5));
        textStyle(BOLD);
        text(indicatorLabel, ix, iy);
      }
      pop();
    }

    // Inner indicator disc (scaled down twice by innerR/outerR)
    if (bInnerDisc) {
      let id = discDiam * (innerR / outerR) * (innerR / outerR);
      if (id >= 1) {
        let ix = cos(angle) * innerR + center.x;
        let iy = sin(angle) * innerR + center.y;
        push(); fill(discClr); noStroke();
        ellipse(ix, iy, id, id);
        if (indicatorLabelInner && id > 6) {
          fill(255, 255, 0);
          textAlign(CENTER, CENTER);
          textSize(max(6, id * 0.5));
          textStyle(BOLD);
          text(indicatorLabelInner, ix, iy);
        }
        pop();
      }
    }
  }

  // ---- drawSpiroRing ----
  // Draws a gear rolling inside a ring, plus anti-gear and support gears.
  // Returns { center, innerR, angle } for chaining to the next gear.
  drawSpiroRing(curRot, cyclesPerRev, nTicks,
    ringCenter, ringRadius, widthFrac, rotOrigin,
    labels, indicatorLabel) {
    // --- Gear geometry ---
    let gearR = (cyclesPerRev - 1) * (ringRadius / cyclesPerRev);
    let offsetAngle = this._norm(-curRot * (cyclesPerRev - 1));
    let curRotNorm = this._norm(curRot);

    // Gear center
    let dx = cos(offsetAngle + rotOrigin) * (ringRadius - gearR);
    let dy = sin(offsetAngle + rotOrigin) * (ringRadius - gearR);
    let gc = { x: ringCenter.x + dx, y: ringCenter.y + dy };

    let gearInnerR = gearR * widthFrac;

    // Point of contact (POC) with outer ring
    let pocAngle = this._norm(offsetAngle + rotOrigin);
    let pocX = ringCenter.x + cos(pocAngle) * ringRadius;
    let pocY = ringCenter.y + sin(pocAngle) * ringRadius;

    // Gear angle (output)
    let gearAngle = this._norm(curRotNorm + rotOrigin);

    // Indicator tip
    let tipX = cos(gearAngle) * gearR + gc.x;
    let tipY = sin(gearAngle) * gearR + gc.y;

    // Distance² from indicator to POC
    let sepSq = (tipX - pocX) * (tipX - pocX) + (tipY - pocY) * (tipY - pocY);
    let rw = gearR - gearInnerR;

    // --- Determine if indicator should be red ---
    let toRedSq = rw * rw * 0.02;
    let fromRedSq = rw * rw * 6;
    let ad = gearAngle - pocAngle;
    if (ad >= PI) ad = -(TWO_PI - ad);
    else if (ad <= -PI) ad = TWO_PI + ad;
    let isRed = (ad < 0) ? (sepSq < toRedSq) : (sepSq < fromRedSq);

    // --- Draw gear outline + POC highlight arcs ---
    push(); noFill(); strokeWeight(1);
    stroke(0);
    ellipse(gc.x, gc.y, gearR * 2, gearR * 2);
    let pw = 30 * PI / 180;
    stroke(128);
    arc(gc.x, gc.y, gearR * 2, gearR * 2,
      pocAngle - pw / 2, pocAngle + pw / 2);
    stroke(192);
    arc(gc.x, gc.y, gearR * 2, gearR * 2,
      pocAngle - pw / 2.5, pocAngle + pw / 2.5);
    stroke(250);
    arc(gc.x, gc.y, gearR * 2, gearR * 2,
      pocAngle - pw / 3, pocAngle + pw / 3);
    pop();

    // --- Anti-gear (half black / half white spinning disc) ---
    let gap = 2 * (ringRadius - gearR);
    let agR = gap * 0.4;
    let rcToAg = ringRadius - (gap - agR);
    let agOffAngle = offsetAngle + PI;
    let agc = {
      x: ringCenter.x + cos(agOffAngle + rotOrigin) * rcToAg,
      y: ringCenter.y + sin(agOffAngle + rotOrigin) * rcToAg
    };
    let agAngle = -curRotNorm * (cyclesPerRev - 1) * (ringRadius + agR) / agR + rotOrigin;

    this._drawMiniGear(agc.x, agc.y, agR, agAngle, 10);

    // --- Support gears (2 smaller half-black/half-white discs) ---
    let sgR = agR * 0.6;
    let a = ringRadius - gap + agR;
    let b = ringRadius - sgR;
    let c = agR + sgR;
    let cosTheta = constrain((a * a + b * b - c * c) / (2 * a * b), -1, 1);
    let theta = acos(cosTheta);
    let rcToSg = ringRadius - sgR;
    let sgAngle = curRotNorm * (cyclesPerRev - 1) * (ringRadius - sgR) / sgR + rotOrigin;

    let nAG = 10, nSG = 6;

    for (let sign of [1, -1]) {
      let sga = agOffAngle + sign * theta;
      let sgc = {
        x: ringCenter.x + cos(sga + rotOrigin) * rcToSg,
        y: ringCenter.y + sin(sga + rotOrigin) * rcToSg
      };

      // Per-support-gear phase alignment at reference geometry
      let sgAngleAdj = sgAngle;
      if (sgR >= 8) {
        let refDir = atan2(
          sin(PI + sign * theta) * rcToSg,
          cos(PI + sign * theta) * rcToSg + rcToAg
        );
        let agIdx = floor(((refDir % TWO_PI + TWO_PI) % TWO_PI) / (TWO_PI / nAG));
        let sgIdx = floor((((refDir + PI) % TWO_PI + TWO_PI) % TWO_PI) / (TWO_PI / nSG));
        if ((agIdx + sgIdx) % 2 === 0) {
          sgAngleAdj += PI / nSG;
        }
      }

      this._drawMiniGear(sgc.x, sgc.y, sgR, sgAngleAdj, 6);
    }

    // --- Draw gear ring with indicator (on top of mini gears) ---
    let discClr = isRed ? color(255, 0, 0) : 0;
    this.drawRing(gc, gearR, gearInnerR,
      255, 128, discClr,
      curRotNorm, rotOrigin, nTicks, 0, false, true,
      indicatorLabel, null,
      labels, null);

    return { center: gc, innerR: gearInnerR, angle: gearAngle };
  }

  // ---- _drawMiniGear ----
  // Draws a simple half-black / half-white spinning disc.
  _drawMiniGear(cx, cy, radius, spinAngle, nSegments) {
    let shadowOff = max(1, radius * 0.06);

    // Shadow
    push(); fill(0, 0, 0, 50); noStroke();
    ellipse(cx + shadowOff, cy + shadowOff, radius * 2, radius * 2);
    pop();

    // Simple half black / half white
    push(); noStroke();
    fill(0); arc(cx, cy, radius * 2, radius * 2, spinAngle, spinAngle + PI, PIE);
    fill(255); arc(cx, cy, radius * 2, radius * 2, spinAngle + PI, spinAngle + TWO_PI, PIE);
    pop();

  }

  // Normalize angle to [0, 2π)
  _norm(a) {
    a = a % TWO_PI;
    if (a < 0) a += TWO_PI;
    return a;
  }
}

// =============================================================================
// Standalone bootstrap — p5.js global-mode entry points.
// When SpiroClock is integrated into CoolweirdClocks, these are NOT loaded;
// the host app's setup/draw/windowResized call the renderer methods directly.
// =============================================================================
/***************************
let spiroClock;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Parse URL hash options (in CoolweirdClocks, the host does this centrally)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  spiroClock = new SpiroClock({
    keepNumbersHoriz: hashParams.get('keepNumbersHoriz') === '1'
  });
  spiroClock.init();
  spiroClock.activate();
  spiroClock.resize(width, height);
}

function draw() {
  background(128);
  spiroClock.update();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  spiroClock.resize(width, height);
}
*******************/