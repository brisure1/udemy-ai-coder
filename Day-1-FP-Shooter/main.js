import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls;
let move = { forward: false, backward: false, left: false, right: false };
let velocity = new THREE.Vector3();
let bullets = [];
let enemyBullets = [];
let clock = new THREE.Clock();
let playerHealth = 100;
let enemyHealth = 100;
const arenaSize = 60;
// whether gameplay updates (movement, AI, bullets) should run
let gameStarted = false;

function init() {
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20232a);

  // camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 0);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(-10, 20, 10);
  scene.add(dir);

  // arena floor
  const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
  const floorMat = new THREE.MeshPhongMaterial({ color: 0x6b6b6b });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // arena walls (simple boxes)
  const wallMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const wallThickness = 1;
  const wallHeight = 6;
  const walls = new THREE.Group();
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness), wallMat);
  w1.position.set(0, wallHeight / 2, -arenaSize / 2);
  walls.add(w1);
  const w2 = w1.clone();
  w2.position.set(0, wallHeight / 2, arenaSize / 2);
  walls.add(w2);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
  w3.position.set(-arenaSize / 2, wallHeight / 2, 0);
  walls.add(w3);
  const w4 = w3.clone();
  w4.position.set(arenaSize / 2, wallHeight / 2, 0);
  walls.add(w4);
  scene.add(walls);

  // simple player collider (invisible)
  const playerCollider = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  playerCollider.position.copy(camera.position);
  playerCollider.name = 'player';
  scene.add(playerCollider);

  // enemy (a simple box)
  const enemyGeo = new THREE.BoxGeometry(1.2, 1.8, 1.2);
  const enemyMat = new THREE.MeshPhongMaterial({ color: 0xff5555 });
  const enemy = new THREE.Mesh(enemyGeo, enemyMat);
  enemy.position.set(8, 0.9, -8);
  enemy.name = 'enemy';
  scene.add(enemy);

  // controls (pointer lock) - use the renderer canvas as the lock target
  controls = new PointerLockControls(camera, renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  // unified pointer lock handler
  function requestLock() {
    try {
      controls.lock();
      const msg = document.getElementById('message');
      if (msg) msg.style.display = 'none';
    } catch (e) {
      console.warn('Pointer lock request failed:', e);
    }
  }

  renderer.domElement.addEventListener('click', requestLock);
  const msgEl = document.getElementById('message');
  if (msgEl) {
    msgEl.style.cursor = 'pointer';
    msgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      requestLock();
    });
  }

  controls.addEventListener('lock', () => {
    // start the game when the pointer is locked (first click)
    gameStarted = true;
  });
  controls.addEventListener('unlock', () => {
    document.getElementById('message').style.display = 'block';
  });

  // movement keys
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // shoot on space
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      shoot();
    }
  });

  // resize
  window.addEventListener('resize', onWindowResize);

  // store objects on scene userData for quick access
  scene.userData = { playerCollider, enemy };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
      move.forward = true;
      break;
    case 'ArrowDown':
      move.backward = true;
      break;
    case 'ArrowLeft':
      move.left = true;
      break;
    case 'ArrowRight':
      move.right = true;
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
      move.forward = false;
      break;
    case 'ArrowDown':
      move.backward = false;
      break;
    case 'ArrowLeft':
      move.left = false;
      break;
    case 'ArrowRight':
      move.right = false;
      break;
  }
}

function shoot() {
  if (!controls.isLocked) return;
  const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffaa }));
  const origin = new THREE.Vector3();
  origin.copy(camera.position);
  bullet.position.copy(origin);
  // direction
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  bullet.userData = { velocity: dir.clone().multiplyScalar(60), owner: 'player' };
  bullets.push(bullet);
  scene.add(bullet);
}

function enemyShoot() {
  const enemy = scene.userData.enemy;
  if (!enemy) return;
  const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaaaa }));
  bullet.position.copy(enemy.position).add(new THREE.Vector3(0, 0.6, 0));
  const dir = new THREE.Vector3();
  const playerPos = scene.userData.playerCollider.position;
  dir.copy(playerPos).sub(enemy.position).normalize();
  bullet.userData = { velocity: dir.multiplyScalar(40), owner: 'enemy' };
  enemyBullets.push(bullet);
  scene.add(bullet);
}

let enemyFireTimer = 0;

function updateBullets(dt) {
  // player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.addScaledVector(b.userData.velocity, dt);
    // check bounds
    if (Math.abs(b.position.x) > arenaSize / 2 || Math.abs(b.position.z) > arenaSize / 2) {
      scene.remove(b);
      bullets.splice(i, 1);
      continue;
    }
    // check collision with enemy
    const enemy = scene.userData.enemy;
    if (enemy && b.position.distanceTo(enemy.position) < 1.0) {
      enemyHealth -= 20;
      document.getElementById('enemyHealth').textContent = 'Enemy: ' + Math.max(0, enemyHealth);
      scene.remove(b);
      bullets.splice(i, 1);
      if (enemyHealth <= 0) {
        endGame(true);
      }
    }
  }
  // enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.position.addScaledVector(b.userData.velocity, dt);
    if (Math.abs(b.position.x) > arenaSize / 2 || Math.abs(b.position.z) > arenaSize / 2) {
      scene.remove(b);
      enemyBullets.splice(i, 1);
      continue;
    }
    const player = scene.userData.playerCollider;
    if (player && b.position.distanceTo(player.position) < 0.8) {
      playerHealth -= 15;
      document.getElementById('health').textContent = 'Health: ' + Math.max(0, playerHealth);
      scene.remove(b);
      enemyBullets.splice(i, 1);
      if (playerHealth <= 0) {
        endGame(false);
      }
    }
  }
}

function endGame(playerWon) {
  controls.unlock();
  // pause gameplay until user clicks to start again
  gameStarted = false;
  const msg = playerWon ? 'You win! Click to play again.' : 'You died. Click to retry.';
  document.getElementById('message').textContent = msg;
  document.getElementById('message').style.display = 'block';
  // reset healths for next round
  playerHealth = 100;
  enemyHealth = 100;
  document.getElementById('health').textContent = 'Health: ' + playerHealth;
  document.getElementById('enemyHealth').textContent = 'Enemy: ' + enemyHealth;
  // reset positions
  const enemy = scene.userData.enemy;
  scene.userData.playerCollider.position.set(0, 1, 0);
  camera.position.set(0, 2, 0);
  if (enemy) enemy.position.set(8, 0.9, -8);
}

function enemyAI(dt) {
  const enemy = scene.userData.enemy;
  const player = scene.userData.playerCollider;
  if (!enemy || !player) return;
  // move enemy towards player, simple steering
  const dir = new THREE.Vector3();
  dir.copy(player.position).sub(enemy.position);
  const dist = dir.length();
  dir.normalize();
  // avoid walls by clamping desired pos inside arena
  const speed = 1.5; // units per second
  if (dist > 3.0) {
    enemy.position.addScaledVector(dir, speed * dt);
  } else {
    // small jitter around player
    enemy.position.x += (Math.random() - 0.5) * 0.5 * dt;
    enemy.position.z += (Math.random() - 0.5) * 0.5 * dt;
  }
  // keep enemy inside arena
  enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -arenaSize / 2 + 1, arenaSize / 2 - 1);
  enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -arenaSize / 2 + 1, arenaSize / 2 - 1);

  // enemy shooting timer
  enemyFireTimer -= dt;
  if (enemyFireTimer <= 0) {
    enemyShoot();
    enemyFireTimer = 1.2 + Math.random() * 1.0;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  // always render the scene, but only run gameplay updates after start
  if (!gameStarted) {
    renderer.render(scene, camera);
    return;
  }

  // player movement
  const speed = 6.0;
  velocity.set(0, 0, 0);
  if (move.forward) velocity.z -= 1;
  if (move.backward) velocity.z += 1;
  if (move.left) velocity.x -= 1;
  if (move.right) velocity.x += 1;
  if (velocity.lengthSq() > 0) velocity.normalize().multiplyScalar(speed * dt);

  // translate by camera rotation (y-axis)
  if (controls.isLocked) {
    const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
    const moveDir = velocity.clone().applyEuler(euler);
    camera.position.add(moveDir);
    // update player collider
    scene.userData.playerCollider.position.copy(camera.position);
    scene.userData.playerCollider.position.y = 1.0;
    // constrain within arena
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -arenaSize / 2 + 1, arenaSize / 2 - 1);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -arenaSize / 2 + 1, arenaSize / 2 - 1);
  }

  enemyAI(dt);
  updateBullets(dt);

  renderer.render(scene, camera);
}

// start after all declarations
init();
animate();
