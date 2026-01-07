
/**
 * MobiusRenderer.js
 * Implements the Mobius Strip Clock visualization using THREE.js.
 */

class MobiusRenderer extends ClockRenderer {
    constructor(containerId) {
        super(containerId);

        // THREE.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mobiusGroup = null;
        this.mobiusMesh = null;
        this.hourNumbersGroup = null;
        this.topRightLight = null;

        // Indicators
        this.hourSphere = null;
        this.minuteSphere = null;
        this.secondSphere = null;

        // Constants
        this.NRECT = 360;
        this.m_NumPoints = 360;
        this.m_Radius = 3.4;
        this.m_Len = 1.9;
        this.m_Ht = 0.2;

        // Data Arrays
        this.m_RectCenter3DPtArray = [];
        this.m_FrontInnerCorner3DPtArray = [];
        this.m_BackInnerCorner3DPtArray = [];
        this.m_FrontOuterCorner3DPtArray = [];
        this.m_BackOuterCorner3DPtArray = [];

        // Thirdway Arrays (for ticks)
        this.m_ThirdwayFromFrontToBackInner3DPtArray = [];
        this.m_ThirdwayFromBackToFrontInner3DPtArray = [];
        this.m_ThirdwayFromFrontToBackOuter3DPtArray = [];
        this.m_ThirdwayFromBackToFrontOuter3DPtArray = [];

        this.initialized = false;

        // State
        this.rotationEnabled = false;
        this.fastMode = false; // Controlled by UI/logic
        this.indicatorShapes = { hours: 'outer-ring', minutes: 'ring', seconds: 'sphere' };
        this.tickScheme = 'standard';
    }

    init() {
        super.init();
        if (this.initialized) return;

        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error("MobiusRenderer: Container not found");
            return;
        }

        // Initialize Data
        this.generateMobius3dPoints();

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x505050); // Medium gray

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 7;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.display = 'none'; // Hidden by default
        this.renderer.domElement.id = 'mobius-canvas';
        container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);

        this.topRightLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.topRightLight.position.set(1, 1, 2);
        this.scene.add(this.topRightLight);

        // Groups
        this.mobiusGroup = new THREE.Group();
        this.scene.add(this.mobiusGroup);

        this.createMobiusStripMesh();
        this.createClockHands();

        // Edge path for hour numbers
        this.edgePath = this.m_FrontInnerCorner3DPtArray.concat(this.m_BackOuterCorner3DPtArray);

        // Try to load numbers (simplified for now, logic below)
        // this.createHourNumbers(); 

        this.initialized = true;
    }

    activate() {
        super.activate();
        if (this.renderer) {
            const el = this.renderer.domElement;
            el.style.display = 'block';
            // Also ensure the container is visible (handled by base class if matching ID, but here ID differs)
            const wrapper = document.getElementById(this.containerId);
            if (wrapper) wrapper.classList.remove('hidden');
        }
    }

    deactivate() {
        super.deactivate();
        if (this.renderer) {
            this.renderer.domElement.style.display = 'none';
            const wrapper = document.getElementById(this.containerId);
            if (wrapper) wrapper.classList.add('hidden');
        }
    }

    resize(w, h) {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);

        // Mobile zoom adjustment
        if (w < 600) {
            this.camera.position.z = 13.0;
        } else {
            this.camera.position.z = 7.2;
        }
    }

    update(tk, loc) {
        if (!this.active) return;

        // Animation Logic
        if (this.rotationEnabled) {
            this.mobiusGroup.rotation.y += 0.005;
        }

        // Light Animation
        const time = tk.totalSecondsToday;
        const radius = 0.5;
        const centerX = 1;
        const centerZ = 2;
        const period = 15.0;
        const angle = (time / period) * Math.PI * 2;
        this.topRightLight.position.x = centerX + Math.cos(angle) * radius;
        this.topRightLight.position.z = centerZ + Math.sin(angle) * radius;

        // Hand Positions
        this.updateHands(tk);

        this.renderer.render(this.scene, this.camera);
    }

    updateHands(tk) {
        let sec60 = tk.seconds + tk.millis / 1000;
        let min60 = tk.minutes + sec60 / 60;
        let hour24 = tk.hours + min60 / 60;

        // Second Hand
        if (this.secondSphere) {
            const secAngle = Math.PI / 2 - (sec60 / 60) * 2 * Math.PI;
            this.secondSphere.position.x = this.m_Radius * Math.cos(secAngle);
            this.secondSphere.position.y = this.m_Radius * Math.sin(secAngle);
            this.secondSphere.position.z = 0;
        }

        // Minute Hand
        if (this.minuteSphere) {
            const minAngle = Math.PI / 2 - (min60 / 60) * 2 * Math.PI;
            this.minuteSphere.position.x = this.m_Radius * Math.cos(minAngle);
            this.minuteSphere.position.y = this.m_Radius * Math.sin(minAngle);
            this.minuteSphere.position.z = 0;

            if (this.indicatorShapes.minutes === 'ring') {
                const tangent = new THREE.Vector3(-Math.sin(minAngle), Math.cos(minAngle), 0).normalize();
                this.minuteSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            }
        }

        // Hour Hand
        const hourProgress = hour24 / 24;
        const totalPoints = this.NRECT * 2;
        const pathIndexFloat = ((this.NRECT / 2 - (hourProgress * totalPoints)) % totalPoints + totalPoints) % totalPoints;

        const index1 = Math.floor(pathIndexFloat);
        const index2 = (index1 + 1) % totalPoints;
        const fraction = pathIndexFloat - index1;

        if (this.hourSphere && this.edgePath[index1] && this.edgePath[index2]) {
            const p1 = this.edgePath[index1];
            const p2 = this.edgePath[index2];
            const edgePos = new THREE.Vector3().lerpVectors(p1, p2, fraction);
            this.hourSphere.position.copy(edgePos);
        }
    }

    // --- Core Mobius Logic ---

    generateMobius3dPoints() {
        const m_Theta = (Math.PI * 2) / this.NRECT;
        const m_RotationPerRect = Math.PI / this.NRECT;

        const s = Math.sqrt(this.m_Len * this.m_Len + this.m_Ht * this.m_Ht) / 2;
        const beta = Math.asin(this.m_Ht / (2 * s));

        for (let ii = 0; ii < this.m_NumPoints; ii++) {
            const phi = (-Math.PI / 2) + ii * m_Theta;
            const alpha = m_RotationPerRect * ii;

            const x = this.m_Radius * Math.cos(phi);
            const y = this.m_Radius * Math.sin(phi);
            const z = 0;
            this.m_RectCenter3DPtArray[ii] = new THREE.Vector3(x, y, z);

            const z1 = s * Math.cos(beta - alpha);
            const r1 = this.m_Radius - (s * Math.sin(beta - alpha));
            const x1 = r1 * Math.cos(phi);
            const y1 = r1 * Math.sin(phi);
            this.m_FrontInnerCorner3DPtArray[ii] = new THREE.Vector3(x1, y1, z1);

            const z2 = -s * Math.cos(beta + alpha);
            const r2 = this.m_Radius - (s * Math.sin(beta + alpha));
            const x2 = r2 * Math.cos(phi);
            const y2 = r2 * Math.sin(phi);
            this.m_BackInnerCorner3DPtArray[ii] = new THREE.Vector3(x2, y2, z2);

            const z3 = s * Math.cos(beta + alpha);
            const r3 = this.m_Radius + (s * Math.sin(beta + alpha));
            const x3 = r3 * Math.cos(phi);
            const y3 = r3 * Math.sin(phi);
            this.m_FrontOuterCorner3DPtArray[ii] = new THREE.Vector3(x3, y3, z3);

            const z4 = -s * Math.cos(beta - alpha);
            const r4 = this.m_Radius + (s * Math.sin(beta - alpha));
            const x4 = r4 * Math.cos(phi);
            const y4 = r4 * Math.sin(phi);
            this.m_BackOuterCorner3DPtArray[ii] = new THREE.Vector3(x4, y4, z4);

            // Third points
            this.m_ThirdwayFromFrontToBackInner3DPtArray[ii] = new THREE.Vector3().lerpVectors(this.m_FrontInnerCorner3DPtArray[ii], this.m_BackInnerCorner3DPtArray[ii], 1 / 3);
            this.m_ThirdwayFromBackToFrontInner3DPtArray[ii] = new THREE.Vector3().lerpVectors(this.m_BackInnerCorner3DPtArray[ii], this.m_FrontInnerCorner3DPtArray[ii], 1 / 3);
            this.m_ThirdwayFromFrontToBackOuter3DPtArray[ii] = new THREE.Vector3().lerpVectors(this.m_FrontOuterCorner3DPtArray[ii], this.m_BackOuterCorner3DPtArray[ii], 1 / 3);
            this.m_ThirdwayFromBackToFrontOuter3DPtArray[ii] = new THREE.Vector3().lerpVectors(this.m_BackOuterCorner3DPtArray[ii], this.m_FrontOuterCorner3DPtArray[ii], 1 / 3);
        }

        this.edgePath = this.m_FrontInnerCorner3DPtArray.concat(this.m_BackOuterCorner3DPtArray);
    }

    createMobiusStripMesh() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        for (let i = 0; i < this.m_NumPoints; i++) {
            // Push all 8 points for this slice
            vertices.push(this.m_FrontInnerCorner3DPtArray[i].x, this.m_FrontInnerCorner3DPtArray[i].y, this.m_FrontInnerCorner3DPtArray[i].z);
            vertices.push(this.m_BackInnerCorner3DPtArray[i].x, this.m_BackInnerCorner3DPtArray[i].y, this.m_BackInnerCorner3DPtArray[i].z);
            vertices.push(this.m_FrontOuterCorner3DPtArray[i].x, this.m_FrontOuterCorner3DPtArray[i].y, this.m_FrontOuterCorner3DPtArray[i].z);
            vertices.push(this.m_BackOuterCorner3DPtArray[i].x, this.m_BackOuterCorner3DPtArray[i].y, this.m_BackOuterCorner3DPtArray[i].z);

            vertices.push(this.m_ThirdwayFromFrontToBackInner3DPtArray[i].x, this.m_ThirdwayFromFrontToBackInner3DPtArray[i].y, this.m_ThirdwayFromFrontToBackInner3DPtArray[i].z);
            vertices.push(this.m_ThirdwayFromBackToFrontInner3DPtArray[i].x, this.m_ThirdwayFromBackToFrontInner3DPtArray[i].y, this.m_ThirdwayFromBackToFrontInner3DPtArray[i].z);
            vertices.push(this.m_ThirdwayFromFrontToBackOuter3DPtArray[i].x, this.m_ThirdwayFromFrontToBackOuter3DPtArray[i].y, this.m_ThirdwayFromFrontToBackOuter3DPtArray[i].z);
            vertices.push(this.m_ThirdwayFromBackToFrontOuter3DPtArray[i].x, this.m_ThirdwayFromBackToFrontOuter3DPtArray[i].y, this.m_ThirdwayFromBackToFrontOuter3DPtArray[i].z);
        }

        for (let i = 0; i < this.m_NumPoints; i++) {
            let r1 = i;
            let r2 = (i + 1) % this.m_NumPoints;

            let fi1 = r1 * 8;
            let bi1 = fi1 + 1;
            let fo1 = fi1 + 2;
            let bo1 = fi1 + 3;
            let fi3 = fi1 + 4;
            let bi3 = fi1 + 5;
            let fo3 = fi1 + 6;
            let bo3 = fi1 + 7;

            let fi2 = r2 * 8;
            let bi2 = fi2 + 1;
            let fo2 = fi2 + 2;
            let bo2 = fi2 + 3;
            let fi4 = fi2 + 4;
            let bi4 = fi2 + 5;
            let fo4 = fi2 + 6;
            let bo4 = fi2 + 7;

            if (i === this.m_NumPoints - 1) {
                // Twist logic
                bo2 = 0; fo2 = 1; bi2 = 2; fi2 = 3;
                bo4 = 4; fo4 = 5; bi4 = 6; fi4 = 7;
            }

            // Front third
            indices.push(fi2, fi3, fi1);
            indices.push(fi2, fi4, fi3);
            indices.push(fo1, fo3, fo2);
            indices.push(fo4, fo2, fo3);
            indices.push(fo1, fi2, fi1); // Edge
            indices.push(fo2, fi2, fo1);

            // Back third
            indices.push(bi4, bi1, bi3);
            indices.push(bi4, bi2, bi1);
            indices.push(bo4, bo3, bo1);
            indices.push(bo4, bo1, bo2);
            indices.push(bi2, bo1, bi1); // Edge
            indices.push(bi2, bo2, bo1);

            // Middle third (Tick area)
            indices.push(fi4, bi3, fi3);
            indices.push(fi4, bi4, bi3);
            indices.push(fo4, fo3, bo3);
            indices.push(fo4, bo3, bo4);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Groups for materials
        const indicesPerSegment = 48;
        const indicesOuterThirds = 36;
        const indicesMiddleThird = 12;

        for (let i = 0; i < this.m_NumPoints; i++) {
            let matOuter = 0;
            let matMiddle = 0;
            const isHourTick = (i % 30 === 0);
            const isMinuteTick = (i % 6 === 0);

            matOuter = isHourTick ? 1 : 0;
            matMiddle = (isHourTick || isMinuteTick) ? 1 : 0;

            geometry.addGroup(i * indicesPerSegment, indicesOuterThirds, matOuter);
            geometry.addGroup(i * indicesPerSegment + indicesOuterThirds, indicesMiddleThird, matMiddle);
        }

        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xD3D3D3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.95 }), // Light
            new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.1 }), // Dark (Tick)
            new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.95 })  // Dark Transparent
        ];

        if (this.mobiusMesh) {
            this.mobiusGroup.remove(this.mobiusMesh);
        }
        this.mobiusMesh = new THREE.Mesh(geometry, materials);
        this.mobiusGroup.add(this.mobiusMesh);
    }

    createClockHands() {
        const hourGeo = new THREE.SphereGeometry(0.3, 32, 32);
        const hourMat = new THREE.MeshStandardMaterial({ color: 0xFFC0CB }); // Pinkish
        this.hourSphere = new THREE.Mesh(hourGeo, hourMat);
        this.mobiusGroup.add(this.hourSphere);

        const minGeo = new THREE.TorusGeometry(0.3, 0.05, 16, 100); // Ring
        const minMat = new THREE.MeshStandardMaterial({ color: 0x00FFFF });
        this.minuteSphere = new THREE.Mesh(minGeo, minMat);
        this.mobiusGroup.add(this.minuteSphere);

        const secGeo = new THREE.SphereGeometry(0.2, 32, 32);
        const secMat = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
        this.secondSphere = new THREE.Mesh(secGeo, secMat);
        this.mobiusGroup.add(this.secondSphere);
    }
}
