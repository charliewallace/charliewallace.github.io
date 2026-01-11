
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

        this.m_SecondsRadius = 0.35;
        this.m_MinutesRadius = 0.45;
        this.m_HourSphereRadius = 0.55;

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
        this.fastMode = false;
        this.indicatorShapes = { hours: 'outer-ring', minutes: 'ring', seconds: 'sphere' };
        this.tickScheme = 'standard';
        this.timeStyle = 'ampm';
        this.hoursVisible = true;

        this.edgePath = [];
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
        this.scene.background = new THREE.Color(0x393939); // Unified middle-ground gray

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

        // Hour Numbers
        this.createHourNumbers();

        this.initialized = true;
    }

    activate() {
        super.activate();
        if (this.renderer) {
            const el = this.renderer.domElement;
            el.style.display = 'block';
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
        } else {
            this.mobiusGroup.rotation.y = 0;
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

        // Billboard Hour Numbers
        if (this.hourNumbersGroup && this.hoursVisible) {
            this.hourNumbersGroup.children.forEach(child => {
                child.lookAt(this.camera.position);
            });
        }

        // Hand Positions
        this.updateHands(tk);

        this.renderer.render(this.scene, this.camera);
    }

    updateHands(tk) {
        let sec60 = tk.seconds + tk.millis / 1000;
        let min60 = tk.minutes + sec60 / 60;
        let hour24 = tk.hours + min60 / 60;

        // Demo (Fast) Mode Logic
        if (this.fastMode) {
            if (this.indicatorShapes.hours === 'outer-ring') {
                // Pause briefly at each hour
                let rawFastHour24 = (24.0 / 60.0) * sec60;
                let fractionalHour = rawFastHour24 % 1;
                let minutesWithinHour = fractionalHour < 0.5 ? fractionalHour * 60 : (1 - fractionalHour) * 60;

                if (minutesWithinHour <= 6) {
                    hour24 = Math.round(rawFastHour24);
                } else {
                    hour24 = rawFastHour24;
                }

                let rawHourFrac = rawFastHour24 - Math.floor(rawFastHour24);
                min60 = rawHourFrac * 60;
            } else {
                hour24 = (24.0 / 60.0) * sec60;
                let hourFrac = hour24 - Math.floor(hour24);
                min60 = hourFrac * 60;
            }
        }

        // Second Hand
        if (this.secondSphere) {
            const secAngle = Math.PI / 2 - (sec60 / 60) * 2 * Math.PI;
            this.secondSphere.position.x = this.m_Radius * Math.cos(secAngle);
            this.secondSphere.position.y = this.m_Radius * Math.sin(secAngle);
            this.secondSphere.position.z = 0;

            if (this.indicatorShapes.seconds === 'disc') {
                const tangent = new THREE.Vector3(-Math.sin(secAngle), Math.cos(secAngle), 0).normalize();
                this.secondSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            } else {
                this.secondSphere.rotation.set(0, 0, 0);
            }
        }

        // Minute Hand
        if (this.minuteSphere) {
            const minAngle = Math.PI / 2 - (min60 / 60) * 2 * Math.PI;
            this.minuteSphere.position.x = this.m_Radius * Math.cos(minAngle);
            this.minuteSphere.position.y = this.m_Radius * Math.sin(minAngle);
            this.minuteSphere.position.z = 0;

            if (this.indicatorShapes.minutes === 'disc') {
                const tangent = new THREE.Vector3(-Math.sin(minAngle), Math.cos(minAngle), 0).normalize();
                this.minuteSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            } else if (this.indicatorShapes.minutes === 'ring') {
                const tangent = new THREE.Vector3(-Math.sin(minAngle), Math.cos(minAngle), 0).normalize();
                this.minuteSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            } else {
                this.minuteSphere.rotation.set(0, 0, 0);
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

            if (this.indicatorShapes.hours === 'outer-ring') {
                const centerIndex1 = index1 % this.m_NumPoints;
                const centerIndex2 = index2 % this.m_NumPoints;
                const centerPt1 = this.m_RectCenter3DPtArray[centerIndex1];
                const centerPt2 = this.m_RectCenter3DPtArray[centerIndex2];
                const centerPt = new THREE.Vector3().lerpVectors(centerPt1, centerPt2, fraction);

                let edgeMidpoint1, edgeMidpoint2;
                if (index1 < this.m_NumPoints) {
                    edgeMidpoint1 = new THREE.Vector3().addVectors(this.m_FrontInnerCorner3DPtArray[centerIndex1], this.m_FrontOuterCorner3DPtArray[centerIndex1]).multiplyScalar(0.5);
                    edgeMidpoint2 = new THREE.Vector3().addVectors(this.m_FrontInnerCorner3DPtArray[centerIndex2], this.m_FrontOuterCorner3DPtArray[centerIndex2]).multiplyScalar(0.5);
                } else {
                    edgeMidpoint1 = new THREE.Vector3().addVectors(this.m_BackOuterCorner3DPtArray[centerIndex1], this.m_BackInnerCorner3DPtArray[centerIndex1]).multiplyScalar(0.5);
                    edgeMidpoint2 = new THREE.Vector3().addVectors(this.m_BackOuterCorner3DPtArray[centerIndex2], this.m_BackInnerCorner3DPtArray[centerIndex2]).multiplyScalar(0.5);
                }
                const edgeMidpoint = new THREE.Vector3().lerpVectors(edgeMidpoint1, edgeMidpoint2, fraction);
                const dirOutward = new THREE.Vector3().subVectors(edgeMidpoint, centerPt).normalize();

                this.hourSphere.position.copy(edgeMidpoint);
                const outerRadius = 0.4 + 0.13;
                this.hourSphere.position.addScaledVector(dirOutward, outerRadius);

                const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
                this.hourSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

                // Rotation animation on the hour
                const fractionalHour = (hour24 % 1);
                const minutesWithinHour = fractionalHour < 0.5 ? (fractionalHour * 60) : ((1 - fractionalHour) * 60);
                const rotationWindow = this.fastMode ? 6 : 1;

                if (minutesWithinHour <= rotationWindow) {
                    let rotationAngle = 0;
                    const currentSeconds = tk.seconds + tk.millis / 1000;
                    if (this.fastMode) {
                        rotationAngle = currentSeconds * Math.PI * 2;
                    } else {
                        rotationAngle = (currentSeconds / 2) * Math.PI * 2;
                    }
                    const rotationQuat = new THREE.Quaternion().setFromAxisAngle(dirOutward, rotationAngle);
                    this.hourSphere.quaternion.premultiply(rotationQuat);
                }
            } else if (this.indicatorShapes.hours === 'disc') {
                const edgePos = new THREE.Vector3().lerpVectors(p1, p2, fraction);
                this.hourSphere.position.copy(edgePos);
                const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
                this.hourSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            } else if (this.indicatorShapes.hours === 'ring') {
                // Simplified ring logic 
                const edgePos = new THREE.Vector3().lerpVectors(p1, p2, fraction);
                this.hourSphere.position.copy(edgePos);
                const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
                this.hourSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            } else {
                const edgePos = new THREE.Vector3().lerpVectors(p1, p2, fraction);
                this.hourSphere.position.copy(edgePos);
            }
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
            let fi1 = r1 * 8; let bi1 = fi1 + 1; let fo1 = fi1 + 2; let bo1 = fi1 + 3;
            let fi3 = fi1 + 4; let bi3 = fi1 + 5; let fo3 = fi1 + 6; let bo3 = fi1 + 7;
            let fi2 = r2 * 8; let bi2 = fi2 + 1; let fo2 = fi2 + 2; let bo2 = fi2 + 3;
            let fi4 = fi2 + 4; let bi4 = fi2 + 5; let fo4 = fi2 + 6; let bo4 = fi2 + 7;

            if (i === this.m_NumPoints - 1) {
                bo2 = 0; fo2 = 1; bi2 = 2; fi2 = 3;
                bo4 = 4; fo4 = 5; bi4 = 6; fi4 = 7;
            }

            indices.push(fi2, fi3, fi1); indices.push(fi2, fi4, fi3);
            indices.push(fo1, fo3, fo2); indices.push(fo4, fo2, fo3);
            indices.push(fo1, fi2, fi1); indices.push(fo2, fi2, fo1);
            indices.push(bi4, bi1, bi3); indices.push(bi4, bi2, bi1);
            indices.push(bo4, bo3, bo1); indices.push(bo4, bo1, bo2);
            indices.push(bi2, bo1, bi1); indices.push(bi2, bo2, bo1);
            indices.push(fi4, bi3, fi3); indices.push(fi4, bi4, bi3);
            indices.push(fo4, fo3, bo3); indices.push(fo4, bo3, bo4);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);

        // Tick Scheme Groups
        const indicesPerSegment = 48;
        const indicesOuterThirds = 36;
        const indicesMiddleThird = 12;

        for (let i = 0; i < this.m_NumPoints; i++) {
            let matOuter = 0, matMiddle = 0;
            const isHourTick = (i % 30 === 0);
            const isMinuteTick = (i % 6 === 0);
            const hourIndex = Math.floor(i / 30);
            const minuteIndex = Math.floor(i / 6);

            switch (this.tickScheme) {
                case 'minimal':
                    matOuter = isHourTick ? 1 : 0;
                    matMiddle = isHourTick ? 1 : 0;
                    break;
                case 'standard':
                    matOuter = isHourTick ? 1 : 0;
                    matMiddle = (isHourTick || isMinuteTick) ? 1 : 0;
                    break;
                case 'alternating':
                    matOuter = (hourIndex % 2 === 0) ? 0 : 2;
                    matMiddle = matOuter;
                    break;
                case 'alternating_ticks':
                    matOuter = (hourIndex % 2 === 0) ? 0 : 2;
                    matMiddle = (minuteIndex % 2 === 0) ? 2 : 0;
                    break;
            }

            geometry.addGroup(i * indicesPerSegment, indicesOuterThirds, matOuter);
            geometry.addGroup(i * indicesPerSegment + indicesOuterThirds, indicesMiddleThird, matMiddle);
        }

        geometry.computeVertexNormals();
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xD3D3D3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.95 }),
            new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.95 })
        ];

        if (this.mobiusMesh) this.mobiusGroup.remove(this.mobiusMesh);
        this.mobiusMesh = new THREE.Mesh(geometry, materials);
        this.mobiusGroup.add(this.mobiusMesh);
    }

    createHourNumbers() {
        if (this.hourNumbersGroup) this.mobiusGroup.remove(this.hourNumbersGroup);
        this.hourNumbersGroup = new THREE.Group();
        this.hourNumbersGroup.visible = this.hoursVisible;
        this.mobiusGroup.add(this.hourNumbersGroup);

        const loader = new THREE.FontLoader();
        loader.load('https://unpkg.com/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
            for (let h = 1; h <= 24; h++) {
                let hourNumStr, suffixStr = '';
                if (this.timeStyle === "24") {
                    hourNumStr = (h === 24) ? '00' : h.toString().padStart(2, '0');
                } else {
                    if (h === 24) { hourNumStr = '12'; suffixStr = 'AM'; }
                    else if (h === 12) { hourNumStr = '12'; suffixStr = 'PM'; }
                    else if (h > 12) { hourNumStr = (h - 12).toString(); suffixStr = 'PM'; }
                    else { hourNumStr = h.toString(); suffixStr = 'AM'; }
                }

                const hourGroup = new THREE.Group();
                const numGeo = new THREE.TextGeometry(hourNumStr, { font: font, size: 0.25, height: 0.02, curveSegments: 4, bevelEnabled: false });
                numGeo.computeBoundingBox();
                const numMesh = new THREE.Mesh(numGeo, textMaterial);
                hourGroup.add(numMesh);

                if (this.timeStyle !== "24") {
                    const topChar = suffixStr[0], botChar = suffixStr[1];
                    const suffixSize = 0.12, marginX = 0.05;
                    const topGeo = new THREE.TextGeometry(topChar, { font: font, size: suffixSize, height: 0.02, curveSegments: 4, bevelEnabled: false });
                    const topMesh = new THREE.Mesh(topGeo, textMaterial);
                    topMesh.position.set(numGeo.boundingBox.max.x + marginX, 0.13, 0);
                    hourGroup.add(topMesh);
                    const botGeo = new THREE.TextGeometry(botChar, { font: font, size: suffixSize, height: 0.02, curveSegments: 4, bevelEnabled: false });
                    const botMesh = new THREE.Mesh(botGeo, textMaterial);
                    botMesh.position.set(numGeo.boundingBox.max.x + marginX, 0.0, 0);
                    hourGroup.add(botMesh);
                }

                // Center the group
                const totalWidth = (this.timeStyle === "24") ? (numGeo.boundingBox.max.x - numGeo.boundingBox.min.x) : (numGeo.boundingBox.max.x + 0.2 - numGeo.boundingBox.min.x);
                hourGroup.children.forEach(child => { child.position.x -= totalWidth / 2; child.position.y -= 0.125; });

                let idx = ((180 - (h * 30)) % 720 + 720) % 720;
                const p = this.edgePath[idx];
                const centerIndex = idx % this.m_NumPoints;
                const centerPt = this.m_RectCenter3DPtArray[centerIndex];
                const dir = new THREE.Vector3().subVectors(p, centerPt).normalize();
                const pos = new THREE.Vector3().copy(p).add(dir.multiplyScalar(0.53));
                hourGroup.position.copy(pos);
                this.hourNumbersGroup.add(hourGroup);
            }
        });
    }

    createClockHands() {
        this.setIndicatorShape('hours', this.indicatorShapes.hours);
        this.setIndicatorShape('minutes', this.indicatorShapes.minutes);
        this.setIndicatorShape('seconds', this.indicatorShapes.seconds);
    }

    setIndicatorShape(type, shape) {
        this.indicatorShapes[type] = shape;
        let geometry;
        if (shape === 'disc') {
            const h = 0.1;
            if (type === 'hours') geometry = new THREE.CylinderGeometry(this.m_HourSphereRadius, this.m_HourSphereRadius, h, 32);
            else if (type === 'minutes') geometry = new THREE.CylinderGeometry(this.m_MinutesRadius, this.m_MinutesRadius, h, 32);
            else if (type === 'seconds') geometry = new THREE.CylinderGeometry(this.m_SecondsRadius, this.m_SecondsRadius, h, 32);
        } else if (shape === 'ring' || shape === 'outer-ring') {
            if (type === 'hours') {
                if (shape === 'outer-ring') geometry = new THREE.TorusGeometry(0.4, 0.13, 16, 32);
                else geometry = new THREE.TorusGeometry(this.m_HourSphereRadius, 0.15, 16, 32);
            } else if (type === 'minutes') {
                geometry = new THREE.TorusGeometry(this.m_MinutesRadius, 0.12, 16, 32);
            }
        } else {
            if (type === 'hours') geometry = new THREE.SphereGeometry(this.m_HourSphereRadius, 32, 32);
            else if (type === 'minutes') geometry = new THREE.SphereGeometry(this.m_MinutesRadius, 32, 32);
            else if (type === 'seconds') geometry = new THREE.SphereGeometry(this.m_SecondsRadius, 32, 32);
        }

        const mat = (type === 'hours') ? new THREE.MeshStandardMaterial({ color: 0xADFF2F }) :
            (type === 'minutes') ? new THREE.MeshStandardMaterial({ color: 0x00FFFF }) :
                new THREE.MeshStandardMaterial({ color: 0xFF7F50 });

        if (type === 'hours') {
            if (this.hourSphere) { this.mobiusGroup.remove(this.hourSphere); this.hourSphere.geometry.dispose(); }
            this.hourSphere = new THREE.Mesh(geometry, mat); this.mobiusGroup.add(this.hourSphere);
        } else if (type === 'minutes') {
            if (this.minuteSphere) { this.mobiusGroup.remove(this.minuteSphere); this.minuteSphere.geometry.dispose(); }
            this.minuteSphere = new THREE.Mesh(geometry, mat); this.mobiusGroup.add(this.minuteSphere);
        } else if (type === 'seconds') {
            if (this.secondSphere) { this.mobiusGroup.remove(this.secondSphere); this.secondSphere.geometry.dispose(); }
            this.secondSphere = new THREE.Mesh(geometry, mat); this.mobiusGroup.add(this.secondSphere);
        }
    }

    setTickScheme(scheme) {
        this.tickScheme = scheme;
        this.createMobiusStripMesh();
    }

    setTimeStyle(style) {
        this.timeStyle = style;
        this.createHourNumbers();
    }

    toggleHourNumbers() {
        this.hoursVisible = !this.hoursVisible;
        if (this.hourNumbersGroup) this.hourNumbersGroup.visible = this.hoursVisible;
        return this.hoursVisible;
    }
}
