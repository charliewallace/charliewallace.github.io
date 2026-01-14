
/**
MobiusRenderer.js
Implements the Mobius Strip Clock visualization using THREE.js.

THEORY of how the Mobius strip is constructed:
We start with a circle of radius m_Radius. This is not actually drawn on the screen, it's simply a theoretical
circle that forms the centerline of the Mobius strip. Picture it positioned vertically.

The next theoretical step: picture a series of NRECT long slender rectangles
placed on the circle such that it passes perpendicularly through the center of each rectangle.  The first one 
is at the bottom of the circle, positioned so the long axis is horizontal.  We can imagine initially all of them in this
orientation; next we will rotate each one around it's center by an angle of m_Theta = 2*PI/NRECT more than the previous one.
This angle is chosen so that the last rectangle will be rotated 180 degrees from the first one, creating the Mobius strip.
 
We don't draw these; instead we create a set of points (vertices) on each rectangle.  For now, consider the four corners.
In order to define the shape of the mobius strip, we need to connect the points of a given rectangle to the points of the
adjacent rectangles using a series of triangles.  Keep in mind that the edges of those adjacent rectangles are NOT 
parallel the the edges of the given rectangle due to the rotation of the rectangles.  That's why we need to use 
triangles to connect the points.  
 
For our strip, we define 4 points on each long edge of each rectangle, front and back. The outer points we already
described above; these are the corners of the rectangle.  The inner points are one third of the way in from the edge
(corner) towards the middle (along the wide side, not the edge).  We call these "thirdway" points.  The thirdway
points are used to define the minute and second tick marks that occupy the middle of the strip.  
The hour tick marks are the full width of the strip.
 
First we calculate the x/y/z coordinates for each of the 8 points per rectangle and store them in arrays.
Then we use those arrays to create a set of vertices (3D points) that are "pushed" into the master vertices buffer.  
Next, we create the "indices" buffer that defines the triangles that make up the strip. The name "indices" is a bit 
confusing; it contains our triangles as a series of sets of three indices that point into the vertices buffer. Note
that the order of the indices determines which way they point (front vs back), using the right hand rule.

ATTN: there's a special case for the last segment, where the last rectangle is rotated 180 degrees from the first one.
This is because the last rectangle is connected to the first one, and the first one is rotated 180 degrees from the last one.
This means that the last rectangle is connected to the first one in the opposite direction, and the indices need to be reversed.
 
So now we have the triangles we need, but we still need to "add" them to our "geometry" object in form of a 
series of "groups".  Each group shares the same "material" which determines its color, transparency, reflectivity, etc.
 
Going back to our original theoretical rectangles, consider each pair of rectangles that are side by side.
We need to connect the points of one rectangle to the points of the adjacent rectangle using a series of triangles.
Let's call each of these a "segment". The strip is formed by NRECT segments.  
 
Most segments will be all the same color, but segments that include a minute/second "tick" mark in the middle third 
will require more than one color. Thus we need to define and add two groups for each segment, one for the middle third,
and one for the outer thirds, just in case the two are different colors. For an hour tick both will be dark; for a 
minute/second tick, only the middle third is dark; for segments that don't include a tick mark, both will be light. 
This assumes we have chosen the the tick mark mode with both hours and minutes/seconds; we have several other modes.
 
Once we have added all the groups to our geometry object, we can create a mesh from it and add it to the scene.
We will use the material we created earlier for the mesh. We also define some light sources to illuminate the strip, and
the camera location
 
We also need to define the hour, minute, and second indicators. For this we use standard geometry objects such as 
spheres and cylinders, and position them relative to the center of the strip.
 
*********/

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
        this.m_Radius = 3.4; // Radius of the circle that forms the centerline of the mobius strip
        this.m_Len = 1.9; // Width of the mobius strip
        this.m_Ht = 0.2; // Thickness of the mobius strip
        this.m_RotationPerRect = Math.PI / this.NRECT; // base rotation

        // Constants for the indicators
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
        // "Thirdway" refers to a point one third of the way
        //   in from the edge (corner) towards the middle
        //   of the strip (along the wide side, not the edge),
        //   along a line connecting front to back, or back to front,
        //   for inner and outer.
        // Purpose: for minute/second tick marks that don't extend all the way 
        //   across the strip; these sit in the inner third, occupying the part of the
        //   strip where the minute and second indicators move. As compared to the hour indicators
        //   that go all the way across.
        // These terms (inner/outer/front/back) only make sense at the start of the strip at the bottom, 
        //  while it's laying flat;later at the top it will be vertical at the top of the arch, 
        // so "inner" and "outer" no longer make sense in that context, but we keep the terms
        // for consistency.
        this.m_ThirdwayFromFrontToBackInner3DPtArray = []; // A third towards middle, from front inner to back inner
        this.m_ThirdwayFromBackToFrontInner3DPtArray = []; // A third towards middle, from back inner to front inner
        this.m_ThirdwayFromFrontToBackOuter3DPtArray = []; // A third towards middle, from front outer to back outer
        this.m_ThirdwayFromBackToFrontOuter3DPtArray = []; // A third towards middle, from back outer to front outer

        this.initialized = false;

        // State
        this.rotationEnabled = false;
        this.fastMode = false;
        this.indicatorShapes = { hours: 'outer-ring', minutes: 'ring', seconds: 'sphere' };
        this.tickScheme = 'standard';
        this.daliMode = false;
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

    // In this fcn we initialize the point arrays.  Later in createMobiusStripMesh() we will push all the points
    //  into the "vertices" array.  We use indices into that array to indirectly refer to the points when
    //  we create the triangles of the model by adding them to the "indices" array.
    generateMobius3dPoints() {
        const m_Theta = (Math.PI * 2) / this.NRECT;
        let m_RotationPerRect = this.m_RotationPerRect;

        if (this.daliMode) {
            m_RotationPerRect *= 3; // The "Dali" effect: extra twists
        }

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

        // Load all of the points into the vertices array.  We will refer to them via their indexes (indices) into this 
        //   vertices array when defining the triangles that will go into the confusingly-named indices array below.
        //   Seems like the indices array should have been called the triangles array, but oh well.
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

        // Guide to var names. Note that these are indexes into the vertices array.  
        // fi = front inner (inner=facing the center of the strip, front = closer to observer)
        // bi = back inner (inner=facing the center of the strip, back = further from observer)
        // fo = front outer (outer=facing away from the center of the strip, front = closer to observer)
        // bo = back outer (outer=facing away from the center of the strip, back = further from observer)
        // The numbers 1,2 are used to refer to the ends of a segment of one of the edges of the strip;
        // 1 is part of the trailing rectangle and 2 is part of the leading rectangle.
        // The numbers 3,4 refer to the corresponding vertices of the inner third of a slice.
        //
        // ATTN: The terms "front, back" etc are in the context of the first slice,
        // located at the bottom of the mobius strip; might not make sense later
        // after we've rotated the slice.
        for (let i = 0; i < this.m_NumPoints; i++) {
            // we make one pass thru this loop for each slice of the mobius strip.
            // A slice is like a cross-section of the mobius strip, with a leading (1) and trailing (2) face.
            // The center third of the slice (the thirdway) is like a bridge 
            // connecting the front and back of the slice.
            let r1 = i;
            let r2 = (i + 1) % this.m_NumPoints; // prevent wrap-around; r2 goes to 0 at the end of the loop

            let fi1 = r1 * 8;
            let bi1 = fi1 + 1; let fo1 = fi1 + 2; let bo1 = fi1 + 3;
            let fi3 = fi1 + 4; let bi3 = fi1 + 5; let fo3 = fi1 + 6; let bo3 = fi1 + 7;

            let fi2 = r2 * 8;
            let bi2 = fi2 + 1; let fo2 = fi2 + 2; let bo2 = fi2 + 3;
            let fi4 = fi2 + 4; let bi4 = fi2 + 5; let fo4 = fi2 + 6; let bo4 = fi2 + 7;

            if (i === this.m_NumPoints - 1) {
                // must alter the order for last slice due to 180 rotation
                //  where the ends meet. r2 is now 0.
                // We are here referring back to the entries for the first slice
                fi2 = 0; fi3 = 1; fi1 = 2; fi2 = 3;
                bo2 = 0; fo2 = 1; bi2 = 2; fi2 = 3;
                bo4 = 4; fo4 = 5; bi4 = 6; fi4 = 7;

                // This should work but doesn't.
                //fi1 = 3; bi1 = 2; fo1 = 1; bo1 = 0;
                //fi3 = 7; bi3 = 6; fo3 = 5; bo3 = 4;

            }

            // The following must push the points using the right-hand rule:
            //  the direction of the normal vector for each triangle points outward.
            // These share the same material.   
            indices.push(fi2, fi3, fi1); indices.push(fi2, fi4, fi3); // front inner
            indices.push(fo1, fo3, fo2); indices.push(fo4, fo2, fo3); // front outer
            indices.push(fo1, fi2, fi1); indices.push(fo2, fi2, fo1); // Front edge of strip

            indices.push(bi4, bi1, bi3); indices.push(bi4, bi2, bi1); // back inner
            indices.push(bo4, bo3, bo1); indices.push(bo4, bo1, bo2); // back outer
            indices.push(bi2, bo1, bi1); indices.push(bi2, bo2, bo1); // Back edge of strip

            // The "thirdway" bridge connecting the front and back of the strip.
            // The minutes and second indicators move along this central part of the strip.
            indices.push(fi4, bi3, fi3); indices.push(fi4, bi4, bi3); // inner facing 
            indices.push(fo4, fo3, bo3); indices.push(fo4, bo3, bo4); // outer facing
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);

        // Tick Scheme Groups
        const indicesPerSegment = 48;
        const indicesOuterThirds = 36;  // 18 for front edge, 18 for back edge
        const indicesMiddleThird = 12;

        // TODO: recode to handle day and night if enabled. That means we need to
        // use different materials for the front and back edges of the strip; and we need
        // to handle the fact that the front and back of the strip are different
        // colors when day and night are enabled. The transitions from day to night and vice versa
        // will correspond to specific slice indices that we'll need to calculate.
        // I have prepared by this by separating the front and back edges into different groups.
        // This will allow us to use different materials for the front and back edges.  
        // We'll need to add day and night materials to the material[] array.
        // ISSUE: some tick schemes are not ideal for day and night mode. Whadda do?? Ignore for now.
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

            // Originally we had both sides of the strip as one group.
            //geometry.addGroup(i * indicesPerSegment, indicesOuterThirds, matOuter);

            // Now we have the front and back of the strip as separate groups.
            // This allows them to be different materials/colors
            geometry.addGroup(i * indicesPerSegment, indicesOuterThirds / 2, matOuter);
            geometry.addGroup(i * indicesPerSegment + indicesOuterThirds / 2, indicesOuterThirds / 2, matOuter);

            geometry.addGroup(i * indicesPerSegment + indicesOuterThirds, indicesMiddleThird, matMiddle);
        }

        geometry.computeVertexNormals();
        const materials = [
            new THREE.MeshStandardMaterial({
                color: 0xD3D3D3, side: THREE.DoubleSide, metalness: 0.5,
                roughness: 0.1, transparent: true, opacity: 0.95
            }),
            new THREE.MeshStandardMaterial({
                color: 0x222222, side: THREE.DoubleSide, metalness: 0.5,
                roughness: 0.1
            }),
            new THREE.MeshStandardMaterial({
                color: 0x222222, side: THREE.DoubleSide, metalness: 0.5,
                roughness: 0.1, transparent: true, opacity: 0.95
            })
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
        if (this.hourNumbersGroup) this.hourNumbersGroup.visible = this.hoursVisible;
        return this.hoursVisible;
    }

    setDaliMode(enabled) {
        if (this.daliMode === enabled) return;
        this.daliMode = enabled;
        // Must regenerate points and mesh because the geometry changes
        this.generateMobius3dPoints();
        this.createMobiusStripMesh();

        // If hour markers need to follow the surface, they might need adjustment, 
        // but since they are placed based on edgePath which is updated in generateMobius3dPoints,
        // we just need to refresh their positions.
        this.createHourNumbers();
    }
}
