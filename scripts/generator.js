var dim = 90; // Make divisible by three?
var matrixX = dim,
    matrixY = dim;

var noiseDensity = 0.013;

var t = 0;
var tx = 0,
    ty = 0,
    tz = 0;

var simplexX, simplexY, simplexZ;
var scene, camera, renderer;

var params = {
    exposure: 1.5,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0.5
};

var afterImageDamping = 0.9;

var canvasSizeX = window.innerHeight * 2;
var canvasSizeY = window.innerHeight * 2;

var geometry, material, mesh;

function initNoise() {
    // Seed the simplex noise generators
    simplexX = new SimplexNoise();
    simplexY = new SimplexNoise();
    simplexZ = new SimplexNoise();
}

function initialize() {
    initNoise();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvasSizeX / canvasSizeY, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        autoClear: false,
    });

    renderer.setSize(canvasSizeX, canvasSizeY);
    document.getElementById('circle-mask').appendChild(renderer.domElement);
}

function initVertices() {
    for (var x = 0; x < matrixX; x++) {
        for (var y = 0; y < matrixY; y++) {
            for (var z = 0; z < 3; z++) {
                vertArray.push(0);
                colors.push(1, 1, 1);
            }
        }
    }
}

function updateVerts() {
    var positions = mesh.geometry.attributes.position.array;
    var colors = mesh.geometry.attributes.color;

    for (var x = 0; x < matrixX; x++) {
        for (var y = 0; y < matrixY; y++) {
            var posX = simplexX.noise2D(x * noiseDensity + tx, y * noiseDensity + tx);
            var posY = simplexY.noise2D(x * noiseDensity + ty, y * noiseDensity + ty);
            var posZ = simplexZ.noise2D(x * noiseDensity + tz, y * noiseDensity + tz);

            positions[(x + y * matrixX) * 3 + 0] = posX;
            positions[(x + y * matrixX) * 3 + 1] = posY;
            positions[(x + y * matrixX) * 3 + 2] = posZ;

            colors.setXYZ(
                x + y * matrixX,
                simplexX.noise3D(x * noiseDensity, y * noiseDensity, t) * 1,
                simplexY.noise3D(x * noiseDensity, y * noiseDensity, t) * 0.3,
                simplexZ.noise3D(x * noiseDensity, y * noiseDensity, t) * 1
            );
        }
    }
    t += 0.002;
    tx += 0.0004;
    ty -= 0.0005;
    tz += 0.0006;

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
}

var vertArray = [];
var colors = [];

initialize();

initVertices();

var vertices = new Float32Array(vertArray);

function initMesh(){
    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.dynamic = true;

    material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
    });
    
    mesh = new THREE.Line(geometry, material);
    scene.add(mesh);
}

initMesh();

camera.position.z = 2;
camera.position.x = 0.6;

var renderScene = new THREE.RenderPass(scene, camera);

var bloomPass;

function postProcess(){
    composer = new THREE.EffectComposer(renderer);
    composer.setSize(canvasSizeX, canvasSizeY);
    
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(canvasSizeX, canvasSizeY), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;
    
    fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);

    var pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (canvasSizeX * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (canvasSizeY * pixelRatio);

    composer.addPass(renderScene);
    afterimagePass = new THREE.AfterimagePass();
    afterimagePass.uniforms["damp"].value = afterImageDamping;
    composer.addPass(afterimagePass);
    composer.addPass(fxaaPass); // Not much of a difference?
    composer.addPass(bloomPass);    
}

postProcess();

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    canvasSizeX = window.innerHeight * 2;
    canvasSizeY = window.innerHeight * 2;
    
    camera.aspect = canvasSizeX / canvasSizeY;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasSizeX, canvasSizeX);
    composer.setSize(canvasSizeX, canvasSizeY);
}

function animate() {
    requestAnimationFrame(animate);

    updateVerts();

    composer.render(scene, camera);
}

animate();