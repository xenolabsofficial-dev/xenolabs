// Import Three.js Library
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// Keys
const keys = {};
window.addEventListener("keydown", (event) => {
	keys[event.key] = true;
});
window.addEventListener("keyup", (event) => {
	keys[event.key] = false;
});

// Constants
const moveSpeed = 0.05;
const turnSpeed = 0.03;
const gravity = 0.01;
const jumpForce = 0.2;
const sprintMultiplier = 3;

// Raycaster
const groundRaycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

// Variables
let yaw = 0;
let pitch = 0;

// Mouse Movement
document.addEventListener("mousemove", (event) => {
	if (document.pointerLockElement === document.body) {
		const mouseSensitivity = 0.002;
		yaw -= event.movementX * mouseSensitivity
		pitch -= event.movementY * mouseSensitivity
		const maxPitch = Math.PI / 2 - 0.01
		if (pitch > maxPitch) pitch = maxPitch;
		if (pitch < -maxPitch) pitch = -maxPitch;
		cameraYaw.rotation.y = yaw;
		cameraPitch.rotation.x = pitch;
	}
});

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// Camera
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
const cameraYaw = new THREE.Object3D();
cameraYaw.position.set(0, 100, 0);
scene.add(cameraYaw);
const cameraPitch = new THREE.Object3D();
cameraYaw.add(cameraPitch);
cameraPitch.add(camera);
camera.position.set(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0x000000);

// Aspect Ratio
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
})

const loader = new THREE.TextureLoader();

// Albedo / Color Texture
const colorTexture = loader.load('textures/ground/color.png');
colorTexture.wrapS = THREE.RepeatWrapping;
colorTexture.wrapT = THREE.RepeatWrapping;
colorTexture.repeat.set(10, 10);

// Normal Map
const normalTexture = loader.load('textures/ground/normal.png');
normalTexture.wrapS = THREE.RepeatWrapping;
normalTexture.wrapT = THREE.RepeatWrapping;
normalTexture.repeat.set(10, 10);

// Roughness Map
const roughnessTexture = loader.load('textures/ground/roughness.png');
roughnessTexture.wrapS = THREE.RepeatWrapping;
roughnessTexture.wrapT = THREE.RepeatWrapping;
roughnessTexture.repeat.set(10, 10);

// Anisotropy
colorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
normalTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
roughnessTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Terrain
const terrainSize = 200;
const terrainSegments = 200;

const terrainGeometry = new THREE.PlaneGeometry(
	terrainSize,
	terrainSize,
	terrainSegments,
	terrainSegments
);
terrainGeometry.rotateX(-Math.PI / 2);

const position = terrainGeometry.attributes.position;
for (let i = 0; i < position.count; i++) {
	const x = position.getX(i);
	const z = position.getZ(i);

	// Height formula (waves + hills)
	const height =
		Math.sin(x * 0.05) * 2 +
		Math.cos(z * 0.05) * 2 +
		Math.sin((x + z) * 0.02) * 4;

	position.setY(i, height);
}

terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
	map: colorTexture,
	normalMap: normalTexture,
	roughnessMap: roughnessTexture,
	roughness: 1,
	metalness: 0.1
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true;
scene.add(terrain);

// Player
const player = {
	height: 2,
	radius: 0.4,
	velocity: new THREE.Vector3(0, 0, 0),
	speed: 4,
	jumpForce: 0.2,
	gravity: 0.01,
	onGround: false
};

// Animation
function animate() {
	requestAnimationFrame(animate);

	player.velocity.y -= player.gravity;
	cameraYaw.position.y += player.velocity.y;

	// Reset grounded state
	player.onGround = false;

	// Raycast down
	groundRaycaster.set(cameraYaw.position, down);
	const intersects = groundRaycaster.intersectObject(terrain);

	if (intersects.length > 0) {
		const hit = intersects[0];
		if (hit.distance <= player.height + 0.05) {
			cameraYaw.position.y = hit.point.y + player.height;
			player.velocity.y = 0;
			player.onGround = true;
		}
	}

	// Jump
	if (keys[" "] && player.onGround) {
		player.velocity.y = player.jumpForce;
	}

	if (keys["ArrowLeft"]) yaw += turnSpeed;
	if (keys["ArrowRight"]) yaw -= turnSpeed;

	cameraYaw.rotation.y = yaw;
	const direction = yaw;
	
	let currentSpeed = moveSpeed;
	if (keys["Shift"]) {
		currentSpeed *= sprintMultiplier
	}

	if (keys["w"] || keys["ArrowUp"]) {
		cameraYaw.position.x -= Math.sin(direction) * currentSpeed;
		cameraYaw.position.z -= Math.cos(direction) * currentSpeed;
	}

	if (keys["s"] || keys["ArrowDown"]) {
		cameraYaw.position.x += Math.sin(direction) * currentSpeed;
		cameraYaw.position.z += Math.cos(direction) * currentSpeed;
	}

	if (keys["a"]) {
		cameraYaw.position.x -= Math.cos(direction) * currentSpeed;
		cameraYaw.position.z += Math.sin(direction) * currentSpeed;
	}

	if (keys["d"]) {
		cameraYaw.position.x += Math.cos(direction) * currentSpeed;
		cameraYaw.position.z -= Math.sin(direction) * currentSpeed;
	}

	renderer.render(scene, camera);
}
animate();

// Shiftlock
document.body.addEventListener("click", () => {
	document.body.requestPointerLock();
})