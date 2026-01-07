/*  
This app was created by Charlie Wallace of Carlsbad, CA, copyright 2025.
ATTN: you can pass in parameters to the app using the URL hash.  For example:
   www.mobiusclock.com/#timeStyle=24
   Will result in use of 24 hour time conventions, with 2-digit hours (00-23).

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
 
*/

// Constants for Mobius strip generation
const NRECT = 360;
const m_NumPoints = NRECT;
const m_Theta = (Math.PI * 2) / NRECT;
const m_RotationPerRect = Math.PI / NRECT;
const m_Len = 1.9; // Width of the mobius strip
const m_Ht = 0.2; // Thickness of the mobius strip
const m_Radius = 3.4; // Radius of the theoreticalcircle that forms the centerline of the mobius strip
const m_SecondsRadius = 0.35;
const m_MinutesRadius = 0.45;
const m_HourSphereRadius = 0.55;

// Arrays to hold the generated points
let m_RectCenter3DPtArray = [];
let m_FrontInnerCorner3DPtArray = [];
let m_BackInnerCorner3DPtArray = [];
let m_FrontOuterCorner3DPtArray = [];
let m_BackOuterCorner3DPtArray = [];

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

let m_ThirdwayFromFrontToBackInner3DPtArray = []; // A third towards middle, from front inner to back inner
let m_ThirdwayFromBackToFrontInner3DPtArray = []; // A third towards middle, from back inner to front inner
let m_ThirdwayFromFrontToBackOuter3DPtArray = []; // A third towards middle, from front outer to back outer
let m_ThirdwayFromBackToFrontOuter3DPtArray = []; // A third towards middle, from back outer to front outer


// In this fcn we initialize the point arrays.  Later in createMobiusStripMesh() we will push all the points
//  into the "vertices" array.  We use indices into this array to indirectly refer to the points when
//  we create the triangles of the model by adding them to the indices array.
function generateMobius3dPoints() {
    const s = Math.sqrt(m_Len * m_Len + m_Ht * m_Ht) / 2;
    const beta = Math.asin(m_Ht / (2 * s));

    for (let ii = 0; ii < m_NumPoints; ii++) {
        const phi = (-Math.PI / 2) + ii * m_Theta;
        const alpha = m_RotationPerRect * ii;

        const x = m_Radius * Math.cos(phi);
        const y = m_Radius * Math.sin(phi);
        const z = 0;
        m_RectCenter3DPtArray[ii] = new THREE.Vector3(x, y, z);

        const z1 = s * Math.cos(beta - alpha);
        const r1 = m_Radius - (s * Math.sin(beta - alpha));
        const x1 = r1 * Math.cos(phi);
        const y1 = r1 * Math.sin(phi);
        m_FrontInnerCorner3DPtArray[ii] = new THREE.Vector3(x1, y1, z1);

        const z2 = -s * Math.cos(beta + alpha);
        const r2 = m_Radius - (s * Math.sin(beta + alpha));
        const x2 = r2 * Math.cos(phi);
        const y2 = r2 * Math.sin(phi);
        m_BackInnerCorner3DPtArray[ii] = new THREE.Vector3(x2, y2, z2);

        const z3 = s * Math.cos(beta + alpha);
        const r3 = m_Radius + (s * Math.sin(beta + alpha));
        const x3 = r3 * Math.cos(phi);
        const y3 = r3 * Math.sin(phi);
        m_FrontOuterCorner3DPtArray[ii] = new THREE.Vector3(x3, y3, z3);

        const z4 = -s * Math.cos(beta - alpha);
        const r4 = m_Radius + (s * Math.sin(beta - alpha));
        const x4 = r4 * Math.cos(phi);
        const y4 = r4 * Math.sin(phi);
        m_BackOuterCorner3DPtArray[ii] = new THREE.Vector3(x4, y4, z4);

        // init the thirdway arrays
        // m_ThirdwayFromFrontToBackInner3DPtArray = fi3 (frontInnerCorner, backInnerCorner)
        const x5 = x1 - ((x1 - x2) / 3);
        const y5 = y1 - ((y1 - y2) / 3);
        const z5 = z1 - ((z1 - z2) / 3);
        m_ThirdwayFromFrontToBackInner3DPtArray[ii] = new THREE.Vector3(x5, y5, z5);

        // m_ThirdwayFromBackToFrontInner3DPtArray = bi3 (backInnerCorner, frontInnerCorner)
        const x6 = x2 - ((x2 - x1) / 3);
        const y6 = y2 - ((y2 - y1) / 3);
        const z6 = z2 - ((z2 - z1) / 3);
        m_ThirdwayFromBackToFrontInner3DPtArray[ii] = new THREE.Vector3(x6, y6, z6);

        // m_ThirdwayFromFrontToBackOuter3DPtArray = fo3 (frontOuterCorner, backOuterCorner)
        const x7 = x3 - ((x3 - x4) / 3);
        const y7 = y3 - ((y3 - y4) / 3);
        const z7 = z3 - ((z3 - z4) / 3);
        m_ThirdwayFromFrontToBackOuter3DPtArray[ii] = new THREE.Vector3(x7, y7, z7);

        // m_ThirdwayFromBackToFrontOuter3DPtArray = bo3 (backOuterCorner, frontOuterCorner)
        const x8 = x4 - ((x4 - x3) / 3);
        const y8 = y4 - ((y4 - y3) / 3);
        const z8 = z4 - ((z4 - z3) / 3);
        m_ThirdwayFromBackToFrontOuter3DPtArray[ii] = new THREE.Vector3(x8, y8, z8);
    }
}

// grab params from the url.
var timeStyle = "ampm";
let rotationEnabled = false;
let fastMode = false;
let zenMode = false;
let initialHoursVisible = true;
let indicatorShapes = {
    hours: 'outer-ring',
    minutes: 'ring',
    seconds: 'sphere'
};
let currentTickScheme = 'standard';

function parseUrlParams() {
    const params = new URLSearchParams(window.location.hash.substring(1)); // Remove #

    // Time Style
    if (params.has('timeStyle')) {
        const val = params.get('timeStyle');
        if (val === '24' || val === 'ampm') {
            timeStyle = val;
        }
    }

    // Shapes
    if (params.has('shapeHours')) indicatorShapes.hours = params.get('shapeHours');
    if (params.has('shapeMinutes')) indicatorShapes.minutes = params.get('shapeMinutes');
    if (params.has('shapeSeconds')) indicatorShapes.seconds = params.get('shapeSeconds');

    // Tick Scheme
    if (params.has('tickScheme')) currentTickScheme = params.get('tickScheme');

    // Rotation
    if (params.has('rotation')) {
        const val = params.get('rotation').toLowerCase();
        rotationEnabled = (val === 'true' || val === 'on');
    }

    // Hours Visibility
    if (params.has('showHours')) {
        const val = params.get('showHours').toLowerCase();
        initialHoursVisible = (val === 'true' || val === 'on');
    }

    // Zen Mode (handled post-init)
    if (params.has('zen')) {
        const val = params.get('zen').toLowerCase();
        // We store this in a temp property to trigger later, or just set the flag 
        // But we need to be careful about the toggle logic.
        // Let's return it.
        return (val === 'true' || val === 'on');
    }
    return false;
}

const startInZen = parseUrlParams();

// generateMobius3dPoints(); // Moved call to be explicit or keep it here? 
// It was here before.
generateMobius3dPoints();

let scene, camera, renderer, mobiusGroup;
// rotationEnabled declared above
// fastMode declared above
let hourNumbersGroup;
let mobiusStripMesh;
let topRightLight;
// zenMode declared above
let preZenState = {};


function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050); // Medium gray

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 7;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);


    document.getElementById('container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    topRightLight = new THREE.DirectionalLight(0xffffff, 0.8); // 2nd parameter is intensity
    topRightLight.position.set(1, 1, 2); // the parameters are x, y, z position in units of
    scene.add(topRightLight);

    mobiusGroup = new THREE.Group();
    scene.add(mobiusGroup);

    createMobiusStripMesh();
    createClockHands();

    edgePath = m_FrontInnerCorner3DPtArray.concat(m_BackOuterCorner3DPtArray);
    createHourNumbers();

    animate();
}


function createMobiusStripMesh() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Load all of the points into the vertices array.  We will refer to them via their indexes (indices) into this 
    //   vertices array when defining the triangles that will go into the confusingly-named indices array below.
    //   Seems like the indices array should have been called the triangles array, but oh well.
    for (let i = 0; i < m_NumPoints; i++) {
        vertices.push(m_FrontInnerCorner3DPtArray[i].x, m_FrontInnerCorner3DPtArray[i].y, m_FrontInnerCorner3DPtArray[i].z);
        vertices.push(m_BackInnerCorner3DPtArray[i].x, m_BackInnerCorner3DPtArray[i].y, m_BackInnerCorner3DPtArray[i].z);
        vertices.push(m_FrontOuterCorner3DPtArray[i].x, m_FrontOuterCorner3DPtArray[i].y, m_FrontOuterCorner3DPtArray[i].z);
        vertices.push(m_BackOuterCorner3DPtArray[i].x, m_BackOuterCorner3DPtArray[i].y, m_BackOuterCorner3DPtArray[i].z);

        //  TODO: push vertices for the 4 thirdway arrays. 
        vertices.push(m_ThirdwayFromFrontToBackInner3DPtArray[i].x,
            m_ThirdwayFromFrontToBackInner3DPtArray[i].y,
            m_ThirdwayFromFrontToBackInner3DPtArray[i].z);
        vertices.push(m_ThirdwayFromBackToFrontInner3DPtArray[i].x,
            m_ThirdwayFromBackToFrontInner3DPtArray[i].y,
            m_ThirdwayFromBackToFrontInner3DPtArray[i].z);
        vertices.push(m_ThirdwayFromFrontToBackOuter3DPtArray[i].x,
            m_ThirdwayFromFrontToBackOuter3DPtArray[i].y,
            m_ThirdwayFromFrontToBackOuter3DPtArray[i].z);
        vertices.push(m_ThirdwayFromBackToFrontOuter3DPtArray[i].x,
            m_ThirdwayFromBackToFrontOuter3DPtArray[i].y,
            m_ThirdwayFromBackToFrontOuter3DPtArray[i].z);

        //
    }

    for (let i = 0; i < m_NumPoints; i++) {
        let r1 = i;
        let r2 = (i + 1) % m_NumPoints; // use mod op to handle wrap to 0 at end

        //let fi1 = r1 * 4;
        let fi1 = r1 * 8;
        let bi1 = fi1 + 1;
        let fo1 = fi1 + 2;
        let bo1 = fi1 + 3;

        let fi3 = fi1 + 4;
        let bi3 = fi1 + 5;
        let fo3 = fi1 + 6;
        let bo3 = fi1 + 7;

        //let fi2 = r2 * 4;
        let fi2 = r2 * 8;
        let bi2 = fi2 + 1;
        let fo2 = fi2 + 2;
        let bo2 = fi2 + 3;

        let fi4 = fi2 + 4;
        let bi4 = fi2 + 5;
        let fo4 = fi2 + 6;
        let bo4 = fi2 + 7;


        // must reverse the order for last slice due to 180 rotation
        if (i === m_NumPoints - 1) {
            bo2 = 0;
            fo2 = bo2 + 1;
            bi2 = bo2 + 2;
            fi2 = bo2 + 3;

            bo4 = 4;
            fo4 = 5;
            bi4 = 6;
            fi4 = 7;
        }

        // The following must push the points using the right-hand rule.
        // These share the same material.



        // This represents the front third of the strip.
        indices.push(fi2, fi3, fi1); // inner face
        indices.push(fi2, fi4, fi3);
        indices.push(fo1, fo3, fo2); // outer face
        indices.push(fo4, fo2, fo3);
        indices.push(fo1, fi2, fi1); // front edge face
        indices.push(fo2, fi2, fo1);

        // This represents the back third of the strip.

        indices.push(bi4, bi1, bi3); // inner face
        indices.push(bi4, bi2, bi1);
        indices.push(bo4, bo3, bo1); // outer face
        indices.push(bo4, bo1, bo2);
        indices.push(bi2, bo1, bi1); // back edge face
        indices.push(bi2, bo2, bo1);

        // These represent the inside third, front and back. These will be
        //  in a separate group bc they may use a different material.
        indices.push(fi4, bi3, fi3); // tick inner face (thirdway)
        indices.push(fi4, bi4, bi3);
        indices.push(fo4, fo3, bo3); // tick outer face (thirdway)
        indices.push(fo4, bo3, bo4);



    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);

    const indicesPerSegment = 48;
    const indicesOuterThirds = 36;
    const indicesMiddleThird = 12;

    for (let i = 0; i < m_NumPoints; i++) {
        let matOuter = 0;
        let matMiddle = 0;

        const isHourTick = (i % 30 === 0);
        const isMinuteTick = (i % 6 === 0);
        const hourIndex = Math.floor(i / 30);
        const minuteIndex = Math.floor(i / 6);

        switch (currentTickScheme) {
            case 'minimal':
                // Hour ticks only, full width
                matOuter = isHourTick ? 1 : 0;
                matMiddle = isHourTick ? 1 : 0;
                break;
            case 'standard':
                // Hour (full width) and Minute (middle only) ticks
                matOuter = isHourTick ? 1 : 0;
                matMiddle = (isHourTick || isMinuteTick) ? 1 : 0;
                break;
            case 'alternating':
                // Stripes, no specific ticks
                matOuter = (hourIndex % 2 === 0) ? 0 : 2;
                matMiddle = matOuter;
                break;
            case 'alternating_ticks':
                // Outer: Hour stripes
                matOuter = (hourIndex % 2 === 0) ? 0 : 2;
                // Middle: Minute stripes (Dark/Light)
                matMiddle = (minuteIndex % 2 === 0) ? 2 : 0;
                break;
        }

        geometry.addGroup(i * indicesPerSegment, indicesOuterThirds, matOuter);
        geometry.addGroup(i * indicesPerSegment + indicesOuterThirds, indicesMiddleThird, matMiddle);
    }

    geometry.computeVertexNormals();

    const materials = [
        new THREE.MeshStandardMaterial({
            color: 0xD3D3D3, // Material 0: Light gray (Main strip A)
            side: THREE.DoubleSide,
            metalness: 0.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.95
        }),
        new THREE.MeshStandardMaterial({
            color: 0x222222, // Material 1: Dark gray (Tick color)
            side: THREE.DoubleSide,
            metalness: 0.5,
            roughness: 0.1
        }),
        new THREE.MeshStandardMaterial({
            color: 0x222222, // Material 2: Dark gray (Same as ticks, for alternating)
            side: THREE.DoubleSide,
            metalness: 0.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.95
        })
    ];

    const mesh = new THREE.Mesh(geometry, materials);

    if (mobiusStripMesh) {
        mobiusGroup.remove(mobiusStripMesh);
        mobiusStripMesh.geometry.dispose(); // Clean up old geometry
        mobiusStripMesh.material.forEach(m => m.dispose()); // Clean up old materials if they were unique
    }
    mobiusStripMesh = mesh;
    mobiusGroup.add(mobiusStripMesh);
}



function setTickScheme(scheme) {
    currentTickScheme = scheme;
    createMobiusStripMesh(); // Recreate the mesh with the new scheme
}

let hourSphere, minuteSphere, secondSphere;
let edgePath = [];

function createHourNumbers() {
    if (hourNumbersGroup) {
        mobiusGroup.remove(hourNumbersGroup);
        // Optional: dispose of geometries/materials if needed to prevent memory leaks
        // But for simple text geometries, just removing might be okay for now, 
        // or we can iterate and dispose.
        hourNumbersGroup.children.forEach(child => {
            // TODO traverse and dispose... 
            // For now, simple removal is likely sufficient for this scale.
        });
    }
    hourNumbersGroup = new THREE.Group();
    hourNumbersGroup.visible = initialHoursVisible;
    mobiusGroup.add(hourNumbersGroup);

    const loader = new THREE.FontLoader();
    loader.load('https://unpkg.com/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

        for (let h = 1; h <= 24; h++) {
            let hourNumStr = h.toString();
            let suffixStr = 'AM';
            if (timeStyle === "24") {
                suffixStr = '';
                if (h === 24) {
                    hourNumStr = '00';
                }
                else {
                    hourNumStr = h.toString().padStart(2, '0');
                }
            }
            else {
                if (h === 24) { hourNumStr = '12'; suffixStr = 'AM'; }
                else if (h === 12) { hourNumStr = '12'; suffixStr = 'PM'; }
                else if (h > 12) { hourNumStr = (h - 12).toString(); suffixStr = 'PM'; }
                else { hourNumStr = h.toString(); suffixStr = 'AM'; }
            }

            const hourGroup = new THREE.Group();

            // 1. Number Mesh
            const numGeo = new THREE.TextGeometry(hourNumStr, {
                font: font,
                size: 0.25,
                height: 0.02, // Thinner extrusion for better look? Or keep 0.05
                curveSegments: 4,
                bevelEnabled: false
            });
            numGeo.computeBoundingBox();
            const numWidth = numGeo.boundingBox.max.x - numGeo.boundingBox.min.x;
            const numMesh = new THREE.Mesh(numGeo, textMaterial);
            hourGroup.add(numMesh);

            var suffixWidth = 0;

            var marginX = 0;

            if (timeStyle !== "24") {
                // 2. Suffix Meshes (Stacked)
                const topChar = suffixStr[0]; // 'A' or 'P'
                const botChar = suffixStr[1]; // 'M'
                const suffixSize = 0.12;
                marginX = 0.05; // Increased margin

                // Top Suffix
                const topGeo = new THREE.TextGeometry(topChar, {
                    font: font,
                    size: suffixSize,
                    height: 0.02,
                    curveSegments: 4,
                    bevelEnabled: false
                });
                const topMesh = new THREE.Mesh(topGeo, textMaterial);
                // Use boundingBox.max.x to position relative to the actual right edge of the number
                topMesh.position.set(numGeo.boundingBox.max.x + marginX, 0.13, 0);
                hourGroup.add(topMesh);

                // Bottom Suffix
                const botGeo = new THREE.TextGeometry(botChar, {
                    font: font,
                    size: suffixSize,
                    height: 0.02,
                    curveSegments: 4,
                    bevelEnabled: false
                });
                const botMesh = new THREE.Mesh(botGeo, textMaterial);
                botMesh.position.set(numGeo.boundingBox.max.x + marginX, 0.0, 0);
                hourGroup.add(botMesh);

                // 3. Center the content
                // Approximate total width
                topGeo.computeBoundingBox();
                botGeo.computeBoundingBox();
                const topWidth = topGeo.boundingBox.max.x - topGeo.boundingBox.min.x;
                const botWidth = botGeo.boundingBox.max.x - botGeo.boundingBox.min.x;
                suffixWidth = Math.max(topWidth, botWidth);
            }


            // Total width is from min.x of number to max.x of suffix
            // We assume number starts around 0, but let's be precise
            const totalWidth = (numGeo.boundingBox.max.x + marginX + suffixWidth) - numGeo.boundingBox.min.x;
            const totalHeight = 0.25;

            // Shift all children to center
            // We want to shift by (min.x + totalWidth/2) ?
            // Or just center the bounding box of the whole group.
            // Let's shift by half the total width relative to the start.
            const shiftX = numGeo.boundingBox.min.x + totalWidth / 2;

            hourGroup.children.forEach(child => {
                child.position.x -= shiftX;
                child.position.y -= totalHeight / 2;
            });

            // FINDME: calculating position of floating hour numbers
            // 4. Position the Group on the Strip
            // Restore original positioning logic:
            // Midnight (24/0) is at index 180. Direction is backwards (minus).
            // Index = 180 - (h * 30). Handle wrapping.
            let idx = ((180 - (h * 30)) % 720 + 720) % 720;

            const p = edgePath[idx]; // FINDME: ISSUE: this is the edge of the strip, not the center

            // Calculate direction for offset (outward)
            const centerIndex = idx % m_NumPoints;
            const centerPt = m_RectCenter3DPtArray[centerIndex];

            // Vector from center to edge point
            const dir = new THREE.Vector3().subVectors(p, centerPt).normalize();

            // Position slightly outside
            const pos = new THREE.Vector3().copy(p).add(dir.multiplyScalar(0.53));
            hourGroup.position.copy(pos);

            // Orient text to face outward from the strip (Initial orientation)
            hourGroup.lookAt(new THREE.Vector3().addVectors(pos, dir));

            hourNumbersGroup.add(hourGroup);
        }
    });
}



function animate() {
    requestAnimationFrame(animate); // this tells the browser to call animate() for the *next* frame
    updateClock();
    if (rotationEnabled) {
        mobiusGroup.rotation.y += 0.005;
    }

    if (topRightLight) {
        const time = Date.now() * 0.001; // seconds
        const radius = 0.5;
        const centerX = 1;
        const centerZ = 2;
        const period = 15.0; // seconds
        const angle = (time / period) * Math.PI * 2;
        topRightLight.position.x = centerX + Math.cos(angle) * radius;
        topRightLight.position.z = centerZ + Math.sin(angle) * radius;
    }
    renderer.render(scene, camera);
}
function setupUIEventListeners() {
    // --- DESKTOP BUTTONS ---
    const rotationButton = document.getElementById('rotation-button');
    const fastModeButton = document.getElementById('fast-mode-button');
    const hoursButton = document.getElementById('hours-button');

    // Rotation
    const toggleRotation = () => {
        rotationEnabled = !rotationEnabled;
        mobiusGroup.rotation.y = 0;
        const text = rotationEnabled ? 'Stop Rotation' : 'Rotate';
        if (rotationButton) rotationButton.textContent = text;
        const mobileBtn = document.getElementById('mobile-rotate');
        if (mobileBtn) mobileBtn.textContent = rotationEnabled ? 'Stop' : 'Rotate';

        // Visual feedback
        if (rotationButton) rotationButton.classList.toggle('active', rotationEnabled);
        if (mobileBtn) mobileBtn.classList.toggle('active', rotationEnabled);
    };
    if (rotationButton) rotationButton.addEventListener('click', toggleRotation);

    // Fast Mode
    const toggleFastMode = () => {
        fastMode = !fastMode;
        const text = fastMode ? 'Stop Fast' : 'Fast Mode';
        if (fastModeButton) fastModeButton.textContent = text;
        const mobileBtn = document.getElementById('mobile-fast');
        if (mobileBtn) mobileBtn.textContent = fastMode ? 'Stop' : 'Fast';

        if (fastModeButton) fastModeButton.classList.toggle('active', fastMode);
        if (mobileBtn) mobileBtn.classList.toggle('active', fastMode);
    };
    if (fastModeButton) fastModeButton.addEventListener('click', toggleFastMode);

    // Hours
    const toggleHours = () => {
        if (hourNumbersGroup) {
            hourNumbersGroup.visible = !hourNumbersGroup.visible;
            const isActive = hourNumbersGroup.visible;
            const text = isActive ? 'Hide Hours' : 'Show Hours';
            if (hoursButton) {
                hoursButton.textContent = text;
                hoursButton.classList.toggle('active', isActive);
            }
            const mobileBtn = document.getElementById('mobile-hours');
            if (mobileBtn) {
                mobileBtn.classList.toggle('active', isActive);
            }
        }
    };
    if (hoursButton) hoursButton.addEventListener('click', toggleHours);


    // --- MOBILE TOOLBAR BUTTONS ---
    const mobileRotate = document.getElementById('mobile-rotate');
    if (mobileRotate) mobileRotate.addEventListener('click', toggleRotation);

    const mobileFast = document.getElementById('mobile-fast');
    if (mobileFast) mobileFast.addEventListener('click', toggleFastMode);

    const mobileHours = document.getElementById('mobile-hours');
    if (mobileHours) mobileHours.addEventListener('click', toggleHours);

    const zenButton = document.getElementById('zen-button');
    if (zenButton) zenButton.addEventListener('click', toggleZenMode);

    const mobileZen = document.getElementById('mobile-zen');
    if (mobileZen) mobileZen.addEventListener('click', toggleZenMode);

    const mobileExplainer = document.getElementById('mobile-explainer');
    if (mobileExplainer) mobileExplainer.addEventListener('click', () => {
        document.getElementById('modal-explainer').style.display = 'block';
    });


    // --- SETTINGS PANEL ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettings = document.getElementById('close-settings');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('open');
        });
    }

    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
        });
    }

    // Close settings if clicking outside (optional, but nice)


    // Settings Inputs
    const shapeHours = document.getElementById('shape-hours');
    const shapeMinutes = document.getElementById('shape-minutes');
    const shapeSeconds = document.getElementById('shape-seconds');

    if (shapeHours) {
        shapeHours.addEventListener('change', (e) => {
            setIndicatorShape('hours', e.target.value);
        });
    }
    if (shapeMinutes) {
        shapeMinutes.addEventListener('change', (e) => {
            setIndicatorShape('minutes', e.target.value);
        });
    }
    if (shapeSeconds) {
        shapeSeconds.addEventListener('change', (e) => {
            setIndicatorShape('seconds', e.target.value);
        });
    }

    const tickSchemeSelect = document.getElementById('tick-scheme-select');
    if (tickSchemeSelect) {
        tickSchemeSelect.addEventListener('change', (e) => {
            setTickScheme(e.target.value);
        });
    }

    const timeStyleSelect = document.getElementById('time-style-select');
    if (timeStyleSelect) {
        // Set initial value based on current timeStyle
        timeStyleSelect.value = timeStyle;

        timeStyleSelect.addEventListener('change', (e) => {
            timeStyle = e.target.value;
            createHourNumbers();
        });
    }


    // --- MODAL LOGIC FOR EXPLAINER ---
    const explainerButton = document.getElementById('explainer-button');
    const modalExplainer = document.getElementById('modal-explainer');
    const modalCloseButton = document.getElementById('modal-close-button');

    // Open the modal (Desktop)
    if (explainerButton) {
        explainerButton.addEventListener('click', () => {
            modalExplainer.style.display = 'block';
        });
    }

    // Close the modal
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', () => {
            modalExplainer.style.display = 'none';
        });
    }

    // Also close the modal if the user clicks anywhere outside the content
    modalExplainer.addEventListener('click', (event) => {
        if (event.target === modalExplainer) {
            modalExplainer.style.display = 'none';
        }
    });
    // --- END MODAL LOGIC ---
}

function toggleZenMode() {
    zenMode = !zenMode;
    const body = document.body;
    const zenBtn = document.getElementById('zen-button');
    const mobileZenBtn = document.getElementById('mobile-zen');

    if (zenMode) {
        // Enter Zen Mode
        body.classList.add('zen-active');
        if (zenBtn) zenBtn.textContent = 'Exit Zen';
        if (mobileZenBtn) mobileZenBtn.textContent = 'Exit';

        // Save state
        preZenState = {
            hoursVisible: hourNumbersGroup ? hourNumbersGroup.visible : false,
            tickScheme: currentTickScheme,
            sceneBackground: scene.background.getHex(),
            fastMode: fastMode,
            backgroundImage: body.style.backgroundImage || '',  // Save original background
            backgroundColor: body.style.backgroundColor || ''
        };

        // Apply Zen settings
        if (hourNumbersGroup) hourNumbersGroup.visible = false;
        setTickScheme('minimal'); // Minimal ticks (hour only)
        if (fastMode) {
            fastMode = false;
        }
        scene.background.setHex(0x2a2a2a);  // Darken background
        // Apply radial gradient vignette
        //console.log('Setting Zen background gradient...');
        //body.style.backgroundImage = 'radial-gradient(circle at center, #666 0%, #1a1a1a 100%)';
        //body.style.backgroundColor = '';  // Clear the solid color
        //console.log('Background applied:', body.style.backgroundImage);
        //console.log('Computed background:', window.getComputedStyle(body).backgroundImage);

    } else {
        // Exit Zen Mode
        body.classList.remove('zen-active');
        if (zenBtn) zenBtn.textContent = 'Zen Mode';
        if (mobileZenBtn) mobileZenBtn.textContent = 'Zen';

        // Restore state
        if (hourNumbersGroup) hourNumbersGroup.visible = preZenState.hoursVisible;
        setTickScheme(preZenState.tickScheme);
        fastMode = preZenState.fastMode;
        scene.background.setHex(preZenState.sceneBackground);
        body.style.backgroundColor = preZenState.backgroundColor;
        console.log('Restored background');
    }
    updateUIButtons();
}

function updateUIButtons() {
    // Helper to sync buttons with current state
    const rotationButton = document.getElementById('rotation-button');
    const fastModeButton = document.getElementById('fast-mode-button');
    const hoursButton = document.getElementById('hours-button');
    const mobileRotate = document.getElementById('mobile-rotate');
    const mobileFast = document.getElementById('mobile-fast');
    const mobileHours = document.getElementById('mobile-hours');

    // Rotation (not affected by Zen, but good to sync)
    if (rotationButton) {
        rotationButton.textContent = rotationEnabled ? 'Stop Rotation' : 'Rotate';
        rotationButton.classList.toggle('active', rotationEnabled);
    }
    if (mobileRotate) {
        mobileRotate.textContent = rotationEnabled ? 'Stop' : 'Rotate';
        mobileRotate.classList.toggle('active', rotationEnabled);
    }

    // Fast Mode
    if (fastModeButton) {
        fastModeButton.textContent = fastMode ? 'Stop Fast' : 'Fast Mode';
        fastModeButton.classList.toggle('active', fastMode);
    }
    if (mobileFast) {
        mobileFast.textContent = fastMode ? 'Stop' : 'Fast';
        mobileFast.classList.toggle('active', fastMode);
    }

    // Hours
    if (hoursButton) {
        const isActive = hourNumbersGroup ? hourNumbersGroup.visible : false;
        hoursButton.textContent = isActive ? 'Hide Hours' : 'Show Hours';
        hoursButton.classList.toggle('active', isActive);
    }
    if (mobileHours) {
        const isActive = hourNumbersGroup ? hourNumbersGroup.visible : false;
        mobileHours.classList.toggle('active', isActive);
    }

    // Tick scheme select
    const tickSchemeSelect = document.getElementById('tick-scheme-select');
    if (tickSchemeSelect) {
        tickSchemeSelect.value = currentTickScheme;
    }
}

function syncUIWithState() {
    updateUIButtons();

    // Sync Shape Selects
    const shapeHours = document.getElementById('shape-hours');
    if (shapeHours) shapeHours.value = indicatorShapes.hours;

    const shapeMinutes = document.getElementById('shape-minutes');
    if (shapeMinutes) shapeMinutes.value = indicatorShapes.minutes;

    const shapeSeconds = document.getElementById('shape-seconds');
    if (shapeSeconds) shapeSeconds.value = indicatorShapes.seconds;

    // Sync Time Style
    const timeStyleSelect = document.getElementById('time-style-select');
    if (timeStyleSelect) timeStyleSelect.value = timeStyle;

    // Sync Zen Buttons (since updateUIButtons doesn't handle them fully)
    const zenBtn = document.getElementById('zen-button');
    const mobileZenBtn = document.getElementById('mobile-zen');
    if (zenBtn) {
        zenBtn.textContent = zenMode ? 'Exit Zen' : 'Zen Mode';
        zenBtn.classList.toggle('active', zenMode);
    }
    if (mobileZenBtn) {
        mobileZenBtn.textContent = zenMode ? 'Exit' : 'Zen';
        mobileZenBtn.classList.toggle('active', zenMode);
    }
}

function updateClock() {
    const now = new Date();
    let iHour24 = now.getHours();
    let iMin60 = now.getMinutes();
    let iSec60 = now.getSeconds();
    let millisec = now.getMilliseconds();

    const ampm = iHour24 >= 12 ? 'PM' : 'AM';
    let iHour12 = iHour24 % 12;
    iHour12 = iHour12 ? iHour12 : 12;
    const digitalTime = `${iHour12}:${iMin60.toString().padStart(2, '0')}:${iSec60.toString().padStart(2, '0')} ${ampm}`;
    document.getElementById('digital-time').textContent = digitalTime;

    let sec60 = iSec60 + millisec / 1000;
    let min60 = iMin60 + sec60 / 60;
    let hour24 = iHour24 + min60 / 60;

    if (fastMode && indicatorShapes.hours === 'outer-ring') {
        // Calculate raw fast time (24 hours in 60 seconds)
        let rawFastHour24 = (24.0 / 60.0) * sec60;

        // Calculate position within current hour to determine pause window
        let fractionalHour = rawFastHour24 % 1; // 0 to 1 within each hour
        let minutesWithinHour = fractionalHour < 0.5 ? fractionalHour * 60 : (1 - fractionalHour) * 60;

        // In fast mode with outer-ring, pause briefly at each hour
        // Use smaller window (6 minutes = 0.25 seconds real time) to minimize position jump
        if (minutesWithinHour <= 6) {
            hour24 = Math.round(rawFastHour24);
        } else {
            hour24 = rawFastHour24;
        }

        // Calculate min60 from raw fast time so minute indicator moves smoothly
        // Don't use hour24 since it's paused at hours
        let rawHourFrac = rawFastHour24 - Math.floor(rawFastHour24);
        min60 = rawHourFrac * 60;
    } else if (fastMode) {
        // Normal fast mode without pauses (for other indicator shapes)
        hour24 = (24.0 / 60.0) * sec60;
        let hourFrac = hour24 - Math.floor(hour24);
        min60 = hourFrac * 60;
    }

    if (secondSphere) {
        const secAngle = Math.PI / 2 - (sec60 / 60) * 2 * Math.PI;
        secondSphere.position.x = m_Radius * Math.cos(secAngle);
        secondSphere.position.y = m_Radius * Math.sin(secAngle);
        secondSphere.position.z = 0;

        if (indicatorShapes.seconds === 'disc') {
            // Tangent for circle is (-sin, cos, 0)
            const tangent = new THREE.Vector3(-Math.sin(secAngle), Math.cos(secAngle), 0).normalize();
            secondSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        } else {
            secondSphere.rotation.set(0, 0, 0);
        }
    }

    if (minuteSphere) {
        const minAngle = Math.PI / 2 - (min60 / 60) * 2 * Math.PI;
        minuteSphere.position.x = m_Radius * Math.cos(minAngle);
        minuteSphere.position.y = m_Radius * Math.sin(minAngle);
        minuteSphere.position.z = 0;

        if (indicatorShapes.minutes === 'disc') {
            const tangent = new THREE.Vector3(-Math.sin(minAngle), Math.cos(minAngle), 0).normalize();
            minuteSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        } else if (indicatorShapes.minutes === 'ring') {
            const tangent = new THREE.Vector3(-Math.sin(minAngle), Math.cos(minAngle), 0).normalize();
            minuteSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        } else {
            minuteSphere.rotation.set(0, 0, 0);
        }
    }

    const hourProgress = hour24 / 24;
    const pathIndexFloat = ((NRECT / 2 - (hourProgress * (2 * NRECT))) % (2 * NRECT) + (2 * NRECT)) % (2 * NRECT);

    const index1 = Math.floor(pathIndexFloat);
    const index2 = (index1 + 1) % (2 * NRECT);
    const fraction = pathIndexFloat - index1;

    const p1 = edgePath[index1]; // findme 
    const p2 = edgePath[index2];

    if (hourSphere && p1 && p2) {
        hourSphere.position.lerpVectors(p1, p2, fraction);

        if (indicatorShapes.hours === 'outer-ring') {
            const centerIndex1 = index1 % m_NumPoints;
            const centerIndex2 = index2 % m_NumPoints;
            const centerPt1 = m_RectCenter3DPtArray[centerIndex1];
            const centerPt2 = m_RectCenter3DPtArray[centerIndex2];
            const centerPt = new THREE.Vector3().lerpVectors(centerPt1, centerPt2, fraction);

            // Calculate the midpoint of the edge (center of thickness)
            let edgeMidpoint1, edgeMidpoint2;
            if (index1 < m_NumPoints) {
                // First half: inner edge - midpoint between FrontInner and FrontOuter
                edgeMidpoint1 = new THREE.Vector3().addVectors(
                    m_FrontInnerCorner3DPtArray[centerIndex1],
                    m_FrontOuterCorner3DPtArray[centerIndex1]
                ).multiplyScalar(0.5);
                edgeMidpoint2 = new THREE.Vector3().addVectors(
                    m_FrontInnerCorner3DPtArray[centerIndex2],
                    m_FrontOuterCorner3DPtArray[centerIndex2]
                ).multiplyScalar(0.5);
            } else {
                // Second half: outer edge - midpoint between BackOuter and BackInner
                edgeMidpoint1 = new THREE.Vector3().addVectors(
                    m_BackOuterCorner3DPtArray[centerIndex1],
                    m_BackInnerCorner3DPtArray[centerIndex1]
                ).multiplyScalar(0.5);
                edgeMidpoint2 = new THREE.Vector3().addVectors(
                    m_BackOuterCorner3DPtArray[centerIndex2],
                    m_BackInnerCorner3DPtArray[centerIndex2]
                ).multiplyScalar(0.5);
            }

            // Interpolate the edge midpoint
            const edgeMidpoint = new THREE.Vector3().lerpVectors(edgeMidpoint1, edgeMidpoint2, fraction);

            // Calculate dirOutward from center to edge midpoint
            const dirOutward = new THREE.Vector3().subVectors(edgeMidpoint, centerPt).normalize();

            // Position the outer ring
            hourSphere.position.copy(edgeMidpoint);
            const outerRadius = 0.4 + 0.13; // torus radius (0.4) + tube radius (0.13)
            hourSphere.position.addScaledVector(dirOutward, outerRadius);

            // Calculate vectors for torus orientation
            const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, dirOutward).normalize();

            // Orient torus axis perpendicular to both dirOutward and strip plane
            // This aligns torus axis with the normal (perpendicular to strip surface)
            hourSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

            // Add rotation animation during ±1 minute from each hour
            // Calculate fractional hour (0-24) and find position within current hour
            const fractionalHour = hour24 % 1; // 0 to 1 within each hour
            const minutesFromHour = Math.abs(fractionalHour - 0.5) * 60; // Minutes from nearest hour (0=on hour, 30=halfway)
            const minutesWithinHour = fractionalHour < 0.5 ? fractionalHour * 60 : (1 - fractionalHour) * 60; // 0-30 within hour

            // Check if within rotation window
            const rotationWindow = fastMode ? 6 : 1; // ±6 minutes in fast mode, ±1 in normal
            if (minutesWithinHour <= rotationWindow) {
                let rotationAngle = 0;

                if (fastMode) {
                    // In fast mode: continuous rotation at 2x speed (one rotation per second)
                    // Use real seconds to create smooth continuous rotation
                    const currentSeconds = iSec60 + millisec / 1000;
                    rotationAngle = currentSeconds * Math.PI * 2; // Complete rotation every 1 second (2x speed)
                } else {
                    // Normal mode: one rotation every 2 seconds
                    // Use real seconds to create smooth continuous rotation
                    const currentSeconds = iSec60 + millisec / 1000;
                    rotationAngle = (currentSeconds / 2) * Math.PI * 2; // Complete rotation every 2 seconds
                }

                // Apply rotation around dirOutward in world space
                // Use premultiply to apply rotation BEFORE torus orientation
                // This ensures dirOutward is interpreted in world coordinates, not local torus space
                const rotationQuat = new THREE.Quaternion().setFromAxisAngle(dirOutward, rotationAngle);
                hourSphere.quaternion.premultiply(rotationQuat);
            }
        } else if (indicatorShapes.hours === 'disc') {
            const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
            hourSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        } else if (indicatorShapes.hours === 'ring') {
            // Fix for ring positioning: Calculate dirOutward to point to center of edge
            const centerIndex1 = index1 % m_NumPoints;
            const centerIndex2 = index2 % m_NumPoints;
            const centerPt1 = m_RectCenter3DPtArray[centerIndex1];
            const centerPt2 = m_RectCenter3DPtArray[centerIndex2];
            const centerPt = new THREE.Vector3().lerpVectors(centerPt1, centerPt2, fraction);

            // Calculate the midpoint of the edge (center of thickness)
            let edgeMidpoint1, edgeMidpoint2;
            if (index1 < m_NumPoints) {
                // First half: inner edge - midpoint between FrontInner and FrontOuter
                edgeMidpoint1 = new THREE.Vector3().addVectors(
                    m_FrontInnerCorner3DPtArray[centerIndex1],
                    m_FrontOuterCorner3DPtArray[centerIndex1]
                ).multiplyScalar(0.5);
                edgeMidpoint2 = new THREE.Vector3().addVectors(
                    m_FrontInnerCorner3DPtArray[centerIndex2],
                    m_FrontOuterCorner3DPtArray[centerIndex2]
                ).multiplyScalar(0.5);
            } else {
                // Second half: outer edge - midpoint between BackOuter and BackInner
                edgeMidpoint1 = new THREE.Vector3().addVectors(
                    m_BackOuterCorner3DPtArray[centerIndex1],
                    m_BackInnerCorner3DPtArray[centerIndex1]
                ).multiplyScalar(0.5);
                edgeMidpoint2 = new THREE.Vector3().addVectors(
                    m_BackOuterCorner3DPtArray[centerIndex2],
                    m_BackInnerCorner3DPtArray[centerIndex2]
                ).multiplyScalar(0.5);
            }

            // Interpolate the edge midpoint
            const edgeMidpoint = new THREE.Vector3().lerpVectors(edgeMidpoint1, edgeMidpoint2, fraction);

            // Set position to the edge midpoint
            hourSphere.position.copy(edgeMidpoint);

            // Calculate dirOutward from center to edge midpoint
            const dirOutward = new THREE.Vector3().subVectors(edgeMidpoint, centerPt).normalize();

            // Move outward from edge so inner edge of torus touches strip edge
            const tubeRadius = 0.15;
            hourSphere.position.addScaledVector(dirOutward, m_HourSphereRadius - tubeRadius);

            const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
            hourSphere.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        }
    }

    // Billboard Hour Numbers
    if (hourNumbersGroup && hourNumbersGroup.visible) {
        hourNumbersGroup.children.forEach(child => {
            child.lookAt(camera.position);
        });
    }
}



function setIndicatorShape(type, shape) {
    indicatorShapes[type] = shape;

    // Define geometries based on shape
    let geometry;
    if (shape === 'disc') {
        const h = 0.1; // Thickness of the disc
        if (type === 'hours') geometry = new THREE.CylinderGeometry(m_HourSphereRadius, m_HourSphereRadius, h, 32);
        else if (type === 'minutes') geometry = new THREE.CylinderGeometry(m_MinutesRadius, m_MinutesRadius, h, 32);
        else if (type === 'seconds') geometry = new THREE.CylinderGeometry(m_SecondsRadius, m_SecondsRadius, h, 32);
    } else if (shape === 'ring' || shape === 'outer-ring') {
        // Ring (torus) - for minutes and hours
        if (type === 'hours') {
            if (shape === 'outer-ring') {
                // Outer ring: torus radius matches hour number offset (0.4), smaller tube
                geometry = new THREE.TorusGeometry(0.4, 0.13, 16, 32);
            } else {
                // Regular ring
                geometry = new THREE.TorusGeometry(m_HourSphereRadius, 0.15, 16, 32);
            }
        } else if (type === 'minutes') {
            geometry = new THREE.TorusGeometry(m_MinutesRadius, 0.12, 16, 32);
        }
    } else {
        if (type === 'hours') geometry = new THREE.SphereGeometry(m_HourSphereRadius, 32, 32);
        else if (type === 'minutes') geometry = new THREE.SphereGeometry(m_MinutesRadius, 32, 32);
        else if (type === 'seconds') geometry = new THREE.SphereGeometry(m_SecondsRadius, 32, 32);
    }

    // Update the specific mesh
    if (type === 'hours') {
        if (hourSphere) {
            mobiusGroup.remove(hourSphere);
            hourSphere.geometry.dispose(); // Clean up old geometry
        }
        const hourMat = new THREE.MeshStandardMaterial({ color: 0xADFF2F });
        hourSphere = new THREE.Mesh(geometry, hourMat);
        mobiusGroup.add(hourSphere);
    } else if (type === 'minutes') {
        if (minuteSphere) {
            mobiusGroup.remove(minuteSphere);
            minuteSphere.geometry.dispose();
        }
        const minuteMat = new THREE.MeshStandardMaterial({ color: 0x00FFFF });
        minuteSphere = new THREE.Mesh(geometry, minuteMat);
        mobiusGroup.add(minuteSphere);
    } else if (type === 'seconds') {
        if (secondSphere) {
            mobiusGroup.remove(secondSphere);
            secondSphere.geometry.dispose();
        }
        const secondMat = new THREE.MeshStandardMaterial({ color: 0xFF7F50 });
        secondSphere = new THREE.Mesh(geometry, secondMat);
        mobiusGroup.add(secondSphere);
    }

    // Trigger update to set positions immediately
    updateClock();
}

function createClockHands() {
    // Initialize with current indicatorShapes (defaults or from URL)
    setIndicatorShape('hours', indicatorShapes.hours);
    setIndicatorShape('minutes', indicatorShapes.minutes);
    setIndicatorShape('seconds', indicatorShapes.seconds);
}
function handleWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

    // Adjust camera distance for mobile to fit the model
    if (width < 600) {
        camera.position.z = 13.0; // Zoom out for mobile to fit width
    } else {
        camera.position.z = 7.2; // Default for desktop (adjusted larger)
    }
}

init();
handleWindowResize();
setupUIEventListeners();
syncUIWithState();

if (startInZen) {
    toggleZenMode();
}

// Fullscreen Logic
// Fullscreen Logic
const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.textContent = 'Exit';
        } else {
            fullscreenBtn.textContent = 'Fullscreen';
        }
    });
}

window.addEventListener('resize', handleWindowResize);
