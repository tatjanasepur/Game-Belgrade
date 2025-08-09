// SkyRun Bird 3D — 3D platformer sa ptičicom (Three.js, bez eksternih assets)
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ---------- GLOBALS ----------
let scene, camera, renderer, clock;
let player, playerRadius = 0.5, coins = [], movingPlatforms = [], level;
let grounded = false, onPlatform = null;
let vel = new THREE.Vector3(), timeLeft = 60, running = false, collected = 0;
let wingL, wingR, wingFlap = 0, flapVel = 0;

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
const input = {left:false,right:false,up:false,down:false,jump:false,mute:false};
addEventListener('keydown', e=>{
  if(e.key==='ArrowLeft'||e.key==='a') input.left=true;
  if(e.key==='ArrowRight'||e.key==='d') input.right=true;
  if(e.key==='ArrowUp'||e.key==='w') input.up=true;
  if(e.key==='ArrowDown'||e.key==='s') input.down=true;
  if(e.key===' ') input.jump=true;
  if(e.key==='r') resetLevel();
  if(e.key==='m') input.mute=!input.mute;
});
addEventListener('keyup', e=>{
  if(e.key==='ArrowLeft'||e.key==='a') input.left=false;
  if(e.key==='ArrowRight'||e.key==='d') input.right=false;
  if(e.key==='ArrowUp'||e.key==='w') input.up=false;
  if(e.key==='ArrowDown'||e.key==='s') input.down=false;
});
hud.tLeft.onpointerdown = ()=> input.left=true;  hud.tLeft.onpointerup = ()=> input.left=false;
hud.tRight.onpointerdown= ()=> input.right=true; hud.tRight.onpointerup= ()=> input.right=false;
hud.tUp.onpointerdown   = ()=> input.up=true;    hud.tUp.onpointerup   = ()=> input.up=false;
hud.tJump.onpointerdown = ()=> { input.jump=true; setTimeout(()=>input.jump=false,90); };

// ---------- AUDIO (mini bip tonovi) ----------
const actx = new (window.AudioContext||window.webkitAudioContext)();
function beep(f=600,d=0.1,type='sine',vol=0.06){
  if(input.mute) return;
  const o=actx.createOscillator(), g=actx.createGain();
  o.type=type; o.frequency.value=f; g.gain.value=vol; o.connect(g); g.connect(actx.destination);
  o.start(); o.stop(actx.currentTime+d);
}

// ---------- SCENE ----------
function init(){
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1020, 25, 120);

  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500);
  camera.position.set(0, 3, 8);
  camera.userData.offset = new THREE.Vector3(0, 2.1, 6);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  clock = new THREE.Clock();

  // svetlo + nebo
  scene.add(new THREE.HemisphereLight(0xbfdfff, 0x080820, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(8, 12, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
  scene.add(sun);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200,32,16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms:{top:{value:new THREE.Color(0x4fb2ff)},bottom:{value:new THREE.Color(0x081028)}},
      vertexShader:`varying vec3 v; void main(){v=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec3 v; uniform vec3 top; uniform vec3 bottom; void main(){float h=normalize(v).y*0.5+0.5; gl_FragColor=vec4(mix(bottom,top,h),1.0);}`
    })
  );
  scene.add(sky);

  buildLevel();
  player = createBird();
  player.position.set(0, 2.2, 0);
  scene.add(player);

  addEventListener('resize', onResize);
}
function onResize(){ camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }

// ---------- BIRD MODEL ----------
function createBird(){
  const bird = new THREE.Group();

  // telo (sfera + malo spljošteno)
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 20, 16),
    new THREE.MeshStandardMaterial({color:0xff6bd6, roughness:0.7, metalness:0.1})
  );
  body.scale.set(1.2, 0.9, 1.2);
  body.castShadow = true; bird.add(body);

  // stomak (belkasto)
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12),
    new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.9, metalness:0})
  );
  belly.position.set(0, -0.05, 0.1); belly.scale.set(0.9,0.7,0.5);
  belly.castShadow = false; bird.add(belly);

  // kljun (kornet)
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.24, 16),
    new THREE.MeshStandardMaterial({color:0xffc03a, roughness:0.6})
  );
  beak.rotation.x = Math.PI/2; beak.position.set(0, 0.05, 0.45);
  beak.castShadow = true; bird.add(beak);

  // oči
  const eyeMat = new THREE.MeshStandardMaterial({color:0x111111, roughness:1});
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.15, 0.18, 0.33);
  eyeR.position.set( 0.15, 0.18, 0.33);
  bird.add(eyeL, eyeR);

  // krila (ploče)
  const wingMat = new THREE.MeshStandardMaterial({color:0xff99e9, roughness:0.5, metalness:0.05});
  wingL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.6), wingMat);
  wingR = wingL.clone();
  wingL.position.set(-0.45, 0.02, 0.05);
  wingR.position.set( 0.45, 0.02, 0.05);
  wingL.rotation.z =  Math.PI/10;
  wingR.rotation.z = -Math.PI/10;
  wingL.castShadow = wingR.castShadow = true;
  bird.add(wingL, wingR);

  // rep
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.35, 10),
    new THREE.MeshStandardMaterial({color:0xff6bd6, roughness:0.7})
  );
  tail.rotation.x = -Math.PI/2;
  tail.position.set(0, -0.02, -0.45);
  bird.add(tail);

  // nogice (samo za look)
  const legMat = new THREE.MeshStandardMaterial({color:0xffc03a});
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.18,8), legMat);
  const legR = legL.clone();
  legL.position.set(-0.12, -0.45, 0.02);
  legR.position.set( 0.12, -0.45, 0.02);
  bird.add(legL, legR);

  // radius za sudare (aproks.)
  playerRadius = 0.5;
  return bird;
}

// ---------- LEVEL ----------
function buildLevel(){
  level = new THREE.Group(); scene.add(level);
  coins.length = 0; movingPlatforms.length = 0;

  const groundMat = new THREE.MeshStandardMaterial({color:0x23314d, roughness:0.85});
  const platMat   = new THREE.MeshStandardMaterial({color:0x3ec7a1, roughness:0.6});
  const dangerMat = new THREE.MeshStandardMaterial({color:0xd84b4b, emissive:0x220000, emissiveIntensity:0.3});
  const coinMat   = new THREE.MeshStandardMaterial({color:0xffd54a, metalness:0.7, roughness:0.25});
  const goalMat   = new THREE.MeshStandardMaterial({color:0x8a2be2, emissive:0x220044, emissiveIntensity:0.6});

  addPlatform(new THREE.Vector3(0,0,0),   new THREE.Vector3(12,1,12), groundMat, true);
  addPlatform(new THREE.Vector3(0,0,-10), new THREE.Vector3(6,1,6),   platMat);
  addMovingPlatform(new THREE.Vector3(0,0,-18), new THREE.Vector3(4,1,4), platMat, new THREE.Vector3(0,0,-4), new THREE.Vector3(0,0,4), 2.8);
  addPlatform(new THREE.Vector3(5,0,-25), new THREE.Vector3(4,1,4),   platMat);
  addPlatform(new THREE.Vector3(9,0,-31), new THREE.Vector3(4,1,4),   platMat);
  addMovingPlatform(new THREE.Vector3(13,0,-37), new THREE.Vector3(4,1,4), platMat, new THREE.Vector3(-2,0,0), new THREE.Vector3(2,0,0), 2.2);
  addPlatform(new THREE.Vector3(17,0,-43), new THREE.Vector3(4,1,4),  platMat);
  addDanger(new THREE.Vector3(10,-1,-31), new THREE.Vector3(24,0.5,18), dangerMat);

  placeCoin( 0, 2.0, -10, coinMat);
  placeCoin( 0, 3.0, -18, coinMat);
  placeCoin( 5, 2.5, -25, coinMat);
  placeCoin( 9, 3.2, -31, coinMat);
  placeCoin(13, 3.0, -37, coinMat);
  placeCoin(17, 2.8, -43, coinMat);
  placeCoin( 4, 2.0, -6,  coinMat);
  placeCoin(-3, 2.0, -6,  coinMat);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2,0.25,12,36), goalMat);
  ring.position.set(17,2.2,-46); ring.rotation.x = Math.PI/2; ring.castShadow = true; ring.userData.type='goal';
  level.add(ring);

  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshBasicMaterial({color:0x0a0f26,transparent:true,opacity:0.6}));
  clouds.rotation.x = -Math.PI/2; clouds.position.y = -2.0; scene.add(clouds);
}
function addPlatform(pos, size, mat, spawn=false){
  const m = new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z), mat);
  m.position.copy(pos); m.castShadow=true; m.receiveShadow=true;
  m.userData={type:'platform', size, spawn};
  level.add(m);
}
function addDanger(pos, size, mat){
  const m = new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z), mat);
  m.position.copy(pos); m.receiveShadow=true;
  m.userData={type:'danger', size}; level.add(m);
}
function addMovingPlatform(pos, size, mat, a, b, period){
  const m = new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z), mat);
  m.position.copy(pos); m.castShadow=true; m.receiveShadow=true;
  m.userData={type:'moving', size, a:pos.clone().add(a), b:pos.clone().add(b), t:Math.random(), period, prev:pos.clone()};
  movingPlatforms.push(m); level.add(m);
}
function placeCoin(x,y,z,mat){
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.1,24), mat);
  c.rotation.x = Math.PI/2; c.position.set(x,y,z); c.castShadow = true;
  c.userData.type='coin'; coins.push(c); level.add(c);
}

// ---------- GAME ----------
function start(){
  if(!scene) init();
  running = true; timeLeft = 60; collected=0; grounded=false; vel.set(0,0,0);
  hud.time.textContent = timeLeft.toFixed(1);
  hud.coins.textContent = '0';
  hud.msg.textContent = 'Pokupi 8 novčića i prođi kroz portal!';
  // spawn
  const spawn = level.children.find(o=>o.userData && o.userData.spawn);
  player.position.copy(spawn.position).add(new THREE.Vector3(0,1.6,0));
  animate();
}
function resetLevel(){
  scene.clear(); init(); start();
}

function animate(){
  if(!running) return;
  const dt = Math.min(0.0167, clock.getDelta());

  // move platforms
  for(const p of movingPlatforms){
    p.userData.t += dt/p.userData.period;
    const tt = (Math.sin(p.userData.t*Math.PI*2)*0.5+0.5);
    p.position.lerpVectors(p.userData.a, p.userData.b, tt);
  }

  // input → wished dir (kamera gleda ka igraču iz pozadine, pa koristimo global X/Z)
  const wish = new THREE.Vector3(
    (input.right?1:0) - (input.left?1:0),
    0,
    (input.down?1:0) - (input.up?1:0)
  );
  if(wish.lengthSq()>0) wish.normalize();

  const SPEED=5.2, JUMP=8.2, GRAV=-18;
  const targetVel = wish.multiplyScalar(SPEED);
  vel.x = THREE.MathUtils.damp(vel.x, targetVel.x, 10, dt);
  vel.z = THREE.MathUtils.damp(vel.z, targetVel.z, 10, dt);
  vel.y += GRAV*dt;

  const nextPos = player.position.clone().addScaledVector(vel, dt);
  grounded = false; onPlatform = null;

  collideAxis('x', nextPos);
  collideAxis('y', nextPos);
  collideAxis('z', nextPos);
  player.position.copy(nextPos);

  // skok
  if(input.jump && grounded){
    vel.y = JUMP; input.jump=false; flapVel = 6; beep(720,0.06,'square',0.06);
  }else{ input.jump=false; }

  // animacija krila: male “zamah” vibracije u letu, mirno kad je na tlu
  wingFlap += (grounded ? -wingFlap*5*dt : flapVel*dt);
  flapVel = THREE.MathUtils.damp(flapVel, 0, 2, dt);
  const base = Math.PI/10, add = Math.sin(performance.now()*0.008 + wingFlap)*Math.PI/12*(grounded?0.2:1);
  wingL.rotation.z =  base + add;
  wingR.rotation.z = -base - add;

  // kovanice
  for(const c of coins){
    if(!c.visible) continue;
    c.rotation.z += dt*4;
    if(player.position.distanceTo(c.position) < playerRadius+0.4){
      c.visible = false; collected++; hud.coins.textContent = String(collected); beep(880,0.06,'triangle',0.08);
    }
  }

  // cilj
  const goal = level.children.find(o=>o.userData && o.userData.type==='goal');
  if(goal && player.position.distanceTo(goal.position)<1.5 && collected>=8){
    running=false; hud.msg.textContent='Bravo! Ptica je stigla! (R za restart)'; beep(520,0.2,'sawtooth',0.08);
  }

  // timer / pad
  timeLeft -= dt; hud.time.textContent = Math.max(0,timeLeft).toFixed(1);
  if(timeLeft<=0){ running=false; hud.msg.textContent='Vreme isteklo! (R)'; beep(200,0.25,'sine',0.07); }
  if(player.position.y<-8){ running=false; hud.msg.textContent='Pao/la si! (R)'; beep(220,0.25,'sine',0.07); }

  // kamera prati
  const camTarget = player.position.clone().add(camera.userData.offset);
  camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, player.position.y+0.7, player.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function collideAxis(axis, nextPos){
  for(const obj of level.children){
    if(!obj.userData) continue;
    const t = obj.userData.type;
    if(t!=='platform' && t!=='moving' && t!=='danger') continue;
    const s = obj.userData.size || new THREE.Vector3(1,1,1);
    const min = obj.position.clone().addScaledVector(s, -0.5);
    const max = obj.position.clone().addScaledVector(s,  0.5);

    const p = nextPos.clone();
    // proširi AABB za radijus ptice
    min.addScalar(-playerRadius); max.addScalar(playerRadius);

    const inside = p.x>=min.x && p.x<=max.x && p.y>=min.y && p.y<=max.y && p.z>=min.z && p.z<=max.z;
    if(!inside) continue;

    if(t==='danger'){ running=false; hud.msg.textContent='Opekla te lava! (R)'; beep(180,0.25,'sine',0.07); return; }

    if(axis==='y'){
      if(vel.y<=0){ nextPos.y = max.y; vel.y=0; grounded=true; if(t==='moving') onPlatform=obj; }
      else{ nextPos.y = min.y; vel.y = -0.1; }
    }else if(axis==='x'){
      if(vel.x>0) nextPos.x = min.x; else nextPos.x = max.x;
      vel.x = 0;
    }else if(axis==='z'){
      if(vel.z>0) nextPos.z = min.z; else nextPos.z = max.z;
      vel.z = 0;
    }
  }
}

// ---------- BOOT ----------
init();
