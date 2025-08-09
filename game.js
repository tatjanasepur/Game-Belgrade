// SkyRun 3D — kratki 3D platformer za GitHub Pages (Three.js, bez eksternih assets)
// Autor: ti + GPT-5 Thinking
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let scene, camera, renderer, clock;
let player, controls, input, level, coins = [], movingPlatforms = [];
let grounded = false, onPlatform = null;
let vel = new THREE.Vector3(), acc = new THREE.Vector3();
let timeLeft = 60.0, running = false, collected = 0, win = false, lose = false;
let sfx = {}, audioOn = true;

const hud = {
  time: document.getElementById('time'),
  coins: document.getElementById('coins'),
  msg: document.getElementById('msg'),
  menu: document.getElementById('menu'),
  start: document.getElementById('playBtn'),
  touch: document.getElementById('touch'),
  tLeft: document.getElementById('left'),
  tRight: document.getElementById('right'),
  tUp: document.getElementById('up'),
  tJump: document.getElementById('jump'),
};

hud.start.onclick = () => { hud.menu.classList.add('hidden'); start(); };

const mobile = /Mobi|Android/i.test(navigator.userAgent);
if (mobile) hud.touch.classList.remove('hidden');

// ---------- INPUT ----------
input = {
  left:false, right:false, up:false, down:false, jump:false, mute:false,
};
window.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft'||e.key==='a') input.left=true;
  if(e.key==='ArrowRight'||e.key==='d') input.right=true;
  if(e.key==='ArrowUp'||e.key==='w') input.up=true;
  if(e.key==='ArrowDown'||e.key==='s') input.down=true;
  if(e.key===' '){ input.jump=true; }
  if(e.key==='r') resetLevel();
  if(e.key==='m'){ audioOn=!audioOn; }
});
window.addEventListener('keyup', (e)=>{
  if(e.key==='ArrowLeft'||e.key==='a') input.left=false;
  if(e.key==='ArrowRight'||e.key==='d') input.right=false;
  if(e.key==='ArrowUp'||e.key==='w') input.up=false;
  if(e.key==='ArrowDown'||e.key==='s') input.down=false;
});

hud.tLeft.onpointerdown = ()=> input.left=true;
hud.tLeft.onpointerup = ()=> input.left=false;
hud.tRight.onpointerdown = ()=> input.right=true;
hud.tRight.onpointerup = ()=> input.right=false;
hud.tUp.onpointerdown = ()=> input.up=true;
hud.tUp.onpointerup = ()=> input.up=false;
hud.tJump.onpointerdown = ()=> { input.jump=true; setTimeout(()=>input.jump=false, 80); };

// ---------- AUDIO (kratki WebAudio tonovi) ----------
const actx = new (window.AudioContext||window.webkitAudioContext)();
function beep(freq=600, dur=0.1, type='sine', vol=0.05){
  if(!audioOn) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type=type; o.frequency.value=freq; g.gain.value=vol;
  o.connect(g); g.connect(actx.destination); o.start();
  o.stop(actx.currentTime+dur);
}

// ---------- CORE ----------
function init(){
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1020, 25, 120);

  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500);
  camera.position.set(0, 3, 8);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  // LIGHTS & SKY
  const hemi = new THREE.HemisphereLight(0xbfdfff, 0x080820, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(8, 12, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  scene.add(sun);

  // gradient sky dome
  const skyGeo = new THREE.SphereGeometry(200, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top:{value:new THREE.Color(0x3a77ff)}, bottom:{value:new THREE.Color(0x081028)} },
    vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vPos; uniform vec3 top; uniform vec3 bottom;
      void main(){ float h = normalize(vPos).y*0.5+0.5; gl_FragColor = vec4(mix(bottom, top, h), 1.0); }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // LEVEL
  buildLevel();

  // PLAYER (capsule-ish)
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.0, 6, 12),
    new THREE.MeshStandardMaterial({color:0xff6bd6, roughness:0.7, metalness:0.1})
  );
  body.castShadow = true;
  body.position.set(0, 2.5, 0);
  player = body; scene.add(player);

  // CAMERA FOLLOW OFFSET
  camera.userData.offset = new THREE.Vector3(0, 2.2, 5.5);

  // START MSG
  hud.msg.textContent = 'Pokupi 8 novčića i uđi u portal!';

  window.addEventListener('resize', onResize);
}

function onResize(){
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function buildLevel(){
  level = new THREE.Group(); scene.add(level);
  coins.length = 0; movingPlatforms.length = 0;

  const groundMat = new THREE.MeshStandardMaterial({color:0x23314d, roughness:0.8, metalness:0.05});
  const platMat = new THREE.MeshStandardMaterial({color:0x3ec7a1, roughness:0.6});
  const dangerMat = new THREE.MeshStandardMaterial({color:0xd84b4b, emissive:0x220000, emissiveIntensity:0.3});
  const coinMat = new THREE.MeshStandardMaterial({color:0xffd54a, metalness:0.7, roughness:0.25});
  const goalMat = new THREE.MeshStandardMaterial({color:0x8a2be2, emissive:0x220044, emissiveIntensity:0.6});

  // start island
  addPlatform(new THREE.Vector3(0,0,0), new THREE.Vector3(12, 1, 12), groundMat, true);

  // path of platforms
  addPlatform(new THREE.Vector3(0,0,-10), new THREE.Vector3(6,1,6), platMat);
  addMovingPlatform(new THREE.Vector3(0,0,-18), new THREE.Vector3(4,1,4), platMat, new THREE.Vector3(0,0,-4), new THREE.Vector3(0,0,4), 2.8);
  addPlatform(new THREE.Vector3(5,0,-25), new THREE.Vector3(4,1,4), platMat);
  addPlatform(new THREE.Vector3(9,0,-31), new THREE.Vector3(4,1,4), platMat);
  addMovingPlatform(new THREE.Vector3(13,0,-37), new THREE.Vector3(4,1,4), platMat, new THREE.Vector3(-2,0,0), new THREE.Vector3(2,0,0), 2.2);
  addPlatform(new THREE.Vector3(17,0,-43), new THREE.Vector3(4,1,4), platMat);

  // wide danger gap
  addDanger(new THREE.Vector3(10,-1,-31), new THREE.Vector3(24,0.5,18), dangerMat);

  // coin trail
  placeCoin( 0, 2.0, -10, coinMat);
  placeCoin( 0, 3.0, -18, coinMat);
  placeCoin( 5, 2.5, -25, coinMat);
  placeCoin( 9, 3.2, -31, coinMat);
  placeCoin(13, 3.0, -37, coinMat);
  placeCoin(17, 2.8, -43, coinMat);
  placeCoin( 4, 2.0, -6,  coinMat);
  placeCoin(-3, 2.0, -6,  coinMat);

  // goal portal
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.25, 12, 36),
    goalMat
  );
  ring.position.set(17, 2.2, -46);
  ring.rotation.x = Math.PI/2;
  ring.castShadow = true;
  ring.userData.type = 'goal';
  level.add(ring);

  // soft cloud floor (just for look)
  const cloudGeo = new THREE.PlaneGeometry(300, 300);
  const cloudMat = new THREE.MeshBasicMaterial({color:0x0a0f26, transparent:true, opacity:0.6});
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  clouds.rotation.x = -Math.PI/2;
  clouds.position.y = -2.0;
  scene.add(clouds);
}

function addPlatform(pos, size, mat, spawn=false){
  const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
  m.position.copy(pos); m.castShadow = true; m.receiveShadow = true;
  m.userData = {type:'platform', size};
  level.add(m);
  if(spawn) m.userData.spawn = true;
}

function addDanger(pos, size, mat){
  const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
  m.position.copy(pos); m.receiveShadow = true;
  m.userData = {type:'danger', size};
  level.add(m);
}

function addMovingPlatform(pos, size, mat, deltaA, deltaB, period){
  const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
  m.position.copy(pos); m.castShadow = true; m.receiveShadow = true;
  m.userData = {type:'moving', size, a: pos.clone().add(deltaA), b: pos.clone().add(deltaB), t: Math.random(), period};
  movingPlatforms.push(m);
  level.add(m);
}

function placeCoin(x,y,z, mat){
  const g = new THREE.CylinderGeometry(0.35,0.35,0.1,24);
  const coin = new THREE.Mesh(g, mat); coin.rotation.x = Math.PI/2; coin.position.set(x,y,z); coin.castShadow = true;
  coin.userData.type='coin'; coins.push(coin); level.add(coin);
}

// ---------- GAME LOOP ----------
function start(){
  if(!scene) init();
  running = true; win = false; lose = false;
  timeLeft = 60.0; collected = 0;
  hud.time.textContent = timeLeft.toFixed(1);
  hud.coins.textContent = `${collected}`;
  hud.msg.textContent = 'Srećno!';

  // spawn pos
  const spawn = level.children.find(o=>o.userData && o.userData.spawn);
  player.position.set(spawn.position.x, spawn.position.y + 1.5, spawn.position.z);
  vel.set(0,0,0); acc.set(0,0,0);
  animate();
}

function resetLevel(){
  // ukloni sve i ponovo izgradi
  scene.clear(); init();
  start();
}

function animate(){
  if(!running) return;
  const dt = Math.min(0.0167, clock.getDelta()); // clamp 60 FPS step

  // move moving platforms
  for(const p of movingPlatforms){
    p.userData.t += dt/p.userData.period;
    const tt = (Math.sin(p.userData.t*2*Math.PI)*0.5 + 0.5); // ping-pong
    p.position.lerpVectors(p.userData.a, p.userData.b, tt);
  }

  // player physics
  const SPEED = 5.5;
  const JUMP = 8.5;
  const GRAV = -18;

  // desired horizontal dir (camera aligned)
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).multiplyScalar(-1);

  let wish = new THREE.Vector3();
  if(input.left)  wish.addScaledVector(right, -1);
  if(input.right) wish.addScaledVector(right,  1);
  if(input.up)    wish.addScaledVector(forward,1);
  if(input.down)  wish.addScaledVector(forward,-1);
  if(wish.lengthSq()>0) wish.normalize();

  // acceleration & damping
  const targetVel = wish.multiplyScalar(SPEED);
  vel.x = THREE.MathUtils.damp(vel.x, targetVel.x, 10, dt);
  vel.z = THREE.MathUtils.damp(vel.z, targetVel.z, 10, dt);

  // gravity
  vel.y += GRAV * dt;

  // simple sweep: try move in steps; collide with boxes
  const nextPos = player.position.clone().addScaledVector(vel, dt);
  grounded = false; onPlatform = null;

  // collide per axis against level meshes
  collideAxis('x', nextPos, dt);
  collideAxis('y', nextPos, dt);
  collideAxis('z', nextPos, dt);

  player.position.copy(nextPos);

  // jump
  if(input.jump && grounded){
    vel.y = JUMP; grounded = false; input.jump = false; beep(700,0.06,'square',0.06);
  }else{
    input.jump = false;
  }

  // if on moving platform, move with it
  if(onPlatform){
    nextPos.add(onPlatform.position.clone().sub(onPlatform.userData.prev||onPlatform.position));
  }
  for(const p of movingPlatforms){ p.userData.prev = p.position.clone(); }

  // coins & goal
  for(const c of coins){
    if(!c.visible) continue;
    if(player.position.distanceTo(c.position) < 0.7){
      c.visible = false; collected++; hud.coins.textContent = `${collected}`;
      beep(880,0.06,'triangle',0.08);
    }
  }
  const goal = level.children.find(o=>o.userData && o.userData.type==='goal');
  if(goal && player.position.distanceTo(goal.position) < 1.5 && collected>=8){
    win = true; running=false; hud.msg.textContent='Bravo! Pobedila si! (R za restart)'; beep(520,0.2,'sawtooth',0.08);
  }

  // time
  timeLeft -= dt;
  hud.time.textContent = Math.max(0, timeLeft).toFixed(1);
  if(timeLeft<=0 && !win){ running=false; lose=true; hud.msg.textContent='Vreme isteklo! (R za restart)'; beep(180,0.3,'sine',0.07); }

  // fall off
  if(player.position.y < -8 && !win){ running=false; lose=true; hud.msg.textContent='Pao/la si! (R za restart)'; beep(220,0.25,'sine',0.07); }

  // camera follow
  const targetCam = player.position.clone().add(camera.userData.offset);
  camera.position.lerp(targetCam, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, player.position.y+1.0, player.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function collideAxis(axis, nextPos, dt){
  // test all boxes (platform/danger/moving)
  const size = 0.35; // capsule radius approx -> treat as AABB
  for(const m of level.children){
    if(!m.userData) continue;
    if(m.userData.type!=='platform' && m.userData.type!=='moving' && m.userData.type!=='danger') continue;
    const s = m.userData.size || new THREE.Vector3(1,1,1);
    const min = new THREE.Vector3().copy(m.position).addScaledVector(s, -0.5);
    const max = new THREE.Vector3().copy(m.position).addScaledVector(s,  0.5);
    // expand by player radius
    min.addScalar(-size); max.addScalar(size);

    const p = nextPos;
    const inside =
      p.x >= min.x && p.x <= max.x &&
      p.y >= min.y && p.y <= max.y &&
      p.z >= min.z && p.z <= max.z;

    if(inside){
      if(m.userData.type==='danger'){ // instant fail (lava)
        running=false; lose=true; hud.msg.textContent='Opekao te je pod! (R za restart)'; beep(200,0.25,'sine',0.07); return;
      }
      // push out along axis
      if(axis==='y'){
        // coming from top (landing)
        if(vel.y <= 0){
          p.y = max.y;
          vel.y = 0;
          grounded = true;
          if(m.userData.type==='moving') onPlatform = m; // ride
        }else{
          p.y = min.y;
          vel.y = -0.2;
        }
      }else if(axis==='x'){
        if(vel.x>0) p.x = min.x; else p.x = max.x;
        vel.x = 0;
      }else if(axis==='z'){
        if(vel.z>0) p.z = min.z; else p.z = max.z;
        vel.z = 0;
      }
    }
  }
}
init();


