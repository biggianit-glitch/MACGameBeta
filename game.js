// My Amneal Career Quest - v22 integrated selectors + one-way platforms + guaranteed 4 skills: original MAC-themed level pacing, logo start screen, Excel at Your Role skills screen, bonus/gig rooms
// - Unique drawn background per level (lobby, lab, warehouse, etc.)
// - Per-level randomized platform layouts, 2-3 min to complete
// - Press UP at elevator to board → fireworks → level complete
// - Simple NES jump physics

if (typeof Phaser === "undefined") {
  alert("Phaser did not load. Check internet or CDN access.");
}

const W = 960, H = 540;
const WORLD_W = 6000; // wider world for 2-3 min traversal

// Original, SMB3-inspired pacing targets:
// short readable stages, 3 gap sequences, 4 major skill collectibles,
// varied enemy pacing, optional gig/mentor bonus rooms, and map-based progress.
// No Nintendo assets, maps, code, music, or level data are used.

const GRAVITY    = 1050;
const WALK_SPEED = 155;
const RUN_SPEED  = 260;
const JUMP_VEL   = -510;
const MAX_FALL   = 620;
const SAFE_GAP_HALF_WIDTH = 48; // 96px floor gaps, safely jumpable with current physics
const SAFE_PLATFORM_STEP_Y = 95; // max comfortable vertical step between reachable platforms

const config = {
  type: Phaser.AUTO, width: W, height: H,
  parent: document.body, pixelArt: true, roundPixels: true,
  backgroundColor: "#071421",
  physics: { default:"arcade", arcade:{ gravity:{y:GRAVITY}, debug:false } },
  scene: { preload, create, update }
};
// Phaser game is started after all constants/functions are initialized.

let sceneRef, state = "start";
let selectedAvatar=0, selectedSkills=[], unlockedLevel=1, currentLevel=1;
let score=0, attempts=3, skillsCollected=0, timeLeft=180;
let levelStartScore=0, levelEnded=false;
let currentWorldLabel="";
let invincible=false, invincibleTimer=null;
let player, cursors, shiftKey, spaceKey, pauseKey, escKey, enterKey;
let platforms, oneWayPlatforms, coins, skillItems, enemies, goalZone, powerUps;
let enemySpawnPoints=[];
let ui={}, timerEvent;
let lastJumpDown=false;
let lastUpDown=false;
let lastPauseDown=false;
let initialEntry={letters:[0,0,0],pos:0,saved:false,reason:"gameover"};
// elevator interaction
let nearElevator=false, elevatorPrompt=null, elevatorX=0;
let fireworksActive=false, fireworkTimers=[];
let gigDoor=null, gigPrompt=null, nearGigDoor=false, gigCompletedThisLevel=false;

const avatars=[
  {key:"maria",    sheetKey:"maria_sheet",    name:"Maria",    color:0xec2f7b},
  {key:"paul",     sheetKey:"paul_sheet",     name:"Paul",     color:0x91c957},
  {key:"joan",     sheetKey:"joan_sheet",     name:"Joan",     color:0xffbf28},
  {key:"deirdre",  sheetKey:"deirdre_sheet",  name:"Deirdre",  color:0xf25f22},
  {key:"dharmesh", sheetKey:"dharmesh_sheet", name:"Dharmesh", color:0x8b55a3}
];

// Sprite sheet constants (all sheets are identical in layout)
const SHEET_FRAME_W = 396;
const SHEET_FRAME_H = 793;
// Frame indices: 0=idle, 1=walk_1, 2=walk_2, 3=jump, 4=crouch
const FRAME_IDLE   = 0;
const FRAME_WALK_1 = 1;
const FRAME_WALK_2 = 2;
const FRAME_JUMP   = 3;
const FRAME_CROUCH = 4;

// Larger in-level player size, closer to the platformer reference proportions.
// The source sheets remain 396x793 per frame; these values only affect how large
// the player appears in the level and how the invisible physics body fits.
const PLAYER_W = 64;
const PLAYER_H = 96;
const PLAYER_CROUCH_H = 58;

// Native-frame collision box values tuned for PLAYER_W/PLAYER_H.
// These keep the character larger visually while keeping the hitbox fair.
const PLAYER_BODY_W = 220;
const PLAYER_BODY_H = 580;
const PLAYER_BODY_OFFSET_X = 88;
const PLAYER_BODY_OFFSET_Y = 150;

const PLAYER_CROUCH_BODY_W = 220;
const PLAYER_CROUCH_BODY_H = 430;
const PLAYER_CROUCH_OFFSET_X = 88;
const PLAYER_CROUCH_OFFSET_Y = 290;
const skillChoices=[
  ["Communication","💬"],["Collaboration","🤝"],["Problem Solving","🧩"],
  ["Adaptability","↪"],["Leadership","★"],["Data Thinking","▥"]
];

const levels=[
  {
    name:"Corporate HQ Lobby",   theme:"Navigate the Home Office",
    timeLimit:180,
    skill:["Career Profile","Communication","Collaboration","Adaptability"],
    label:"Welcome to Amneal HQ — build your MAC profile, collect core skills, try optional gigs, and ride the elevator up!"
  },
  {
    name:"R&D Lab",              theme:"Develop the Next Formula",
    timeLimit:180,
    skill:["Scientific Acumen","Analytical Thinking","Problem Solving","Innovation"],
    label:"R&D lab — collect science and problem-solving skills before advancing!"
  },
  {
    name:"Manufacturing Floor",  theme:"Keep the Line Moving",
    timeLimit:185,
    skill:["GMP Mindset","Process Discipline","Safety Focus","Operational Excellence"],
    label:"Manufacturing floor — build process, safety, and execution skills!"
  },
  {
    name:"Quality Control Lab",  theme:"Raise the Standard",
    timeLimit:185,
    skill:["Quality Mindset","Attention to Detail","Root Cause Analysis","Compliance"],
    label:"QC lab — collect quality and compliance skills and reach the elevator!"
  },
  {
    name:"Regulatory Affairs",   theme:"File the Submission",
    timeLimit:190,
    skill:["Regulatory Knowledge","Technical Writing","Risk Assessment","Stakeholder Management"],
    label:"Regulatory deadline — collect the skills needed to move work forward!"
  },
  {
    name:"Supply Chain Warehouse",theme:"Ship the Order On Time",
    timeLimit:190,
    skill:["Planning","Prioritization","Inventory Awareness","Execution"],
    label:"Warehouse route — collect planning and execution skills before time runs out!"
  },
  {
    name:"Sales District Office", theme:"Build the Territory",
    timeLimit:185,
    skill:["Product Knowledge","Business Acumen","Customer Focus","Territory Management"],
    label:"Field sales day — collect product, customer, and business skills!"
  },
  {
    name:"Medical Affairs",       theme:"Support the Science",
    timeLimit:185,
    skill:["Clinical Acumen","Evidence Review","Presentation Skills","External Engagement"],
    label:"Medical Affairs — gather evidence, insight, and communication skills!"
  },
  {
    name:"Global Expansion Hub",  theme:"Enter New Markets",
    timeLimit:195,
    skill:["Global Mindset","Change Agility","Cross-Functional Partnership","Data Thinking"],
    label:"Global launch — collect skills that help you work across teams and markets!"
  },
  {
    name:"Executive Boardroom",   theme:"Present the Strategy",
    timeLimit:195,
    skill:["Strategic Thinking","Leadership","Decision Making","Coaching Others"],
    label:"Career milestone — collect leadership skills and present your strategy!"
  }
];



// ─── AUDIO: lightweight synthesized music and sound effects ─────────────────
// No external audio files required. Browser audio starts after the first click.
let audioCtx=null;
let currentMusic=null;
let musicTimer=null;
let musicMode=null;

function initAudio(){
  if(audioCtx) return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return;
  audioCtx=new AC();
}
function stopMusic(){
  if(musicTimer){ clearInterval(musicTimer); musicTimer=null; }
  currentMusic=null;
}
function playTone(freq, dur=0.12, type='square', volume=0.05, delay=0){
  if(!audioCtx) return;
  const t=audioCtx.currentTime+delay;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type=type; osc.frequency.setValueAtTime(freq,t);
  gain.gain.setValueAtTime(0.0001,t);
  gain.gain.linearRampToValueAtTime(volume,t+0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t); osc.stop(t+dur+0.03);
}
function playSfx(kind){
  if(!audioCtx) return;
  if(kind==='coin'){
    playTone(880,0.08,'square',0.035,0); playTone(1320,0.08,'square',0.03,0.07);
  } else if(kind==='jump'){
    playTone(260,0.07,'square',0.03,0); playTone(390,0.10,'square',0.03,0.06);
  } else if(kind==='stomp'){
    playTone(140,0.08,'sawtooth',0.045,0); playTone(90,0.12,'sawtooth',0.035,0.06);
  } else if(kind==='die'){
    playTone(330,0.14,'sawtooth',0.04,0); playTone(220,0.16,'sawtooth',0.035,0.12); playTone(120,0.22,'sawtooth',0.03,0.28);
  } else if(kind==='win'){
    [523,659,784,1046].forEach((f,i)=>playTone(f,0.13,'square',0.04,i*0.11));
  } else if(kind==='skill'){
    [660,880,1100].forEach((f,i)=>playTone(f,0.10,'triangle',0.035,i*0.08));
  }
}
function playMusic(mode, levelNum=1){
  if(!audioCtx) { musicMode=mode; return; }
  if(musicMode===mode && currentMusic) return;
  stopMusic();
  musicMode=mode;

  const master=audioCtx.createGain();
  master.gain.value=0.075;
  master.connect(audioCtx.destination);
  currentMusic={gain:master};

  // More 16-bit inspired: melody + harmony + bass pulse.
  // 80s-style catchy start melody (32 notes, faster tempo feel)
  const startTheme=[
    523,659,784,659,784,880,784,659,
    523,523,659,784,880,1047,880,784,
    659,784,659,523,392,440,523,440,
    392,330,392,440,523,659,523,0,
    523,784,1047,784,523,784,1047,784,
    523,659,880,659,523,659,880,659,
    523,523,784,784,1047,880,784,659,
    523,440,392,330,294,330,392,523
  ];
  const menuTheme =[392,494,587,659,587,494,440,392,330,392,494,523,494,392,349,330];
  const levelThemes=[
    [262,330,392,523,392,330,294,392,330,392,523,659,523,392,330,294],
    [330,392,494,659,587,494,440,523,392,440,523,698,659,523,440,392],
    [196,247,294,392,330,294,247,330,220,277,330,440,392,330,277,247],
    [294,370,440,587,494,440,392,494,330,392,494,659,587,494,392,370],
    [247,330,370,494,415,370,330,415,277,349,415,554,494,415,349,330],
    [220,294,349,466,392,349,294,392,247,330,392,523,466,392,330,294],
    [330,415,494,659,554,494,415,554,370,466,554,740,659,554,466,415],
    [262,349,440,587,523,440,349,523,294,392,494,659,587,494,392,349],
    [294,392,494,659,587,494,392,587,330,440,554,740,659,554,440,392],
    [330,440,523,698,659,523,440,659,392,494,587,784,698,587,494,440]
  ];
  const notes= mode==='start' ? startTheme : mode==='menu' ? menuTheme : levelThemes[(levelNum-1)%levelThemes.length];

  let step=0;
  musicTimer=setInterval(()=>{
    if(!audioCtx || !currentMusic) return;

    const now=audioCtx.currentTime;
    const f=notes[step%notes.length];
    const harmony=notes[(step+2)%notes.length] * 0.5;
    const bassNote=notes[Math.floor(step/2)%notes.length] * 0.25;
    step++;

    // Melody pulse
    const osc=audioCtx.createOscillator();
    const noteGain=audioCtx.createGain();
    osc.type='square';
    osc.frequency.value=f;
    noteGain.gain.setValueAtTime(0.001,now);
    noteGain.gain.linearRampToValueAtTime(0.26,now+0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.001,now+0.19);
    osc.connect(noteGain).connect(master);
    osc.start(now); osc.stop(now+0.21);

    // Harmony/chord blip
    if(step%2===0){
      const h=audioCtx.createOscillator();
      const hg=audioCtx.createGain();
      h.type='triangle';
      h.frequency.value=harmony;
      hg.gain.setValueAtTime(0.001,now);
      hg.gain.linearRampToValueAtTime(0.12,now+0.015);
      hg.gain.exponentialRampToValueAtTime(0.001,now+0.25);
      h.connect(hg).connect(master);
      h.start(now); h.stop(now+0.28);
    }

    // Bass pulse
    const bass=audioCtx.createOscillator();
    const bg=audioCtx.createGain();
    bass.type='sawtooth';
    bass.frequency.value=bassNote;
    bg.gain.setValueAtTime(0.001,now);
    bg.gain.linearRampToValueAtTime(0.13,now+0.01);
    bg.gain.exponentialRampToValueAtTime(0.001,now+0.16);
    bass.connect(bg).connect(master);
    bass.start(now); bass.stop(now+0.18);
  }, mode==='start'?100:mode==='level'?210:260);
}

// ─── LEVEL LAYOUT ────────────────────────────────────────────────────────────
// Hand-designed reachable platform chains.
// Jump height with JUMP_VEL=-510, GRAVITY=1050 ≈ 125px vertical clearance.
// Max safe horizontal gap between platforms to jump across ≈ 260px at run speed.
// All skills sit on explicitly named "skill platform" entries.
// Ground gaps are kept narrow (128px) so the player can always jump across.
//
// Layout entry fields:
//   {x, y, w, type}           — platform
//   {x, y, skill:true, label} — skill platform (also a platform, skill floats above it)
//   {gap: x}                  — ground gap centred at x (width 128px)

// 10 unique hand-designed layouts. Each has 20-26 platforms + 3 ground gaps.
// Platforms form continuous stepping-stone chains reachable from ground.
// Skills are always on reachable platforms that are explicitly connected.

// Physics: JUMP_VEL=-510, GRAVITY=1050 → max jump height ≈ 124px from standing surface.
// Player feet at y≈462 on ground.  Highest reachable y from ground in 1 jump ≈ 338.
// Skill platforms sit at y≥310.  Each is always preceded by a stepping stone within 110px below it.
// Ground gaps are 128px wide — easily jumpable at walk speed.

const LAYOUT_DEFS = [
  // ── Level 1: Corporate HQ Lobby — gentle intro ──────────────────────────
  [
    {gap:950},  {gap:2400}, {gap:3900},
    {x:340,  y:430, w:160, type:"stone"},                               // 1
    {x:570,  y:390, w:140, type:"shelf"},                               // 2
    {x:800,  y:350, w:160, type:"stone"},                               // 3 — clears gap 1
    {x:1040, y:420, w:180, type:"stone"},                               // 4
    {x:1270, y:380, w:150, type:"shelf"},                               // 5
    {x:1490, y:360, w:150, type:"stone"},                               // 6 — boost stone
    {x:1700, y:310, w:160, type:"stone", skill:true, skillIdx:0},       // SKILL 0 (+124 reachable from y=360+38=398 stand → 398-124=274 ✓ 310>274)
    {x:1920, y:400, w:180, type:"stone"},                               // 7
    {x:2150, y:360, w:150, type:"shelf"},                               // 8
    {x:2380, y:310, w:160, type:"stone"},                               // 9 — clears gap 2
    {x:2610, y:400, w:180, type:"stone"},                               // 10
    {x:2840, y:370, w:150, type:"shelf"},                               // 11 — boost
    {x:3060, y:320, w:160, type:"stone", skill:true, skillIdx:1},       // SKILL 1
    {x:3290, y:420, w:200, type:"stone"},                               // 12
    {x:3530, y:380, w:150, type:"shelf"},                               // 13
    {x:3760, y:340, w:160, type:"stone"},                               // 14 — clears gap 3
    {x:4000, y:420, w:180, type:"stone"},                               // 15
    {x:4230, y:380, w:150, type:"shelf"},                               // 16 — boost
    {x:4450, y:320, w:160, type:"stone", skill:true, skillIdx:2},       // SKILL 2
    {x:4680, y:420, w:180, type:"stone"},                               // 17
    {x:4910, y:380, w:160, type:"shelf"},                               // 18
    {x:5130, y:340, w:150, type:"stone"},                               // 19 — boost
    {x:5340, y:310, w:180, type:"stone", skill:true, skillIdx:3},       // SKILL 3
    {x:5600, y:430, w:200, type:"stone"},                               // 20
  ],
  // ── Level 2: R&D Lab — more vertical variety ────────────────────────────
  [
    {gap:860},  {gap:2200}, {gap:3700},
    {x:360,  y:420, w:150, type:"shelf"},
    {x:580,  y:370, w:130, type:"stone"},
    {x:800,  y:320, w:150, type:"shelf"},                               // clears gap 1
    {x:1030, y:400, w:160, type:"stone"},
    {x:1260, y:360, w:140, type:"shelf"},
    {x:1470, y:340, w:150, type:"stone"},                               // boost
    {x:1680, y:295, w:160, type:"stone", skill:true, skillIdx:0},       // SKILL 0
    {x:1910, y:390, w:160, type:"shelf"},
    {x:2130, y:350, w:150, type:"stone"},
    {x:2360, y:310, w:160, type:"shelf"},                               // clears gap 2
    {x:2600, y:410, w:160, type:"stone"},
    {x:2820, y:370, w:150, type:"shelf"},
    {x:3030, y:340, w:160, type:"stone"},                               // boost
    {x:3240, y:295, w:160, type:"stone", skill:true, skillIdx:1},       // SKILL 1
    {x:3470, y:400, w:160, type:"shelf"},
    {x:3700, y:360, w:150, type:"stone"},
    {x:3930, y:320, w:160, type:"shelf"},                               // clears gap 3
    {x:4170, y:410, w:160, type:"stone"},
    {x:4390, y:360, w:150, type:"shelf"},
    {x:4600, y:330, w:160, type:"stone"},                               // boost
    {x:4810, y:295, w:160, type:"stone", skill:true, skillIdx:2},       // SKILL 2
    {x:5040, y:400, w:160, type:"shelf"},
    {x:5260, y:355, w:150, type:"stone"},                               // boost
    {x:5460, y:310, w:170, type:"stone", skill:true, skillIdx:3},       // SKILL 3
    {x:5680, y:430, w:200, type:"stone"},
  ],
  // ── Level 3: Manufacturing Floor — wide platforms, zigzag ───────────────
  [
    {gap:1000}, {gap:2600}, {gap:4100},
    {x:400,  y:430, w:200, type:"stone"},
    {x:650,  y:380, w:170, type:"shelf"},
    {x:890,  y:330, w:190, type:"stone"},                               // clears gap 1
    {x:1130, y:420, w:200, type:"stone"},
    {x:1370, y:375, w:170, type:"shelf"},
    {x:1590, y:345, w:170, type:"stone"},                               // boost
    {x:1800, y:300, w:190, type:"stone", skill:true, skillIdx:0},       // SKILL 0
    {x:2040, y:410, w:200, type:"stone"},
    {x:2280, y:365, w:170, type:"shelf"},
    {x:2520, y:320, w:190, type:"stone"},
    {x:2760, y:380, w:200, type:"stone"},                               // clears gap 2
    {x:3000, y:345, w:170, type:"shelf"},
    {x:3220, y:310, w:190, type:"stone", skill:true, skillIdx:1},       // SKILL 1
    {x:3460, y:420, w:200, type:"stone"},
    {x:3700, y:370, w:170, type:"shelf"},
    {x:3940, y:330, w:190, type:"stone"},
    {x:4180, y:395, w:200, type:"stone"},                               // clears gap 3
    {x:4420, y:355, w:170, type:"shelf"},
    {x:4640, y:315, w:190, type:"stone", skill:true, skillIdx:2},       // SKILL 2
    {x:4880, y:410, w:200, type:"stone"},
    {x:5110, y:365, w:170, type:"shelf"},
    {x:5320, y:330, w:180, type:"stone"},                               // boost
    {x:5520, y:300, w:190, type:"stone", skill:true, skillIdx:3},       // SKILL 3
    {x:5760, y:430, w:200, type:"stone"},
  ],
  // ── Level 4: QC Lab — tighter step-ups, more platforms ──────────────────
  [
    {gap:900},  {gap:2350}, {gap:3850},
    {x:370,  y:430, w:150, type:"shelf"},
    {x:590,  y:390, w:140, type:"stone"},
    {x:810,  y:350, w:160, type:"shelf"},                               // clears gap 1
    {x:1040, y:420, w:150, type:"stone"},
    {x:1260, y:380, w:140, type:"shelf"},
    {x:1470, y:355, w:150, type:"stone"},                               // boost
    {x:1670, y:310, w:160, type:"stone", skill:true, skillIdx:0},       // SKILL 0
    {x:1900, y:420, w:150, type:"shelf"},
    {x:2120, y:385, w:140, type:"stone"},
    {x:2340, y:345, w:160, type:"stone"},                               // clears gap 2
    {x:2580, y:415, w:150, type:"shelf"},
    {x:2800, y:375, w:140, type:"stone"},
    {x:3010, y:345, w:150, type:"shelf"},                               // boost
    {x:3210, y:300, w:160, type:"stone", skill:true, skillIdx:1},       // SKILL 1
    {x:3450, y:420, w:150, type:"stone"},
    {x:3670, y:380, w:140, type:"shelf"},
    {x:3890, y:340, w:160, type:"stone"},                               // clears gap 3
    {x:4130, y:415, w:150, type:"shelf"},
    {x:4350, y:375, w:140, type:"stone"},
    {x:4560, y:345, w:150, type:"stone"},                               // boost
    {x:4760, y:300, w:160, type:"stone", skill:true, skillIdx:2},       // SKILL 2
    {x:4990, y:415, w:150, type:"shelf"},
    {x:5200, y:370, w:160, type:"stone"},                               // boost
    {x:5400, y:320, w:170, type:"stone", skill:true, skillIdx:3},       // SKILL 3
    {x:5640, y:430, w:200, type:"stone"},
  ],
  // ── Level 5: Regulatory — long run, mixed heights ───────────────────────
  [
    {gap:1050}, {gap:2700}, {gap:4250},
    {x:400,  y:430, w:180, type:"stone"},
    {x:640,  y:385, w:160, type:"shelf"},
    {x:880,  y:345, w:170, type:"stone"},                               // clears gap 1
    {x:1120, y:415, w:180, type:"stone"},
    {x:1360, y:375, w:160, type:"shelf"},
    {x:1570, y:350, w:170, type:"stone"},                               // boost
    {x:1780, y:305, w:170, type:"stone", skill:true, skillIdx:0},       // SKILL 0
    {x:2010, y:415, w:180, type:"stone"},
    {x:2250, y:375, w:160, type:"shelf"},
    {x:2490, y:335, w:170, type:"stone"},
    {x:2730, y:400, w:180, type:"stone"},                               // clears gap 2
    {x:2960, y:360, w:160, type:"shelf"},
    {x:3170, y:330, w:170, type:"stone"},                               // boost
    {x:3380, y:295, w:170, type:"stone", skill:true, skillIdx:1},       // SKILL 1
    {x:3620, y:415, w:180, type:"stone"},
    {x:3860, y:370, w:160, type:"shelf"},
    {x:4100, y:330, w:170, type:"stone"},                               // clears gap 3
    {x:4340, y:415, w:180, type:"stone"},
    {x:4580, y:370, w:160, type:"shelf"},
    {x:4790, y:340, w:170, type:"stone"},                               // boost
    {x:5000, y:295, w:170, type:"stone", skill:true, skillIdx:2},       // SKILL 2
    {x:5230, y:410, w:180, type:"stone"},
    {x:5440, y:365, w:160, type:"stone"},                               // boost
    {x:5640, y:315, w:180, type:"stone", skill:true, skillIdx:3},       // SKILL 3
    {x:5880, y:430, w:200, type:"stone"},
  ],
  // ── Levels 6-10: same layouts rotated (different BG each time) ──────────
  null, null, null, null, null
];

// Levels 6-10 reuse layouts 1-5 with minor x-shifts (background is what differs)
for(let i=5;i<10;i++){
  LAYOUT_DEFS[i] = LAYOUT_DEFS[i-5].map(e=>{
    if(e==null) return e;
    if(e.gap!=null) return {gap: e.gap + 100};
    return Object.assign({}, e, {x: e.x + 60});  // shift right slightly, keep y unchanged
  });
}

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── PRELOAD / CREATE ────────────────────────────────────────────────────────
function preload() {
  this.load.image("macLogo","assets/myamnealcareer_logo.png");
  this.load.image("uiStartScreen","assets/ui_start_screen.png");
  this.load.image("uiAvatarScreen","assets/ui_avatar_screen.png");
  this.load.image("uiSkillsScreen","assets/ui_skills_screen.png");
  this.load.image("uiMapScreen","assets/ui_map_screen.png");
  this.load.image("uiStartBgClean","assets/ui_start_bg_clean.png");
  this.load.image("uiTitleLogo","assets/ui_title_logo.png");
  this.load.image("btnStartOrange","assets/btn_start_orange.png");
  this.load.image("btnLeaderboardBlue","assets/btn_leaderboard_blue.png");
  this.load.image("btnHowToBlue","assets/btn_howto_blue.png");
  this.load.image("uiPressStart","assets/ui_press_start.png");

  // World 1-1 background pack
  this.load.image("w1bgSky","assets/world1/bg/bg_sky_clouds.png");
  this.load.image("w1bgCity","assets/world1/bg/bg_city_skyline.png");
  this.load.image("w1bgCampus","assets/world1/bg/bg_campus_left.png");
  this.load.image("w1bgPark","assets/world1/bg/bg_park_right.png");

  // World 1-1 sliced tiles
  this.load.image("w1GrassGroundLeft","assets/world1/tiles/grass_ground_left.png");
  this.load.image("w1GrassGroundMid","assets/world1/tiles/grass_ground_mid.png");
  this.load.image("w1GrassGroundRight","assets/world1/tiles/grass_ground_right.png");
  this.load.image("w1StonePlatformLeft","assets/world1/tiles/stone_platform_left.png");
  this.load.image("w1StonePlatformMid","assets/world1/tiles/stone_platform_mid.png");
  this.load.image("w1StonePlatformRight","assets/world1/tiles/stone_platform_right.png");
  this.load.image("w1OneWayPlatformLeft","assets/world1/tiles/one_way_platform_left.png");
  this.load.image("w1OneWayPlatformMid","assets/world1/tiles/one_way_platform_mid.png");
  this.load.image("w1OneWayPlatformRight","assets/world1/tiles/one_way_platform_right.png");

  // World 1-1 sliced props
  this.load.image("w1BuildingLarge","assets/world1/props/amneal_building_large.png");
  this.load.image("w1BuildingSmall","assets/world1/props/amneal_building_small.png");
  this.load.image("w1Elevator","assets/world1/props/elevator.png");
  this.load.image("w1ElevatorArrow","assets/world1/props/elevator_arrow.png");
  this.load.image("w1BlueBanner","assets/world1/props/blue_banner.png");
  this.load.image("w1SignDirectional","assets/world1/props/sign_directional.png");
  this.load.image("w1LampPost","assets/world1/props/lamp_post.png");
  this.load.image("w1Bench","assets/world1/props/bench.png");
  this.load.image("w1TreeLarge","assets/world1/props/tree_large.png");
  this.load.image("w1TreeSmall","assets/world1/props/tree_small.png");
  this.load.image("w1Bush","assets/world1/props/bush.png");
  this.load.image("w1HedgePlanter","assets/world1/props/hedge_planter.png");
  this.load.image("w1FlowerBed","assets/world1/props/flower_bed.png");
  this.load.image("w1AmnealSignLarge","assets/world1/props/amneal_sign_large.png");

  // World 1-1 sliced collectibles and enemies
  this.load.spritesheet("w1CoinSheet","assets/world1/collectibles/coin_sheet.png", { frameWidth:95, frameHeight:105 });
  this.load.image("w1SkillGrowth","assets/world1/collectibles/skill_growth.png");
  this.load.image("w1SkillPeople","assets/world1/collectibles/skill_people.png");
  this.load.image("w1SkillIdea","assets/world1/collectibles/skill_idea.png");
  this.load.image("w1ShieldPowerup","assets/world1/collectibles/shield_powerup.png");
  this.load.image("w1StarPowerup","assets/world1/collectibles/star_powerup.png");
  this.load.spritesheet("w1SmallBotWalk","assets/world1/enemies/small_bot_walk_sheet.png", { frameWidth:103, frameHeight:136 });
  this.load.spritesheet("w1LargeBotWalk","assets/world1/enemies/large_bot_walk_sheet.png", { frameWidth:230, frameHeight:192 });

  avatars.forEach(a=>{
    this.load.spritesheet(a.sheetKey,
      "assets/"+a.sheetKey+".png",
      { frameWidth: SHEET_FRAME_W, frameHeight: SHEET_FRAME_H }
    );

    // Selector portrait used only on the character selection screen.
    this.load.image(a.key + "_selector", "assets/" + a.key + "_selector.png");
  });
}

function create() {
  sceneRef=this;
  cursors =this.input.keyboard.createCursorKeys();
  shiftKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  spaceKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  pauseKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  escKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  enterKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  // Build animations for every persona sheet
  avatars.forEach(a=>{
    const k=a.sheetKey;
    this.anims.create({key:k+"_walk",  frames:[{key:k,frame:FRAME_WALK_1},{key:k,frame:FRAME_WALK_2}], frameRate:8, repeat:-1});
    this.anims.create({key:k+"_idle",  frames:[{key:k,frame:FRAME_IDLE}],   frameRate:4, repeat:-1});
    this.anims.create({key:k+"_jump",  frames:[{key:k,frame:FRAME_JUMP}],   frameRate:1, repeat:0});
    this.anims.create({key:k+"_crouch",frames:[{key:k,frame:FRAME_CROUCH}], frameRate:1, repeat:0});
  });
  makeTinyTextures(this);

  if(!this.anims.exists("w1CoinSpin")){
    this.anims.create({
      key:"w1CoinSpin",
      frames:this.anims.generateFrameNumbers("w1CoinSheet",{start:0,end:3}),
      frameRate:8,
      repeat:-1
    });
  }

  if(!this.anims.exists("w1SmallBotWalkAnim")){
    this.anims.create({
      key:"w1SmallBotWalkAnim",
      frames:this.anims.generateFrameNumbers("w1SmallBotWalk",{start:0,end:3}),
      frameRate:7,
      repeat:-1
    });
  }

  if(!this.anims.exists("w1LargeBotWalkAnim")){
    this.anims.create({
      key:"w1LargeBotWalkAnim",
      frames:this.anims.generateFrameNumbers("w1LargeBotWalk",{start:0,end:3}),
      frameRate:6,
      repeat:-1
    });
  }

  showStart(this);
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
function update() {
  if(state==="initials"){
    handleInitialEntry(this);
    return;
  }

  if(state==="paused"){
    handlePauseInput(this);
    return;
  }

  if (state!=="level"||!player||levelEnded) return;

  const pausePressed=(pauseKey&&pauseKey.isDown)||(escKey&&escKey.isDown);
  if(pausePressed && !lastPauseDown){
    showPauseScreen(this);
    lastPauseDown=true;
    return;
  }
  lastPauseDown=pausePressed;

  const spd=shiftKey.isDown ? RUN_SPEED : WALK_SPEED;
  if (cursors.left.isDown)      {player.setVelocityX(-spd); player.flipX=true;}
  else if(cursors.right.isDown) {player.setVelocityX(spd);  player.flipX=false;}
  else                          {player.setVelocityX(0);}

  const ducking=cursors.down.isDown&&player.body.touching.down;
  if(ducking){
    player.setDisplaySize(PLAYER_W, PLAYER_CROUCH_H);
    player.body.setSize(PLAYER_CROUCH_BODY_W, PLAYER_CROUCH_BODY_H, false);
    player.body.setOffset(PLAYER_CROUCH_OFFSET_X, PLAYER_CROUCH_OFFSET_Y);
  } else {
    player.setDisplaySize(PLAYER_W, PLAYER_H);
    player.body.setSize(PLAYER_BODY_W, PLAYER_BODY_H, false);
    player.body.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);
  }

  const jumpKey=spaceKey.isDown;
  const upPressed=cursors.up.isDown && !lastUpDown;
  const wasOnGround=player.body.touching.down;
  if(jumpKey&&!lastJumpDown&&wasOnGround) { player.setVelocityY(JUMP_VEL); playSfx("jump"); }
  lastJumpDown=jumpKey;
  if(player.body.velocity.y>MAX_FALL) player.setVelocityY(MAX_FALL);

  if(invincible){
    const colors=[0xffffff,0xffd700,0x00ff88,0x66ccff,0xff66cc,0xff8844];
    player.setTint(colors[Math.floor(sceneRef.time.now/90)%colors.length]);
  }

  // ── Drive sprite animations ────────────────────────────────────────────
  const k=avatars[selectedAvatar].sheetKey;
  const onGround=player.body.touching.down||player.body.blocked.down;
  if(!onGround){
    if(player.anims.currentAnim?.key!==k+"_jump") player.play(k+"_jump",true);
  } else if(ducking){
    if(player.anims.currentAnim?.key!==k+"_crouch") player.play(k+"_crouch",true);
  } else if(cursors.left.isDown||cursors.right.isDown){
    if(player.anims.currentAnim?.key!==k+"_walk") player.play(k+"_walk",true);
  } else {
    if(player.anims.currentAnim?.key!==k+"_idle") player.play(k+"_idle",true);
  }

  if(!invincible && player.tintTopLeft !== 0xffffff) player.clearTint();

  // Elevator proximity check
  const distToElev=Math.abs(player.x-elevatorX);
  if(distToElev<80&&player.body.touching.down){
    if(!nearElevator){
      nearElevator=true;
      if(!elevatorPrompt){
        elevatorPrompt=sceneRef.add.text(elevatorX,380,
          skillsCollected>=4?"↑ Press UP to ride":"Collect all 4 items first",
          {fontSize:"16px",fill:skillsCollected>=4?"#00ff88":"#ff8888",
           stroke:"#000",strokeThickness:3,fontStyle:"bold"}).setOrigin(0.5).setScrollFactor(1);
      } else {
        elevatorPrompt.setText(skillsCollected>=4?"↑ Press UP to ride":"Collect all 4 items first");
        elevatorPrompt.setColor(skillsCollected>=4?"#00ff88":"#ff8888");
        elevatorPrompt.setVisible(true);
      }
    }
    if(upPressed&&skillsCollected>=4) triggerElevator();
  } else {
    nearElevator=false;
    if(elevatorPrompt) elevatorPrompt.setVisible(false);
  }

  // Gig / Mentor door proximity check. Up Arrow interacts here too.
  if(gigDoor && !gigCompletedThisLevel){
    const distToGig=Math.abs(player.x-gigDoor.x);
    if(distToGig<70 && player.body.touching.down){
      if(!nearGigDoor){
        nearGigDoor=true;
        if(!gigPrompt){
          gigPrompt=sceneRef.add.text(gigDoor.x,365,"↑ Press UP for "+gigDoor.kind+" bonus",{
            fontSize:"15px",fill:"#ffd700",stroke:"#000",strokeThickness:3,fontStyle:"bold"
          }).setOrigin(0.5).setScrollFactor(1);
        } else {
          gigPrompt.setText("↑ Press UP for "+gigDoor.kind+" bonus");
          gigPrompt.setVisible(true);
        }
      }
      if(upPressed) completeGigBonus(sceneRef);
    } else {
      nearGigDoor=false;
      if(gigPrompt) gigPrompt.setVisible(false);
    }
  }

  lastUpDown=cursors.up.isDown;
  lastPauseDown=(pauseKey&&pauseKey.isDown)||(escKey&&escKey.isDown);

  // Let the player fall completely off-screen before resetting the level.
  if(player.y>H+140) failLevel(this,true);

  // Enemies that fall into pits disappear below the screen, then respawn.
  if(enemies){
    enemies.children.iterate((enemy)=>{
      if(!enemy || !enemy.active || enemy.respawning) return;

      // Reverse enemy direction if it gets stuck against a wall/platform edge.
      if(enemy.body.blocked.left || enemy.body.touching.left){
        enemy.setVelocityX(Math.abs(enemy.patrolSpeed || 80));
      } else if(enemy.body.blocked.right || enemy.body.touching.right){
        enemy.setVelocityX(-Math.abs(enemy.patrolSpeed || 80));
      }

      if(enemy.y>H+140){
        scheduleEnemyRespawn(enemy);
      }
    });
  }
}

// ─── TEXTURES ────────────────────────────────────────────────────────────────
function makeTinyTextures(scene) {
  const g=scene.add.graphics();

  // Gold coin (circle with inner ring + star)
  g.fillStyle(0xd4a000,1); g.fillCircle(11,11,11);
  g.fillStyle(0xffd700,1); g.fillCircle(11,11,9);
  g.fillStyle(0xffee66,1); g.fillCircle(9,8,4);
  g.lineStyle(2,0xb8860b,1); g.strokeCircle(11,11,10);
  g.lineStyle(1,0xfff0a0,0.6); g.strokeCircle(11,11,6);
  g.generateTexture("coinTex",22,22); g.clear();

  // Clipboard (skill)
  g.fillStyle(0x1a6aaa,1); g.fillRoundedRect(2,2,28,32,4);
  g.fillStyle(0x2288dd,1); g.fillRoundedRect(4,4,24,28,3);
  g.fillStyle(0xffffff,1); g.fillRect(9,2,14,6); g.fillRoundedRect(11,0,10,6,3);
  g.fillStyle(0xffffff,1); g.fillRect(7,13,18,2); g.fillRect(7,18,18,2); g.fillRect(7,23,12,2);
  g.generateTexture("skillTex",32,36); g.clear();

  // Warning bot enemy
  g.fillStyle(0xcc2200,1); g.fillRoundedRect(2,4,34,28,5);
  g.fillStyle(0xff4422,1); g.fillRoundedRect(4,6,30,24,4);
  g.fillStyle(0x220000,1); g.fillRect(7,8,24,16);
  g.fillStyle(0xffcc00,1); g.fillTriangle(19,9,10,22,28,22);
  g.fillStyle(0x220000,1); g.fillRect(17,14,4,5); g.fillRect(17,20,4,3);
  g.fillStyle(0xaa1100,1); g.fillRect(8,32,6,6); g.fillRect(24,32,6,6);
  g.generateTexture("enemyTex",38,40); g.clear();

  // Warning bot enemy variation 2: blue data bug
  g.fillStyle(0x1d5fd1,1); g.fillRoundedRect(2,5,34,26,6);
  g.fillStyle(0x58a6ff,1); g.fillRoundedRect(5,8,28,20,5);
  g.fillStyle(0x061830,1); g.fillRect(8,12,7,7); g.fillRect(23,12,7,7);
  g.fillStyle(0xffffff,1); g.fillRect(10,14,3,3); g.fillRect(25,14,3,3);
  g.fillStyle(0x0a2a66,1); g.fillRect(10,32,6,6); g.fillRect(23,32,6,6);
  g.generateTexture("enemyTex2",38,40); g.clear();

  // Warning bot enemy variation 3: orange process blocker
  g.fillStyle(0xf39c12,1); g.fillRoundedRect(2,5,34,26,6);
  g.fillStyle(0xffc04d,1); g.fillRoundedRect(5,8,28,20,5);
  g.fillStyle(0x301500,1); g.fillRect(9,14,6,5); g.fillRect(23,14,6,5);
  g.fillStyle(0x301500,1); g.fillRect(14,24,11,2);
  g.fillStyle(0x8a4b00,1); g.fillRect(8,32,6,6); g.fillRect(24,32,6,6);
  g.generateTexture("enemyTex3",38,40); g.clear();

  // MAC star-style power-up: career boost
  g.fillStyle(0xffd700,1);
  g.fillTriangle(18,0,23,12,36,12);
  g.fillTriangle(36,12,25,21,29,35);
  g.fillTriangle(29,35,18,27,7,35);
  g.fillTriangle(7,35,11,21,0,12);
  g.fillTriangle(0,12,13,12,18,0);
  g.fillStyle(0xffffff,0.75); g.fillCircle(14,13,4);
  g.generateTexture("powerStarTex",36,36); g.clear();

  // Puff
  g.fillStyle(0xffdd00,0.9); g.fillCircle(16,16,14);
  g.fillStyle(0xff8800,0.7); g.fillCircle(16,16,9);
  g.fillStyle(0xffffff,0.7); g.fillCircle(11,11,5);
  g.generateTexture("puffTex",32,32); g.clear();

  // Floor tile (16-bit industrial)
  g.fillStyle(0x66707a,1); g.fillRect(0,0,32,32);
  g.fillStyle(0x7d8792,1); g.fillRect(0,0,32,8);
  g.fillStyle(0x515b65,1); g.fillRect(0,24,32,8);
  g.fillStyle(0x9aa6b2,0.35); g.fillRect(2,2,12,3);
  g.lineStyle(1,0x3d4650,1);
  g.strokeRect(0,0,32,32);
  g.lineStyle(1,0x87939f,0.75);
  g.strokeLineShape(new Phaser.Geom.Line(0,1,32,1));
  g.lineStyle(1,0x48525c,0.7);
  g.strokeLineShape(new Phaser.Geom.Line(0,16,32,16));
  g.generateTexture("groundTile",32,32); g.clear();

  // Stone ledge tile with highlight/shadow
  g.fillStyle(0xb49b82,1); g.fillRect(0,0,32,16);
  g.fillStyle(0x92755f,1); g.fillRect(0,5,32,11);
  g.fillStyle(0xd4c0a8,0.65); g.fillRect(1,1,30,3);
  g.fillStyle(0x6a4f3d,0.55); g.fillRect(0,13,32,3);
  g.lineStyle(1,0x4a372b,1); g.strokeRect(0,0,32,16);
  g.generateTexture("stoneTile",32,16); g.clear();

  // Metal shelf tile (blue-grey 16-bit)
  g.fillStyle(0x5f83bd,1); g.fillRect(0,0,32,16);
  g.fillStyle(0x3d5f99,1); g.fillRect(0,4,32,12);
  g.fillStyle(0xa6c0ef,0.55); g.fillRect(2,1,22,3);
  g.fillStyle(0x253d66,0.65); g.fillRect(0,13,32,3);
  g.lineStyle(1,0x1d3154,1); g.strokeRect(0,0,32,16);
  g.generateTexture("shelfTile",32,16); g.clear();

  // Low concrete block
  g.fillStyle(0x9b9b9b,1); g.fillRect(0,0,32,16);
  g.fillStyle(0x7d7d7d,1); g.fillRect(0,4,32,12);
  g.fillStyle(0xc9c9c9,0.55); g.fillRect(1,1,28,3);
  g.fillStyle(0x4f4f4f,0.5); g.fillRect(0,13,32,3);
  g.lineStyle(1,0x444444,1); g.strokeRect(0,0,32,16);
  g.generateTexture("concreteTile",32,16); g.clear();

  // Elevator doors
  g.fillStyle(0x333344,1); g.fillRect(0,0,80,110);
  g.fillStyle(0x55556a,1); g.fillRect(2,2,76,106);
  g.fillStyle(0x8888aa,1); g.fillRect(4,10,34,94);   // left door
  g.fillStyle(0xaaaacc,0.4); g.fillRect(6,12,12,26);
  g.fillStyle(0x8888aa,1); g.fillRect(42,10,34,94);  // right door
  g.fillStyle(0xaaaacc,0.4); g.fillRect(44,12,12,26);
  g.fillStyle(0x111122,1); g.fillRect(38,10,4,94);   // gap
  g.fillStyle(0x222233,1); g.fillRect(0,0,80,10);    // header
  g.fillStyle(0x00ff88,1); g.fillTriangle(40,1,33,9,47,9); // up arrow
  // Call button panel on right side
  g.fillStyle(0x444455,1); g.fillRect(72,40,8,30);
  g.fillStyle(0xffdd00,1); g.fillCircle(76,50,4);
  g.fillStyle(0x666677,1); g.fillCircle(76,62,4);
  g.generateTexture("elevatorTex",80,110); g.clear();

  // Firework burst
  g.fillStyle(0xffffff,1); g.fillCircle(16,16,4);
  g.generateTexture("fwDot",32,32); g.clear();

  // Trophy
  g.fillStyle(0xffd700,1); g.fillCircle(24,20,18);
  g.fillStyle(0xffee88,1); g.fillCircle(22,17,8);
  g.fillStyle(0xffd700,1); g.fillRect(16,36,16,8);
  g.fillStyle(0xcc9900,1); g.fillRect(10,44,28,6);
  g.lineStyle(2,0xaa8800,1); g.strokeCircle(24,20,18);
  g.generateTexture("trophyTex",48,52); g.clear();

  g.destroy();
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────
function panel(s,x,y,w,h,col=0x0d253a){return s.add.rectangle(x,y,w,h,col,0.93).setStrokeStyle(4,0x2f80bd);}
function button(s,x,y,lbl,cb,w=300,col=0x1b7f3a){
  const box=s.add.rectangle(x,y,w,50,col,1).setStrokeStyle(3,0xffffff).setInteractive({useHandCursor:true});
  s.add.rectangle(x,y-10,w-6,8,0xffffff,0.18);
  const txt=s.add.text(x,y,lbl,{fontSize:"19px",fill:"#fff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setOrigin(0.5);
  const wrapped=()=>{
    initAudio();
    if(audioCtx && audioCtx.state==='suspended') audioCtx.resume().then(()=>{ if(musicMode && !currentMusic) playMusic(musicMode); });
    else if(musicMode && !currentMusic) playMusic(musicMode);
    cb();
  };
  box.on("pointerover",()=>box.setFillStyle(Phaser.Display.Color.ValueToColor(col).lighten(20).color));
  box.on("pointerout",()=>box.setFillStyle(col));
  box.on("pointerdown",wrapped); txt.setInteractive({useHandCursor:true}).on("pointerdown",wrapped);
  return {box,txt};
}
function titleText(s,x,y,txt,sz=38){
  return s.add.text(x,y,txt,{fontSize:`${sz}px`,fill:"#fff",fontStyle:"bold",stroke:"#000",strokeThickness:6}).setOrigin(0.5);
}
function imageMenuButton(s,x,y,key,cb,scale=1){
  const img=s.add.image(x,y,key).setScale(scale).setInteractive({useHandCursor:true});
  const wrapped=()=>{
    initAudio();
    if(audioCtx && audioCtx.state==='suspended') audioCtx.resume().then(()=>{ if(musicMode && !currentMusic) playMusic(musicMode); });
    else if(musicMode && !currentMusic) playMusic(musicMode);
    cb();
  };
  img.on("pointerdown",wrapped);
  img.on("pointerover",()=>img.setScale(scale*1.03));
  img.on("pointerout",()=>img.setScale(scale));
  return img;
}
function popText(s,x,y,txt,col=0xffffff){
  const hex="#"+col.toString(16).padStart(6,"0");
  const t=s.add.text(x,y,txt,{fontSize:"18px",fill:hex,stroke:"#000",strokeThickness:4,fontStyle:"bold"}).setOrigin(0.5);
  s.tweens.add({targets:t,y:y-50,alpha:0,duration:900,ease:"Quad.easeOut",onComplete:()=>t.destroy()});
}

// ─── CLEAR ───────────────────────────────────────────────────────────────────
function clearAll(scene) {
  fireworkTimers.forEach(t=>t&&t.remove&&t.remove(false));
  fireworkTimers=[]; fireworksActive=false;
  if(timerEvent){timerEvent.remove(false);timerEvent=null;}
  scene.children.removeAll();
  scene.physics.world.colliders.destroy();
  scene.cameras.main.stopFollow();
  scene.cameras.main.setScroll(0,0);
  scene.physics.world.setBounds(0,0,W,H);
  scene.physics.world.gravity.y=GRAVITY;
  ui={}; player=null; levelEnded=false; lastJumpDown=false; lastUpDown=false; lastPauseDown=false; invincible=false;
  nearElevator=false; elevatorPrompt=null; elevatorX=0;
}

// ─── START SCREEN ────────────────────────────────────────────────────────────
function showStart(scene) {
  clearAll(scene);
  state = "start";

  initAudio();
  if (audioCtx && audioCtx.state !== "suspended") playMusic("start");
  else musicMode = "start";

  // Clean campus background only. No baked-in HUD, no character, no duplicate menu.
  scene.add.image(W / 2, H / 2, "uiStartBgClean").setDisplaySize(W, H);
  scene.add.rectangle(0, 0, W, H, 0x000000, 0.05).setOrigin(0, 0);

  // Subtle dark overlay on the right side so the menu reads clearly.
  scene.add.rectangle(710, 270, 410, 455, 0x061830, 0.84).setStrokeStyle(4, 0xffd55a);
  scene.add.rectangle(710, 270, 382, 427, 0x0d2238, 0.42).setStrokeStyle(2, 0xffffff, 0.30);

  // Title treatment built in code so there is no white image box.
  scene.add.text(710, 82, "my", {
    fontSize: "48px",
    fill: "#ffffff",
    fontStyle: "bold",
    stroke: "#061830",
    strokeThickness: 7
  }).setOrigin(0.5);

  scene.add.text(710, 124, "AMNEAL", {
    fontSize: "48px",
    fill: "#0a1b31",
    fontStyle: "bold",
    stroke: "#ffffff",
    strokeThickness: 6
  }).setOrigin(0.5);

  scene.add.text(710, 158, "career", {
    fontSize: "34px",
    fill: "#111111",
    fontStyle: "bold",
    stroke: "#ffffff",
    strokeThickness: 5
  }).setOrigin(0.5);

  scene.add.text(710, 220, "QUEST", {
    fontSize: "68px",
    fill: "#ffb000",
    fontStyle: "bold",
    stroke: "#071421",
    strokeThickness: 9
  }).setOrigin(0.5);

  // Small shooting-star accent.
  const starG = scene.add.graphics();
  starG.lineStyle(8, 0xffb000, 1);
  starG.strokeLineShape(new Phaser.Geom.Line(805, 145, 885, 105));
  starG.fillStyle(0xffd55a, 1);
  starG.fillCircle(895, 100, 13);

  scene.add.text(
    710,
    272,
    "Build your profile. Add skills. Complete gigs.\nAdvance through your career journey.",
    {
      fontSize: "16px",
      fill: "#ffffff",
      align: "center",
      stroke: "#000000",
      strokeThickness: 4,
      lineSpacing: 4
    }
  ).setOrigin(0.5);

  function startScreenButton(x, y, label, callback, color, selected = false) {
    const w = 292;
    const h = 58;
    const stroke = selected ? 0xffd55a : 0xffffff;
    const shadow = scene.add.rectangle(x + 5, y + 6, w, h, 0x000000, 0.42);
    const base = scene.add.rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(4, stroke)
      .setInteractive({ useHandCursor: true });

    // Beveled 16-bit style.
    scene.add.rectangle(x, y - 18, w - 16, 10, 0xffffff, 0.22);
    scene.add.rectangle(x, y + 19, w - 16, 9, 0x000000, 0.25);
    scene.add.rectangle(x - w / 2 + 10, y, 10, h - 12, 0xffffff, 0.08);
    scene.add.rectangle(x + w / 2 - 10, y, 10, h - 12, 0x000000, 0.18);

    const txt = scene.add.text(x, y, label, {
      fontSize: "24px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5);

    if (selected) {
      scene.add.triangle(x - w / 2 - 28, y, 0, -14, 0, 14, 24, 0, 0xffd55a)
        .setStrokeStyle(2, 0x000000);
    }

    const wrapped = () => {
      initAudio();
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
          if (musicMode && !currentMusic) playMusic(musicMode);
        });
      } else if (musicMode && !currentMusic) {
        playMusic(musicMode);
      }
      callback();
    };

    base.on("pointerdown", wrapped);
    txt.setInteractive({ useHandCursor: true }).on("pointerdown", wrapped);
    base.on("pointerover", () => {
      base.setScale(1.025);
      txt.setScale(1.025);
      shadow.setScale(1.025);
    });
    base.on("pointerout", () => {
      base.setScale(1);
      txt.setScale(1);
      shadow.setScale(1);
    });

    return { base, txt };
  }

  startScreenButton(710, 345, "START JOURNEY", () => showAvatarSelect(scene), 0x1f8f42, true);
  startScreenButton(710, 420, "LEADERBOARD", () => showLeaderboard(scene), 0x165a9e);
  startScreenButton(710, 495, "HOW TO PLAY", () => showHowTo(scene), 0x1f78b4);

  scene.add.text(360, 510, "PRESS START", {
    fontSize: "22px",
    fill: "#ffffff",
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 5
  }).setOrigin(0.5);

  scene.add.text(710, 526, "Start Journey opens character selection", {
    fontSize: "13px",
    fill: "#dce9f5",
    stroke: "#000",
    strokeThickness: 3
  }).setOrigin(0.5);
}

function showHowTo(scene) {
  playMusic("menu");
  clearAll(scene); state="how";
  scene.cameras.main.setBackgroundColor("#071421");
  panel(scene,480,270,860,460);
  scene.add.rectangle(480,50,860,60,0x000080,0.95).setStrokeStyle(3,0xffd700);
  titleText(scene,480,50,"HOW TO PLAY",34);
  const rows=[
    ["Move","← → Arrow Keys"],
    ["Run","Hold SHIFT"],
    ["Jump","SPACE"],
    ["Pause","P or ESC"],
    ["Use Elevator / Bonus Door","↑ Arrow"],
    ["Duck","↓ Arrow"],
    ["",""],
    ["Coins","+10 pts"],
    ["Skills","Collect all 4 to unlock the elevator"],
    ["Career Boost Star","Temporary color flicker and safe enemy hits"],
    ["Stomp Bots","Jump on top for +100 pts"],
    ["Leaderboard","Enter 3 initials with arrow keys"]
  ];
  let y=108;
  for(const [l,d] of rows){
    if(l){scene.add.text(130,y,l+":",{fontSize:"17px",fill:"#ffd700",fontStyle:"bold"});
          scene.add.text(295,y,d,{fontSize:"17px",fill:"#fff"});}
    y+=d?26:10;
  }
  button(scene,480,495,"◀ BACK",()=>showStart(scene),280,0x1f78b4);
}

// ─── AVATAR SELECT ───────────────────────────────────────────────────────────
function showAvatarSelect(scene) {
  playMusic("menu");
  clearAll(scene);
  state = "avatar";
  scene.cameras.main.setBackgroundColor("#071421");

  // Clean selection background using the same visual language as the title screen.
  scene.add.image(W / 2, H / 2, "uiStartBgClean").setDisplaySize(W, H);
  scene.add.rectangle(0, 0, W, H, 0x000000, 0.32).setOrigin(0, 0);

  // Header panel.
  scene.add.rectangle(480, 52, 860, 68, 0x061830, 0.92).setStrokeStyle(4, 0xffd55a);
  scene.add.text(480, 42, "CHOOSE YOUR PERSONA", {
    fontSize: "32px",
    fill: "#ffcf4d",
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 6
  }).setOrigin(0.5);

  scene.add.text(480, 79, "Pick the role path that will begin your MyAmnealCareer Quest.", {
    fontSize: "15px",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 3
  }).setOrigin(0.5);

  const roleLabels = [
    "People\nLeadership",
    "Professional",
    "Scientific /\nResearch",
    "Business\nEnablement",
    "Operations /\nWarehouse"
  ];

  const roleDescriptions = [
    "Lead teams and help people grow.",
    "Build expertise in a specialized field.",
    "Explore science, data, and discovery.",
    "Support the business and enable results.",
    "Keep production, quality, and supply moving."
  ];

  const cardColors = [0xec2f7b, 0x2f80bd, 0x23a86d, 0xf25f22, 0x8b55a3];

  avatars.forEach((a, i) => {
    const x = 100 + i * 190;
    const cardY = 285;
    const cardW = 168;
    const cardH = 350;
    const color = cardColors[i] || a.color;

    // Card shadow and body.
    scene.add.rectangle(x + 5, cardY + 6, cardW, cardH, 0x000000, 0.42);
    scene.add.rectangle(x, cardY, cardW, cardH, 0x071421, 0.93).setStrokeStyle(4, color);
    scene.add.rectangle(x, cardY - cardH / 2 + 12, cardW - 14, 8, 0xffffff, 0.12);
    scene.add.rectangle(x, cardY + cardH / 2 - 10, cardW - 14, 8, 0x000000, 0.26);

    // Name badge.
    scene.add.rectangle(x, 125, cardW - 20, 40, color, 0.95).setStrokeStyle(2, 0xffffff);
    scene.add.text(x, 125, a.name.toUpperCase(), {
      fontSize: "17px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    // Larger persona art.
    scene.add.image(x, 252, a.key + "_selector").setDisplaySize(138, 198);
    scene.add.ellipse(x, 346, 100, 20, 0x000000, 0.32);

    // Role label.
    scene.add.rectangle(x, 380, cardW - 26, 54, 0x0d2238, 0.90).setStrokeStyle(2, color);
    scene.add.text(x, 380, roleLabels[i], {
      fontSize: "14px",
      fill: "#ffcf4d",
      align: "center",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
      lineSpacing: -2
    }).setOrigin(0.5);

    // Short description.
    scene.add.text(x, 435, roleDescriptions[i], {
      fontSize: "12px",
      fill: "#dce8f3",
      align: "center",
      wordWrap: { width: cardW - 28 },
      lineSpacing: 1
    }).setOrigin(0.5);

    // Graphic-style select button built in Phaser.
    const btnY = 490;
    const btn = scene.add.rectangle(x, btnY, cardW - 34, 42, color, 1)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    scene.add.rectangle(x, btnY - 11, cardW - 48, 6, 0xffffff, 0.22);
    scene.add.rectangle(x, btnY + 12, cardW - 48, 6, 0x000000, 0.22);

    const btnText = scene.add.text(x, btnY, "SELECT", {
      fontSize: "16px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    const choose = () => {
      selectedAvatar = i;
      showSkillSelect(scene);
    };

    btn.on("pointerdown", choose);
    btnText.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
    btn.on("pointerover", () => {
      btn.setScale(1.04);
      btnText.setScale(1.04);
    });
    btn.on("pointerout", () => {
      btn.setScale(1);
      btnText.setScale(1);
    });
  });

  // Footer navigation.
  scene.add.rectangle(480, 528, 860, 34, 0x061830, 0.82).setStrokeStyle(2, 0xffffff, 0.35);
  scene.add.text(480, 528, "Choose a persona to continue to the skills screen.", {
    fontSize: "14px",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 3
  }).setOrigin(0.5);

  const back = scene.add.rectangle(78, 52, 110, 38, 0x8e2c2c, 1)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true });

  scene.add.text(78, 52, "BACK", {
    fontSize: "15px",
    fill: "#ffffff",
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 4
  }).setOrigin(0.5);

  back.on("pointerdown", () => showStart(scene));
}

function showSkillSelect(scene) {
  playMusic("menu");
  clearAll(scene); state="skills"; selectedSkills=[];
  scene.cameras.main.setBackgroundColor("#071421");

  scene.add.image(W/2,H/2,"uiSkillsScreen").setDisplaySize(W,H);
  scene.add.rectangle(0,0,W,H,0x000000,0.22).setOrigin(0,0);

  const avatar=avatars[selectedAvatar || 0];

  scene.add.rectangle(230,270,270,420,0x061830,0.90).setStrokeStyle(4,avatar.color);
  scene.add.text(230,82,"YOUR PERSONA",{
    fontSize:"18px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:4
  }).setOrigin(0.5);
  scene.add.image(230,225,avatar.key + "_selector").setDisplaySize(170,244);
  scene.add.rectangle(230,362,170,32,avatar.color,0.92).setStrokeStyle(2,0xffffff);
  scene.add.text(230,362,avatar.name.toUpperCase(),{
    fontSize:"16px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3
  }).setOrigin(0.5);
  scene.add.text(230,414,
    "Pick 3 starting skills. These represent the strengths your character brings into the journey.",
    {fontSize:"14px",fill:"#dce8f3",align:"center",wordWrap:{width:210}}
  ).setOrigin(0.5);

  scene.add.rectangle(655,270,540,420,0x061830,0.90).setStrokeStyle(4,0xffd55a);
  titleText(scene,655,58,"EXCEL AT YOUR ROLE",30);
  scene.add.text(655,96,"Add 3 starting skills to begin your career path.",{
    fontSize:"17px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3
  }).setOrigin(0.5);
  scene.add.text(655,128,
    "You will collect additional skills in each level, complete gigs, connect with mentors, and progress through your next opportunity.",
    {fontSize:"14px",fill:"#dce8f3",align:"center",wordWrap:{width:460}}
  ).setOrigin(0.5);

  const sText=scene.add.text(655,434,"SELECTED: 0 / 3",{
    fontSize:"22px",fill:"#fff",fontStyle:"bold",stroke:"#000",strokeThickness:4
  }).setOrigin(0.5);

  const cBtn=button(scene,655,482,"CONTINUE",()=>{ if(selectedSkills.length===3)showMap(scene); },250,0x555555);
  const updateContinue=()=>{
    sText.setText(`SELECTED: ${selectedSkills.length} / 3`);
    cBtn.box.setFillStyle(selectedSkills.length===3 ? 0x1b7f3a : 0x555555);
  };

  skillChoices.forEach((s,i)=>{
    const col=i%2, row=Math.floor(i/2);
    const x=520 + col*270, y=210 + row*82;
    const card=scene.add.rectangle(x,y,230,60,0x0f2740,0.94).setStrokeStyle(3,0x2f80bd).setInteractive({useHandCursor:true});
    const emoji=scene.add.text(x-84,y,s[1],{fontSize:"24px",fill:"#ffd55a",stroke:"#000",strokeThickness:3}).setOrigin(0.5);
    const lbl=scene.add.text(x-40,y,s[0],{fontSize:"16px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setOrigin(0,0.5);
    const dot=scene.add.circle(x+92,y,11,0x29435a).setStrokeStyle(2,0xffffff);

    const toggle=()=>{
      const idx=selectedSkills.indexOf(s[0]);
      if(idx>-1){
        selectedSkills.splice(idx,1);
      } else if(selectedSkills.length<3){
        selectedSkills.push(s[0]);
      }
      const chosen=selectedSkills.includes(s[0]);
      card.setStrokeStyle(3,chosen ? 0xffd55a : 0x2f80bd);
      dot.setFillStyle(chosen ? 0x1b7f3a : 0x29435a);
      updateContinue();
    };
    card.on("pointerdown",toggle);
    lbl.setInteractive({useHandCursor:true}).on("pointerdown",toggle);
    emoji.setInteractive({useHandCursor:true}).on("pointerdown",toggle);
  });

  button(scene,140,510,"BACK",()=>showAvatarSelect(scene),130,0x8e2c2c);
  updateContinue();
}

function showMap(scene) {
  playMusic("menu");
  clearAll(scene); state="map";

  scene.add.image(W/2,H/2,"uiMapScreen").setDisplaySize(W,H);
  scene.add.rectangle(0,0,W,H,0x000000,0.14).setOrigin(0,0);

  scene.add.rectangle(480,42,910,54,0x061830,0.88).setStrokeStyle(4,0xffd55a);
  titleText(scene,480,42,"CAREER JOURNEY MAP",28);

  scene.add.rectangle(150,495,250,78,0x061830,0.88).setStrokeStyle(3,0xffffff);
  scene.add.text(150,476,"PERSONA",{fontSize:"13px",fill:"#dce8f3",fontStyle:"bold"}).setOrigin(0.5);
  scene.add.image(85,503,avatars[selectedAvatar||0].key + "_selector").setDisplaySize(48,68);
  scene.add.text(175,502,avatars[selectedAvatar||0].name.toUpperCase(),{fontSize:"18px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setOrigin(0.5);

  scene.add.rectangle(470,495,290,78,0x061830,0.88).setStrokeStyle(3,0xffffff);
  scene.add.text(470,476,"STARTING SKILLS",{fontSize:"13px",fill:"#dce8f3",fontStyle:"bold"}).setOrigin(0.5);
  scene.add.text(470,505,(selectedSkills||[]).join("  •  ") || "No skills selected",{fontSize:"14px",fill:"#ffffff",align:"center",wordWrap:{width:250}}).setOrigin(0.5);

  scene.add.rectangle(820,495,220,78,0x061830,0.88).setStrokeStyle(3,0xffffff);
  scene.add.text(820,475,"SCORE  " + String(score).padStart(5,"0"),{fontSize:"18px",fill:"#ffd55a",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setOrigin(0.5);
  scene.add.text(820,505,"TRIES  " + attempts,{fontSize:"18px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setOrigin(0.5);

  const nodes=[
    {x:110,y:220,label:"1-1\nCorporate Lobby"},
    {x:240,y:152,label:"1-2\nR&D Lab"},
    {x:405,y:154,label:"1-3\nManufacturing"},
    {x:563,y:152,label:"1-4\nConference Center"},
    {x:716,y:154,label:"1-5\nSupply Chain"},
    {x:778,y:276,label:"1-6\nField Sales"},
    {x:655,y:372,label:"1-7\nQuality"},
    {x:496,y:400,label:"1-8\nLearning Hub"},
    {x:320,y:372,label:"1-9\nInnovation"},
    {x:160,y:374,label:"1-10\nCareer Summit"}
  ];

  nodes.forEach((n,i)=>{
    const levelNum=i+1;
    const unlocked=levelNum<=unlockedLevel;
    const completed=levelNum<unlockedLevel;
    const ringColor=completed ? 0x27d17f : unlocked ? 0xffd55a : 0x7a7a7a;
    const fillColor=completed ? 0x145a36 : unlocked ? 0x8b5b12 : 0x555555;

    scene.add.circle(n.x,n.y,27,fillColor,0.95).setStrokeStyle(5,ringColor);
    scene.add.circle(n.x,n.y,19,0xffffff,0.12).setStrokeStyle(2,0xffffff,0.4);
    scene.add.text(n.x,n.y,completed ? "✓" : String(levelNum),{
      fontSize:completed ? "22px" : "18px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:4
    }).setOrigin(0.5);
    scene.add.text(n.x,n.y+38,n.label,{
      fontSize:"11px",fill:"#ffffff",align:"center",stroke:"#000",strokeThickness:3
    }).setOrigin(0.5,0);

    if(unlocked){
      const hit=scene.add.circle(n.x,n.y,30,0xffffff,0.001).setInteractive({useHandCursor:true});
      hit.on("pointerdown",()=>startLevel(scene,levelNum));
    }
  });

  scene.add.text(480,92,"Select the next stop on your career journey.",{
    fontSize:"16px",fill:"#ffffff",stroke:"#000",strokeThickness:3
  }).setOrigin(0.5);

  button(scene,875,64,"BACK",()=>showSkillSelect(scene),120,0x8e2c2c);
}

function startLevel(scene,n) {
  clearAll(scene); state="level";
  currentLevel=n;
  playMusic("level", n); skillsCollected=0;
  timeLeft=levels[n-1].timeLimit||180;
  levelStartScore=score; levelEnded=false;
  const level=levels[n-1];
  enemySpawnPoints=[];
  gigCompletedThisLevel=false;
  nearGigDoor=false;
  gigDoor=null;
  gigPrompt=null;

  scene.physics.world.setBounds(0,0,WORLD_W,H+600);
  scene.cameras.main.setBounds(0,0,WORLD_W,H);

  // Draw unique background for this level
  drawUniqueBG(scene, n, level);
  drawRetroForegroundPolish(scene,n);

  platforms = scene.physics.add.staticGroup();
  oneWayPlatforms = scene.physics.add.staticGroup();
  coins = scene.physics.add.group({allowGravity:false});
  skillItems = scene.physics.add.group({allowGravity:false});
  powerUps = scene.physics.add.group({allowGravity:false});
  enemies = scene.physics.add.group();

  // Use hand-designed layout (0-indexed)
  const layout = LAYOUT_DEFS[(n-1) % LAYOUT_DEFS.length];
  const gaps   = layout.filter(e=>e.gap!=null).map(e=>e.gap);
  auditJumpSafety(gaps);
  const plats  = layout.filter(e=>e.x!=null);
  const activePlats = shapePlatformSet(plats,currentLevel);
  auditPlatformReachability(activePlats);
  currentWorldLabel = 'WORLD 1-' + currentLevel;

  // Build continuous ground with gaps
  buildGroundWithGaps(scene, gaps);

  // Floating platforms
  const sk = level.skill;
  activePlats.forEach(p => {
    makePlatform(scene, p.x, p.y, p.w, p.type);
  });

  // Always place exactly 4 level skills, even if platform shaping removes a skill platform.
  placeLevelSkills(scene, activePlats, sk);

  // Coins along ground
  for(let i=0;i<48;i++) makeCoin(scene, 180+i*112, 454-((i%4)*12));
  // Coins on every platform
  activePlats.forEach(p=>{
    const count=Math.max(2,Math.floor(p.w/60));
    for(let c=0;c<count;c++){
      const cx=p.x-p.w/2+p.w/(count+1)*(c+1);
      makeCoin(scene, cx, p.y-34);
    }
  });

  // Warning bots: early classic-platformer density.
  // Level 1-3 style pacing: about 10-14 enemies, not overcrowded.
  const enemyTarget = Math.min(14, 10 + Math.floor((currentLevel-1) / 2));
  const enemySpawns=[];

  // Ground enemies in readable clusters.
  for(let i=0;i<Math.min(8,enemyTarget);i++){
    enemySpawns.push({
      x: 360+i*520+Phaser.Math.Between(-45,45),
      y: 462,
      kind: i%3===0 ? "blocker" : "ground"
    });
  }

  // A few near gaps, but not too many.
  gaps.slice(0,3).forEach((gx,idx)=>{
    if(enemySpawns.length<enemyTarget){
      enemySpawns.push({x:gx-180+Phaser.Math.Between(-25,25),y:462,kind:idx%2 ? "dataBug" : "gapApproach"});
    }
  });

  // A few platform enemies.
  const platformEnemyCandidates=activePlats.filter(p=>!p.skill && p.w>=110);
  for(let i=0;enemySpawns.length<enemyTarget && i<platformEnemyCandidates.length;i+=3){
    const p=platformEnemyCandidates[i];
    enemySpawns.push({
      x: p.x+Phaser.Math.Between(-Math.floor(p.w/4),Math.floor(p.w/4)),
      y: p.y-36,
      kind: i%2 ? "dataBug" : "platform"
    });
  }

  Phaser.Utils.Array.Shuffle(enemySpawns).forEach(sp=>makeEnemy(scene,sp.x,sp.y,sp.kind));

  // One career boost power-up per level. It temporarily makes the player flicker colors
  // and lets the player defeat bots by touching them.
  const powerSpot = activePlats.find(p=>!p.skill && p.x>900 && p.x<2500) || activePlats[3];
  if(powerSpot) makePowerUp(scene, powerSpot.x, powerSpot.y-42);

  // Optional gig/mentor bonus door, inspired by classic bonus rooms but fully MAC-themed.
  // It appears before the last third of the stage and awards points once per level.
  const bonusPlan=[
    {x:1420,y:500,kind:"GIG"},
    {x:2080,y:500,kind:"MENTOR"},
    {x:2860,y:500,kind:"GIG"},
    {x:3380,y:500,kind:"MENTOR"},
    {x:1780,y:500,kind:"GIG"},
    {x:4300,y:500,kind:"MENTOR"},
    {x:2550,y:500,kind:"GIG"},
    {x:3660,y:500,kind:"MENTOR"},
    {x:3150,y:500,kind:"GIG"},
    {x:4720,y:500,kind:"MENTOR"}
  ];
  const bp=bonusPlan[(currentLevel-1)%bonusPlan.length];
  makeGigDoor(scene,bp.x,bp.y,bp.kind);

  // Elevator at end
  elevatorX=WORLD_W-260;
  const elev=scene.add.image(elevatorX,430,"elevatorTex").setDisplaySize(80,110);
  // Elevator collision zone (walk into it)
  goalZone=scene.add.zone(elevatorX,430,80,110).setOrigin(0.5);
  scene.physics.add.existing(goalZone,true);
  // Label
  scene.add.text(elevatorX,310,"ELEVATOR",{fontSize:"15px",fill:"#00ff88",stroke:"#000",strokeThickness:3,fontStyle:"bold"}).setOrigin(0.5);
  scene.add.text(elevatorX,330,"↑ Press UP to ride",{fontSize:"12px",fill:"#aaffcc",stroke:"#000",strokeThickness:2}).setOrigin(0.5);

  // Player
  player=scene.physics.add.sprite(120,410,avatars[selectedAvatar].sheetKey,FRAME_IDLE);
  player.setDisplaySize(PLAYER_W, PLAYER_H);
  player.setCollideWorldBounds(false);
  // Larger visible character with a narrower fair hitbox.
  // setSize / setOffset use the native 396x793 frame coordinates.
  player.body.setSize(PLAYER_BODY_W, PLAYER_BODY_H, false);
  player.body.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);
  // Play idle anim immediately
  player.play(avatars[selectedAvatar].sheetKey+"_idle",true);

  scene.physics.add.collider(player, platforms);
  scene.physics.add.collider(player, oneWayPlatforms, null, canLandOnOneWayPlatform, scene);
  scene.physics.add.collider(enemies, platforms);
  scene.physics.add.collider(enemies, oneWayPlatforms, null, canLandOnOneWayPlatform, scene);
  scene.physics.add.collider(enemies,enemies,bumpEnemies,null,scene);
  scene.physics.add.overlap(player,coins,collectCoin,null,scene);
  scene.physics.add.overlap(player,skillItems,collectSkill,null,scene);
  scene.physics.add.overlap(player,powerUps,collectPowerUp,null,scene);
  scene.physics.add.overlap(player,enemies,hitEnemy,null,scene);

  scene.cameras.main.startFollow(player,true,0.09,0.09);
  drawHUD(scene,level);

  timerEvent=scene.time.addEvent({delay:1000,loop:true,callback:()=>{
    if(state!=="level"||levelEnded)return;
    timeLeft--; updateHUD();
    if(timeLeft<=0) failLevel(scene);
  }});
}

function drawRetroForegroundPolish(scene,n){
  const g=scene.add.graphics();
  // Subtle horizon/shadow bands to make backgrounds feel more SNES/Genesis-like
  // without changing the existing color schemes.
  g.fillStyle(0x000000,0.10);
  g.fillRect(0,84,WORLD_W,5);
  g.fillStyle(0xffffff,0.08);
  g.fillRect(0,89,WORLD_W,2);

  // Repeat small light/shadow details in the far background.
  const accent=[0x2f80bd,0x00aa66,0xffd700,0x8e44ad][(n-1)%4];
  for(let x=180;x<WORLD_W;x+=520){
    g.fillStyle(accent,0.08);
    g.fillRect(x,135,180,18);
    g.fillStyle(0xffffff,0.05);
    g.fillRect(x+8,138,70,4);
  }
}

// ─── UNIQUE BACKGROUNDS ──────────────────────────────────────────────────────
function drawUniqueBG(scene,n,level){
  const g=scene.add.graphics();
  switch(n){
    case 1: drawBG_Lobby(scene,g); break;
    case 2: drawBG_RDLab(scene,g); break;
    case 3: drawBG_MfgFloor(scene,g); break;
    case 4: drawBG_QCLab(scene,g); break;
    case 5: drawBG_Regulatory(scene,g); break;
    case 6: drawBG_Warehouse(scene,g); break;
    case 7: drawBG_SalesOffice(scene,g); break;
    case 8: drawBG_MedAffairs(scene,g); break;
    case 9: drawBG_GlobalHub(scene,g); break;
    case 10:drawBG_Boardroom(scene,g); break;
    default:drawBG_Lobby(scene,g); break;
  }
  // Level title is shown in the HUD, not drawn into the scrolling background.
}

// BG 1: Corporate lobby — marble floors, tall windows, reception desk
function drawBG_Lobby(scene,g){
  g.clear();

  // World 1-1 visual plan:
  // Background remains simple and clean. The level art now comes from sliced tiles/props.
  // This avoids full-screen seams and avoids rough code-drawn buildings.

  g.fillGradientStyle(0x1678d7, 0x1678d7, 0x8bd8ff, 0x8bd8ff, 1);
  g.fillRect(0, 0, WORLD_W, H);

  // Far skyline. Low opacity so it reads as atmosphere.
  for(let x=-W; x<WORLD_W + W*2; x+=W){
    scene.add.image(x + W/2, H/2 + 16, "w1bgCity")
      .setDisplaySize(W, H)
      .setAlpha(0.30)
      .setScrollFactor(0.32);
  }

  // A few soft cloud shapes for depth.
  function cloud(cx, cy, s=1, alpha=0.50){
    const cg=scene.add.graphics();
    cg.setScrollFactor(0.18);
    cg.fillStyle(0xffffff, alpha);
    cg.fillCircle(cx, cy, 24*s);
    cg.fillCircle(cx+30*s, cy+5*s, 20*s);
    cg.fillCircle(cx-30*s, cy+7*s, 17*s);
    cg.fillCircle(cx+5*s, cy-15*s, 18*s);
    cg.fillStyle(0xb8dcff, alpha*0.45);
    cg.fillRect(cx-54*s, cy+21*s, 112*s, 6*s);
  }

  for(let x=130; x<WORLD_W+600; x+=680){
    cloud(x, 125 + ((x/680)%3)*18, 0.95, 0.45);
    cloud(x+320, 215 + ((x/680)%2)*18, 0.60, 0.35);
  }

  // Subtle haze to bind background layers.
  g.fillStyle(0x8bd8ff, 0.18);
  g.fillRect(0, 195, WORLD_W, 260);

  // Sliced World 1-1 props. These are visual only, not collision.
  scene.add.image(300, 345, "w1BuildingLarge").setDisplaySize(610, 345).setDepth(-5);
  scene.add.image(960, 395, "w1TreeLarge").setDisplaySize(205, 245).setDepth(-4);
  scene.add.image(1240, 438, "w1Bench").setDisplaySize(150, 82).setDepth(-3);
  scene.add.image(1460, 382, "w1LampPost").setDisplaySize(72, 230).setDepth(-3);
  scene.add.image(1525, 390, "w1BlueBanner").setDisplaySize(70, 170).setDepth(-3);

  for(let x=1820; x<WORLD_W; x+=760){
    scene.add.image(x, 395, "w1TreeLarge").setDisplaySize(210, 250).setDepth(-4);
    scene.add.image(x+255, 440, "w1Bench").setDisplaySize(150, 82).setDepth(-3);
    scene.add.image(x+465, 382, "w1LampPost").setDisplaySize(72, 230).setDepth(-3);
    scene.add.image(x+520, 390, "w1BlueBanner").setDisplaySize(70, 170).setDepth(-3);
    scene.add.image(x-205, 455, "w1FlowerBed").setDisplaySize(220, 56).setDepth(-3);
  }

  // Elevator visual near end of stage. Existing collision/goal logic still controls completion.
  scene.add.image(WORLD_W-420, 385, "w1Elevator").setDisplaySize(190, 230).setDepth(-2);
  scene.add.image(WORLD_W-420, 260, "w1ElevatorArrow").setDisplaySize(70, 55).setDepth(-2);
}

// BG 2: R&D Lab — white sterile walls, equipment silhouettes
function drawBG_RDLab(scene,g){
  g.fillStyle(0xe8f4ff,1); g.fillRect(0,0,WORLD_W,H);
  // Lab bench counter along back wall
  for(let x=0;x<WORLD_W;x+=600){
    g.fillStyle(0xd0e8f0,1); g.fillRect(x,200,560,160);
    g.fillStyle(0xb8d0e0,1); g.fillRect(x,355,560,10);
    g.lineStyle(1,0x80a8c0,0.5); g.strokeRect(x,200,560,160);
  }
  // Equipment on benches
  for(let x=80;x<WORLD_W;x+=220){
    // centrifuge / microscope shapes
    g.fillStyle(0x607898,0.7); g.fillEllipse(x,300,50,60);
    g.fillStyle(0x809ab8,0.5); g.fillEllipse(x,280,28,20);
    g.fillStyle(0x405878,0.7); g.fillRect(x-8,310,16,30);
    // beakers
    g.fillStyle(0x80c8e8,0.5); g.fillRect(x+60,320,18,30); g.fillRect(x+60,316,18,6);
    g.lineStyle(1,0x60a0c0,0.7); g.strokeRect(x+60,316,18,36);
  }
  // Overhead fluorescent lights
  for(let x=100;x<WORLD_W;x+=400){
    g.fillStyle(0xffffff,0.95); g.fillRect(x,0,200,8);
    g.fillStyle(0xeeffff,0.3); g.fillRect(x,8,200,30);
  }
  // Floor
  g.fillStyle(0xd8eef8,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=80) g.lineStyle(1,0xb8d8e8,0.6), g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));
  g.lineStyle(1,0xb8d8e8,0.6); g.strokeLineShape(new Phaser.Geom.Line(0,470,WORLD_W,470));
}

// BG 3: Manufacturing floor — industrial, machinery, conveyors
function drawBG_MfgFloor(scene,g){
  g.fillStyle(0x505860,1); g.fillRect(0,0,WORLD_W,H);
  // Ceiling girders
  for(let x=0;x<WORLD_W;x+=300){
    g.fillStyle(0x303840,1); g.fillRect(x,0,20,H);
    g.fillStyle(0x404850,1); g.fillRect(x,0,6,H);
  }
  // Conveyor belts mid-background
  for(let x=0;x<WORLD_W;x+=400){
    g.fillStyle(0x383840,1); g.fillRect(x,340,380,28);
    g.fillStyle(0x484850,1); g.fillRect(x,340,380,8);
    for(let bx=x;bx<x+380;bx+=30){g.fillStyle(0x555560,0.6);g.fillRect(bx,348,2,20);}
  }
  // Machinery silhouettes
  for(let x=200;x<WORLD_W;x+=500){
    g.fillStyle(0x404450,1); g.fillRect(x,230,80,140);
    g.fillStyle(0x505560,1); g.fillRect(x+6,238,68,60);
    g.fillStyle(0x303438,1); g.fillRect(x+20,200,40,36);
    g.fillStyle(0xff4400,0.7); g.fillCircle(x+60,246,6); // indicator light
    g.fillStyle(0x00ff44,0.7); g.fillCircle(x+60,260,6);
  }
  // Overhead lights (yellow industrial)
  for(let x=150;x<WORLD_W;x+=350){
    g.fillStyle(0xffcc44,0.8); g.fillEllipse(x,20,60,20);
    g.fillStyle(0xffee88,0.4); g.fillEllipse(x,35,80,40);
    g.fillStyle(0x303840,1); g.fillRect(x-3,0,6,20);
  }
  // Floor
  g.fillStyle(0x454d55,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=64){g.lineStyle(1,0x353d45,0.8);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
  g.lineStyle(2,0xffcc00,0.4); g.strokeLineShape(new Phaser.Geom.Line(0,470,WORLD_W,470));
}

// BG 4: QC Lab — bright clinical white, test equipment
function drawBG_QCLab(scene,g){
  g.fillStyle(0xf4f8ff,1); g.fillRect(0,0,WORLD_W,H);
  // Wall tiles
  for(let x=0;x<WORLD_W;x+=80) for(let y=0;y<400;y+=80){
    g.lineStyle(1,0xd8e8f0,0.7); g.strokeRect(x,y,80,80);
  }
  // HPLC / analyzer machines
  for(let x=100;x<WORLD_W;x+=480){
    g.fillStyle(0x88aac8,0.8); g.fillRect(x,260,120,120);
    g.fillStyle(0xaaccdd,0.7); g.fillRect(x+6,268,108,60);
    g.fillStyle(0x223344,0.9); g.fillRect(x+8,270,104,56);
    // screen glow
    g.fillStyle(0x00ccff,0.5); g.fillRect(x+10,272,60,30);
    g.fillStyle(0x006688,0.4); g.fillRect(x+10,272,60,30);
    g.fillStyle(0x334455,1); g.fillRect(x+90,280,16,8); g.fillRect(x+90,294,16,8);
  }
  // Pipette stations
  for(let x=300;x<WORLD_W;x+=360){
    g.fillStyle(0x80c0e0,0.5); g.fillRect(x,310,12,60);
    g.fillStyle(0x60a0c0,0.7); g.fillEllipse(x+6,308,14,10);
    g.fillStyle(0xd0f0ff,0.6); g.fillRect(x+2,340,8,20);
  }
  // Floor
  g.fillStyle(0xe8f4f8,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=80){g.lineStyle(1,0xc8dce8,0.6);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
}

// BG 5: Regulatory — office cubicles, filing, papers
function drawBG_Regulatory(scene,g){
  g.fillStyle(0x4a5870,1); g.fillRect(0,0,WORLD_W,H);
  // Cubicle walls
  for(let x=0;x<WORLD_W;x+=280){
    g.fillStyle(0x3a4860,1); g.fillRect(x,180,8,280); g.fillRect(x,180,160,8);
    g.fillStyle(0x6070a0,0.25); g.fillRect(x+8,188,152,272);
    // filing cabinet inside cubicle
    g.fillStyle(0x7088a8,0.7); g.fillRect(x+20,340,44,100);
    g.lineStyle(1,0x5068888,0.8); g.strokeRect(x+20,340,44,100);
    for(let fy=348;fy<430;fy+=24){g.strokeRect(x+24,fy,36,18);g.fillStyle(0x90a8c0,0.4);g.fillRect(x+30,fy+7,16,4);}
    // monitor on desk
    g.fillStyle(0x333344,0.9); g.fillRect(x+80,320,60,40); g.fillRect(x+88,358,20,12); g.fillRect(x+78,368,40,6);
    g.fillStyle(0x1144aa,0.7); g.fillRect(x+82,322,56,36);
  }
  // Overhead fluorescent
  for(let x=60;x<WORLD_W;x+=350){g.fillStyle(0xffffff,0.3);g.fillRect(x,0,180,6);}
  // Floor — carpet tiles
  g.fillStyle(0x3a4458,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=40){g.lineStyle(1,0x2a3448,0.6);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
}

// BG 6: Warehouse — high shelving, loading dock
function drawBG_Warehouse(scene,g){
  g.fillGradientStyle(0xb09060,0xb09060,0xd0b880,0xd0b880,1); g.fillRect(0,0,WORLD_W,80);
  g.fillStyle(0x8a7050,1); g.fillRect(0,80,WORLD_W,H-80);
  // Shelving racks (tall metal)
  for(let x=0;x<WORLD_W;x+=300){
    g.fillStyle(0x605040,1); g.fillRect(x,80,8,380); g.fillRect(x+292,80,8,380);
    for(let sy=120;sy<450;sy+=80){
      g.fillStyle(0x504030,1); g.fillRect(x,sy,300,10);
      // boxes on shelf
      for(let bx=x+10;bx<x+280;bx+=60){
        const bc=Phaser.Math.Between===undefined?0x8a6040:[0x8a6040,0xa08060,0x706040,0x907050][Math.floor(Math.random()*4)];
        g.fillStyle(bc,0.85); g.fillRect(bx,sy-36,50,28);
        g.lineStyle(1,0x403020,0.5); g.strokeRect(bx,sy-36,50,28);
      }
    }
  }
  // Loading dock doors
  for(let x=500;x<WORLD_W;x+=1500){
    g.fillStyle(0x706050,1); g.fillRect(x,250,180,220);
    g.fillStyle(0x404030,1); g.fillRect(x+4,254,172,212);
    for(let dy=260;dy<460;dy+=20){g.lineStyle(2,0x505040,1);g.strokeLineShape(new Phaser.Geom.Line(x+4,dy,x+176,dy));}
  }
  // Floor
  g.fillStyle(0x706050,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=100){g.lineStyle(1,0x605040,0.7);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
  g.lineStyle(2,0xffcc00,0.6); g.strokeLineShape(new Phaser.Geom.Line(0,470,WORLD_W,470));
  // safety stripe on floor
  for(let x=0;x<WORLD_W;x+=40){g.fillStyle(0xffcc00,0.3);g.fillRect(x,470,20,8);}
}

// BG 7: Sales office — open plan, windows, daylight
function drawBG_SalesOffice(scene,g){
  g.fillGradientStyle(0x4888c8,0x4888c8,0x70aadd,0x70aadd,1); g.fillRect(0,0,WORLD_W,H);
  // Large windows
  for(let x=40;x<WORLD_W;x+=380){
    g.fillStyle(0x88c8ff,0.7); g.fillRect(x,40,280,300);
    g.fillStyle(0xffffff,0.25); g.fillRect(x,40,80,300);
    g.lineStyle(5,0x3866a8,1); g.strokeRect(x,40,280,300);
    g.lineStyle(3,0x3866a8,1); g.strokeLineShape(new Phaser.Geom.Line(x+140,40,x+140,340));
    g.strokeLineShape(new Phaser.Geom.Line(x,190,x+280,190));
  }
  // Desks
  for(let x=80;x<WORLD_W;x+=280){
    g.fillStyle(0xd8c8a8,0.8); g.fillRect(x,380,140,60);
    g.fillStyle(0x222233,0.8); g.fillRect(x+40,360,60,24); g.fillRect(x+50,382,30,8);
    g.fillStyle(0x4466aa,0.7); g.fillRect(x+42,362,56,20);
    g.fillStyle(0xd8c8a8,0.7); g.fillRect(x+110,370,16,40);
  }
  // Carpet
  g.fillStyle(0x385070,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=50){g.lineStyle(1,0x283848,0.5);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
}

// BG 8: Medical Affairs — clinical, research posters, conference table
function drawBG_MedAffairs(scene,g){
  g.fillStyle(0x2a4838,1); g.fillRect(0,0,WORLD_W,H);
  // Conference room walls — dark green
  g.fillStyle(0x1e3828,1); g.fillRect(0,0,WORLD_W,80);
  // Long conference table in background
  for(let x=0;x<WORLD_W;x+=700){
    g.fillStyle(0x3a5848,1); g.fillRect(x+40,280,600,60);
    g.fillStyle(0x4a6858,0.6); g.fillRect(x+40,280,600,10);
    // chairs
    for(let cx=x+70;cx<x+620;cx+=100){
      g.fillStyle(0x2a3830,0.8); g.fillRect(cx,250,40,34); g.fillRect(cx+4,240,32,12);
    }
  }
  // Research posters on wall
  for(let x=100;x<WORLD_W;x+=380){
    g.fillStyle(0xd0e8d0,0.7); g.fillRect(x,80,160,170);
    g.lineStyle(3,0x4a6848,0.9); g.strokeRect(x,80,160,170);
    g.fillStyle(0x2244aa,0.6); g.fillRect(x+10,90,60,40);
    g.fillStyle(0x224488,0.4); g.fillRect(x+80,90,70,20); g.fillRect(x+80,116,70,12); g.fillRect(x+80,132,50,12);
    g.fillStyle(0xaaccaa,0.5);
    for(let ly=170;ly<240;ly+=14){g.fillRect(x+10,ly,140,8);}
  }
  // Floor
  g.fillStyle(0x1e3020,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=60){g.lineStyle(1,0x152818,0.7);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
}

// BG 9: Global Hub — world map, screens, international vibe
function drawBG_GlobalHub(scene,g){
  g.fillStyle(0x203060,1); g.fillRect(0,0,WORLD_W,H);
  // World map dot pattern on wall
  for(let x=20;x<WORLD_W;x+=320){
    g.fillStyle(0x304880,0.5); g.fillRect(x,60,280,260);
    g.lineStyle(1,0x405898,0.4); g.strokeRect(x,60,280,260);
    // continent-ish blobs
    g.fillStyle(0x3a6858,0.5);
    g.fillEllipse(x+50,140,70,50); g.fillEllipse(x+120,130,50,70);
    g.fillEllipse(x+200,150,60,40); g.fillEllipse(x+60,200,80,40);
    g.fillEllipse(x+180,200,55,35);
    // grid lines
    g.lineStyle(1,0x304888,0.3);
    for(let gx=x+28;gx<x+280;gx+=28){g.strokeLineShape(new Phaser.Geom.Line(gx,60,gx,320));}
    for(let gy=80;gy<320;gy+=28){g.strokeLineShape(new Phaser.Geom.Line(x,gy,x+280,gy));}
    // glowing nodes
    g.fillStyle(0x00ffcc,0.9); g.fillCircle(x+80,155,5); g.fillCircle(x+180,160,5); g.fillCircle(x+120,220,5);
    g.lineStyle(1,0x00ffcc,0.3);
    g.strokeLineShape(new Phaser.Geom.Line(x+80,155,x+180,160));
    g.strokeLineShape(new Phaser.Geom.Line(x+180,160,x+120,220));
  }
  // Status screens
  for(let x=160;x<WORLD_W;x+=480){
    g.fillStyle(0x101828,0.95); g.fillRect(x,310,180,110);
    g.fillStyle(0x0033aa,0.6); g.fillRect(x+4,314,172,50);
    g.fillStyle(0x00aaff,0.4); g.fillRect(x+8,318,80,20);
    g.fillStyle(0x00ff88,0.6); g.fillRect(x+8,342,100,8); g.fillRect(x+8,354,70,8); g.fillRect(x+8,366,120,8);
  }
  // Floor
  g.fillStyle(0x182038,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=60){g.lineStyle(1,0x101828,0.6);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
}

// BG 10: Executive Boardroom — dark luxury, wood paneling, screen wall
function drawBG_Boardroom(scene,g){
  g.fillStyle(0x1a2030,1); g.fillRect(0,0,WORLD_W,H);
  // Dark wood paneling
  for(let x=0;x<WORLD_W;x+=160){
    g.fillStyle(0x2a1a08,0.85); g.fillRect(x,0,4,H);
    g.fillStyle(0x2e2010,0.3); g.fillRect(x+4,0,156,H);
  }
  // Projection screen wall
  for(let x=0;x<WORLD_W;x+=600){
    g.fillStyle(0xffffff,0.95); g.fillRect(x+50,40,460,200);
    g.fillStyle(0x1a3a6a,0.9); g.fillRect(x+54,44,452,192);
    // slide content on screen
    g.fillStyle(0x2255aa,0.7); g.fillRect(x+60,50,440,80);
    g.fillStyle(0xffffff,0.8); g.fillRect(x+64,54,200,20); g.fillRect(x+64,78,280,12); g.fillRect(x+64,94,200,12);
    g.fillStyle(0x00aaff,0.6); g.fillRect(x+64,118,100,80); g.fillRect(x+186,138,80,60); g.fillRect(x+288,128,60,70); g.fillRect(x+370,148,80,50);
  }
  // Long boardroom table
  for(let x=0;x<WORLD_W;x+=700){
    g.fillStyle(0x3a2808,1); g.fillRect(x+30,310,620,70);
    g.fillStyle(0x4a3818,0.6); g.fillRect(x+30,310,620,12);
    // chairs
    for(let cx=x+60;cx<x+630;cx+=100){
      g.fillStyle(0x1a1010,0.9); g.fillRect(cx,275,44,40); g.fillRect(cx+4,264,36,14);
    }
    // water glasses on table
    for(let gx=x+80;gx<x+620;gx+=120){
      g.fillStyle(0xaaddff,0.4); g.fillRect(gx,298,10,15);
      g.lineStyle(1,0x88bbdd,0.6); g.strokeRect(gx,298,10,15);
    }
  }
  // Floor
  g.fillStyle(0x100c08,1); g.fillRect(0,470,WORLD_W,70);
  for(let x=0;x<WORLD_W;x+=80){g.lineStyle(1,0x1a1408,0.6);g.strokeLineShape(new Phaser.Geom.Line(x,470,x,540));}
  g.lineStyle(1,0x3a2a10,0.5); g.strokeLineShape(new Phaser.Geom.Line(0,470,WORLD_W,470));
}

// ─── LEVEL BUILDERS ──────────────────────────────────────────────────────────
function buildGroundWithGaps(scene,gaps){
  const tilew=32;

  if(currentLevel === 1){
    // Larger visual ground chunks using the sliced grass/stone assets.
    const groundTopY = 500;
    const visualH = 112;

    let segmentStart = null;

    function flushSegment(endX){
      if(segmentStart === null) return;
      const segW = Math.max(32, endX - segmentStart);
      const cx = segmentStart + segW/2;

      // Left/mid/right visual sections. Collision stays simple and invisible below.
      scene.add.image(segmentStart + 48, groundTopY + 36, "w1GrassGroundLeft").setDisplaySize(96, visualH);
      if(segW > 192){
        scene.add.image(cx, groundTopY + 36, "w1GrassGroundMid").setDisplaySize(Math.max(64, segW - 192), visualH);
      }
      scene.add.image(endX - 48, groundTopY + 36, "w1GrassGroundRight").setDisplaySize(96, visualH);

      segmentStart = null;
    }

    for(let x=0; x<WORLD_W; x+=tilew){
      const inGap = gaps.some(gx=>x>=gx-SAFE_GAP_HALF_WIDTH&&x<=gx+SAFE_GAP_HALF_WIDTH);

      if(!inGap && segmentStart === null) segmentStart = x;
      if((inGap || x+tilew>=WORLD_W) && segmentStart !== null){
        flushSegment(inGap ? x : x+tilew);
      }

      if(!inGap){
        const r=scene.add.rectangle(x+16,516,tilew,32,0x000000,0);
        scene.physics.add.existing(r,true);
        platforms.add(r);
      }
    }
    return;
  }

  for(let x=0;x<WORLD_W;x+=tilew){
    // Gap is intentionally limited to ~96px so the character can clear it
    // with normal jump physics without needing a perfect edge jump.
    const inGap=gaps.some(gx=>x>=gx-SAFE_GAP_HALF_WIDTH&&x<=gx+SAFE_GAP_HALF_WIDTH);
    if(!inGap){
      const img=scene.add.image(x+16,516,"groundTile").setDisplaySize(tilew,32);
      scene.add.rectangle(x+16,500,tilew,3,0xffffff,0.10);
      scene.add.rectangle(x+16,531,tilew,3,0x000000,0.22);
      const r=scene.add.rectangle(x+16,516,tilew,32,0x000000,0);
      scene.physics.add.existing(r,true); platforms.add(r);
    }
  }
}

function shapePlatformSet(plats,levelNum){
  // Each level gets a different platform rhythm. This keeps the levels distinct
  // and prevents a continuous upper route from replacing ground-level play.
  const patterns=[
    {keep:[0,4,7,11,14,18,21,24], widths:[95,140,190,115,165], y:[0,22,-16,35,-8]},
    {keep:[1,3,6,9,13,16,20,23], widths:[120,85,170,210,105], y:[-20,15,28,-10,40]},
    {keep:[0,2,5,8,12,15,19,22], widths:[160,110,220,90,145], y:[12,-18,24,0,34]},
    {keep:[2,4,8,10,13,17,20,24], widths:[100,180,125,235,110], y:[30,-12,5,24,-25]},
    {keep:[0,5,7,11,15,18,22], widths:[200,115,95,170,130], y:[-10,30,18,-22,38]},
    {keep:[1,4,6,10,14,16,19,23], widths:[90,135,205,115,175], y:[24,-15,35,5,-8]},
    {keep:[0,3,7,12,16,20,24], widths:[150,95,210,120,185], y:[0,32,-18,22,8]},
    {keep:[2,5,9,13,17,21,24], widths:[110,175,95,220,140], y:[-24,20,34,-8,14]},
    {keep:[1,4,8,11,15,19,22], widths:[185,105,155,90,225], y:[18,-20,8,36,-12]},
    {keep:[0,3,6,10,14,18,21,24], widths:[130,200,100,165,115], y:[-8,28,-22,16,34]}
  ];
  const pat=patterns[(levelNum-1)%patterns.length];
  const shaped=[];

  plats.forEach((p,i)=>{
    if(p.skill){
      // Skills stay reachable, but skill platforms vary by level.
      const sw=[150,170,190,160][(p.skillIdx+levelNum)%4];
      const sy=Phaser.Math.Clamp(p.y + [-6,10,-12,16][(p.skillIdx+levelNum)%4],310,420);
      shaped.push({...p,w:sw,y:sy});
      return;
    }

    if(!pat.keep.includes(i)) return;

    const w=pat.widths[(i+levelNum)%pat.widths.length];
    const y=Phaser.Math.Clamp(p.y + pat.y[(i+levelNum)%pat.y.length],320,440);
    shaped.push({...p,w,y});
  });

  return addReachabilityHelpers(shaped,levelNum);
}

function addReachabilityHelpers(platformsIn,levelNum){
  const out=[...platformsIn];
  const candidates=[...out].sort((a,b)=>a.x-b.x);
  candidates.forEach((p,idx)=>{
    // Anything higher than y=385 is difficult from the ground unless a helper path exists.
    if(p.y>=385) return;

    const hasLowerNear=out.some(q=>{
      if(q===p) return false;
      const dx=Math.abs(q.x-p.x);
      const dy=q.y-p.y;
      return dx<=260 && dy>0 && dy<=SAFE_PLATFORM_STEP_Y+20;
    });

    if(hasLowerNear) return;

    // Add a 2-step helper path near the high platform.
    // These are intentionally short so they help reachability without creating a full upper highway.
    const direction = (p.x>WORLD_W-700) ? -1 : 1;
    const step1Y=Phaser.Math.Clamp(p.y+SAFE_PLATFORM_STEP_Y*2,405,435);
    const step2Y=Phaser.Math.Clamp(p.y+SAFE_PLATFORM_STEP_Y,345,395);
    const step1X=Phaser.Math.Clamp(p.x-(direction*240),160,WORLD_W-420);
    const step2X=Phaser.Math.Clamp(p.x-(direction*125),160,WORLD_W-420);

    out.push({x:step1X,y:step1Y,w:118,type:"low",assist:true});
    out.push({x:step2X,y:step2Y,w:108,type:"low",assist:true});
  });

  return out;
}

function auditPlatformReachability(plats){
  const high=plats.filter(p=>p.y<385);
  high.forEach(p=>{
    const reachable=plats.some(q=>q!==p && Math.abs(q.x-p.x)<=270 && q.y>p.y && (q.y-p.y)<=SAFE_PLATFORM_STEP_Y+20);
    if(!reachable){
      console.warn("High platform may need helper:",p);
    }
  });
}

function makePlatform(scene, x, y, w, type) {
  // Platform collision design:
  // - stone = fully solid from all directions
  // - shelf / low = one-way from below, solid only when landing on top
  const isOneWay = type === "shelf" || type === "low";

  if(currentLevel === 1){
    const leftKey = isOneWay ? "w1OneWayPlatformLeft" : "w1StonePlatformLeft";
    const midKey  = isOneWay ? "w1OneWayPlatformMid"  : "w1StonePlatformMid";
    const rightKey= isOneWay ? "w1OneWayPlatformRight": "w1StonePlatformRight";

    const visualH = isOneWay ? 40 : 48;
    scene.add.image(x - w/2 + 24, y, leftKey).setDisplaySize(48, visualH);
    if(w > 96){
      scene.add.image(x, y, midKey).setDisplaySize(Math.max(16, w-96), visualH);
    }
    scene.add.image(x + w/2 - 24, y, rightKey).setDisplaySize(48, visualH);

    const r = scene.add.rectangle(x, y, w, 20, 0x000000, 0);
    scene.physics.add.existing(r, true);
    r.platformType = isOneWay ? "oneWay" : "solid";

    if (isOneWay) oneWayPlatforms.add(r);
    else platforms.add(r);
    return;
  }

  const tile = type === "shelf" ? "shelfTile" : type === "low" ? "concreteTile" : "stoneTile";
  const tc = Math.ceil(w / 32);

  for (let i = 0; i < tc; i++) {
    const tx = x - w / 2 + 16 + i * 32;
    scene.add.image(tx, y - 6, tile).setDisplaySize(32, 18);

    if (isOneWay) {
      // Grey/low visual = jump-through platform.
      scene.add.rectangle(tx, y - 17, 30, 3, 0xd8d8d8, 0.35);
      scene.add.rectangle(tx, y + 7, 32, 7, 0x000000, 0.12);
    } else {
      // Stone visual = fully solid platform.
      scene.add.rectangle(tx, y - 16, 30, 2, 0xffffff, 0.14);
      scene.add.rectangle(tx, y + 7, 32, 7, 0x000000, 0.22);
    }
  }

  const r = scene.add.rectangle(x, y, w, 20, 0x000000, 0);
  scene.physics.add.existing(r, true);
  r.platformType = isOneWay ? "oneWay" : "solid";

  if (isOneWay) {
    oneWayPlatforms.add(r);
  } else {
    platforms.add(r);
  }
}

function canLandOnOneWayPlatform(obj, platform) {
  if (!obj || !obj.body || !platform || !platform.body) return false;

  const body = obj.body;
  const platformTop = platform.body.top;

  // Only land while falling downward. If moving upward, pass through.
  if (body.velocity.y < 0) return false;

  // Use the previous frame bottom so collision only happens when the object
  // approached the platform from above, not from underneath or the side.
  const previousBottom = body.prev
    ? body.prev.y + body.height
    : body.bottom;

  return previousBottom <= platformTop + 6;
}

function auditJumpSafety(gaps){
  // Current build uses 96px gaps. This is intentionally well under the expected
  // horizontal jump distance at WALK speed and far under RUN speed.
  const gapWidth=SAFE_GAP_HALF_WIDTH*2;
  if(gapWidth>120) console.warn("Gap may be too wide for comfortable jumps:",gapWidth,gaps);
}

function makeCoin(scene,x,y){
  const useW1Coin = currentLevel === 1 && scene.textures.exists("w1CoinSheet") && scene.anims.exists("w1CoinSpin");
  const c = useW1Coin ? coins.create(x,y,"w1CoinSheet") : coins.create(x,y,"coinTex");
  if(useW1Coin){
    c.setDisplaySize(34,34);
    c.play("w1CoinSpin");
  }
  sceneRef.tweens.add({targets:c,y:y-8,duration:600+Phaser.Math.Between(-100,100),yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
}

function placeLevelSkills(scene, activePlats, skillLabels) {
  const placed = new Set();

  // First honor any platforms already marked as skill platforms.
  const flaggedSkillPlats = activePlats
    .filter(p => p.skill && p.skillIdx != null && p.skillIdx < skillLabels.length)
    .sort((a, b) => a.skillIdx - b.skillIdx);

  flaggedSkillPlats.forEach(p => {
    if (placed.has(p.skillIdx)) return;
    makeSkill(scene, p.x, p.y - 38, skillLabels[p.skillIdx]);
    placed.add(p.skillIdx);
  });

  // If any skills are missing, place them across the level on reasonable platforms.
  const fallbackPlats = activePlats
    .filter(p => p.x > 350 && p.x < WORLD_W - 450 && p.y <= 430)
    .sort((a, b) => a.x - b.x);

  for (let i = 0; i < skillLabels.length; i++) {
    if (placed.has(i)) continue;

    const fallbackIndex = Math.min(
      fallbackPlats.length - 1,
      Math.max(0, Math.floor(((i + 1) / (skillLabels.length + 1)) * fallbackPlats.length))
    );

    const p = fallbackPlats[fallbackIndex];

    if (p) {
      makeSkill(scene, p.x, p.y - 38, skillLabels[i]);
    } else {
      // Emergency fallback, should rarely be used.
      makeSkill(scene, 900 + i * 900, 390, skillLabels[i]);
    }

    placed.add(i);
  }
}

function makeSkill(scene,x,y,label){
  let tex = "skillTex";
  if(currentLevel === 1){
    const idx = (levels[currentLevel-1].skill || []).indexOf(label);
    const preferred = idx === 0 ? "w1SkillGrowth" : idx === 1 ? "w1SkillPeople" : "w1SkillIdea";
    if(scene.textures.exists(preferred)) tex = preferred;
  }

  const s=skillItems.create(x,y,tex); s.label=label;
  if(currentLevel === 1 && tex !== "skillTex") s.setDisplaySize(44,44);
  sceneRef.tweens.add({targets:s,scaleX:1.12,scaleY:1.12,duration:700,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});

  const labelBg=scene.add.rectangle(x,y+39,150,28,0x061830,0.88)
    .setStrokeStyle(2,0x66ccff);
  const labelText=scene.add.text(x,y+39,label,{
    fontSize:"14px",
    fill:"#ffffff",
    stroke:"#000",
    strokeThickness:3,
    align:"center",
    wordWrap:{width:140},
    fontStyle:"bold"
  }).setOrigin(0.5);

  s.labelBg=labelBg;
  s.labelText=labelText;
}

function makePowerUp(scene,x,y){
  // Use the built-in generated star texture for now.
  // This avoids a missing-texture green box if the sliced star asset is not present or did not load.
  const p=powerUps.create(x,y,"powerStarTex");
  p.setDisplaySize(38,38);
  sceneRef.tweens.add({targets:p,y:y-10,duration:500,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
  sceneRef.tweens.add({targets:p,angle:360,duration:1100,repeat:-1,ease:"Linear"});
}

function makeEnemy(scene,x,y,kind="ground"){
  const useLargeBot = currentLevel === 1 && kind==="blocker" && scene.textures.exists("w1LargeBotWalk") && scene.anims.exists("w1LargeBotWalkAnim");
  const useSmallBot = currentLevel === 1 && kind!=="blocker" && scene.textures.exists("w1SmallBotWalk") && scene.anims.exists("w1SmallBotWalkAnim");

  const tex = useLargeBot ? "w1LargeBotWalk"
    : useSmallBot ? "w1SmallBotWalk"
    : (kind==="dataBug" ? "enemyTex2" : (kind==="blocker" ? "enemyTex3" : "enemyTex"));

  const e=enemies.create(x,y,tex);

  if(useLargeBot){
    e.setDisplaySize(66,55);
    e.play("w1LargeBotWalkAnim");
  } else if(useSmallBot){
    e.setDisplaySize(42,48);
    e.play("w1SmallBotWalkAnim");
  } else {
    e.setDisplaySize(38,40);
  }

  e.setBounce(0,0);
  e.setCollideWorldBounds(false);
  e.body.allowGravity=true;
  e.body.setMaxVelocity(160,MAX_FALL);
  e.body.setSize(30,34,true);

  const base=(kind==="gapApproach"||kind==="gapExit") ? Phaser.Math.Between(75,125) : Phaser.Math.Between(55,110);
  const dir=Math.random()<0.5 ? -1 : 1;
  e.patrolSpeed=base*dir;
  e.spawnX=x;
  e.spawnY=y;
  e.spawnKind=kind;
  e.respawning=false;
  e.setVelocityX(e.patrolSpeed);

  enemySpawnPoints.push({x,y,kind});
}

function bumpEnemies(a,b){
  if(!a || !b || a.respawning || b.respawning) return;

  const aSpeed=Math.abs(a.patrolSpeed || 80);
  const bSpeed=Math.abs(b.patrolSpeed || 80);

  if(a.x <= b.x){
    a.patrolSpeed=-aSpeed;
    b.patrolSpeed=bSpeed;
    a.x-=3;
    b.x+=3;
  } else {
    a.patrolSpeed=aSpeed;
    b.patrolSpeed=-bSpeed;
    a.x+=3;
    b.x-=3;
  }

  a.setVelocityX(a.patrolSpeed);
  b.setVelocityX(b.patrolSpeed);
}

function scheduleEnemyRespawn(enemy){
  if(!enemy || enemy.respawning) return;

  enemy.respawning=true;
  enemy.disableBody(true,true);

  sceneRef.time.delayedCall(1200,()=>{
    if(state!=="level" || levelEnded || !enemy || !enemy.body) return;

    // Respawn near its original starting point, with a little variation.
    const spawnX=Phaser.Math.Clamp((enemy.spawnX||300)+Phaser.Math.Between(-35,35),80,WORLD_W-420);
    const spawnY=enemy.spawnY || 462;
    const speed=Math.abs(enemy.patrolSpeed || Phaser.Math.Between(55,105));
    const dir=Math.random()<0.5 ? -1 : 1;

    enemy.enableBody(true,spawnX,spawnY,true,true);
    enemy.respawning=false;
    enemy.patrolSpeed=speed*dir;
    enemy.setVelocity(enemy.patrolSpeed,0);
    enemy.setAlpha(0);
    sceneRef.tweens.add({targets:enemy,alpha:1,duration:250});
  });
}


function makeGigDoor(scene,x,y,kind){
  // y is the ground surface — door bottom sits here
  const g=scene.add.graphics();
  const color=kind==="GIG" ? 0x00aa66 : 0xd6a800;
  const doorH=96, doorW=56;
  // Door frame (anchored at ground: top = y-doorH, bottom = y)
  g.fillStyle(0x111111,1); g.fillRoundedRect(x-doorW/2-4, y-doorH-4, doorW+8, doorH+4, 7);
  g.fillStyle(color,1);    g.fillRoundedRect(x-doorW/2,   y-doorH,   doorW,   doorH,   6);
  g.fillStyle(0xffffff,0.25); g.fillRect(x-doorW/2+4, y-doorH+6, 14, doorH-10);
  g.fillStyle(0x071421,1); g.fillCircle(x+doorW/2-9, y-doorH/2, 4);
  // Step/threshold at ground level
  g.fillStyle(0x222222,1); g.fillRect(x-doorW/2-6, y-6, doorW+12, 8);
  g.fillStyle(0x444444,1); g.fillRect(x-doorW/2-4, y-6, doorW+8, 4);
  // Label above door
  const label=scene.add.text(x, y-doorH-18, kind,{
    fontSize:"15px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3,
    backgroundColor:"#"+color.toString(16).padStart(6,"0")+"cc",
    padding:{x:8,y:3}
  }).setOrigin(0.5);
  // Prompt hint below label
  const hint=scene.add.text(x, y-doorH-3, "↑ UP for bonus",{
    fontSize:"11px",fill:"#ffd700",stroke:"#000",strokeThickness:2
  }).setOrigin(0.5);
  gigDoor={x,y,kind,label,hint,graphics:g};
}

function completeGigBonus(scene){
  if(gigCompletedThisLevel || !gigDoor) return;
  gigCompletedThisLevel=true;
  playSfx("skill");
  const bonus = gigDoor.kind==="GIG" ? 350 : 300;
  score += bonus;
  updateHUD();
  if(gigPrompt){ gigPrompt.setVisible(false); gigPrompt.destroy(); gigPrompt=null; }

  const msg = gigDoor.kind==="GIG"
    ? "GIG COMPLETE! +" + bonus
    : "MENTOR CONNECTION! +" + bonus;

  // Big pop text for the points awarded
  const px=gigDoor.x, py=gigDoor.y;
  popText(scene,px,py-gigDoor.y*0+py-120,msg,0xffd700);
  // Secondary score indicator
  const scorePopTxt=scene.add.text(px,py-140,"+"+bonus+" PTS",{
    fontSize:"28px",fill:"#ffd700",fontStyle:"bold",stroke:"#000",strokeThickness:5
  }).setOrigin(0.5);
  scene.tweens.add({targets:scorePopTxt,y:py-220,alpha:0,duration:1400,ease:"Quad.easeOut",onComplete:()=>scorePopTxt.destroy()});

  // Vanish door with flash then destroy
  if(gigDoor.graphics){
    scene.tweens.add({targets:gigDoor.graphics,alpha:0,duration:400,ease:"Quad.easeIn",onComplete:()=>{
      if(gigDoor && gigDoor.graphics) gigDoor.graphics.destroy();
    }});
  }
  if(gigDoor.label)  { scene.tweens.add({targets:gigDoor.label, alpha:0,duration:300,onComplete:()=>gigDoor.label.destroy()}); }
  if(gigDoor.hint)   { scene.tweens.add({targets:gigDoor.hint,  alpha:0,duration:300,onComplete:()=>gigDoor.hint.destroy()}); }

  // Quick bonus-room style celebration without leaving the level.
  for(let i=0;i<18;i++){
    const star=scene.add.text(gigDoor.x,gigDoor.y-40,"★",{
      fontSize:String(Phaser.Math.Between(14,28))+"px",
      fill:i%2? "#00ff88":"#ffd700",
      stroke:"#000",strokeThickness:2
    }).setOrigin(0.5);
    scene.tweens.add({
      targets:star,
      x:gigDoor.x+Phaser.Math.Between(-90,90),
      y:gigDoor.y-120+Phaser.Math.Between(-40,40),
      alpha:0,
      duration:700,
      ease:"Quad.easeOut",
      onComplete:()=>star.destroy()
    });
  }
}


// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD(scene,level){
  scene.add.rectangle(480,42,W,84,0x000000,0.92).setScrollFactor(0);
  scene.add.rectangle(480,84,W,5,0x2f80bd,1).setScrollFactor(0);

  ui.level=scene.add.text(14,8,"LEVEL "+currentLevel,{fontSize:"19px",fill:"#66ccff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.title=scene.add.text(14,34,currentWorldLabel+" - "+level.name.toUpperCase(),{fontSize:"17px",fill:"#ffd700",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.theme=scene.add.text(14,59,level.theme,{fontSize:"14px",fill:"#d8e6f3",stroke:"#000",strokeThickness:2}).setScrollFactor(0);

  ui.skills=scene.add.text(455,10,"",{fontSize:"22px",fill:"#00ff88",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.time  =scene.add.text(590,10,"",{fontSize:"22px",fill:"#ffff00",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.att   =scene.add.text(725,10,"",{fontSize:"22px",fill:"#ff6666",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.pause =scene.add.text(850,10,"P: PAUSE",{fontSize:"16px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.score =scene.add.text(455,45,"",{fontSize:"19px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setScrollFactor(0);
  ui.pips=[];
  for(let i=0;i<4;i++) ui.pips.push(scene.add.rectangle(760+i*36,56,26,18,0x333333).setStrokeStyle(2,0x00ff88).setScrollFactor(0));
  updateHUD();
}
function updateHUD(){
  if(!ui.skills)return;
  ui.skills.setText("SKILLS "+skillsCollected+"/4");
  ui.time.setText("TIME "+timeLeft);
  ui.att.setText("TRIES "+attempts);
  ui.score.setText("SCORE  "+score);
  if(ui.pips) ui.pips.forEach((p,i)=>p.setFillStyle(i<skillsCollected?0x00ff88:0x333333));
}


function showPauseScreen(scene){
  state="paused";
  scene.physics.pause();
  if(timerEvent) timerEvent.paused=true;

  // Each element needs setScrollFactor(0) and setDepth individually.
  // Buttons inside containers lose their input hit-test when the container
  // has scrollFactor(0), so we avoid containers entirely here.
  const D=9999;
  const items=[];
  const add=(obj)=>{ items.push(obj); return obj; };

  add(scene.add.rectangle(480,270,W,H,0x000000,0.68).setScrollFactor(0).setDepth(D));
  add(scene.add.rectangle(480,265,540,330,0x071421,0.97).setStrokeStyle(4,0x2f80bd).setScrollFactor(0).setDepth(D+1));
  add(scene.add.text(480,162,"⏸ PAUSED",{fontSize:"44px",fill:"#ffd700",fontStyle:"bold",stroke:"#000",strokeThickness:6}).setOrigin(0.5).setScrollFactor(0).setDepth(D+2));
  add(scene.add.text(480,218,"Your career quest is paused.",{fontSize:"18px",fill:"#ffffff",align:"center"}).setOrigin(0.5).setScrollFactor(0).setDepth(D+2));
  add(scene.add.text(480,246,"Press P or ESC to resume.",{fontSize:"15px",fill:"#aaccff"}).setOrigin(0.5).setScrollFactor(0).setDepth(D+2));

  // Buttons — NOT in a container, set scrollFactor/depth directly
  const mkBtn=(bx,by,lbl,cb,w,col)=>{
    const box=scene.add.rectangle(bx,by,w,52,col,1).setStrokeStyle(3,0xffffff).setScrollFactor(0).setDepth(D+3).setInteractive({useHandCursor:true});
    scene.add.rectangle(bx,by-11,w-6,9,0xffffff,0.18).setScrollFactor(0).setDepth(D+4);
    const txt=scene.add.text(bx,by,lbl,{fontSize:"21px",fill:"#fff",fontStyle:"bold",stroke:"#000",strokeThickness:3}).setOrigin(0.5).setScrollFactor(0).setDepth(D+5);
    box.on("pointerover",()=>box.setFillStyle(Phaser.Display.Color.ValueToColor(col).lighten(20).color));
    box.on("pointerout",()=>box.setFillStyle(col));
    const wrapped=()=>{ initAudio(); if(audioCtx&&audioCtx.state==="suspended") audioCtx.resume(); cb(); };
    box.on("pointerdown",wrapped); txt.setInteractive({useHandCursor:true}).setScrollFactor(0).setDepth(D+5).on("pointerdown",wrapped);
    items.push(box,txt); return {box,txt};
  };

  mkBtn(480,305,"▶ CONTINUE",()=>resumeGame(scene),270,0x2e9d3f);
  mkBtn(480,372,"MAIN MENU",()=>{
    items.forEach(o=>o&&o.destroy&&o.destroy());
    ui.pauseItems=null;
    scene.physics.resume(); if(timerEvent) timerEvent.paused=false;
    score=0;attempts=3;unlockedLevel=1;showStart(scene);
  },270,0x8e44ad);

  ui.pauseItems=items;
}

function resumeGame(scene){
  if(ui.pauseItems){ ui.pauseItems.forEach(o=>o&&o.destroy&&o.destroy()); ui.pauseItems=null; }
  if(ui.pauseOverlay){ ui.pauseOverlay.destroy(); ui.pauseOverlay=null; }
  state="level";
  scene.physics.resume();
  if(timerEvent) timerEvent.paused=false;
  lastPauseDown=true;
}

function handlePauseInput(scene){
  const pausePressed=(pauseKey&&pauseKey.isDown)||(escKey&&escKey.isDown);
  if(pausePressed && !lastPauseDown){
    resumeGame(scene);
    return;
  }
  lastPauseDown=pausePressed;
}

// ─── GAME EVENTS ─────────────────────────────────────────────────────────────
function collectPowerUp(p,power){
  playSfx("skill");
  power.disableBody(true,true);
  activateCareerBoost();
  popText(sceneRef,power.x,power.y-35,"CAREER BOOST!",0xffd700);
}

function activateCareerBoost(){
  invincible=true;
  if(invincibleTimer) invincibleTimer.remove(false);
  invincibleTimer=sceneRef.time.delayedCall(7500,()=>{
    invincible=false;
    if(player && player.active) player.clearTint();
  });
}

function collectCoin(p,c){
  playSfx("coin");
  c.disableBody(true,true); score+=10; updateHUD();
  const img=sceneRef.add.image(c.x,c.y,"coinTex").setDisplaySize(20,22);
  sceneRef.tweens.add({targets:img,y:c.y-48,alpha:0,duration:500,ease:"Quad.easeOut",onComplete:()=>img.destroy()});
  popText(sceneRef,c.x,c.y-20,"+10");
}

function collectSkill(p,s){
  playSfx("skill");
  if(s.labelBg) s.labelBg.destroy();
  if(s.labelText) s.labelText.destroy();
  s.disableBody(true,true); skillsCollected++; score+=250;
  for(let i=0;i<8;i++){
    const angle=(i/8)*Math.PI*2;
    const star=sceneRef.add.text(s.x,s.y,"★",{fontSize:"16px",fill:"#66ccff"}).setOrigin(0.5);
    sceneRef.tweens.add({targets:star,x:s.x+Math.cos(angle)*50,y:s.y+Math.sin(angle)*50,alpha:0,duration:600,ease:"Quad.easeOut",onComplete:()=>star.destroy()});
  }
  popText(sceneRef,s.x,s.y-40,s.label+" +250",0x66ccff);
  if(skillsCollected===4){
    score+=500;
    popText(sceneRef,p.x,p.y-80,"ALL DOCS! +500",0xffff00);
    sceneRef.cameras.main.flash(300,200,255,150);
  }
  // Update elevator prompt if nearby
  if(nearElevator&&elevatorPrompt){
    elevatorPrompt.setText(skillsCollected>=4?"↑ Press UP to ride":"Collect all "+skillsCollected+"/4 items first");
    elevatorPrompt.setColor(skillsCollected>=4?"#00ff88":"#ff8888");
  }
  updateHUD();
}

function hitEnemy(pObj,enemy){
  if(levelEnded)return;
  if(invincible){
    playSfx("stomp");
    stompEnemy(enemy);
    score+=100;
    popText(sceneRef,enemy.x,enemy.y-30,"BOOST! +100",0xffd700);
    updateHUD();
    return;
  }
  const falling=player.body.velocity.y>80, above=player.y<enemy.y-10;
  if(falling&&above){
    playSfx("stomp"); stompEnemy(enemy); player.setVelocityY(-320); score+=100;
    popText(sceneRef,enemy.x,enemy.y-30,"BOT DOWN! +100",0xffdd00); updateHUD();
  } else {
    failLevel(sceneRef);
  }
}

function stompEnemy(enemy){
  const ex=enemy.x,ey=enemy.y; enemy.disableBody(true,true);
  const puff=sceneRef.add.image(ex,ey,"puffTex").setDisplaySize(48,48);
  sceneRef.tweens.add({targets:puff,scaleX:2.2,scaleY:0.2,alpha:0,duration:350,ease:"Expo.easeOut",onComplete:()=>puff.destroy()});
  for(let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2;
    const sp=sceneRef.add.circle(ex,ey,5,0xffdd00);
    sceneRef.tweens.add({targets:sp,x:ex+Math.cos(a)*40,y:ey+Math.sin(a)*40,alpha:0,duration:400,onComplete:()=>sp.destroy()});
  }
  sceneRef.cameras.main.shake(80,0.006);
}

// ─── ELEVATOR TRIGGER ────────────────────────────────────────────────────────
function triggerElevator(){
  if(levelEnded)return;
  playSfx("win");
  levelEnded=true;
  const bonus=timeLeft*5; score+=bonus;
  // Freeze player in elevator
  player.setVelocityX(0); player.setVelocityY(0); player.body.allowGravity=false;
  player.anims.stop(); player.setFrame(FRAME_IDLE);

  // Show "boarding" message
  popText(sceneRef,elevatorX,360,"🛗 BOARDING...",0x00ff88);

  // Slide player into elevator
  sceneRef.tweens.add({targets:player,x:elevatorX,duration:400,ease:"Quad.easeOut",
    onComplete:()=>{
      // Flash elevator glow
      sceneRef.cameras.main.flash(200,180,255,180);
      // Launch fireworks
      startFireworks(sceneRef, elevatorX);
      // Show level complete after fireworks play
      sceneRef.time.delayedCall(2800,()=>{
        stopFireworks();
        if(currentLevel>=levels.length){showInitialEntry(sceneRef,'complete');}
        else{unlockedLevel=Math.max(unlockedLevel,currentLevel+1);showLevelComplete(sceneRef,bonus);}
      });
    }
  });
}

// ─── FIREWORKS ───────────────────────────────────────────────────────────────
function startFireworks(scene, nearX){
  fireworksActive=true;
  // Launch a rocket every 350ms for 2.5 seconds
  const cols=[0xff2244,0xffdd00,0x00ff88,0x2288ff,0xff88ff,0xffffff,0xff8800];
  let count=0;
  const launcher=scene.time.addEvent({delay:300,repeat:7,callback:()=>{
    if(!fireworksActive)return;
    // random position above elevator area
    const fx=nearX+Phaser.Math.Between(-300,300);
    const fy=Phaser.Math.Between(60,220);
    const col=cols[count%cols.length]; count++;
    launchBurst(scene,fx,fy,col);
  }});
  fireworkTimers.push(launcher);
}

function launchBurst(scene,x,y,color){
  // Central flash
  const flash=scene.add.circle(x,y,18,color,0.95).setScrollFactor(1);
  scene.tweens.add({targets:flash,scaleX:0,scaleY:0,alpha:0,duration:400,ease:"Expo.easeOut",onComplete:()=>flash.destroy()});
  // Burst particles
  const numParts=16;
  for(let i=0;i<numParts;i++){
    const angle=(i/numParts)*Math.PI*2;
    const speed=Phaser.Math.Between(80,180);
    const dx=Math.cos(angle)*speed;
    const dy=Math.sin(angle)*speed;
    const sz=Phaser.Math.Between(4,9);
    const p=scene.add.circle(x,y,sz,color,1).setScrollFactor(1);
    // secondary sparkle color
    if(i%3===0) p.setFillStyle(0xffffff,0.9);
    scene.tweens.add({
      targets:p,
      x:x+dx*1.8, y:y+dy*1.8,
      alpha:0, scaleX:0.2, scaleY:0.2,
      duration:Phaser.Math.Between(700,1200),
      ease:"Quad.easeOut",
      onComplete:()=>p.destroy()
    });
  }
  // Trailing sparks upward
  for(let i=0;i<6;i++){
    const p2=scene.add.circle(x+Phaser.Math.Between(-20,20),y+Phaser.Math.Between(-10,10),3,0xffffff,0.8).setScrollFactor(1);
    scene.tweens.add({targets:p2,y:y-Phaser.Math.Between(40,90),alpha:0,duration:Phaser.Math.Between(500,900),ease:"Quad.easeOut",onComplete:()=>p2.destroy()});
  }
  // Camera rumble
  scene.cameras.main.shake(60,0.004);
}

function stopFireworks(){
  fireworksActive=false;
  fireworkTimers.forEach(t=>t&&t.remove&&t.remove(false));
  fireworkTimers=[];
}

// ─── FAIL LEVEL ──────────────────────────────────────────────────────────────
function failLevel(scene, fell=false){
  if(levelEnded)return;
  playSfx("die");
  levelEnded=true; stopFireworks();

  if(fell){
    // The player already fell out of view. Do not pop them back up.
    if(player){
      player.setVisible(false);
      player.body.enable=false;
    }
  } else {
    scene.cameras.main.shake(250,0.018);
    scene.cameras.main.flash(300,255,50,50);
    if(player){
      player.setVelocityX(0);
      player.setVelocityY(-260);
      player.body.allowGravity=true;
    }
  }

  scene.time.delayedCall(900,()=>{
    attempts--; score=levelStartScore;
    if(attempts<=0){showInitialEntry(scene,'gameover');}
    else startLevel(scene,currentLevel);
  });
}

// ─── LEVEL COMPLETE ──────────────────────────────────────────────────────────
function showLevelComplete(scene,bonus){
  playMusic("menu");
  clearAll(scene); state="completeLevel";
  const level=levels[currentLevel-1];

  const g=scene.add.graphics();
  g.fillGradientStyle(0x0a1830,0x0a1830,0x143050,0x143050,1); g.fillRect(0,0,W,H);

  const cc=[0xffd700,0x00ff88,0x2288dd,0xff4422,0xffffff,0x66ccff];
  for(let i=0;i<55;i++){
    const dot=scene.add.circle(
      Phaser.Math.Between(0,W),
      -20,
      Phaser.Math.Between(4,8),
      cc[i%cc.length],
      Phaser.Math.FloatBetween(0.65,1)
    );
    scene.tweens.add({
      targets:dot,
      y:H+20,
      duration:Phaser.Math.Between(1800,3400),
      delay:Phaser.Math.Between(0,1100),
      ease:"Linear",
      repeat:-1
    });
  }

  panel(scene,480,255,780,430,0x061830);

  const trophy=scene.add.image(480,110,"trophyTex").setDisplaySize(62,68).setAlpha(0);
  scene.tweens.add({
    targets:trophy,
    alpha:1,
    scaleX:1.25,
    scaleY:1.25,
    duration:380,
    ease:"Back.easeOut",
    onComplete:()=>scene.tweens.add({targets:trophy,scaleX:1,scaleY:1,duration:180})
  });

  const banner=titleText(scene,480,-40,"LEVEL COMPLETE",38);
  scene.tweens.add({targets:banner,y:170,duration:480,ease:"Back.easeOut"});

  const lvlTxt=scene.add.text(480,215,level.name.toUpperCase(),{
    fontSize:"19px",
    fill:"#66ccff",
    fontStyle:"bold",
    stroke:"#000",
    strokeThickness:3
  }).setOrigin(0.5).setAlpha(0);
  scene.tweens.add({targets:lvlTxt,alpha:1,duration:350,delay:350});

  const stars=scene.add.text(480,0,"★★★",{
    fontSize:"48px",
    fill:"#ffd700"
  }).setOrigin(0.5).setScale(0);
  scene.tweens.add({targets:stars,y:258,scaleX:1,scaleY:1,duration:500,delay:550,ease:"Back.easeOut"});

  [
    {t:"Skills collected:  4 / 4",col:"#00ff88",d:850},
    {t:"Time bonus:        +"+bonus, col:"#ffd700",d:1050},
    {t:"Total score:       "+score,  col:"#ffffff",d:1250}
  ].forEach((l,i)=>{
    const st=scene.add.text(480,310+i*34,l.t,{
      fontSize:"21px",
      fill:l.col,
      fontStyle:"bold",
      stroke:"#000",
      strokeThickness:3
    }).setOrigin(0.5).setAlpha(0);
    scene.tweens.add({targets:st,alpha:1,duration:300,delay:l.d});
  });

  const flav=scene.add.text(480,426,"Return to the Journey Map to see your completed step and choose the next unlocked level.",{
    fontSize:"14px",
    fill:"#d8e6f3",
    wordWrap:{width:690},
    align:"center"
  }).setOrigin(0.5).setAlpha(0);
  scene.tweens.add({targets:flav,alpha:1,duration:350,delay:1450});

  scene.time.delayedCall(1650,()=>{
    button(scene,480,484,"RETURN TO JOURNEY MAP",()=>showMap(scene),340,0x2e9d3f);
  });
}

// ─── FINAL COMPLETE ──────────────────────────────────────────────────────────
function showComplete(scene){
  playMusic("menu");
  clearAll(scene); state="final";
  const g=scene.add.graphics();
  g.fillGradientStyle(0x0a1040,0x0a1040,0x1a2860,0x1a2860,1); g.fillRect(0,0,W,H);
  const cc=[0xffd700,0xffee88,0xffffff,0x00ff88];
  for(let i=0;i<80;i++){
    const d=scene.add.circle(Phaser.Math.Between(0,W),-10,Phaser.Math.Between(3,8),cc[i%cc.length]);
    scene.tweens.add({targets:d,y:H+20,duration:Phaser.Math.Between(2000,4000),delay:Phaser.Math.Between(0,2000),ease:"Linear",repeat:-1});
  }
  panel(scene,480,255,800,430,0x0d1a40);
  scene.add.image(480,105,"trophyTex").setDisplaySize(80,88);
  titleText(scene,480,158,"CAREER MILESTONE ACHIEVED!",28);
  scene.add.text(480,210,"You advanced through all 10 Amneal career levels!",{fontSize:"19px",fill:"#66ccff"}).setOrigin(0.5);
  scene.add.text(480,248,"Your initials were saved to the leaderboard.",{fontSize:"17px",fill:"#ffffff"}).setOrigin(0.5);
  scene.add.text(480,305,"Final Score: "+score,{fontSize:"34px",fill:"#ffd700",fontStyle:"bold",stroke:"#000",strokeThickness:4}).setOrigin(0.5);
  button(scene,480,382,"VIEW LEADERBOARD",()=>showLeaderboard(scene),300,0x1f78b4);
  button(scene,480,450,"START NEW PATH",()=>{score=0;attempts=3;unlockedLevel=1;showStart(scene);},300,0x2e9d3f);
}

// ─── GAME OVER ───────────────────────────────────────────────────────────────
function showGameOver(scene){
  playMusic("menu");
  clearAll(scene); state="gameover";
  const g=scene.add.graphics();
  g.fillGradientStyle(0x2a0505,0x2a0505,0x46120f,0x46120f,1); g.fillRect(0,0,W,H);
  panel(scene,480,270,720,380,0x641e16);
  titleText(scene,480,130,"GAME OVER",48);
  scene.add.text(480,205,"Out of attempts!",{fontSize:"24px",fill:"#ff8888"}).setOrigin(0.5);
  scene.add.text(480,248,"Final Score: "+score,{fontSize:"28px",fill:"#ffd700",fontStyle:"bold"}).setOrigin(0.5);
  scene.add.text(480,292,"Your initials were saved to the leaderboard.",{fontSize:"17px",fill:"#ffffff"}).setOrigin(0.5);
  button(scene,380,380,"TRY AGAIN",()=>{score=0;attempts=3;unlockedLevel=1;showStart(scene);},220,0xc0392b);
  button(scene,620,380,"LEADERBOARD",()=>showLeaderboard(scene),220,0x1f78b4);
}

// ─── LEADERBOARD / SAVE ──────────────────────────────────────────────────────
function saveScoreInitials(name){
  const safe=(name||"AAA").slice(0,3).toUpperCase();
  const scores=JSON.parse(localStorage.getItem("macCareerScores")||"[]");
  scores.push({name:safe,score,date:new Date().toLocaleDateString()});
  scores.sort((a,b)=>b.score-a.score);
  localStorage.setItem("macCareerScores",JSON.stringify(scores));
}

function showInitialEntry(scene,reason="gameover"){
  playMusic("menu");
  clearAll(scene); state="initials";
  initialEntry={letters:[0,0,0],pos:0,saved:false,reason};

  const g=scene.add.graphics();
  const bg=reason==="complete" ? 0x0a1040 : 0x46120f;
  g.fillGradientStyle(bg,bg,0x071421,0x071421,1); g.fillRect(0,0,W,H);
  panel(scene,480,270,760,420,reason==="complete"?0x0d1a40:0x641e16);

  titleText(scene,480,105,reason==="complete"?"CAREER MILESTONE ACHIEVED!":"OUT OF ATTEMPTS",32);
  scene.add.text(480,158,"Final Score: "+score,{fontSize:"30px",fill:"#ffd700",fontStyle:"bold",stroke:"#000",strokeThickness:4}).setOrigin(0.5);
  scene.add.text(480,205,"Enter 3 initials for the leaderboard.",{fontSize:"20px",fill:"#ffffff",fontStyle:"bold"}).setOrigin(0.5);
  scene.add.text(480,235,"Use ← → to choose a letter slot. Use ↑ ↓ to change letters. Press ENTER or SPACE to save.",{fontSize:"14px",fill:"#d8e6f3",align:"center",wordWrap:{width:650}}).setOrigin(0.5);

  ui.initialLetters=[];
  for(let i=0;i<3;i++){
    const box=scene.add.rectangle(390+i*90,315,70,80,0x102a43,1).setStrokeStyle(4,i===0?0xffd700:0x2f80bd);
    const txt=scene.add.text(390+i*90,315,"A",{fontSize:"48px",fill:"#ffffff",fontStyle:"bold",stroke:"#000",strokeThickness:5}).setOrigin(0.5);
    ui.initialLetters.push({box,txt});
  }
  ui.initialHelp=scene.add.text(480,390,"",{fontSize:"18px",fill:"#ffd700",fontStyle:"bold"}).setOrigin(0.5);
  updateInitialEntryUI();
}

function updateInitialEntryUI(){
  if(!ui.initialLetters) return;
  ui.initialLetters.forEach((slot,i)=>{
    slot.txt.setText(String.fromCharCode(65+initialEntry.letters[i]));
    slot.box.setStrokeStyle(4,i===initialEntry.pos?0xffd700:0x2f80bd);
    slot.box.setFillStyle(i===initialEntry.pos?0x155f3d:0x102a43);
  });
  if(ui.initialHelp) ui.initialHelp.setText("INITIALS: "+initialEntry.letters.map(v=>String.fromCharCode(65+v)).join(""));
}

function handleInitialEntry(scene){
  const left=Phaser.Input.Keyboard.JustDown(cursors.left);
  const right=Phaser.Input.Keyboard.JustDown(cursors.right);
  const up=Phaser.Input.Keyboard.JustDown(cursors.up);
  const down=Phaser.Input.Keyboard.JustDown(cursors.down);
  const save=(enterKey&&Phaser.Input.Keyboard.JustDown(enterKey)) || (spaceKey&&Phaser.Input.Keyboard.JustDown(spaceKey));

  if(left) initialEntry.pos=(initialEntry.pos+2)%3;
  if(right) initialEntry.pos=(initialEntry.pos+1)%3;
  if(up) initialEntry.letters[initialEntry.pos]=(initialEntry.letters[initialEntry.pos]+1)%26;
  if(down) initialEntry.letters[initialEntry.pos]=(initialEntry.letters[initialEntry.pos]+25)%26;

  if(left||right||up||down) updateInitialEntryUI();

  if(save && !initialEntry.saved){
    initialEntry.saved=true;
    const initials=initialEntry.letters.map(v=>String.fromCharCode(65+v)).join("");
    saveScoreInitials(initials);
    if(initialEntry.reason==="complete") showComplete(scene);
    else showGameOver(scene);
  }
}

function showLeaderboard(scene){
  playMusic("menu");
  clearAll(scene); state="leaderboard";
  scene.cameras.main.setBackgroundColor("#071421");
  panel(scene,480,270,840,430,0x0d253a);
  titleText(scene,480,65,"🏆 LEADERBOARD",34);
  const scores=JSON.parse(localStorage.getItem("macCareerScores")||"[]").slice(0,10);
  scene.add.rectangle(480,122,840,28,0x1a3a5a).setStrokeStyle(1,0x2f80bd);
  ["RANK","PLAYER","SCORE","DATE"].forEach((h,i)=>{
    scene.add.text([175,310,555,705][i],112,h,{fontSize:"16px",fill:"#ffd700",fontStyle:"bold"});
  });
  if(!scores.length) scene.add.text(480,270,"No scores yet. Be the first!",{fontSize:"24px",fill:"#aaa"}).setOrigin(0.5);
  scores.forEach((s,i)=>{
    const y=148+i*28;
    scene.add.rectangle(480,y+6,836,26,i%2===0?0x0a1f30:0x0d253a,0.7);
    const m=i===0?"🥇":i===1?"🥈":i===2?"🥉":String(i+1);
    [[185,m],[310,s.name],[555,String(s.score)],[705,s.date]].forEach(([x,t])=>scene.add.text(x,y,t,{fontSize:"17px",fill:x===555?"#ffd700":"#fff"}));
  });
  button(scene,480,488,"◀ BACK TO START",()=>showStart(scene),280,0x1f78b4);
}


// Start the game only after this file has fully initialized.
window.addEventListener("load",()=>new Phaser.Game(config));
