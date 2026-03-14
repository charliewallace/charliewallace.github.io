// SteampunkClockRenderer - Web 3D port of SteamPunkClock1
// Uses THREE.js
// Interface follows ClockRenderer pattern for CoolweirdClocks integration:
//   constructor(containerId, options) – configure without heavy side-effects
//   init()                           – one-time setup (parse hash, etc.)
//   activate() / deactivate()        – show/hide this renderer
//   resize(w, h)                     – recompute layout for given dimensions
//   update(timeKeeper)               – draw one frame
//   getPOV() / setPOV(pov)           – get/set camera point-of-view

// CoolweirdClocks integration uses duck typing — matching the ClockRenderer method
// signatures (init, activate, deactivate, resize, update) is sufficient.

class SteampunkClockRenderer {
  constructor(containerId = 'canvas-container', options = {}) {
    this.containerId = containerId;
    this.keepNumbersHoriz = options.keepNumbersHoriz || false;
    this.style = options.style || 'gears'; // Can be 'rollers' or 'gears'
    this.materialStyle = options.materialStyle || 'aged'; // Can be 'new' or 'aged'
    this.texturePath = options.texturePath || './'; // Configurable path to texture PNGs
    this.standalone = options.standalone || false; // True when running outside CoolweirdClocks
    this.keepNumbersRadial = options.keepNumbersRadial !== undefined ? options.keepNumbersRadial : 1;

    // Configuration constants (from original)
    this.FIXED_RING_OUTER_RADIUS_FRAC = 0.95;
    this.HOUR12_RING_WIDTH_FRAC = 0.83;
    this.INNER_TWEAK_FRAC = 0.95;
    this.MINI_GEAR_THICKNESS_FRAC = 0.45; // Thinner than rings to avoid peg collision

    // Optimal teeth geometries
    this.teethConfigs = {
      hour12: { NR: 204, Nr: 187, Nag: 12, Nsg: 7, K: 4 },
      min60: { NR: 204, Nr: 187, Nag: 12, Nsg: 7, K: 4 },
      // Topologically flawless configuration that physically fits inside the gap
      min5: { NR: 220, Nr: 176, Nag: 37, Nsg: 17, K: 16 },
      sec60: { NR: 204, Nr: 187, Nag: 12, Nsg: 7, K: 4 }
    };

    this.active = false;
    this.hasSetPOV = false;

    // THREE.js setup
    this.container = document.getElementById(containerId || 'canvas-container');
    if (!this.container) {
      this.container = document.body;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.z = 1000;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Setup OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;

      // Control zoom speed for mousewheels
      this.controls.zoomSpeed = 0.3;

      // Allow user to pan (Shift-drag or Right-Click drag) naturally across the clock face
      this.controls.screenSpacePanning = true;
    }

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Main light
    const dirLight = new THREE.DirectionalLight(0xffdfb0, 0.42); // Reduced by 40%
    dirLight.position.set(200, 500, 1000);
    this.scene.add(dirLight);

    // Low-angle shadow light (upper right, coming across the surface)
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.54); // Reduced by 40%
    shadowLight.position.set(400, 400, 300); // Rake across the surface
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;
    const d = 500;
    shadowLight.shadow.camera.left = -d;
    shadowLight.shadow.camera.right = d;
    shadowLight.shadow.camera.top = d;
    shadowLight.shadow.camera.bottom = -d;
    shadowLight.shadow.camera.near = 0.1;
    shadowLight.shadow.camera.far = 2000;
    shadowLight.shadow.bias = -0.0005;
    this.scene.add(shadowLight);

    // Secondary fill light (more in front, above and bit left)
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.4);
    fillLight.position.set(-200, 500, 600);
    this.scene.add(fillLight);

    // Clock Base Radius (arbitrary scaling factor for 3D world)
    this.baseRadius = 300;

    // Rings group
    this.ringsGroup = new THREE.Group();
    this.scene.add(this.ringsGroup);

    // Sub-groups for rotations
    this.ringMeshes = {};

    // Load Specialized Textures (User Provided 3K/4K Custom Assets)
    this.textureLoader = new THREE.TextureLoader();
    this.metalTextures = {};
    const tp = this.texturePath;
    const textureMap = {
      bronze_aged: tp + 'Gemini4kAgedBrushedBronze.png',
      copper: tp + 'Gemini4kAgedBrushedCopper.png',
      steel_dark: tp + 'Gemini4kDistressedDarkSteel.png',
      bronze_weather: tp + 'Gemini4kWeatheredBrushedBronze.png',
      steel_light: tp + 'Gemini4kWeatheredSteel.png'
    };

    // Materials (Steampunk)
    const isAged = (this.materialStyle === 'aged');
    this.materials = {
      fixed: isAged ? this._createAgedMaterial(0xb5a642, 0.32, true, 'bronze_weather') : new THREE.MeshStandardMaterial({ color: 0xb5a642, roughness: 0.4, metalness: 0.7 }),
      hour12: isAged ? this._createAgedMaterial(0xcb6d51, 0.32, true, 'copper') : new THREE.MeshStandardMaterial({ color: 0xcb6d51, roughness: 0.5, metalness: 0.6 }),
      min60: isAged ? this._createAgedMaterial(0xcd7f32, 0.32, true, 'bronze_weather') : new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.4, metalness: 0.8 }),
      min5: isAged ? this._createAgedMaterial(0xd4af37, 0.32, true, 'steel_light') : new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 }),
      sec60: isAged ? this._createAgedMaterial(0x8c7853, 0.32, true, 'bronze_weather') : new THREE.MeshStandardMaterial({ color: 0x8c7853, roughness: 0.6, metalness: 0.5 }),
      black: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.2 }),
      white: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5, metalness: 0.2 }),
      silverGear: isAged ? this._createAgedMaterial(0xe0e0e0, 0.55, false, 'steel_dark') : new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.2, metalness: 0.4 })
    };

    if (isAged) {
      for (let key in textureMap) {
        this.textureLoader.load(
          textureMap[key],
          (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            this.metalTextures[key] = tex;

            // Refresh materials that depend on this specific texture
            for (let mKey in this.materials) {
              const mat = this.materials[mKey];
              if (mat.metalType === key) {
                this._applyTextureToMaterial(mat, tex);
              }
            }
          },
          undefined,
          (err) => {
            console.error(`❌ Failed to load texture: ${key} (${textureMap[key]})`, err);
          }
        );
      }
    }


    // Build Geometry
    this._buildRings();

    // Load Font for 3D Numbers
    const loader = new THREE.FontLoader();
    loader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      this._addLabelsToRings(font);
    });

    // Handle resize binding — only in standalone mode (host calls resize() directly)
    this._onResize = this._onResize.bind(this);
    if (this.standalone) {
      window.addEventListener('resize', this._onResize);
    }
  }

  _buildRings() {
    // Calculate radii
    let fixedOuter = this.baseRadius * this.FIXED_RING_OUTER_RADIUS_FRAC;
    let fixedInner = this.baseRadius * (this.FIXED_RING_OUTER_RADIUS_FRAC * this.HOUR12_RING_WIDTH_FRAC);

    let twk = this.INNER_TWEAK_FRAC;
    let h12wf = this.HOUR12_RING_WIDTH_FRAC * twk;
    let m60wf = h12wf * twk;
    let m5wf = m60wf * twk;
    let s60wf = m5wf * twk;

    // Ring definitions: { parentRadius, widthFrac, cyclesPerRev, numScoops }
    // 0: Fixed (outer static) - 12 scoops
    let fixedScoopR = 0.2 * (fixedOuter - fixedInner);
    const fixedGroup = this._createRing('fixed', fixedOuter, fixedInner, 12, 0);
    fixedGroup.rotation.z = Math.PI / 2; // Fixed ring also uses indicator at top

    // 1: Hour12 (rolls inside fixed). gearR = (11/12) * fixedInner
    let h12R = (11 / 12) * fixedInner;
    let h12Inner = h12R * h12wf;
    let h12ScoopR = 0.2 * (h12R - h12Inner);
    // 12 scoops on inner edge
    this._createRing('hour12', h12R, h12Inner, 12, 1, fixedScoopR);

    // 2: Min60 (rolls inside hour12). gearR = (11/12) * h12Inner
    let m60R = (11 / 12) * h12Inner;
    let m60Inner = m60R * m60wf;
    let m60ScoopR = 0.2 * (m60R - m60Inner);
    // 5 scoops on inner edge
    this._createRing('min60', m60R, m60Inner, 5, 2, h12ScoopR);

    // 3: Min5
    let m5R = (4 / 5) * m60Inner;
    let m5Inner = m5R * m5wf;
    let m5ScoopR = 0.2 * (m5R - m5Inner);
    // 12 scoops on inner edge
    this._createRing('min5', m5R, m5Inner, 12, 3, m60ScoopR);

    // 4: Sec60
    let s60R = (11 / 12) * m5Inner;
    let s60Inner = s60R * s60wf;
    this._createRing('sec60', s60R, s60Inner, 0, 4, m5ScoopR);

    // Standardize thickness for all rings based on baseRadius
    const standardThickness = this.baseRadius * 0.05;
    this.innerRingThickness = standardThickness;

    // Save kinematic parameters for update()
    this.kinematics = {
      hour12: { ringRadius: fixedInner, cycles: 12 },
      min60: { ringRadius: h12Inner, cycles: 12 },
      min5: { ringRadius: m60Inner, cycles: 5 },
      sec60: { ringRadius: m5Inner, cycles: 12 }
    };

    this.miniGears = {
      hour12: this._createMiniGearSet('hour12', fixedInner, h12R, 12),
      min60: this._createMiniGearSet('min60', h12Inner, m60R, 12),
      min5: this._createMiniGearSet('min5', m60Inner, m5R, 5),
      sec60: this._createMiniGearSet('sec60', m5Inner, s60R, 12)
    };
  }

  _createMiniGearSet(name, ringRadius, gearR, cyclesPerRev) {
    const gap = 2 * (ringRadius - gearR); // Correct spirograph widest-point gap

    // Optimal integer teeth counts
    const tc = this.teethConfigs[name];
    const nAG = tc.Nag;
    const nSG = tc.Nsg;

    // For perfect teeth meshing natively, pitch radii must be strictly proportional to teeth
    const pitchRadiusPerTooth = ringRadius / tc.NR;
    const agR_math = nAG * pitchRadiusPerTooth;
    const sgR_math = nSG * pitchRadiusPerTooth;

    // Use a robust clearance. 0.6 provides better mesh separation as requested.
    const clearance = (this.style === 'gears') ? 0.6 : 0.2;
    const agR_visual = agR_math - clearance;
    const sgR_visual = sgR_math - clearance;

    const D = this.baseRadius * 0.05;
    const thickness = D * this.MINI_GEAR_THICKNESS_FRAC;

    const antiGear = this._createMiniGearMesh(agR_visual, thickness, nAG);
    const supportGear1 = this._createMiniGearMesh(sgR_visual, thickness, nSG);
    const supportGear2 = this._createMiniGearMesh(sgR_visual, thickness, nSG);

    this.scene.add(antiGear);
    this.scene.add(supportGear1);
    this.scene.add(supportGear2);

    return {
      antiGear,
      supportGear1,
      supportGear2,
      agR: agR_math, // Store math radii for kinematics
      sgR: sgR_math,
      gap,
      ringRadius,
      nAG,
      nSG,
    };
  }

  _createMiniGearMesh(radius, thickness, numTeeth) {
    const group = new THREE.Group();

    if (this.style === 'rollers') {
      const nSegments = numTeeth * 2;
      const angleStep = (Math.PI * 2) / nSegments;

      for (let i = 0; i < nSegments; i++) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.absarc(0, 0, radius, i * angleStep, (i + 1) * angleStep, false);
        shape.lineTo(0, 0);

        const extrudeSettings = {
          depth: thickness,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.5,
          bevelThickness: 0.5,
          curveSegments: 8
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -thickness / 2);
        const material = (i % 2 === 0) ? this.materials.black : this.materials.white;
        const segment = new THREE.Mesh(geometry, material);
        segment.castShadow = true;
        segment.receiveShadow = true;
        group.add(segment);
      }
    } else {
      // 'gears' style: 3-part recessed geometry for a "worn" professional look
      const numPoints = numTeeth * 16;
      const pitch = (Math.PI * 2 * radius) / numTeeth;
      const amplitude = pitch * 0.225; // Deep sinusoidal teeth

      // -- 1. Outer Rim (The toothed part) --
      const rimShape = new THREE.Shape();
      const holeRadius = radius * 0.75; // Recess starts at 75% of radius

      // Outer boundary with teeth
      for (let i = 0; i <= numPoints; i++) {
        const a = (i / numPoints) * Math.PI * 2;
        const r = radius + amplitude * Math.sin(a * numTeeth);
        if (i === 0) rimShape.moveTo(r * Math.cos(a), r * Math.sin(a));
        else rimShape.lineTo(r * Math.cos(a), r * Math.sin(a));
      }

      // Inner boundary (Hole for the web)
      const holePts = [];
      const holeSegs = 64;
      for (let i = holeSegs; i >= 0; i--) {
        const a = (i / holeSegs) * Math.PI * 2;
        holePts.push(new THREE.Vector2(holeRadius * Math.cos(a), holeRadius * Math.sin(a)));
      }
      rimShape.holes.push(new THREE.Path().setFromPoints(holePts));

      const rimSettings = {
        depth: thickness,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.5,
        bevelThickness: 0.5,
        curveSegments: 1
      };

      const rimGeo = new THREE.ExtrudeGeometry(rimShape, rimSettings);
      rimGeo.translate(0, 0, -thickness / 2);
      const rimMesh = new THREE.Mesh(rimGeo, this.materials.silverGear);
      rimMesh.castShadow = true;
      rimMesh.receiveShadow = true;
      group.add(rimMesh);

      // -- 2. Central Web (The thin recessed part) --
      const webThickness = thickness * 0.3;
      const webShape = new THREE.Shape();
      webShape.absarc(0, 0, holeRadius + 0.5, 0, Math.PI * 2, false);
      const webSettings = {
        depth: webThickness,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.2,
        bevelThickness: 0.2,
        curveSegments: 32
      };
      const webGeo = new THREE.ExtrudeGeometry(webShape, webSettings);
      webGeo.translate(0, 0, -webThickness / 2);
      const webMesh = new THREE.Mesh(webGeo, this.materials.silverGear);
      webMesh.castShadow = true;
      webMesh.receiveShadow = true;
      group.add(webMesh);

      // -- 3. Center Hub (Axle cap) --
      const hubRadius = radius * 0.2;
      const hubHeight = thickness * 0.8;
      const hubShape = new THREE.Shape();
      hubShape.absarc(0, 0, hubRadius, 0, Math.PI * 2, false);
      const hubSettings = {
        depth: hubHeight,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.5,
        bevelThickness: 0.5,
        curveSegments: 16
      };
      const hubGeo = new THREE.ExtrudeGeometry(hubShape, hubSettings);
      hubGeo.translate(0, 0, -hubHeight / 2);
      const hubMesh = new THREE.Mesh(hubGeo, this.materials.silverGear);
      hubMesh.castShadow = true;
      hubMesh.receiveShadow = true;
      group.add(hubMesh);
    }

    return group;
  }


  _createRing(name, outerRadius, innerRadius, numScoops, depthIndex, parentScoopRadius = null) {
    const group = new THREE.Group();
    const zOffset = 0; // All rings share the same Z-plane
    group.position.z = zOffset;

    let rw = outerRadius - innerRadius;
    const baseExtrudeDepth = this.baseRadius * 0.05; // Uniform thickness
    const D = baseExtrudeDepth;
    const frontDepth = D / 2;
    const backDepth = D / 2;

    let gap = 1.1;

    // --- 1. Helper for shape creation ---
    const getShape = (isScooped) => {
      const shape = new THREE.Shape();

      // Outer boundary (Counter-Clockwise)
      const outerPts = [];
      const outConf = (name !== 'fixed') ? this.teethConfigs[name] : null;

      // In 'gears' mode, use math radius (pitch circle) as baseline, but recessed by 1.0 to avoid peak collisions
      let visualOuterR = (name === 'fixed') ? outerRadius : (outerRadius - gap);
      if (!isScooped && this.style === 'gears' && outConf) {
        visualOuterR = outerRadius - 1.0; // Recess teeth into the ring body
        const nTeeth = outConf.Nr;
        const numPoints = nTeeth * 16;
        const pitch = (Math.PI * 2 * outerRadius) / nTeeth;
        const amp = pitch * 0.225;
        for (let i = 0; i <= numPoints; i++) {
          const a = (i / numPoints) * Math.PI * 2;
          const r = visualOuterR + amp * Math.sin(a * nTeeth);
          outerPts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
        }
      } else {
        const segs = isScooped ? 128 : 256;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          outerPts.push(new THREE.Vector2(visualOuterR * Math.cos(a), visualOuterR * Math.sin(a)));
        }
      }
      shape.setFromPoints(outerPts);

      // Inner hole boundary (Clockwise)
      const holePts = [];
      let visualInnerR = innerRadius + gap;
      const hole_r = 0.2 * rw;
      const visualScoopR = hole_r + gap;

      const innerGapName = (name === 'fixed') ? 'hour12' :
        (name === 'hour12') ? 'min60' :
          (name === 'min60') ? 'min5' :
            (name === 'min5') ? 'sec60' : null;
      const inConf = innerGapName ? this.teethConfigs[innerGapName] : null;

      if (!isScooped && this.style === 'gears' && inConf) {
        visualInnerR = innerRadius + 1.0; // Recess teeth into the ring body
        const nTeeth = inConf.NR;
        const numPoints = nTeeth * 16;
        const pitch = (Math.PI * 2 * innerRadius) / nTeeth;
        const amp = pitch * 0.225;
        for (let i = 0; i <= numPoints; i++) {
          const a = (numPoints - i) / numPoints * Math.PI * 2;
          // In spiroclock_good, inner teeth (NR) had a PI/NR offset (Gap at 0).
          // sin(N*a - PI) = -sin(N*a). 
          // Peak (r = R - amp*sin) becomes Root/Gap (r = R + amp*sin).
          const r = visualInnerR + amp * Math.sin(a * nTeeth);
          holePts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
        }
      } else if (!isScooped || numScoops === 0) {
        const segs = isScooped ? 128 : 256;
        for (let i = segs; i >= 0; i--) {
          const a = (i / segs) * Math.PI * 2;
          holePts.push(new THREE.Vector2(visualInnerR * Math.cos(a), visualInnerR * Math.sin(a)));
        }
      } else {
        const anglePerScoop = (Math.PI * 2) / numScoops;
        const R = innerRadius;
        const R_v = visualInnerR;
        const r_v = visualScoopR;

        const cosAlpha = (R_v * R_v + R * R - r_v * r_v) / (2 * R_v * R);
        const alpha = Math.acos(cosAlpha);

        let phiCCW = Math.atan2(R_v * Math.sin(alpha), R_v * Math.cos(alpha) - R);
        let phiCW = Math.atan2(-R_v * Math.sin(alpha), R_v * Math.cos(alpha) - R);
        if (phiCW < 0) phiCW += Math.PI * 2;

        for (let i = numScoops; i > 0; i--) {
          let baseAngle = i * anglePerScoop;
          let nextBaseAngle = (i - 1) * anglePerScoop;
          let startMain = baseAngle - alpha;
          let endMain = nextBaseAngle + alpha;
          let mainSweep = startMain - endMain;
          if (mainSweep < 0) mainSweep += Math.PI * 2;
          let mainSegs = Math.max(2, Math.floor(64 * (mainSweep / (Math.PI * 2))));
          for (let j = 0; j <= mainSegs; j++) {
            let a = startMain - (j / mainSegs) * mainSweep;
            holePts.push(new THREE.Vector2(R_v * Math.cos(a), R_v * Math.sin(a)));
          }
          let cx = R * Math.cos(nextBaseAngle);
          let cy = R * Math.sin(nextBaseAngle);
          let scoopStart = nextBaseAngle + phiCCW;
          let scoopEnd = nextBaseAngle + phiCW;
          let scoopSweep = scoopStart - scoopEnd;
          if (scoopSweep < 0) scoopSweep += Math.PI * 2;
          let scoopSegs = 16;
          for (let j = 1; j < scoopSegs; j++) {
            let a = scoopStart - (j / scoopSegs) * scoopSweep;
            holePts.push(new THREE.Vector2(cx + r_v * Math.cos(a), cy + r_v * Math.sin(a)));
          }
        }
      }
      const holePath = new THREE.Path();
      holePath.setFromPoints(holePts);
      shape.holes.push(holePath);
      return shape;
    };

    // --- 2. Create Front (Scooped) Part ---
    const frontShape = getShape(true);
    const frontSettings = {
      depth: frontDepth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 1,
      bevelThickness: 1,
      curveSegments: 1
    };
    const frontGeo = new THREE.ExtrudeGeometry(frontShape, frontSettings);
    frontGeo.translate(0, 0, -frontDepth / 2);
    const frontMesh = new THREE.Mesh(frontGeo, this.materials[name]);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    frontMesh.position.z = D / 4; // Center of front layer (occupies [D/2, 0])
    group.add(frontMesh);

    // --- 3. Create Back (Smooth) Part ---
    const backShape = getShape(false);
    const backSettings = {
      depth: backDepth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 1,
      bevelThickness: 1,
      curveSegments: 1
    };
    const backGeo = new THREE.ExtrudeGeometry(backShape, backSettings);
    backGeo.translate(0, 0, -backDepth / 2);
    const backMesh = new THREE.Mesh(backGeo, this.materials[name]);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    backMesh.position.z = -D / 4; // Center of back layer (occupies [0, -D/2])

    // --- Add colored gear teeth wedges to back layer ---
    this._addTeethToRing(name, backMesh, outerRadius, innerRadius, backDepth);

    group.add(backMesh);

    // --- 4. Add Outer Indicator Cylinder ---
    if (name !== 'fixed') {
      let tickLen = 0.2 * rw;
      let indRadius = parentScoopRadius ? parentScoopRadius * 0.90 : tickLen * (outerRadius / innerRadius) * 0.85;

      // Peg height gradient: outer (low depthIndex) are taller than inner (high depthIndex)
      // Base height is 2x the ring thickness, scaled down slightly for inner rings.
      const indDepth = D * (2.0 - (depthIndex - 1) * 0.15);

      // --- LANTERN DESIGN ---
      const lanternGroup = new THREE.Group();
      const isAged = (this.materialStyle === 'aged');
      const metalMat = isAged ? this.materials.silverGear.clone() : new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.6 });
      if (isAged) {
        metalMat.color.set(0xdddddd); // Brighter than the gears but sharing the texture
        metalMat.metalType = 'steel_dark';
      }

      // 1. Lantern Base (Solid Metal Peg - Extended vertically)
      const baseHeight = indDepth * 0.8; // Extended base as requested
      const baseGeo = new THREE.CylinderGeometry(indRadius, indRadius, baseHeight, 16);
      const baseMesh = new THREE.Mesh(baseGeo, metalMat);
      baseMesh.rotation.x = Math.PI / 2;
      baseMesh.position.z = -indDepth / 2 + baseHeight / 2;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      lanternGroup.add(baseMesh);

      // 2. Glass Lantern Core (Holistic glow)
      const glassHeight = indDepth * 0.6;
      const glassRadius = indRadius * 0.85;
      const glassGeo = new THREE.CylinderGeometry(glassRadius, glassRadius, glassHeight, 16);
      const glassTopGeo = new THREE.SphereGeometry(glassRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      glassTopGeo.translate(0, glassHeight / 2, 0);

      let glassMesh;
      const indMatNormal = new THREE.MeshStandardMaterial({
        color: 0xffffdd,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
        metalness: 0.2
      });
      const indMatRed = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff0000,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.95
      });

      if (typeof THREE.BufferGeometryUtils !== 'undefined' && THREE.BufferGeometryUtils.mergeBufferGeometries) {
        const glassCombinedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries([glassGeo, glassTopGeo]);
        glassMesh = new THREE.Mesh(glassCombinedGeo, indMatNormal);
      } else {
        glassMesh = new THREE.Mesh(glassGeo, indMatNormal);
        const dome = new THREE.Mesh(glassTopGeo, indMatNormal);
        glassMesh.add(dome);
        glassMesh.onBeforeRender = function () { dome.material = this.material; };
      }

      glassMesh.rotation.x = Math.PI / 2;
      glassMesh.position.z = baseMesh.position.z + baseHeight / 2 + glassHeight / 2;
      lanternGroup.add(glassMesh);

      // 3. Skeleton Frame: Top Metal Ring (Replacing the cap)
      // Align with the base radius for a flush look
      const frameRadius = indRadius;
      const topRingGeo = new THREE.TorusGeometry(frameRadius, indRadius * 0.1, 8, 24);
      const topRingMesh = new THREE.Mesh(topRingGeo, metalMat);
      // Position the ring at the start of the dome
      topRingMesh.position.z = glassMesh.position.z + glassHeight / 2;
      topRingMesh.castShadow = true;
      lanternGroup.add(topRingMesh);

      // 4. Extended Supporting Pillars
      const pillarRadius = indRadius * 0.12;
      const pillarHeight = glassHeight;
      const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 8);
      for (let i = 0; i < 4; i++) {
        const pillar = new THREE.Mesh(pillarGeo, metalMat);
        const ang = (i / 4) * Math.PI * 2;
        const px = Math.cos(ang) * frameRadius;
        const py = Math.sin(ang) * frameRadius;
        // Pillars span from the top of the base to the top ring
        pillar.position.set(px, py, glassMesh.position.z);
        pillar.rotation.x = Math.PI / 2;
        pillar.castShadow = true;
        lanternGroup.add(pillar);
      }

      // 5. Red PointLight Source (Dynamic glow)
      // Placed inside the glass core
      const indLight = new THREE.PointLight(0xff0000, 0, D * 10, 2);
      indLight.position.set(0, 0, glassMesh.position.z);
      lanternGroup.add(indLight);

      // 6. Final positioning of the whole lantern assembly
      lanternGroup.position.set(outerRadius, 0, (indDepth / 2) - (0.08 * D));

      frontMesh.add(lanternGroup);

      // Registration for the update loop
      group.userData.indicator = glassMesh;
      group.userData.indLight = indLight;
      group.userData.indMatNormal = indMatNormal;
      group.userData.indMatRed = indMatRed;
    }

    this.ringsGroup.add(group);
    this.ringMeshes[name] = {
      mesh: frontMesh, // labels attach here
      backMesh: backMesh,
      group: group,
      outerR: outerRadius,
      innerR: innerRadius,
      baseExtrudeDepth: baseExtrudeDepth
    };

    // Now assign the stored indicator references if they exist
    if (group.userData.indicator) {
      this.ringMeshes[name].indicator = group.userData.indicator;
      this.ringMeshes[name].indLight = group.userData.indLight;
      this.ringMeshes[name].indMatNormal = group.userData.indMatNormal;
      this.ringMeshes[name].indMatRed = group.userData.indMatRed;
    }
    return group;
  }

  _addTeethToRing(name, parentMesh, outerRadius, innerRadius, depth) {
    if (this.style === 'gears') return; // 3D gears are naturally modeled on the mesh boundary!
    // Determine early exit if this ring is neither an enclosing gap nor an enclosed ring
    if (name !== 'fixed' && !this.teethConfigs[name]) return;

    const inward = 3.0;  // Extend safely into the solid mesh
    const outward = 0.5; // Protrude into the gap 

    // Outer edge teeth (Nr)
    if (name !== 'fixed') {
      const outConf = this.teethConfigs[name];
      if (outConf) {
        let nOuterSegments = outConf.Nr * 2;
        this._createTeethWedges(parentMesh, nOuterSegments, outerRadius - inward, outerRadius + outward, depth);
      }
    }

    // Inner edge teeth (NR)
    // The fixed ring doesn't roll inside anything, but hour12 rolls inside its inner edge, so it *has* inner teeth.
    const innerGapName = name === 'fixed' ? 'hour12' :
      name === 'hour12' ? 'min60' :
        name === 'min60' ? 'min5' :
          name === 'min5' ? 'sec60' : null;

    if (innerGapName) {
      const inConf = this.teethConfigs[innerGapName];
      if (inConf) {
        let nInnerGapSegments = inConf.NR * 2;
        // Apply half-segment offset to ALL rings' inner teeth (shifts B/W pattern
        // so that rolling-inside contacts produce Black-to-White alignment)
        let offsetAngle = Math.PI / inConf.NR;
        this._createTeethWedges(parentMesh, nInnerGapSegments, innerRadius - outward, innerRadius + inward, depth, offsetAngle);
      }
    }
  }

  _createTeethWedges(parent, nSegments, rIn, rOut, depth, offsetAngle = 0) {
    const angleStep = (Math.PI * 2) / nSegments;

    // Use StandardMaterial so the extrusions catch the metallic lighting nicely alongside the ring
    const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8, metalness: 0.1 });

    const shapesBlack = [];
    const shapesWhite = [];

    for (let i = 0; i < nSegments; i++) {
      const shape = new THREE.Shape();
      const aStart = i * angleStep + offsetAngle;
      const aEnd = (i + 1) * angleStep + offsetAngle;

      shape.absarc(0, 0, rOut, aStart, aEnd, false);
      shape.lineTo(rIn * Math.cos(aEnd), rIn * Math.sin(aEnd));
      shape.absarc(0, 0, rIn, aEnd, aStart, true);
      shape.lineTo(rOut * Math.cos(aStart), rOut * Math.sin(aStart));

      if (i % 2 === 0) shapesBlack.push(shape);
      else shapesWhite.push(shape);
    }

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: false,
      curveSegments: 1
    };

    if (shapesBlack.length > 0) {
      // ExtrudeGeometry directly handles an array of shapes for highly optimized rendering
      const geoBlack = new THREE.ExtrudeGeometry(shapesBlack, extrudeSettings);
      geoBlack.translate(0, 0, -depth / 2);
      const meshBlack = new THREE.Mesh(geoBlack, matBlack);

      // Scale slightly in Z so we don't z-fight exactly on the top/bottom faces
      meshBlack.scale.set(1, 1, 1.02);
      meshBlack.receiveShadow = true;
      meshBlack.castShadow = true;
      parent.add(meshBlack);

      const geoWhite = new THREE.ExtrudeGeometry(shapesWhite, extrudeSettings);
      geoWhite.translate(0, 0, -depth / 2);
      const meshWhite = new THREE.Mesh(geoWhite, matWhite);
      meshWhite.scale.set(1, 1, 1.02);
      meshWhite.receiveShadow = true;
      meshWhite.castShadow = true;
      parent.add(meshWhite);
    }
  }

  init() {
    this._parseHash();
  }

  activate() {
    this.active = true;
    // In hosted mode, show the container (host manages visibility)
    if (!this.standalone) {
      const el = document.getElementById(this.containerId || 'canvas-container');
      if (el) {
        el.classList.remove('hidden');
        el.style.display = '';
      }
    }
    // Only run our own animation loop when standalone;
    // when hosted, the host app calls update() each frame.
    if (this.standalone) {
      this._animate();
      this._startPOVTracker();
    }
  }

  deactivate() {
    this.active = false;
    // In hosted mode, hide the container
    if (!this.standalone) {
      const el = document.getElementById(this.containerId || 'canvas-container');
      if (el) el.classList.add('hidden');
    }
    if (this._povInterval) {
      clearInterval(this._povInterval);
      this._povInterval = null;
    }
  }

  _parseHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/&/g, '&').replace(/;/g, '&'));

    // 1. Point of View Restoration
    const pov = params.get('pov');
    if (pov) {
      const parts = pov.split(',').map(Number);
      if (parts.length === 6 && !parts.some(isNaN)) {
        this.camera.position.set(parts[0], parts[1], parts[2]);
        if (this.controls) {
          this.controls.target.set(parts[3], parts[4], parts[5]);
          this.controls.update();
        }
        this.hasSetPOV = true; // Coordinate restoration successful
      }
    }

    // 2. Options Restoration
    if (params.has('keepNumbersHoriz')) {
      this.keepNumbersHoriz = params.get('keepNumbersHoriz') === 'true';
    }
    if (params.has('style')) {
      this.style = params.get('style');
    }
    if (params.has('materialStyle')) {
      this.materialStyle = params.get('materialStyle');
    }
  }

  _updateHash() {
    if (!this.active || !this.controls) return;

    const cam = this.camera.position;
    const tar = this.controls.target;

    // Build parameters
    const params = new URLSearchParams();

    // POV: rounded to 1 decimal place for URL cleanliness
    const povStr = [
      cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(1),
      tar.x.toFixed(1), tar.y.toFixed(1), tar.z.toFixed(1)
    ].join(',');

    params.set('pov', povStr);

    // Always include current boolean/style states
    if (this.keepNumbersHoriz) params.set('keepNumbersHoriz', 'true');
    if (this.style !== 'gears') params.set('style', this.style);
    if (this.materialStyle !== 'aged') params.set('materialStyle', this.materialStyle);

    // Update hash without polluting history
    const newHash = '#' + params.toString().replace(/\+/g, '%20');
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }

  _startPOVTracker() {
    if (!this.standalone) return; // Host app manages its own URL hash
    if (this._povInterval) clearInterval(this._povInterval);
    this._povInterval = setInterval(() => {
      this._updateHash();
    }, 1000);
  }

  // --- Public POV API (for host app "save preferred view" button) ---

  /**
   * Returns the current camera point-of-view as an object.
   * The host app can serialize this to storage / a URL parameter.
   */
  getPOV() {
    const cam = this.camera.position;
    const tar = this.controls ? this.controls.target : { x: 0, y: 0, z: 0 };
    return {
      cx: +cam.x.toFixed(1),
      cy: +cam.y.toFixed(1),
      cz: +cam.z.toFixed(1),
      tx: +tar.x.toFixed(1),
      ty: +tar.y.toFixed(1),
      tz: +tar.z.toFixed(1)
    };
  }

  /**
   * Restores a previously saved point-of-view.
   * @param {object} pov - Object with { cx, cy, cz, tx, ty, tz }
   */
  setPOV(pov) {
    if (!pov) return;
    this.camera.position.set(pov.cx, pov.cy, pov.cz);
    if (this.controls) {
      this.controls.target.set(pov.tx, pov.ty, pov.tz);
      this.controls.update();
    }
    this.hasSetPOV = true;
  }

  resize(w, h) {
    w = w || window.innerWidth || 1;
    h = h || window.innerHeight || 1;
    this.camera.aspect = w / h;

    // Compute required Z distance so the clock fills the viewport.
    // Vertical FOV is fixed, so we compute Z to fill height first,
    // then push back further if viewport is narrower than tall.
    const fovRad = this.camera.fov * Math.PI / 180;
    const halfTan = Math.tan(fovRad / 2);
    let requiredZ = this.baseRadius / halfTan;
    if (w < h) {
      // Portrait/narrow: push camera back so model fits the width
      requiredZ = this.baseRadius / (halfTan * (w / h));
    }

    if (!this.hasSetPOV) {
      // First-time setup: position camera at the correct viewing distance
      this.camera.position.z = requiredZ * 1.1;
    } else if (this._lastRequiredZ) {
      // User/hash has set a specific POV — scale the camera distance
      // proportionally so the model rescales with the viewport
      this.camera.position.z *= requiredZ / this._lastRequiredZ;
    }
    this._lastRequiredZ = requiredZ;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _onResize() {
    this.resize(window.innerWidth, window.innerHeight);
  }

  _norm(a) {
    let normalized = a % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    return normalized;
  }

  _updateKinematics(timeKeeper) {
    let hour24, rawSec, rawMin, ms;
    if (timeKeeper) {
      hour24 = timeKeeper.hours;
      rawMin = timeKeeper.minutes;
      rawSec = timeKeeper.seconds;
      ms = timeKeeper.millis;
    } else {
      let now = new Date();
      hour24 = now.getHours();
      rawMin = now.getMinutes();
      rawSec = now.getSeconds();
      ms = now.getMilliseconds();
    }
    let sec = rawSec + ms / 1000;
    let min = rawMin + sec / 60;
    let hour12 = (hour24 % 12) + min / 60;

    let hourAngle = (hour12 / 12) * Math.PI * 2;
    let minute60Angle = (min / 60) * Math.PI * 2;
    let minute5Angle = (minute60Angle * 12) % (Math.PI * 2);
    let second60Angle = (sec / 60) * Math.PI * 2;
    minute60Angle -= Math.PI / 2;
    second60Angle -= Math.PI / 2;

    // To adapt from p5.js (Y-down) to Three.js (Y-up) and keep CW rotation, 
    // we negate the curRot angles passed into gear kinematics.
    let { center: c1, angle: a1 } = this._applyGearKinematics('hour12', -(hourAngle - Math.PI / 2), { x: 0, y: 0 }, 0);
    // 2. Min60 rolls inside Hour12
    let { center: c2, angle: a2 } = this._applyGearKinematics('min60', -(minute60Angle + Math.PI / 2), c1, a1);
    // 3. Min5 rolls inside Min60
    let { center: c3, angle: a3 } = this._applyGearKinematics('min5', -(minute5Angle), c2, a2);
    // 4. Sec60 rolls inside Min5
    // a3 output is also negated, so we subtract instead of add Math.PI / 2
    this._applyGearKinematics('sec60', -(second60Angle), c3, a3 - Math.PI / 2);
  }

  _applyGearKinematics(name, curRot, parentCenter, rotOrigin) {
    const k = this.kinematics[name];
    const cyclesPerRev = k.cycles;
    const ringRadius = k.ringRadius;

    let gearR = (cyclesPerRev - 1) * (ringRadius / cyclesPerRev);
    let offsetAngle = this._norm(-curRot * (cyclesPerRev - 1));
    let curRotNorm = this._norm(curRot);

    let dx = Math.cos(offsetAngle + rotOrigin) * (ringRadius - gearR);
    let dy = Math.sin(offsetAngle + rotOrigin) * (ringRadius - gearR);
    let gc = { x: parentCenter.x + dx, y: parentCenter.y + dy };
    let gearAngle = this._norm(curRotNorm + rotOrigin);

    // --- Indicator Red Logic ---
    // Point of contact
    let pocAngle = this._norm(offsetAngle + rotOrigin);
    let pocX = parentCenter.x + Math.cos(pocAngle) * ringRadius;
    let pocY = parentCenter.y + Math.sin(pocAngle) * ringRadius;

    // Indicator tip
    let tipX = Math.cos(gearAngle) * gearR + gc.x;
    let tipY = Math.sin(gearAngle) * gearR + gc.y;

    // Distance² from indicator to POC
    let sepSq = (tipX - pocX) * (tipX - pocX) + (tipY - pocY) * (tipY - pocY);
    let rw = gearR - (gearR * 0.85); // approximate width

    // Determine if indicator should be red
    let toRedSq = rw * rw * 0.02;
    let fromRedSq = rw * rw * 6;
    let ad = gearAngle - pocAngle;
    if (ad >= Math.PI) ad = -(Math.PI * 2 - ad);
    else if (ad <= -Math.PI) ad = Math.PI * 2 + ad;
    // Inverted angles from p5.js means ad sign is inverted, so use ad > 0
    let isRed = (ad > 0) ? (sepSq < toRedSq) : (sepSq < fromRedSq);

    const grp = this.ringMeshes[name].group;
    grp.position.x = gc.x;
    grp.position.y = gc.y;

    const mesh = this.ringMeshes[name].mesh; // front mesh
    mesh.rotation.z = gearAngle;

    // Ensure the back smooth/teeth mesh rotates with the front mesh
    const backMesh = this.ringMeshes[name].backMesh;
    if (backMesh) {
      backMesh.rotation.z = gearAngle;
    }

    // Apply color and light
    const indicator = this.ringMeshes[name].indicator;
    const indLight = this.ringMeshes[name].indLight;
    if (indicator) {
      indicator.material = isRed ? this.ringMeshes[name].indMatRed : this.ringMeshes[name].indMatNormal;
    }
    if (indLight) {
      indLight.intensity = isRed ? 2.5 : 0;
    }

    // --- Update Mini Gears ---
    this._updateMiniGearKinematics(name, curRot, parentCenter, rotOrigin, gc);

    return { center: gc, angle: gearAngle };
  }

  _updateMiniGearKinematics(name, curRot, ringCenter, rotOrigin, gc) {
    const mg = this.miniGears[name];
    if (!mg) return;

    const k = this.kinematics[name];
    const cyclesPerRev = k.cycles;
    const ringRadius = mg.ringRadius;
    const gap = mg.gap;
    const agR = mg.agR;
    const sgR = mg.sgR;
    const tc = this.teethConfigs[name];

    const curRotNorm = this._norm(curRot);
    const offsetAngle = this._norm(-curRot * (cyclesPerRev - 1));

    const D = this.ringMeshes[name].baseExtrudeDepth;
    const agPosZ = -D / 4;

    const rcToAg = ringRadius - (gap - agR);
    const agOffAngle = offsetAngle + Math.PI;
    const agPosX = ringCenter.x + Math.cos(agOffAngle + rotOrigin) * rcToAg;
    const agPosY = ringCenter.y + Math.sin(agOffAngle + rotOrigin) * rcToAg;

    const a = ringRadius - gap + agR;
    const b = ringRadius - sgR;
    const c = agR + sgR;
    const cosTheta = Math.min(Math.max((a * a + b * b - c * c) / (2 * a * b), -1), 1);
    const theta = Math.acos(cosTheta);
    const rcToSg = ringRadius - sgR;

    const innerR = tc.Nr * ringRadius / tc.NR;
    const innerGearAngle = curRotNorm + rotOrigin;
    const cpDir = agOffAngle + rotOrigin;
    const agAngleBase = cpDir - (innerGearAngle - cpDir) * (innerR / agR);
    const sg1X = ringCenter.x + Math.cos(agOffAngle + theta + rotOrigin) * rcToSg;
    const sg1Y = ringCenter.y + Math.sin(agOffAngle + theta + rotOrigin) * rcToSg;
    const sg2X = ringCenter.x + Math.cos(agOffAngle - theta + rotOrigin) * rcToSg;
    const sg2Y = ringCenter.y + Math.sin(agOffAngle - theta + rotOrigin) * rcToSg;

    // SG base rotations driven directly from AG contact to ensure zero-slip locking
    const dx1 = sg1X - agPosX, dy1 = sg1Y - agPosY;
    const contactAngleAgToSg1 = Math.atan2(dy1, dx1);
    const sg1AngleBase = contactAngleAgToSg1 - (agAngleBase - contactAngleAgToSg1) * (agR / sgR);

    const dx2 = sg2X - agPosX, dy2 = sg2Y - agPosY;
    const contactAngleAgToSg2 = Math.atan2(dy2, dx2);
    const sg2AngleBase = contactAngleAgToSg2 - (agAngleBase - contactAngleAgToSg2) * (agR / sgR);

    // --- First-frame phase solver using actual rotOrigin ---
    if (!mg.phaseSolved) {
      // Returns true if the contact point is a Peak, false if it's a Valley.
      const EPS = 1e-4;
      const isPeak = (cpx, cpy, cx, cy, rot, N, isHole) => {
        const la = Math.atan2(cpy - cy, cpx - cx) - rot;
        const step = Math.PI / N;
        let idx = Math.floor((la + EPS) / step);
        idx = ((idx % (2 * N)) + (2 * N)) % (2 * N);
        const sinValIsPositive = (idx % 2 === 0);
        // For external gears (AG/SG/InnerRingOuter), sin > 0 is a Peak.
        // For internal holes (OuterRingInner), sin > 0 is a Valley.
        return isHole ? !sinValIsPositive : sinValIsPositive;
      };

      const innerGearAngle = this._norm(curRotNorm + rotOrigin);
      const outerRingRot = rotOrigin;
      const innerR = tc.Nr * ringRadius / tc.NR;

      const cpDir = agOffAngle + rotOrigin;
      const cpAI_x = gc.x + Math.cos(cpDir) * innerR;
      const cpAI_y = gc.y + Math.sin(cpDir) * innerR;
      const cpSO1_x = ringCenter.x + Math.cos(agOffAngle + theta + rotOrigin) * ringRadius;
      const cpSO1_y = ringCenter.y + Math.sin(agOffAngle + theta + rotOrigin) * ringRadius;
      const cpSO2_x = ringCenter.x + Math.cos(agOffAngle - theta + rotOrigin) * ringRadius;
      const cpSO2_y = ringCenter.y + Math.sin(agOffAngle - theta + rotOrigin) * ringRadius;

      const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const cpAS1_x = agPosX + dx1 * agR / d1, cpAS1_y = agPosY + dy1 * agR / d1;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const cpAS2_x = agPosX + dx2 * agR / d2, cpAS2_y = agPosY + dy2 * agR / d2;

      const stepAG = Math.PI / tc.Nag;
      const stepSG = Math.PI / tc.Nsg;

      let agO = agAngleBase;
      let sg1O = sg1AngleBase;
      let sg2O = sg2AngleBase;

      // 1. Lock AG to Inner Ring
      if (isPeak(cpAI_x, cpAI_y, gc.x, gc.y, innerGearAngle, tc.Nr, false) === isPeak(cpAI_x, cpAI_y, agPosX, agPosY, agO, tc.Nag, false)) {
        agO += stepAG;
      }

      // 2. Lock SG1 to AG
      if (isPeak(cpAS1_x, cpAS1_y, agPosX, agPosY, agO, tc.Nag, false) === isPeak(cpAS1_x, cpAS1_y, sg1X, sg1Y, sg1O, tc.Nsg, false)) {
        sg1O += stepSG;
      }

      // 3. Lock SG2 to AG
      if (isPeak(cpAS2_x, cpAS2_y, agPosX, agPosY, agO, tc.Nag, false) === isPeak(cpAS2_x, cpAS2_y, sg2X, sg2Y, sg2O, tc.Nsg, false)) {
        sg2O += stepSG;
      }

      // 4. Lock SG to Outer Ring (Verification)
      if (this.style === 'gears') {
        if (isPeak(cpSO1_x, cpSO1_y, ringCenter.x, ringCenter.y, outerRingRot, tc.NR, true) === isPeak(cpSO1_x, cpSO1_y, sg1X, sg1Y, sg1O, tc.Nsg, false)) {
          sg1O += stepSG;
        }
        if (isPeak(cpSO2_x, cpSO2_y, ringCenter.x, ringCenter.y, outerRingRot, tc.NR, true) === isPeak(cpSO2_x, cpSO2_y, sg2X, sg2Y, sg2O, tc.Nsg, false)) {
          sg2O += stepSG;
        }
      }

      mg.agPhaseOffset = agO - agAngleBase;
      mg.sg1PhaseOffset = sg1O - sg1AngleBase;
      mg.sg2PhaseOffset = sg2O - sg2AngleBase;

      mg.phaseSolved = true;
    }

    const agAngle = agAngleBase + mg.agPhaseOffset;
    mg.antiGear.position.set(agPosX, agPosY, agPosZ);
    mg.antiGear.rotation.z = agAngle;

    [1, -1].forEach((sign, idx) => {
      const sgMesh = idx === 0 ? mg.supportGear1 : mg.supportGear2;
      const sgPosX = idx === 0 ? sg1X : sg2X;
      const sgPosY = idx === 0 ? sg1Y : sg2Y;
      const PhaseOffset = (idx === 0) ? mg.sg1PhaseOffset : mg.sg2PhaseOffset;
      const baseAngle = (idx === 0) ? sg1AngleBase : sg2AngleBase;
      sgMesh.position.set(sgPosX, sgPosY, agPosZ);
      sgMesh.rotation.z = baseAngle + PhaseOffset;
    });
  }


  _addLabelsToRings(font) {
    const ringLabels = {
      'fixed': { labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], angleOffset: 0 },
      'hour12': { labels: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], angleOffset: 0 },
      'min60': { labels: [1, 2, 3, 4, 5], angleOffset: 0 },
      'min5': { labels: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], angleOffset: 0 }
    };

    for (const name in ringLabels) {
      if (!this.ringMeshes[name]) continue;
      const data = this.ringMeshes[name];
      const conf = ringLabels[name];
      const labels = conf.labels;

      const rw = data.outerR - data.innerR;
      const midR = (data.outerR + data.innerR) / 2;

      // Reduced font size by 10%
      const fontSize = Math.max(6, rw * 0.45) * 0.9;

      // Increased depth to make them cast shadows
      const textDepth = 6;

      // Shift fixed ring numbers slightly outwards to counteract visual optical illusion of scoops pulling the center
      let labelR = (name === 'fixed') ? midR + (fontSize * 0.15) : midR - fontSize / 8;

      let n = labels.length;
      let da = (Math.PI * 2) / n;

      // Z position: protrude slightly from the front surface of the front layer
      // frontLayer front surface is at local Z = frontDepth/2 = D/4
      const ringDepth = data.baseExtrudeDepth;
      const frontDepth = ringDepth / 2;
      let zPos = (frontDepth / 2) - (textDepth * 0.2);

      for (let i = 0; i < n; i++) {
        let la = conf.angleOffset + (i + 1) * da;
        let angle3D = -la; // All labels are CW from local 0

        // Visual tweaks for certain numbers
        // "12" on fixed ring: move left (CCW) by ~1/3 width of "1"
        if (name === 'fixed' && labels[i] === 12) {
          angle3D += (fontSize * 0.3) / labelR;
        }
        // "1" on min60 ring: move left (CCW) by ~1/3 width of "1"
        if (name === 'min60' && labels[i] === 1) {
          angle3D += (fontSize * 0.33) / labelR;
        }

        const textGeo = new THREE.TextGeometry(labels[i].toString(), {
          font: font,
          size: fontSize,
          height: textDepth,
          curveSegments: 4,
          bevelEnabled: true,
          bevelThickness: 0.8,
          bevelSize: 0.7,
          bevelSegments: 3 // A few segments to make it look slightly rounded rather than chamfered
        });
        textGeo.computeBoundingBox();
        const xOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
        const yOffset = -0.5 * (textGeo.boundingBox.max.y - textGeo.boundingBox.min.y);
        textGeo.translate(xOffset, yOffset, 0);

        const tm = new THREE.Mesh(textGeo, this.materials[name]);
        tm.castShadow = true;
        tm.receiveShadow = true;

        // Place it in the ring plane
        tm.position.x = Math.cos(angle3D) * labelR;
        tm.position.y = Math.sin(angle3D) * labelR;
        tm.position.z = zPos;

        if (name !== 'fixed') {
          if (this.keepNumbersRadial === 1) {
            tm.rotation.z = angle3D - Math.PI / 2;
          } else {
            // Parallel (Follows root segment orientation - horizontal at top)
            tm.rotation.z = -Math.PI / 2;
          }
          tm.userData = { angle3D: angle3D }; // Store for dynamic re-orientation
        } else {
          // Fixed ring is also rotated PI/2, so Radial baseline for 12 (at local 0) is -PI/2
          if (this.keepNumbersRadial === 1) {
            tm.rotation.z = angle3D - Math.PI / 2;
          } else {
            tm.rotation.z = -Math.PI / 2;
          }
          tm.userData = { angle3D: angle3D };
        }

        data.mesh.add(tm);
        if (!data.labels) data.labels = [];
        data.labels.push(tm);
      }
    }
  }

  setRotationMode(mode) {
    this.keepNumbersRadial = mode;
    for (const name in this.ringMeshes) {
      const data = this.ringMeshes[name];
      if (data.labels) {
        data.labels.forEach(tm => {
          if (this.keepNumbersRadial === 1) {
            tm.rotation.z = tm.userData.angle3D - Math.PI / 2;
          } else {
            tm.rotation.z = -Math.PI / 2;
          }
        });
      }
    }
  }

  update(timeKeeper) {
    if (!this.active) return;
    // When hosted (no _animate loop), we must pump OrbitControls for damping
    if (!this.standalone && this.controls) this.controls.update();
    this._updateKinematics(timeKeeper);
    this.renderer.render(this.scene, this.camera);
  }

  setTexturesEnabled(enabled) {
    this.texturesEnabled = enabled;
    for (const key in this.materials) {
      const mat = this.materials[key];
      if (mat.isAgedMaterial) {
        if (enabled) {
          // Restore textures
          mat.color.set(0xffffff);
          if (mat.metalType && this.metalTextures[mat.metalType]) {
            this._applyTextureToMaterial(mat, this.metalTextures[mat.metalType]);
          } else if (mat.userData && mat.userData.proceduralTexture) {
            // Restore procedural if nothing better
            mat.map = mat.bumpMap = mat.userData.proceduralTexture;
          }
        } else {
          // Remove textures, use base color
          mat.map = null;
          mat.bumpMap = null;
          mat.color.set(mat.baseColor);
        }
        mat.needsUpdate = true;
      }
    }
  }

  _animate() {
    if (!this.active) return;
    requestAnimationFrame(() => this._animate());
    if (this.controls) this.controls.update();
    this.update();
  }

  _applyTextureToMaterial(mat, tex) {
    const newTex = tex.clone();
    newTex.needsUpdate = true;

    // Re-verify wrapping after clone
    newTex.wrapS = newTex.wrapT = THREE.RepeatWrapping;

    // CUSTOM 3K/4K TEXTURE SCALING:
    // With high-res assets, we likely need extreme zoom (tiny repeat) to see detail
    // on these specific geometries. Reverting to original tiny values.
    if (mat.isLargeSurface) {
      newTex.repeat.set(0.005, 0.005);
    } else {
      newTex.repeat.set(0.003, 0.003);
      newTex.offset.set(0.5, 0.5);
    }

    mat.map = newTex;
    mat.bumpMap = newTex;
    mat.needsUpdate = true;
  }

  _createAgedMaterial(baseColor, intensity, isLargeSurface, metalType = null) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // -- Background: Base color --
    const rBase = (baseColor >> 16) & 255;
    const gBase = (baseColor >> 8) & 255;
    const bBase = baseColor & 255;
    ctx.fillStyle = `rgb(${rBase}, ${gBase}, ${bBase})`;
    ctx.fillRect(0, 0, size, size);

    // Procedural Fallback Drawing
    function drawSeamlessRect(x, y, w, h, fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      if (x + w > size) ctx.fillRect(x - size, y, w, h);
      if (x < 0) ctx.fillRect(x + size, y, w, h);
      if (y + h > size) ctx.fillRect(x, y - size, w, h);
      if (y < 0) ctx.fillRect(x, y + size, w, h);
    }

    const noiseCount = (isLargeSurface ? 800 : 1200) * intensity;
    ctx.save();
    ctx.filter = 'blur(4px)';
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const s = 4 + Math.random() * 8;
      const alpha = Math.random() * 0.25 * intensity;
      drawSeamlessRect(x, y, s, s, `rgba(0,0,0,${alpha})`);
    }
    ctx.restore();

    const proceduralTexture = new THREE.CanvasTexture(canvas);
    proceduralTexture.wrapS = proceduralTexture.wrapT = THREE.RepeatWrapping;

    // Create the material
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: proceduralTexture,
      roughness: 0.15 + intensity * 0.35,
      metalness: 0.85, // Reduced from 0.98 to brighten the model
      bumpMap: proceduralTexture,
      bumpScale: isLargeSurface ? 0.02 : 0.04
    });

    mat.isAgedMaterial = true;
    mat.isLargeSurface = isLargeSurface;
    mat.metalType = metalType;
    mat.baseColor = baseColor; // Store for texture toggling
    mat.userData = { proceduralTexture: proceduralTexture }; // Store for fallback

    // If texture is already loaded, apply it immediately
    if (metalType && this.metalTextures[metalType]) {
      this._applyTextureToMaterial(mat, this.metalTextures[metalType]);
    } else {
      // Fallback scaling
      if (isLargeSurface) proceduralTexture.repeat.set(0.0025, 0.0025);
      else proceduralTexture.repeat.set(0.018, 0.018);
    }

    return mat;
  }
}
