

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Board layout
const COLS = 10;
const ROWS = 22;
const VISIBLE_ROWS = 20;
const BLOCK = 24;

// SOLO board position (centered)
const SOLO_BOARD_X = Math.floor(canvas.width / 2 - (COLS * BLOCK) / 2);
const SOLO_BOARD_Y = 100;

// VS board positions
const VS_PLAYER_BOARD_X = 260;
const VS_BOT_BOARD_X = canvas.width - 260 - COLS * BLOCK;
const VS_BOARD_Y = 120;

// Game state
let gameState = "menu";
let gameMode = null;
let botDifficultySelection = 1;

// Leaderboard data
const playerName = "Player";
const playerCountry = "US";

let tempName = "";
let pendingScore = 0;
let leaderboardData = null;
let leaderboardLoaded = false;
// Solo mode type: 'competitive' uploads score and disables undo, 'casual' enables undo and doesn't upload
window.soloType = window.soloType || 'competitive';
// Selection index used by the solo-type selection screen (0=Competitive,1=Casual)
window.soloTypeSelection = window.soloTypeSelection || 0;

// Time / FPS
let lastTime = 0;
let fps = 0;
let fpsAccum = 0;
let fpsFrames = 0;
let fpsLast = 0;

// Options state
let showFPS = true;
let backgroundGlowEnabled = true;
let masterVolume = 1.0;

// Menu selections
let menuSelection = 0;
let optionsSelection = 0;
let controlsSelection = 0;
let waitingForKeyBinding = null;

// Cheat: bot drives the player
let cheatActive = false;

// Button bounds
let topRightMenuButtons = [];
let soloMenuButtonBounds = null;
let soloRestartButtonBounds = null;
let vsMenuButtonBounds = null;

// Movement speed presets
const SPEED_PRESETS = [
  { name: "Slow",   gravity: 1200, das: 150, arr: 16, dcd: 0, sdf: 100, lock: 650 },
  { name: "Normal", gravity: 800,  das: 110, arr: 10, dcd: 0, sdf: 40,  lock: 500 },
  { name: "Fast",   gravity: 300,  das: 80,  arr: 6,  dcd: 0, sdf: 20,  lock: 350 },
];

let speedPresetIndex = 1;

let GRAVITY_DELAY = SPEED_PRESETS[speedPresetIndex].gravity;
let DAS = SPEED_PRESETS[speedPresetIndex].das;
let ARR = SPEED_PRESETS[speedPresetIndex].arr;
let DCD = SPEED_PRESETS[speedPresetIndex].dcd;
let SDF = SPEED_PRESETS[speedPresetIndex].sdf;
let LOCK_DELAY = SPEED_PRESETS[speedPresetIndex].lock;

let CUSTOM_SDF = Infinity;

function normalizeSdf(value) {
  if (value === Infinity || value === "Infinity") return Infinity;
  const n = Number(value);
  if (!Number.isFinite(n)) return Infinity;
  return Math.max(1, Math.min(40, Math.round(n)));
}

function getSoftDropDelayMs() {
  const sdf = getCurrentSdf();
  if (sdf === Infinity) return 0;
  return Math.max(1, Math.round(1000 / sdf));
}

function getCurrentDas() {
  return (CUSTOM_DAS !== null && CUSTOM_DAS !== undefined) ? CUSTOM_DAS : DAS;
}

function getCurrentArr() {
  return (CUSTOM_ARR !== null && CUSTOM_ARR !== undefined) ? CUSTOM_ARR : ARR;
}

function getCurrentDcd() {
  return (CUSTOM_DCD !== null && CUSTOM_DCD !== undefined) ? CUSTOM_DCD : DCD;
}

function getCurrentSdf() {
  return (CUSTOM_SDF !== null && CUSTOM_SDF !== undefined) ? CUSTOM_SDF : SDF;
}

function setSdf(value) {
  CUSTOM_SDF = normalizeSdf(value);
  window.CUSTOM_SDF = CUSTOM_SDF;
  window.CUSTOM_SOFT_DROP_SPEED = CUSTOM_SDF;
}

function applySpeedPreset() {
  const preset = SPEED_PRESETS[speedPresetIndex];
  GRAVITY_DELAY = preset.gravity;
  DAS = preset.das;
  ARR = preset.arr;
  DCD = preset.dcd;
  SDF = preset.sdf;
  LOCK_DELAY = preset.lock;

  
  try {
    if (solo) {
      solo.das = getCurrentDas();
      solo.arr = getCurrentArr();
      solo.dcd = getCurrentDcd();
      solo.gravityDelay = GRAVITY_DELAY;
    }
    if (player) {
      player.das = getCurrentDas();
      player.arr = getCurrentArr();
      player.dcd = getCurrentDcd();
      player.gravityDelay = GRAVITY_DELAY;
    }
    if (bot) {
      bot.das = getCurrentDas();
      bot.arr = getCurrentArr();
      bot.dcd = getCurrentDcd();
      bot.gravityDelay = GRAVITY_DELAY;
    }
  } catch (e) {
    
  }
}


let CUSTOM_DAS = null; 
let CUSTOM_ARR = null; 
let CUSTOM_DCD = null;


function setCustomPlayerSpeeds(dasMs, arrMs, dcdMs) {
  CUSTOM_DAS = (typeof dasMs === 'number') ? dasMs : CUSTOM_DAS;
  CUSTOM_ARR = (typeof arrMs === 'number') ? arrMs : CUSTOM_ARR;
  CUSTOM_DCD = (typeof dcdMs === 'number') ? dcdMs : CUSTOM_DCD;
  const dasVal = getCurrentDas();
  const arrVal = getCurrentArr();
  const dcdVal = getCurrentDcd();
  if (solo) { solo.das = dasVal; solo.arr = arrVal; solo.dcd = dcdVal; }
  if (player) { player.das = dasVal; player.arr = arrVal; player.dcd = dcdVal; }
  if (bot) { bot.das = dasVal; bot.arr = arrVal; bot.dcd = dcdVal; }
  // mirror to window so UI can read the current values
  window.CUSTOM_DAS = CUSTOM_DAS;
  window.CUSTOM_ARR = CUSTOM_ARR;
  window.CUSTOM_DCD = CUSTOM_DCD;
}
window.setCustomPlayerSpeeds = setCustomPlayerSpeeds;
window.setSdf = setSdf;
window.setSoftDropSpeed = setSdf;

// expose current custom values on window for UI to read
window.CUSTOM_DAS = CUSTOM_DAS;
window.CUSTOM_ARR = CUSTOM_ARR;
window.CUSTOM_DCD = CUSTOM_DCD;
window.CUSTOM_SDF = CUSTOM_SDF;
window.CUSTOM_SOFT_DROP_SPEED = CUSTOM_SDF;

// Recalculate per-player speeds based on level (called when level/time changes)
function recalcPlayerSpeeds(pState) {
  if (!pState) return;
  // Gravity speeds up with level; clamp to a minimum so it doesn't become instant
  const baseGravity = GRAVITY_DELAY;
  const levelFactor = Math.pow(0.92, Math.max(0, pState.level - 1));
  pState.gravityDelay = Math.max(50, Math.round(baseGravity * levelFactor));
}

// Bot difficulty defaults
let botDifficulty = 1;
let BOT_MOVE_INTERVAL = 1.0;
let BOT_DROP_INTERVAL = 1.0;
let BOT_RETHINK_CHANCE = 0.1;
let BOT_HOLE_PENALTY = 22;
let BOT_PLACEMENT_ACCURACY = 1.0;  
let BOT_AGGRESSION = 0.5;          

function applyBotDifficulty() {
  if (botDifficulty === 0) {
    // EASY: very beatable for most players.
    BOT_MOVE_INTERVAL = 0.95;
    BOT_DROP_INTERVAL = 0.75;
    BOT_RETHINK_CHANCE = 0.28;
    BOT_HOLE_PENALTY = 9;
    BOT_PLACEMENT_ACCURACY = 0.50;
    BOT_AGGRESSION = 0.28;
  } else if (botDifficulty === 1) {
    // MEDIUM: pro-like and consistent, but not impossible.
    BOT_MOVE_INTERVAL = 0.24;
    BOT_DROP_INTERVAL = 0.18;
    BOT_RETHINK_CHANCE = 0.05;
    BOT_HOLE_PENALTY = 34;
    BOT_PLACEMENT_ACCURACY = 0.93;
    BOT_AGGRESSION = 0.74;
  } else if (botDifficulty === 2) {
    // HARD: near-perfect and relentless.
    BOT_MOVE_INTERVAL = 0.025;
    BOT_DROP_INTERVAL = 0.02;
    BOT_RETHINK_CHANCE = 0.0;
    BOT_HOLE_PENALTY = 95;
    BOT_PLACEMENT_ACCURACY = 1.0;
    BOT_AGGRESSION = 1.0;
  } else {
    BOT_MOVE_INTERVAL = 1.0;
    BOT_DROP_INTERVAL = 1.0;
    BOT_RETHINK_CHANCE = 0.1;
    BOT_HOLE_PENALTY = 22;
    BOT_PLACEMENT_ACCURACY = 0.85;
    BOT_AGGRESSION = 0.5;
  }
}
applyBotDifficulty();


const keys = { left: false, right: false, softDrop: false, hardDrop: false };

const THEMES = {
  regular: {
    name: "Regular",
    titleLabel: "TETRIS+",
    backgroundGradient: ["#003366", "#001122"],
    boardBg: "#151515",
    gridColor: "#222",
    hudTextColor: "#ffffff",
    holdNextBg: "#181818",
    garbageColor: "#444",
    glowColor: "rgba(255,255,255,0.35)",
    menuLogoColor: "#ffffff",
    menuLogoShadow: "rgba(0, 150, 255, 0.9)",
    menuButtonColors: ["#00ccff","#56c774","#66ccff","#3366ff","#8e6fff"],
    menuBannerBg: "rgba(0,0,0,0.4)",
    menuBannerAccent: "#00ccff",
    pieceColors: { I: "#00FFFF", O: "#FFFF00", T: "#AA00FF", S: "#00FF00", Z: "#FF0000", J: "#0000FF", L: "#FFAA00" }
  },
  neon: {
    name: "Neon",
    titleLabel: "TETRIS+ NEON",
    backgroundGradient: ["#050510", "#000000"],
    boardBg: "#080818",
    gridColor: "#222",
    hudTextColor: "#8cfffd",
    holdNextBg: "#101025",
    garbageColor: "#333",
    glowColor: "rgba(0,255,255,0.75)",
    menuLogoColor: "#8cfffd",
    menuLogoShadow: "rgba(0,255,255,0.9)",
    menuButtonColors: ["#00f6ff","#00ff7a","#66a8ff","#3a4bff","#c04bff"],
    menuBannerBg: "rgba(5,5,25,0.9)",
    menuBannerAccent: "#00f6ff",
    pieceColors: { I: "#00F6FF", O: "#FFE257", T: "#FF4BFF", S: "#3CFF8F", Z: "#FF4B6E", J: "#4B7CFF", L: "#FFB44B" }
  },
  ice: {
    name: "Ice",
    titleLabel: "TETRIS+ ICE",
    backgroundGradient: ["#0a1a2a", "#020610"],
    boardBg: "#0f2438",
    gridColor: "#1c3b57",
    hudTextColor: "#d6f3ff",
    holdNextBg: "#12304a",
    garbageColor: "#3a6a8a",
    glowColor: "rgba(120,200,255,0.65)",
    menuLogoColor: "#d6f3ff",
    menuLogoShadow: "rgba(150,210,255,0.9)",
    menuButtonColors: ["#66d0ff","#7ae0b9","#9ed6ff","#4a7dff","#9f8cff"],
    menuBannerBg: "rgba(3,15,30,0.9)",
    menuBannerAccent: "#66d0ff",
    pieceColors: { I: "#8BE9FF", O: "#F1FBFF", T: "#C9E0FF", S: "#A3F5FF", Z: "#FFAEC4", J: "#9CB6FF", L: "#F7D39B" }
  },
  fire: {
    name: "Fire",
    titleLabel: "TETRIS+ FIRESTORM",
    backgroundGradient: ["#400000", "#0a0000"],
    boardBg: "#260800",
    gridColor: "#331000",
    hudTextColor: "#ffb38a",
    holdNextBg: "#3a0d00",
    garbageColor: "#662000",
    glowColor: "rgba(255,80,20,0.7)",
    menuLogoColor: "#ffb38a",
    menuLogoShadow: "rgba(255,120,40,0.9)",
    menuButtonColors: ["#ff8a3a","#ffb84a","#ff7a7a","#ff4a4a","#ff7aff"],
    menuBannerBg: "rgba(35,5,0,0.9)",
    menuBannerAccent: "#ff8a3a",
    pieceColors: { I: "#FF8F4F", O: "#FFD55A", T: "#FF7AFF", S: "#FFB14F", Z: "#FF4F4F", J: "#FF7A4F", L: "#FFC44F" }
  },
  retro: {
    name: "Retro",
    titleLabel: "TETRIS+ RETRO",
    backgroundGradient: ["#1a1a1a", "#050505"],
    boardBg: "#202020",
    gridColor: "#333",
    hudTextColor: "#00ff66",
    holdNextBg: "#262626",
    garbageColor: "#444",
    glowColor: "rgba(0,255,102,0.5)",
    menuLogoColor: "#00ff66",
    menuLogoShadow: "rgba(0,255,102,0.9)",
    menuButtonColors: ["#00ff66","#9fff3a","#66ffb0","#4affd5","#ffc94a"],
    menuBannerBg: "rgba(10,10,10,0.95)",
    menuBannerAccent: "#00ff66",
    pieceColors: { I: "#00FFCC", O: "#FFFF66", T: "#FF66FF", S: "#66FF99", Z: "#FF6666", J: "#6699FF", L: "#FFCC66" }
  }
};

let currentThemeKey = "regular";
let currentTheme = THEMES[currentThemeKey];

const TETROMINOES = {
  I: {
    baseColor: "#00FFFF",
    kicks: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
  },
  O: {
    baseColor: "#FFFF00",
    kicks: [[0, 0]],
    shapes: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
  },
  T: {
    baseColor: "#AA00FF",
    kicks: [[0,0],[1,0],[-1,0],[0,-1]],
    shapes: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
  },
  S: {
    baseColor: "#00FF00",
    kicks: [[0,0],[1,0],[-1,0]],
    shapes: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
  },
  Z: {
    baseColor: "#FF0000",
    kicks: [[0,0],[1,0],[-1,0]],
    shapes: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
  },
  J: {
    baseColor: "#0000FF",
    kicks: [[0,0],[1,0],[-1,0]],
    shapes: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
  },
  L: {
    baseColor: "#FFAA00",
    kicks: [[0,0],[1,0],[-1,0]],
    shapes: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  },
};

const BAG_ORDER = ["I", "O", "T", "S", "Z", "J", "L"];

function getPieceColor(type) {
  const theme = currentTheme;
  if (theme && theme.pieceColors && theme.pieceColors[type]) {
    return theme.pieceColors[type];
  }
  return TETROMINOES[type].baseColor;
}

// FX hooks will be added by fx.js via fxAddOverlay etc.
// For safety, ensure overlays for current theme are set up when theme changes
function setupThemeOverlays() {
  // Clear previous overlays to avoid stacking
  if (window.fxClearOverlays) window.fxClearOverlays();

  // Re-register overlays that are static across themes
  // (fxAddOverlay calls are in ui.js where theme-specific overlays are added)
}

// Board and player state
function createEmptyBoard() {
  const m = [];
  for (let r = 0; r < ROWS; r++) {
    m.push(new Array(COLS).fill(null));
  }
  return m;
}

function randomBag() {
  const bag = BAG_ORDER.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function createPlayerState() {
  return {
    board: createEmptyBoard(),
    queue: [],
    hold: null,
    canHold: true,
    piece: null,
    pieceX: 0,
    pieceY: 0,
    rotation: 0,
    lastDropTime: 0,
    lastLockTime: 0,
    softDropping: false,
    dasDir: 0,
    dasTime: 0,
    arrTime: 0,
    // per-player timing overrides (allow personalized ARR/DAS/gravity)
    arr: getCurrentArr(),
    das: getCurrentDas(),
    dcd: getCurrentDcd(),
    gravityDelay: GRAVITY_DELAY,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    b2b: 0,
    lastAttack: 0,
    lastAttackAt: 0,
    lastClearWasLine: false,
    lastMoveWasRotation: false,
    lastKickUsed: false,
    alive: true,
    garbageQueue: 0,
    garbageHole: (Math.random() * COLS) | 0,
    garbageFlashUntil: 0,
    _target: null,
    _targetPiece: null,
    _nextMove: NaN,
    _nextDrop: NaN,
  };
}

let solo = createPlayerState();
let player = createPlayerState();
let bot = createPlayerState();

// SOLO history for undo/redo
let soloUndoStack = [];
let soloRedoStack = [];
const MAX_UNDO_STATES = 80;
let isUndoingOrRedoing = false;

function clonePlayerState(pState) {
  return JSON.parse(JSON.stringify(pState));
}

function pushUndoEveryAction() {
  if (isUndoingOrRedoing) return;
  if (gameMode === "solo" && solo.alive) {
    soloUndoStack.push(clonePlayerState(solo));
    if (soloUndoStack.length > MAX_UNDO_STATES) soloUndoStack.shift();
    soloRedoStack = [];
  }
}

function restoreSoloFromState(state) {
  solo = clonePlayerState(state);
}

function undoSolo() {
  if (gameMode !== "solo") return;
  if (soloUndoStack.length === 0) return;
  isUndoingOrRedoing = true;
  const current = clonePlayerState(solo);
  const prev = soloUndoStack.pop();
  soloRedoStack.push(current);
  restoreSoloFromState(prev);
  gameState = "playing";
  setTimeout(() => { isUndoingOrRedoing = false; }, 50);
}

function redoSolo() {
  if (gameMode !== "solo") return;
  if (soloRedoStack.length === 0) return;
  isUndoingOrRedoing = true;
  const current = clonePlayerState(solo);
  const next = soloRedoStack.pop();
  soloUndoStack.push(current);
  restoreSoloFromState(next);
  gameState = "playing";
  setTimeout(() => { isUndoingOrRedoing = false; }, 50);
}

// Popups
let popups = [];

function generateShape(piece, rot) {
  if (!piece) return [[]];
  const def = TETROMINOES[piece];
  return def.shapes[((rot % 4) + 4) % 4];
}

function canPlace(pState, px, py, rot) {
  const shape = generateShape(pState.piece, rot);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && pState.board[by][bx]) return false;
    }
  }
  return true;
}

function spawnPiece(pState) {
  while (pState.queue.length < 6) {
    pState.queue.push(...randomBag());
  }
  const type = pState.queue.shift();
  pState.piece = type;
  pState.rotation = 0;
  pState.pieceX = Math.floor(COLS / 2) - 2;
  pState.pieceY = 0;
  pState.canHold = true;
  pState.lastDropTime = performance.now();
  pState.lastLockTime = 0;
  pState.lastMoveWasRotation = false;
  pState.lastKickUsed = false;

  if (!canPlace(pState, pState.pieceX, pState.pieceY, pState.rotation)) {
    pState.alive = false;
    if (gameMode === "solo") {
      if (window.soloType === 'competitive') {
        gameState = "nameEntry";
        pendingScore = pState.score;
        tempName = "";
      } else {
        // casual: go to gameover without prompting for leaderboard name
        gameState = "gameover";
      }
    } else {
      gameState = "gameover";
    }
  }
}

function hardDropDistance(pState) {
  let dy = 0;
  while (canPlace(pState, pState.pieceX, pState.pieceY + dy + 1, pState.rotation)) {
    dy++;
  }
  return dy;
}

function lockPiece(pState) {
  const shape = generateShape(pState.piece, pState.rotation);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const bx = pState.pieceX + x;
      const by = pState.pieceY + y;
      if (by < 0) continue;
      pState.board[by][bx] = { type: pState.piece, color: getPieceColor(pState.piece) };
    }
  }

  const clearInfo = clearLines(pState);
  scoreAfterLock(pState, clearInfo);
  pState.lastClearWasLine = clearInfo.linesCleared > 0;
  spawnPiece(pState);
}

function clearLines(pState) {
  let linesCleared = 0;
  const newBoard = [];
  for (let r = 0; r < ROWS; r++) {
    if (pState.board[r].every(cell => cell)) {
      linesCleared++;
    } else {
      newBoard.push(pState.board[r]);
    }
  }
  while (newBoard.length < ROWS) {
    newBoard.unshift(new Array(COLS).fill(null));
  }
  pState.board = newBoard;

  const tSpin = detectTSpin(pState, linesCleared);
  const b2bWas = pState.b2b;
  const difficultClear = (linesCleared === 4 || !!tSpin.type);

  if (linesCleared > 0) pState.combo++;
  else pState.combo = 0;

  if (linesCleared > 0 && difficultClear) {
    pState.b2b++;
  } else if (linesCleared > 0) {
    pState.b2b = 0;
  }

  const allClear = linesCleared > 0 && pState.board.every(row => row.every(cell => !cell));
  const send = garbageForClear(linesCleared, tSpin, pState.combo, pState.b2b, allClear);
  pState.lastAttack = send;
  pState.lastAttackAt = performance.now();

  if (gameMode === "vsBot" && send > 0) {
    // Attack cancels your own pending garbage first, then sends the rest.
    let outgoing = send;
    if (pState.garbageQueue > 0) {
      const canceled = Math.min(pState.garbageQueue, outgoing);
      pState.garbageQueue -= canceled;
      outgoing -= canceled;
    }

    let opponent = null;
    if (pState === player) opponent = bot;
    else if (pState === bot) opponent = player;

    if (opponent && outgoing > 0) {
      opponent.garbageQueue += outgoing;
      opponent.garbageFlashUntil = performance.now() + 320;
      spawnBadgePopup(opponent, "GAR", `+${outgoing}`, "#ff8a5c");
    }
  }

  if (send > 0) spawnBadgePopup(pState, "ATK", `+${send}`, "#ff5f6d");
  if (pState.b2b >= 2 && difficultClear) spawnBadgePopup(pState, "B2B", `x${pState.b2b}`, "#5cd3ff");

  spawnClearPopup(pState, linesCleared, tSpin, b2bWas, pState.b2b, send, allClear);
  return { linesCleared, tSpin, send, allClear };
}

function detectTSpin(pState, linesCleared) {
  if (pState.piece !== "T") return { type: null, mini: false };
  if (!pState.lastMoveWasRotation) return { type: null, mini: false };

  const cx = pState.pieceX + 1;
  const cy = pState.pieceY + 1;

  let corners = 0;
  const check = [
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
    [cx - 1, cy + 1],
    [cx + 1, cy + 1],
  ];
  for (const [x, y] of check) {
    if (y < 0 || y >= ROWS || x < 0 || x >= COLS || pState.board[y][x]) {
      corners++;
    }
  }

  if (corners >= 3) {
    const mini = linesCleared < 2;
    return { type: "TSPIN", mini };
  }
  return { type: null, mini: false };
}

function garbageForClear(linesCleared, tSpin, combo, b2b, allClear = false) {
  if (!linesCleared) return 0;

  let base = 0;

  if (tSpin.type === "TSPIN") {
    if (tSpin.mini) {
      // Closer to TETR.IO/Guideline feel: mini single is weak.
      if (linesCleared === 1) base = 0;
      else if (linesCleared === 2) base = 1;
    } else {
      if (linesCleared === 1) base = 2;
      else if (linesCleared === 2) base = 4;
      else if (linesCleared === 3) base = 6;
    }
  } else {
    if (linesCleared === 1) base = 0;
    else if (linesCleared === 2) base = 1;
    else if (linesCleared === 3) base = 2;
    else if (linesCleared === 4) base = 4;
  }

  let b2bBonus = 0;
  if (b2b >= 2 && (linesCleared === 4 || tSpin.type)) {
    // Bonus starts on the second difficult clear in the chain.
    b2bBonus = 1 + Math.min(2, Math.floor((b2b - 2) / 4));
  }

  // REN/combo bonus table (ren = combo - 1), tuned toward TETR.IO-like pacing.
  const ren = Math.max(0, combo - 1);
  const comboTable = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];
  const comboBonus = (ren < comboTable.length) ? comboTable[ren] : 5;

  const allClearBonus = allClear ? 10 : 0;
  return Math.max(0, base + b2bBonus + comboBonus + allClearBonus);
}

function applyGarbage(pState) {
  let count = pState.garbageQueue | 0;
  if (!count) return;
  if (count > 8) count = 8;

  for (let i = 0; i < count; i++) {
    pState.board.shift();
    const intensity = Math.min(1, (pState.garbageQueue + i) / 16);
    const red = Math.round(80 + intensity * 140);
    const green = Math.round(40 + intensity * 60);
    const blue = Math.round(40 + intensity * 40);
    const row = new Array(COLS).fill({ type: "G", color: `rgb(${red},${green},${blue})` });

    if (typeof pState.garbageHole !== "number") pState.garbageHole = (Math.random() * COLS) | 0;
    if (Math.random() < 0.35) pState.garbageHole += (Math.random() < 0.5 ? -1 : 1);
    pState.garbageHole = Math.max(0, Math.min(COLS - 1, pState.garbageHole));
    const hole = pState.garbageHole;
    row[hole] = null;
    pState.board.push(row);
  }

  pState.garbageQueue -= count;
  if (count > 0) spawnBadgePopup(pState, "GAR", `+${count}`, "#ff9f43");
}

function scoreAfterLock(pState, { linesCleared, tSpin }) {
  let add = 0;
  const lvl = pState.level;

  if (tSpin.type === "TSPIN") {
    if (tSpin.mini) {
      if (linesCleared === 1) add += 200 * lvl;
    } else {
      if (linesCleared === 1) add += 400 * lvl;
      else if (linesCleared === 2) add += 700 * lvl;
      else if (linesCleared === 3) add += 1200 * lvl;
    }
  } else {
    if (linesCleared === 1) add += 100 * lvl;
    else if (linesCleared === 2) add += 300 * lvl;
    else if (linesCleared === 3) add += 500 * lvl;
    else if (linesCleared === 4) add += 800 * lvl;
  }

  if (linesCleared > 0) {
    pState.lines += linesCleared;
    const oldLevel = pState.level || 1;
    pState.level = 1 + Math.floor(pState.lines / 10);
    if (pState.level !== oldLevel) recalcPlayerSpeeds(pState);
  }

  pState.score += add;
}


function spawnPopup(pState, text, sub, x, y, color) {
  popups.push({ x, y, text, sub, color, t: 0, life: 900, owner: pState });
}

function popupAnchorForPlayer(pState) {
  const isVS = (gameMode === "vsBot");
  let boardX = SOLO_BOARD_X;
  let boardY = SOLO_BOARD_Y;
  if (isVS) {
    boardX = (pState === player) ? VS_PLAYER_BOARD_X : VS_BOT_BOARD_X;
    boardY = VS_BOARD_Y;
  }
  return {
    boardX,
    boardY,
    centerX: boardX + COLS * BLOCK / 2,
    centerY: boardY + 60
  };
}

function spawnBadgePopup(pState, icon, value, color) {
  const anchor = popupAnchorForPlayer(pState);
  const order = popups.filter(p => p.owner === pState && p.kind === "badge").length;
  const y = anchor.boardY + 22 + Math.min(4, order) * 24;
  const iconMap = {
    B2B: "⛓",
    ATK: "⚔",
    GAR: "🧱"
  };
  const iconGlyph = iconMap[icon] || "◆";
  popups.push({
    kind: "badge",
    owner: pState,
    x: anchor.boardX + COLS * BLOCK - 4,
    y,
    icon: iconGlyph,
    label: String(icon || ""),
    value: String(value || ""),
    color: color || "#ffffff",
    t: 0,
    life: 700
  });
}

function spawnClearPopup(pState, lines, tSpin, oldB2B, newB2B, sent = 0, allClear = false) {
  if (!lines && !tSpin.type && pState.combo <= 1) return;

  const anchor = popupAnchorForPlayer(pState);
  const centerX = anchor.centerX;
  const centerY = anchor.centerY;

  let main = "";
  let sub = "";

  if (tSpin.type === "TSPIN") {
    if (tSpin.mini) {
      if (lines === 1) main = "T-SPIN MINI SINGLE";
      else main = "T-SPIN MINI";
    } else {
      if (lines === 1) main = "T-SPIN SINGLE";
      else if (lines === 2) main = "T-SPIN DOUBLE";
      else if (lines === 3) main = "T-SPIN TRIPLE";
      else main = "T-SPIN";
    }
  } else {
    if (lines === 1) main = "SINGLE";
    else if (lines === 2) main = "DOUBLE";
    else if (lines === 3) main = "TRIPLE";
    else if (lines === 4) main = "TETRIS";
  }

  if (pState.combo >= 2) sub += `COMBO x${pState.combo} `;
  if (newB2B > 0 && (lines === 4 || tSpin.type)) sub += `B2B x${newB2B} `;
  if (sent > 0) sub += `+${sent} ATK `;
  if (allClear) sub += "ALL CLEAR";

  if (!main && sub) { main = sub; sub = ""; }

  if (main) {
    spawnPopup(pState, main, sub, centerX, centerY, currentTheme.hudTextColor);
  }
}

function updatePopups(delta) {
  for (const p of popups) p.t += delta;
  popups = popups.filter(p => p.t < p.life);
}

function drawPopups() {
  for (const p of popups) {
    const alpha = 1 - p.t / p.life;
    const rise = (p.t / p.life) * 40;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.kind === "badge") {
      const lift = (p.t / p.life) * 16;
      const pulse = 1 + (1 - p.t / p.life) * 0.08;
      const w = 96;
      const h = 22;
      const x = p.x - w / 2;
      const y = p.y - lift;

      ctx.translate(p.x, y + h / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-p.x, -(y + h / 2));

      ctx.fillStyle = "rgba(8,12,20,0.82)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = p.color || "#fff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = p.color || "#fff";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.icon || "", x + 8, y + h / 2 + 0.5);

      // Small label under icon keeps meaning clear while still icon-first.
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = "bold 8px Arial";
      ctx.fillText(p.label || "", x + 28, y + h / 2 + 0.5);

      ctx.fillStyle = p.color || "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(p.value || "", x + w - 8, y + h / 2 + 0.5);
      ctx.restore();
      continue;
    }

    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - rise);

    if (p.sub) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(p.sub, p.x, p.y - rise + 24);
    }
    ctx.restore();
  }
}

// Movement helpers used by bot.js and input handlers
function moveHoriz(pState, dir) {
  const nx = pState.pieceX + dir;
  if (canPlace(pState, nx, pState.pieceY, pState.rotation)) {
    if (gameMode === "solo" && pState === solo) pushUndoEveryAction();
    pState.pieceX = nx;
    return true;
  }
  return false;
}

function rotate(pState, dir) {
  const newRot = (pState.rotation + dir + 4) % 4;
  const kicks = TETROMINOES[pState.piece].kicks;

  for (const [kx, ky] of kicks) {
    const nx = pState.pieceX + kx;
    const ny = pState.pieceY + ky;
    if (canPlace(pState, nx, ny, newRot)) {
      if (gameMode === "solo" && pState === solo) pushUndoEveryAction();
      pState.pieceX = nx;
      pState.pieceY = ny;
      pState.rotation = newRot;
      pState.lastMoveWasRotation = true;
      pState.lastKickUsed = !(kx === 0 && ky === 0);
      return;
    }
  }
}

function rotate180(pState) { rotate(pState, 2); }

function holdPiece(pState) {
  if (!pState.canHold) return;
  if (gameMode === "solo" && pState === solo) pushUndoEveryAction();

  if (!pState.hold) {
    pState.hold = pState.piece;
    spawnPiece(pState);
  } else {
    const tmp = pState.hold;
    pState.hold = pState.piece;
    pState.piece = tmp;
    pState.rotation = 0;
    pState.pieceX = Math.floor(COLS / 2) - 2;
    pState.pieceY = 0;
    if (!canPlace(pState, pState.pieceX, pState.pieceY, pState.rotation)) {
      pState.alive = false;
      if (gameMode === "solo") {
        gameState = "nameEntry";
        pendingScore = pState.score;
        tempName = "";
      } else {
        gameState = "gameover";
      }
    }
  }

  pState.canHold = false;
}

function beginHorizontalInput(pState, dir, switchedDirection = false) {
  if (!pState || !dir) return;
  const now = performance.now();
  const localDAS = (typeof pState.das === 'number') ? pState.das : DAS;
  const localDCD = (typeof pState.dcd === 'number') ? pState.dcd : DCD;

  pState.dasDir = dir;
  moveHoriz(pState, dir);
  pState.arrTime = now;

  if (switchedDirection) {
    const preservedCharge = Math.max(0, Math.min(localDAS, localDCD));
    pState.dasTime = now - preservedCharge;
  } else {
    pState.dasTime = now;
  }
}

// Expose core functions used by other modules
window.canvas = canvas;
window.ctx = ctx;
window.COLs = COLS;
window.ROWS = ROWS;
window.VISIBLE_ROWS = VISIBLE_ROWS;
window.BLOCK = BLOCK;

window.spawnPiece = spawnPiece;
window.lockPiece = lockPiece;
window.clearLines = clearLines;
window.applyGarbage = applyGarbage;
window.hardDropDistance = hardDropDistance;
window.moveHoriz = moveHoriz;
window.rotate = rotate;
window.rotate180 = rotate180;
window.holdPiece = holdPiece;
window.beginHorizontalInput = beginHorizontalInput;
window.createPlayerState = createPlayerState;
window.clonePlayerState = clonePlayerState;
window.pushUndoEveryAction = pushUndoEveryAction;
window.updatePopups = updatePopups;
window.drawPopups = drawPopups;
window.spawnPopup = spawnPopup;
window.spawnClearPopup = spawnClearPopup;
window.applySpeedPreset = applySpeedPreset;
window.applyBotDifficulty = applyBotDifficulty;
window.setupThemeOverlays = setupThemeOverlays;

// All possible actions the player can bind
const ACTIONS = [
  "moveLeft",
  "moveRight",
  "softDrop",
  "hardDrop",
  "rotateCW",
  "rotateCCW",
  "reverseSpin",
  "hold",
  "pause",
  "restart",
  "undo",
  "redo"
];

// Default keybindings
let controlsConfig = {
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  softDrop: "s",
  hardDrop: "Space",
  rotateCW: "ArrowUp",
  rotateCCW: "ArrowDown",
  reverseSpin: "A",
  hold: "Shift",
  pause: "P",
  restart: "R",
  undo: "Ctrl+z"
};

function describeKeyEvent(e) {
  let key = e.key;
  if (key === " ") key = "Space";
  if (key === "Shift") key = "Shift";
  if (key.length === 1) key = key.toLowerCase();

  const combo = [];
  if (e.ctrlKey) combo.push("Ctrl");
  if (e.altKey) combo.push("Alt");
  if (e.shiftKey && key !== "Shift") combo.push("Shift");

  combo.push(key);
  return combo.join("+");
}

function actionFromKeyEvent(e) {
  const keyDesc = describeKeyEvent(e);
  // Accept either exact combo match (e.g. Ctrl+z) OR base key match (ArrowRight)
  const parts = keyDesc.split("+");
  const base = parts[parts.length - 1];
  for (const action of ACTIONS) {
    const cfg = (controlsConfig[action] || "").toLowerCase();
    if (!cfg) continue;
    if (cfg === keyDesc.toLowerCase()) return action;
    if (cfg === base.toLowerCase()) return action;
  }
  return null;
}

function handleMainMenuSelection() {
  if (menuSelection === 0) {
    // Show solo type selector (competitive vs casual) before starting
    gameState = 'soloTypeSelect';
    window.soloTypeSelection = 0;
  } else if (menuSelection === 1) {
    gameState = "botDifficultySelect";
  } else if (menuSelection === 2) {
    leaderboardLoaded = false;
    leaderboardData = null;

    window.loadLeaderboard().then(data => {
      leaderboardData = data;
      leaderboardLoaded = true;
    });

    gameState = "leaderboard";
  } else if (menuSelection === 3) {
    gameState = "controls";
  } else if (menuSelection === 4) {
    gameState = "options";
  }
}

// ==========================
// PLAYER UPDATE LOGIC (missing from split)
// ==========================

function updatePlayer(pState, now) {
  if (!pState.alive) return;

  if (pState.garbageQueue > 0) {
    applyGarbage(pState);
  }

  // Level can increase over time as well as by lines: every 60s = +1 level
  const timeLevels = pState.startTime ? Math.floor((now - pState.startTime) / 60000) : 0;
  const linesBasedLevel = 1 + Math.floor(pState.lines / 10);
  const newLevel = linesBasedLevel + timeLevels;
  if (newLevel !== pState.level) {
    pState.level = newLevel;
    recalcPlayerSpeeds(pState);
  }

  const fallDelay = pState.gravityDelay || GRAVITY_DELAY;
  const softDropDelay = getSoftDropDelayMs();
  const currentSdf = getCurrentSdf();

  if (pState.softDropping && currentSdf === Infinity) {
    const dy = hardDropDistance(pState);
    if (dy > 0) {
      if (gameMode === "solo" && pState === solo) pushUndoEveryAction();
      pState.pieceY += dy;
    }
    lockPiece(pState);
  } else if (now - pState.lastDropTime >= (pState.softDropping ? softDropDelay : fallDelay)) {
    if (canPlace(pState, pState.pieceX, pState.pieceY + 1, pState.rotation)) {
      if (gameMode === "solo" && pState === solo) pushUndoEveryAction();
      pState.pieceY++;
      pState.lastDropTime = now;
      pState.lastLockTime = now;
    } else {
      if (!pState.lastLockTime) pState.lastLockTime = now;
      if (now - pState.lastLockTime >= LOCK_DELAY) {
        lockPiece(pState);
      }
    }
  }

  handleHorizontalMovement(pState, now);
}

function handleHorizontalMovement(pState, now) {
  if (!pState.dasDir) return;

  const localDAS = (typeof pState.das === 'number') ? pState.das : DAS;
  const localARR = (typeof pState.arr === 'number') ? pState.arr : ARR;

  if (!pState.dasTime) {
    pState.dasTime = now;
    return;
  }

  if (now - pState.dasTime < localDAS) return;

  if (!pState.arrTime) pState.arrTime = now;

  if (now - pState.arrTime >= localARR) {
    if (moveHoriz(pState, pState.dasDir)) {
      pState.arrTime = now;
    }
  }
}

// Expose globally
window.updatePlayer = updatePlayer;
window.handleHorizontalMovement = handleHorizontalMovement;
window.describeKeyEvent = describeKeyEvent;
window.actionFromKeyEvent = actionFromKeyEvent;
window.handleMainMenuSelection = handleMainMenuSelection;
