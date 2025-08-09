// Belgrade Life v2 — Map, GSP, NPC, Phone, Day/Night
const CONFIG = { w: 1024, h: 576, bg: 0x0b0c12 };

const state = {
  location: 'Dedinje — Kuća',
  gender: 'z',
  color: 0xff6bd6,
  energy: 100,
  need: 0,
  cash: 4500,
  bagsKg: 0,
  bagItems: [],
  fridge: [],
  day: 1,
  hour: 8, // 0-23
  minute: 0,
};

const CATALOG = [
  {name:'Voda 1.5L', kg:1.5, price:90},
  {name:'Hleb', kg:0.5, price:75},
  {name:'Mleko 1L', kg:1, price:140},
  {name:'Jaja (10)', kg:0.7, price:260},
  {name:'Sir Gauda 250g', kg:0.25, price:360},
  {name:'Jogurt 1L', kg:1, price:150},
  {name:'Banane 1kg', kg:1, price:180},
  {name:'Jabuke 1kg', kg:1, price:160},
  {name:'Piletina 500g', kg:0.5, price:420},
  {name:'Mleveno 500g', kg:0.5, price:520},
  {name:'Pasta 500g', kg:0.5, price:170},
  {name:'Pirinac 1kg', kg:1, price:240},
  {name:'Kafa 200g', kg:0.2, price:420},
  {name:'Caj 20', kg:0.1, price:160},
  {name:'Cokolada 100g', kg:0.1, price:140},
  {name:'Detergent', kg:2, price:780},
  {name:'Sampon', kg:0.4, price:350},
  {name:'Pasta za zube', kg:0.2, price:220},
  {name:'Toalet papir (8)', kg:0.6, price:380},
];

// phone tasks
const TASKS = [
  {text: 'Kupi vodu i hleb', done:false},
  {text: 'Odradi smenu u Starbrews', done:false},
  {text: 'Spremi ručak kod kuće', done:false},
];

let overlay, startBtn, genderSel, colorInput;
let shopUI, shopList, cashLabel, closeShop, buyBtn;
let invUI, invList, bagsLabel, closeInv, toFridgeBtn;
let phoneUI, phoneTabs, tabMap, tabTasks, taskList, closePhone;
let baristaUI, orderText, timerFill, baristaMsg, quitBarista;
let hudLoc, hudEnergy, hudNeeds, hudCash, hudBags, hudDay, hudHour;

class SceneHome extends Phaser.Scene{
  constructor(){ super('home'); }
  preload(){
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(state.color,1).fillCircle(12,12,12); g.generateTexture('player',24,24); g.clear();
    g.fillStyle(0x2a2f48,1).fillRect(0,0,80,40); g.fillStyle(0xffffff,1).fillRect(4,4,72,32); g.generateTexture('bed',80,40); g.clear();
    g.fillStyle(0xaad3ff,1).fillRect(0,0,28,48); g.fillRect(3,3,22,18); g.fillRect(3,27,22,18); g.generateTexture('fridge',28,48); g.clear();
    g.fillStyle(0x8b6b4a,1).fillRect(0,0,40,50); g.generateTexture('ward',40,50); g.clear();
    g.fillStyle(0xcccccc,1).fillRect(0,0,24,50); g.generateTexture('door',24,50); g.clear();
  }
  create(){
    setDaylight(this);
    hudSet('Dedinje — Kuća');
    this.add.text(12,8,'Dedinje — Kuća', {font:'16px monospace', fill:'#cfe3ff'});
    this.add.text(12,28,'Krevet  Frižider  Ormar  Vrata', {font:'12px monospace', fill:'#9fb0d7'});
    this.add.rectangle(0,0,CONFIG.w,CONFIG.h,0x111420).setOrigin(0);

    this.bed = this.add.image(150,120,'bed').setInteractive();
    this.fridge = this.add.image(320,120,'fridge').setInteractive();
    this.ward = this.add.image(480,118,'ward').setInteractive();
    this.door = this.add.image(980,280,'door').setInteractive();

    this.player = this.physics.add.image(200,300,'player').setCollideWorldBounds(true);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,E,I,T');
    this.input.keyboard.on('keydown-E', ()=>{
      if(dist(this.player,this.bed)<80) sleepAction(this);
      else if(dist(this.player,this.fridge)<80) eatAction(this);
      else if(dist(this.player,this.ward)<80) wardrobeAction(this);
      else if(dist(this.player,this.door)<90) this.scene.start('street');
    });
    this.input.keyboard.on('keydown-I', openInventory);
    this.input.keyboard.on('keydown-T', openPhone);
  }
  update(){ movePlayer(this, 230); tickTime(this); }
}

class SceneStreet extends Phaser.Scene{
  constructor(){ super('street'); }
  preload(){
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(state.color,1).fillCircle(12,12,12); g.generateTexture('player',24,24); g.clear();
    g.fillStyle(0x2f354d,1).fillRect(0,0,240,120); g.generateTexture('block',240,120); g.clear();
    g.fillStyle(0xffcc66,1).fillRect(0,0,160,60); g.generateTexture('shop',160,60); g.clear();
    g.fillStyle(0x9a6bff,1).fillRect(0,0,180,60); g.generateTexture('cafe',180,60); g.clear();
    g.fillStyle(0x66d9aa,1).fillRect(0,0,160,50); g.generateTexture('bus',160,50); g.clear();
    g.fillStyle(0xcccccc,1).fillRect(0,0,140,60); g.generateTexture('home',140,60); g.clear();
    // npc
    g.fillStyle(0xeeeeee,1).fillCircle(8,8,8); g.generateTexture('npc',16,16); g.clear();
  }
  create(){
    setDaylight(this);
    hudSet('Dedinje — Ulica');
    this.add.text(12,8,'Dedinje — Ulica', {font:'16px monospace', fill:'#cfe3ff'});
    this.add.text(12,28,'SuperMarkt • Starbrews • GSP • Kuća', {font:'12px monospace', fill:'#9fb0d7'});
    this.add.rectangle(0,0,CONFIG.w,CONFIG.h,0x10131c).setOrigin(0);

    for(let i=0;i<6;i++) this.add.image(140+i*150, 120, 'block');
    this.market = this.add.image(250, 380, 'shop');
    this.add.text(200, 410, 'SuperMarkt', {font:'13px monospace', fill:'#ffe9b0'});
    this.cafe = this.add.image(520, 360, 'cafe');
    this.add.text(480, 390, 'Starbrews', {font:'13px monospace', fill:'#e6d6ff'});
    this.bus = this.add.image(680, 420, 'bus');
    this.add.text(640, 448, 'GSP Stajalište', {font:'13px monospace', fill:'#c6ffe4'});
    this.home = this.add.image(860, 360, 'home');
    this.add.text(830, 390, 'Kuća', {font:'13px monospace', fill:'#e6f0ff'});

    this.player = this.physics.add.image(860,460,'player').setCollideWorldBounds(true);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,E,I,T');
    this.input.keyboard.on('keydown-E', ()=>{
      if(dist(this.player,this.market)<120) openShop();
      else if(dist(this.player,this.cafe)<120) this.scene.start('barista');
      else if(dist(this.player,this.home)<120) this.scene.start('home');
      else if(dist(this.player,this.bus)<120) openBus(this);
    });
    this.input.keyboard.on('keydown-I', openInventory);
    this.input.keyboard.on('keydown-T', openPhone);

    // simple NPC walkers
    this.npcs = this.add.group();
    for(let i=0;i<10;i++){
      const n = this.physics.add.image(100+Math.random()*800, 200+Math.random()*220, 'npc');
      n.vx = (Math.random()<.5?-1:1)*(40+Math.random()*60);
      n.vy = (Math.random()<.5?-1:1)*(40+Math.random()*60);
      this.npcs.add(n);
    }
  }
  update(){
    movePlayer(this, 260); tickTime(this);
    this.npcs.children.iterate(n=>{
      if(!n) return;
      n.setVelocity(n.vx, n.vy);
      if(n.x<40||n.x>CONFIG.w-40) n.vx*=-1;
      if(n.y<200||n.y>520) n.vy*=-1;
    });
  }
}
class SceneDistrict extends Phaser.Scene {
  constructor(key, label) { super(key); this.label = label; }
  preload(){
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(state.color,1).fillCircle(12,12,12); g.generateTexture('player',24,24); g.clear();
    g.fillStyle(0x2f354d,1).fillRect(0,0,240,120); g.generateTexture('block',240,120); g.clear();
    g.fillStyle(0x66d9aa,1).fillRect(0,0,160,50); g.generateTexture('bus',160,50); g.clear();
    g.fillStyle(0xeeeeee,1).fillCircle(8,8,8); g.generateTexture('npc',16,16); g.clear();
  }
  create(){
    setDaylight(this);
    hudSet(this.label);
    this.add.text(12,8,this.label,{font:'16px monospace', fill:'#cfe3ff'});
    this.add.rectangle(0,0,CONFIG.w,CONFIG.h,0x10131c).setOrigin(0);

    this.bus = this.add.image(860, 400, 'bus');
    this.add.text(820, 428, 'GSP nazad', {font:'13px monospace', fill:'#c6ffe4'});

    // NPCs
    this.npcs = this.add.group();
    for(let i=0;i<12;i++){
      const n = this.physics.add.image(100+Math.random()*800, 150+Math.random()*300, 'npc');
      n.vx = (Math.random()<.5?-1:1)*(40+Math.random()*60);
      n.vy = (Math.random()<.5?-1:1)*(40+Math.random()*60);
      this.npcs.add(n);
    }

    this.player = this.physics.add.image(100,460,'player').setCollideWorldBounds(true);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,E,I,T');
    this.input.keyboard.on('keydown-E', ()=>{
      if(dist(this.player,this.bus)<100) this.scene.start('street');
    });
    this.input.keyboard.on('keydown-I', openInventory);
    this.input.keyboard.on('keydown-T', openPhone);
  }
  update(){
    movePlayer(this, 250); tickTime(this);
    this.npcs.children.iterate(n=>{
      n.setVelocity(n.vx, n.vy);
      if(n.x<40||n.x>CONFIG.w-40) n.vx*=-1;
      if(n.y<150||n.y>520) n.vy*=-1;
    });
  }
}

class SceneBarista extends Phaser.Scene{
  constructor(){ super('barista'); }
  create(){
    hudSet('Starbrews — Smena');
    document.getElementById('overlay').classList.remove('hidden');
    baristaUI.classList.remove('hidden');
    startOrder();
    quitBarista.onclick = ()=>{
      baristaUI.classList.add('hidden');
      this.scene.start('street');
    };
  }
  update(){ tickTime(this); }
}

// helper functions
function dist(a,b){ return Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y); }
function movePlayer(scene, speed){
  const k = scene.keys;
  let vx=0, vy=0;
  if(k.W.isDown) vy=-1;
  if(k.S.isDown) vy=1;
  if(k.A.isDown) vx=-1;
  if(k.D.isDown) vx=1;
  const spd = (k.SPACE.isDown?1.6:1)*speed;
  scene.player.setVelocity(vx*spd, vy*spd);
}
function tickTime(scene){
  state.minute += 1;
  if(state.minute>=60){ state.minute=0; state.hour+=1; }
  if(state.hour>=24){ state.hour=0; state.day+=1; }
  hudHour.textContent = `${String(state.hour).padStart(2,'0')}:${String(state.minute).padStart(2,'0')}`;
}
function hudSet(loc){
  state.location = loc;
  hudLoc.textContent = loc;
  hudEnergy.textContent = state.energy;
  hudNeeds.textContent = state.need;
  hudCash.textContent = state.cash;
  hudBags.textContent = state.bagsKg.toFixed(1);
  hudDay.textContent = state.day;
  hudHour.textContent = `${String(state.hour).padStart(2,'0')}:${String(state.minute).padStart(2,'0')}`;
}
function setDaylight(scene){
  const tint = (state.hour>=20||state.hour<6)?0x0a0b12:CONFIG.bg;
  scene.cameras.main.setBackgroundColor(tint);
}
function sleepAction(scene){
  state.energy = 100;
  scene.add.text(400,280,'Spavanje...',{font:'18px monospace', fill:'#fff'}).setDepth(10).setScrollFactor(0);
}
function eatAction(scene){
  if(state.fridge.length>0){
    state.need = Math.max(0,state.need-20);
    state.fridge.pop();
  }
}
function wardrobeAction(scene){
  state.color = Math.random()*0xffffff;
  scene.textures.remove('player');
  const g = scene.make.graphics({x:0,y:0,add:false});
  g.fillStyle(state.color,1).fillCircle(12,12,12); g.generateTexture('player',24,24);
}
function openShop(){
  shopUI.classList.remove('hidden');
  shopList.innerHTML = '';
  CATALOG.forEach(it=>{
    const row = document.createElement('div'); row.textContent = it.name;
    const kg = document.createElement('div'); kg.textContent = `${it.kg}kg`;
    const pr = document.createElement('div'); pr.textContent = `${it.price} RSD`;
    shopList.append(row,kg,pr);
  });
  cashLabel.textContent = state.cash;
}
function openInventory(){
  invUI.classList.remove('hidden');
  invList.innerHTML='';
  state.bagItems.forEach(it=>{
    const row = document.createElement('div'); row.textContent = it.name;
    const kg = document.createElement('div'); kg.textContent = `${it.kg}kg`;
    const pr = document.createElement('div'); pr.textContent = `${it.price} RSD`;
    invList.append(row,kg,pr);
  });
  bagsLabel.textContent = `${state.bagsKg}kg`;
}
function openPhone(){
  phoneUI.classList.remove('hidden');
  renderTasks();
}
function openBus(scene){
  const lines = [
    {label:'Eko1 → Dorćol', goto:'dorcol'},
    {label:'31 → Vračar', goto:'vracar'},
    {label:'23 → Ada', goto:'ada'},
    {label:'33 → Dedinje', goto:'home'}
  ];
  const pick = prompt('Linije:\n' + lines.map((l,i)=>`${i+1}) ${l.label}`).join('\n'));
  const num = parseInt(pick);
  if(num>=1 && num<=lines.length){
    scene.scene.start(lines[num-1].goto);
  }
}
function renderTasks(){
  taskList.innerHTML='';
  TASKS.forEach((t,i)=>{
    const li = document.createElement('li');
    li.textContent = (t.done?'✔ ':'☐ ') + t.text;
    taskList.appendChild(li);
  });
}
function startOrder(){
  const steps = ['espresso','mleko','preliv'];
  let stepIndex = 0;
  orderText.textContent = 'Porudžbina: ' + steps.join(' → ');
  document.querySelectorAll('#baristaUI button.mini').forEach(btn=>{
    btn.onclick=()=>{
      if(btn.dataset.step===steps[stepIndex]){
        stepIndex++;
        if(stepIndex===steps.length){
          baristaMsg.textContent = 'Kafa poslužena!';
          state.cash += 250;
          hudCash.textContent = state.cash;
          stepIndex=0;
        }
      } else {
        baristaMsg.textContent = 'Pogrešan korak!';
      }
    };
  });
}

window.onload = ()=>{
  overlay = document.getElementById('overlay');
  startBtn = document.getElementById('startBtn');
  genderSel = document.getElementById('gender');
  colorInput = document.getElementById('color');
  shopUI = document.getElementById('shopUI');
  shopList = document.getElementById('shopList');
  cashLabel = document.getElementById('cashLabel');
  closeShop = document.getElementById('closeShop');
  buyBtn = document.getElementById('buyBtn');
  invUI = document.getElementById('invUI');
  invList = document.getElementById('invList');
  bagsLabel = document.getElementById('bagsLabel');
  closeInv = document.getElementById('closeInv');
  toFridgeBtn = document.getElementById('toFridgeBtn');
  phoneUI = document.getElementById('phoneUI');
  taskList = document.getElementById('taskList');
  closePhone = document.getElementById('closePhone');
  baristaUI = document.getElementById('baristaUI');
  orderText = document.getElementById('orderText');
  timerFill = document.getElementById('timerFill');
  baristaMsg = document.getElementById('baristaMsg');
  quitBarista = document.getElementById('quitBarista');
  hudLoc = document.getElementById('hudLoc');
  hudEnergy = document.getElementById('hudEnergy');
  hudNeeds = document.getElementById('hudNeeds');
  hudCash = document.getElementById('hudCash');
  hudBags = document.getElementById('hudBags');
  hudDay = document.getElementById('hudDay');
  hudHour = document.getElementById('hudHour');

  startBtn.onclick=()=>{
    state.gender = genderSel.value;
    state.color = parseInt(colorInput.value.replace('#','0x'));
    overlay.classList.add('hidden');
    game.scene.start('home');
  };
  closeShop.onclick=()=> shopUI.classList.add('hidden');
  buyBtn.onclick=()=>{
    const idx = prompt('Koji broj artikla kupuješ? (0-19)');
    const it = CATALOG[idx];
    if(!it) return;
    if(state.cash>=it.price && state.bagsKg+it.kg<=12){
      state.cash-=it.price;
      state.bagsKg+=it.kg;
      state.bagItems.push(it);
      hudCash.textContent = state.cash;
      hudBags.textContent = state.bagsKg;
      cashLabel.textContent = state.cash;
    }
  };
  closeInv.onclick=()=> invUI.classList.add('hidden');
  toFridgeBtn.onclick=()=>{
    state.fridge.push(...state.bagItems);
    state.bagItems=[];
    state.bagsKg=0;
    hudBags.textContent=0;
    invUI.classList.add('hidden');
  };
  closePhone.onclick=()=> phoneUI.classList.add('hidden');

  phoneUI.querySelectorAll('.tabs button').forEach(btn=>{
    btn.onclick=()=>{
      phoneUI.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(btn.dataset.tab==='map'){ tabMap.classList.remove('hidden'); tabTasks.classList.add('hidden'); }
      else { tabMap.classList.add('hidden'); tabTasks.classList.remove('hidden'); }
    };
  });

  tabMap = document.getElementById('tabMap');
  tabTasks = document.getElementById('tabTasks');

  const config = {
    type: Phaser.AUTO,
    width: CONFIG.w,
    height: CONFIG.h,
    backgroundColor: CONFIG.bg,
    physics: { default:'arcade', arcade:{debug:false} },
    scene: [
      SceneHome,
      SceneStreet,
      new SceneDistrict('dorcol','Dorćol'),
      new SceneDistrict('vracar','Vračar'),
      new SceneDistrict('ada','Ada'),
      SceneBarista
    ]
  };
  window.game = new Phaser.Game(config);
};

