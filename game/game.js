// game/game.js — Dino+ Game Engine
// ═══════════════════════════════════════════════
// SOUND SYSTEM
// ═══════════════════════════════════════════════

const sounds = {
  jump: new Audio(chrome.runtime.getURL("assets/sounds/jump.mp3")),
  coin: new Audio(chrome.runtime.getURL("assets/sounds/coin.mp3")),
  hit: new Audio(chrome.runtime.getURL("assets/sounds/hit.mp3"))
};

Object.values(sounds).forEach(sound => {
  sound.volume = 0.5;
  sound.preload = "auto";
});

function playSound(audio) {
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;

  audio.play().catch(err => {
    console.log("Sound blocked:", err);
  });
}

// ═══════════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════════

const CANVAS_W = 900;
const CANVAS_H = 300;
const GROUND_Y = 240;

const DIFFICULTY = {
  easy:   { baseSpeed: 4.5,   speedInc: 0.0005, spawnMin: 90,  spawnMax: 170, coinMult: 1   },
  normal: { baseSpeed: 5.5, speedInc: 0.001, spawnMin: 60,  spawnMax: 120, coinMult: 1.5 },
  hard:   { baseSpeed: 7.5,   speedInc: 0.0014, spawnMin: 40,  spawnMax: 85,  coinMult: 2   }
};

const SKIN_COLORS = {
  classic: { body: '#5d5d5d', belly: '#999',    eye: '#fff', pupil: '#222', accent: '#444' },
  green:   { body: '#27ae60', belly: '#2ecc71', eye: '#fff', pupil: '#145a32', accent: '#1e8449' },
  blue:    { body: '#2471a3', belly: '#3498db', eye: '#fff', pupil: '#1a4a70', accent: '#1a6090' },
  red:     { body: '#b03a2e', belly: '#e74c3c', eye: '#fff', pupil: '#6b1c14', accent: '#922b21' },
  robot:   { body: '#717d7e', belly: '#aab7b8', eye: '#f39c12', pupil: '#e67e22', accent: '#566573' },
  gold:    { body: '#b7950b', belly: '#f1c40f', eye: '#fff', pupil: '#7d6608', accent: '#d4ac0d' }
};

const OBSTACLE_COLORS = {
  cactus: { body: '#2ecc71', shadow: '#27ae60', spine: '#1e8449' },
  bird:   { body: '#9b59b6', wing: '#8e44ad', eye: '#f1c40f' }
};

// ═══════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════

let canvas, ctx;
let gameState = 'idle'; // idle | playing | dead
let score = 0;
let bestScore = 0;
let coins = 0;
let frameCount = 0;
let speed = 5.5;
let animFrameId;
let diffConfig = DIFFICULTY.normal;
let currentSkin = 'classic';
let currentTheme = 'dark';
let totalCoins = 0;
let difficultyKey = 'normal';
let panelVisible = false;
let volume = 1;

chrome.storage.local.get(["volume"], (data) => {
  volume = data.volume ?? 0.2;   // 🔥 default = 20%

  updateVolumeUI();
});

// ── Dino ──
const dino = {
  x: 80,
  y: GROUND_Y,
  w: 44,
  h: 52,
  vy: 0,
  jumping: false,
  ducking: false,
  frame: 0, // leg animation
  frameTimer: 0,
  get hitbox() {
    if (this.ducking) {
      return { x: this.x + 4, y: this.y + 26, w: this.w - 6, h: 26 };
    }
    return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 };
  }
};

// ── Obstacles ──
let obstacles = [];
let nextObstacle = 80;

// ── Clouds / stars ──
let clouds = [];
let stars = [];

// ── Ground tiles ──
let groundX = 0;

// ── Keys ──
const keys = { space: false, up: false, down: false };

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

async function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  const data = await Storage.get();
  bestScore = data.highScore || 0;
  totalCoins = data.coins || 0;
  currentSkin = data.selectedSkin || 'classic';
  difficultyKey = data.settings?.difficulty || 'normal';
  currentTheme = data.settings?.theme || 'dark';

  // Apply theme
  document.body.className = `theme-${currentTheme}`;

  // Update HUD
  updateHUD();

  // Set difficulty display
  diffConfig = DIFFICULTY[difficultyKey];
  speed = diffConfig.baseSpeed;
  const badge = document.getElementById('diff-badge');
  badge.textContent = difficultyKey.toUpperCase();
  badge.className = `diff-badge ${difficultyKey}`;

  // Generate initial clouds/stars
  for (let i = 0; i < 6; i++) {
    clouds.push({ x: Math.random() * CANVAS_W, y: 20 + Math.random() * 80, w: 50 + Math.random() * 60, speed: 0.3 + Math.random() * 0.3 });
  }
  if (currentTheme === 'dark') {
    for (let i = 0; i < 40; i++) {
      stars.push({ x: Math.random() * CANVAS_W, y: Math.random() * 160, r: Math.random() * 1.2 + 0.3, twinkle: Math.random() * Math.PI * 2 });
    }
  }

  setupInput();
  setupButtons();

  // Draw initial frame
  drawFrame();
}

// ═══════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════

function setupInput() {
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault();
      keys.space = true;
      if (gameState === 'idle') startGame();
      else if (gameState === 'playing') dinoJump();
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); keys.down = true; }
    if (e.key === 'r' || e.key === 'R') {
      if (gameState === 'dead') restartGame();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') keys.space = false;
    if (e.key === 'ArrowDown') { keys.down = false; if (dino.ducking) unduck(); }
  });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const y = touch.clientY / canvas.getBoundingClientRect().height;
    if (y > 0.6) {
      // bottom = duck
      if (gameState === 'playing') startDuck();
    } else {
      if (gameState === 'idle') startGame();
      else if (gameState === 'playing') dinoJump();
      else if (gameState === 'dead') restartGame();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    if (dino.ducking) unduck();
  });
}

function setupButtons() {
  document.getElementById('start-btn').addEventListener('click', () => startGame());
  document.getElementById('restart-btn').addEventListener('click', () => restartGame());
  document.getElementById('shop-link-btn').addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('shop/shop.html');
  });
}

// ═══════════════════════════════════════════════
// GAME CONTROL
// ═══════════════════════════════════════════════

function startGame() {
  document.getElementById('start-screen').classList.add('hidden');
  gameState = 'playing';
  score = 0;
  frameCount = 0;
  speed = diffConfig.baseSpeed;
  obstacles = [];
  nextObstacle = diffConfig.spawnMin + Math.floor(Math.random() * (diffConfig.spawnMax - diffConfig.spawnMin));
  groundX = 0;

  // Reset dino
  dino.y = GROUND_Y;
  dino.vy = 0;
  dino.jumping = false;
  dino.ducking = false;
  dino.frame = 0;

  loop();
}

function restartGame() {
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('new-best-banner').classList.add('hidden');
  startGame();
}

async function gameOver() {
  playSound(sounds.hit);
  gameState = 'dead';
  cancelAnimationFrame(animFrameId);

  // Calculate coins earned
  const earned = Math.floor((score / 100) * diffConfig.coinMult);

  // Update storage
  const newBest = await Storage.updateHighScore(score);
  const newCoins = await Storage.updateCoins(earned);
  bestScore = newBest;
  totalCoins = newCoins;

  // Show game over screen
  document.getElementById('go-score').textContent = Math.floor(score).toLocaleString();
  document.getElementById('go-best').textContent = newBest.toLocaleString();
  document.getElementById('go-coins').textContent = `+${earned}`;
  document.getElementById('hud-best').textContent = newBest.toLocaleString();
  document.getElementById('hud-coins').textContent = newCoins.toLocaleString();

  if (Math.floor(score) >= newBest && Math.floor(score) > 0) {
    document.getElementById('new-best-banner').classList.remove('hidden');
  }

  document.getElementById('gameover-screen').classList.remove('hidden');

  // Flash effect
  drawDeathFlash();
}

// ═══════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════

function loop() {
  animFrameId = requestAnimationFrame(loop);
  update();
  drawFrame();
}

function loop() {
  animFrameId = requestAnimationFrame(loop);
  update();
  drawFrame();
}

function update() {
  frameCount++;
  score += 0.1;

  speed += diffConfig.speedInc;

  if (speed > diffConfig.maxSpeed) {
    speed = diffConfig.maxSpeed;
  }

  if (frameCount % 6 === 0) {
    document.getElementById('hud-score').textContent =
      Math.floor(score).toLocaleString();
  }

  updateDino();
  updateObstacles();

  groundX -= speed;
  if (groundX < -900) groundX += 900;

  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x + c.w < 0) {
      c.x = CANVAS_W + 20;
      c.y = 20 + Math.random() * 80;
      c.w = 50 + Math.random() * 60;
    }
  });
}

function updateDino() {
  // Ducking
  if (keys.down && !dino.jumping) {
    startDuck();
  }

  // Apply gravity
  if (dino.jumping) {
    dino.vy += 0.55;
    dino.y += dino.vy;
    if (dino.y >= GROUND_Y) {
      dino.y = GROUND_Y;
      dino.vy = 0;
      dino.jumping = false;
    }
  }

  // Leg animation
  if (!dino.jumping) {
    dino.frameTimer++;
    const frameSpeed = Math.max(3, 10 - speed * 0.5);
    if (dino.frameTimer >= frameSpeed) {
      dino.frame = (dino.frame + 1) % 2;
      dino.frameTimer = 0;
    }
  }
}

function startDuck() {
  if (!dino.ducking && !dino.jumping) {
    dino.ducking = true;
    dino.h = 30;
    dino.y = GROUND_Y + 22;
  }
}

function unduck() {
  dino.ducking = false;
  dino.h = 52;
  dino.y = GROUND_Y;
}

function dinoJump() {
  if (!dino.jumping && !dino.ducking) {
    dino.jumping = true;
    dino.vy = -13;

    playSound(sounds.jump);
  }
}

function collectCoin(coin) {
    coins += coin.value;

    playSound(sounds.coin);

    updateHUD();
}



function updateObstacles() {
  nextObstacle--;

  if (nextObstacle <= 0) {
    spawnObstacle();
    nextObstacle = diffConfig.spawnMin + Math.floor(Math.random() * (diffConfig.spawnMax - diffConfig.spawnMin));
    nextObstacle = Math.max(nextObstacle, Math.floor(200 / speed * 3));
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= speed;

    // Bird vertical movement
    if (obs.type === 'bird') {
      obs.wingTimer++;
      if (obs.wingTimer > 8) {
        obs.wingFrame = (obs.wingFrame + 1) % 2;
        obs.wingTimer = 0;
      }
    }

    // Collision detection
    if (checkCollision(dino.hitbox, obs.hitbox)) {
      gameOver();
      return;
    }

    // Remove off-screen
    if (obs.x + obs.w < -10) {
      obstacles.splice(i, 1);
    }
  }
}

function spawnObstacle() {
  const type = Math.random() < 0.3 && score > 200 ? 'bird' : 'cactus';

  if (type === 'cactus') {
    const variant = Math.floor(Math.random() * 3);
    let w, h;
    switch (variant) {
      case 0: w = 24; h = 50; break; // tall single
      case 1: w = 48; h = 44; break; // double
      case 2: w = 70; h = 52; break; // triple
    }
    obstacles.push({
      type: 'cactus',
      variant,
      x: CANVAS_W + 20,
      y: GROUND_Y + 52 - h,
      w, h,
      get hitbox() { return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 }; }
    });
  } else {
    const yOptions = [GROUND_Y - 30, GROUND_Y - 60, GROUND_Y - 90];
    const y = yOptions[Math.floor(Math.random() * yOptions.length)];
    obstacles.push({
      type: 'bird',
      x: CANVAS_W + 20,
      y, w: 46, h: 30,
      wingFrame: 0, wingTimer: 0,
      get hitbox() { return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 }; }
    });
  }
}

function checkCollision(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// ═══════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════

function drawFrame() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground();
  drawGround();
  obstacles.forEach(obs => {
    if (obs.type === 'cactus') drawCactus(obs);
    else drawBird(obs);
  });
  drawDino();
}

function drawBackground() {
  const isDark = currentTheme === 'dark';
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  if (isDark) {
    gradient.addColorStop(0, '#080812');
    gradient.addColorStop(1, '#0d0d1e');
  } else {
    gradient.addColorStop(0, '#e8e8ff');
    gradient.addColorStop(1, '#f5f5ff');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars (dark only)
  if (isDark) {
    stars.forEach(s => {
      s.twinkle += 0.03;
      const alpha = 0.4 + Math.sin(s.twinkle) * 0.3;
      ctx.fillStyle = `rgba(200,200,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Clouds
  clouds.forEach(c => {
    if (isDark) {
      ctx.fillStyle = 'rgba(50,50,90,0.6)';
    } else {
      ctx.fillStyle = 'rgba(200,200,240,0.7)';
    }
    drawCloud(c.x, c.y, c.w);
  });

  // Speed lines (when going fast)
  if (gameState === 'playing' && speed > 8) {
    const alpha = Math.min((speed - 8) / 10, 0.15);
    ctx.strokeStyle = isDark ? `rgba(108,99,255,${alpha})` : `rgba(108,99,255,${alpha * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const x = (frameCount * 3 + i * 120) % (CANVAS_W + 100) - 50;
      const y = 60 + i * 22;
      const len = 30 + Math.random() * 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len, y);
      ctx.stroke();
    }
  }
}

function drawCloud(x, y, w) {
  const h = w * 0.35;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.5, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.3, y + h * 0.3, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.7, y + h * 0.35, w * 0.27, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  const isDark = currentTheme === 'dark';

  // Ground fill
  const gy = GROUND_Y + 52;
  const groundGrad = ctx.createLinearGradient(0, gy, 0, CANVAS_H);
  if (isDark) {
    groundGrad.addColorStop(0, '#1a1a38');
    groundGrad.addColorStop(1, '#12122a');
  } else {
    groundGrad.addColorStop(0, '#d0d0f0');
    groundGrad.addColorStop(1, '#c0c0e8');
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, gy, CANVAS_W, CANVAS_H - gy);

  // Ground line
  ctx.fillStyle = isDark ? '#2a2a52' : '#b0b0d8';
  ctx.fillRect(0, gy, CANVAS_W, 2);

  // Ground texture marks
  ctx.fillStyle = isDark ? 'rgba(60,60,100,0.5)' : 'rgba(150,150,200,0.5)';
  for (let i = 0; i < 20; i++) {
    const x = ((groundX + i * 48) % CANVAS_W + CANVAS_W) % CANVAS_W;
    ctx.fillRect(x, gy + 4, 20, 2);
    ctx.fillRect(x + 10, gy + 10, 8, 1);
  }
}

function drawDino() {
  const c = SKIN_COLORS[currentSkin] || SKIN_COLORS.classic;
  const x = dino.x;
  const y = dino.ducking ? dino.y - 26 : dino.y;
  const duck = dino.ducking;

  ctx.save();

  if (duck) {
    // ── DUCKING DINO ──
    // Long stretched body
    ctx.fillStyle = c.body;
    ctx.fillRect(x + 4, y + 26, 44, 20);
    // Head (low)
    ctx.fillRect(x + 28, y + 16, 20, 20);
    // Tail
    ctx.fillRect(x, y + 30, 10, 10);
    ctx.fillRect(x - 6, y + 34, 8, 6);
    // Belly
    ctx.fillStyle = c.belly;
    ctx.fillRect(x + 8, y + 32, 24, 10);
    // Legs (flat running)
    ctx.fillStyle = c.body;
    const legOff = dino.frame === 0 ? 0 : 6;
    ctx.fillRect(x + 10 + legOff, y + 44, 8, 10);
    ctx.fillRect(x + 26 - legOff, y + 44, 8, 10);
    // Eye
    ctx.fillStyle = c.eye;
    ctx.fillRect(x + 40, y + 18, 6, 6);
    ctx.fillStyle = c.pupil;
    ctx.fillRect(x + 43, y + 19, 3, 3);
  } else {
    // ── STANDING / JUMPING DINO ──
    // Body
    ctx.fillStyle = c.body;
    ctx.fillRect(x + 8, y + 20, 24, 20);
    // Head
    ctx.fillRect(x + 18, y + 2, 22, 20);
    // Neck
    ctx.fillRect(x + 16, y + 12, 8, 12);
    // Tail
    ctx.fillRect(x, y + 24, 12, 10);
    ctx.fillRect(x - 6, y + 28, 8, 6);
    // Snout extension
    ctx.fillRect(x + 36, y + 14, 6, 8);

    // Belly highlight
    ctx.fillStyle = c.belly;
    ctx.fillRect(x + 10, y + 28, 18, 10);

    // Legs
    ctx.fillStyle = c.body;
    if (dino.jumping) {
      // Mid-air: legs tucked
      ctx.fillRect(x + 10, y + 40, 8, 8);
      ctx.fillRect(x + 22, y + 38, 8, 10);
    } else {
      if (dino.frame === 0) {
        ctx.fillRect(x + 10, y + 40, 8, 14);  // left forward
        ctx.fillRect(x + 22, y + 40, 8, 8);   // right back
      } else {
        ctx.fillRect(x + 10, y + 40, 8, 8);   // left back
        ctx.fillRect(x + 22, y + 40, 8, 14);  // right forward
      }
    }

    // Eye white
    ctx.fillStyle = c.eye;
    ctx.fillRect(x + 32, y + 4, 6, 6);
    // Pupil
    ctx.fillStyle = c.pupil;
    ctx.fillRect(x + 35, y + 5, 3, 3);
    // Nostril
    ctx.fillStyle = c.pupil;
    ctx.fillRect(x + 39, y + 14, 2, 2);

    // Robot skin: chest panel
    if (currentSkin === 'robot') {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x + 12, y + 22, 14, 10);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(x + 14, y + 24, 4, 4);
      ctx.fillRect(x + 20, y + 24, 4, 4);
    }

    // Gold skin: crown
    if (currentSkin === 'gold') {
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(x + 18, y - 4, 18, 6);
      ctx.fillRect(x + 18, y - 8, 4, 4);
      ctx.fillRect(x + 24, y - 10, 4, 6);
      ctx.fillRect(x + 30, y - 8, 4, 4);
    }
  }

  ctx.restore();
}

function drawCactus(obs) {
  const isDark = currentTheme === 'dark';
  const stemColor = isDark ? '#2ecc71' : '#27ae60';
  const darkGreen = isDark ? '#1e8449' : '#196f3d';
  const x = obs.x;
  const y = obs.y;

  switch (obs.variant) {
    case 0: drawCactusVariant0(x, y, stemColor, darkGreen); break;
    case 1: drawCactusVariant1(x, y, stemColor, darkGreen); break;
    case 2: drawCactusVariant2(x, y, stemColor, darkGreen); break;
  }
}

function drawCactusVariant0(x, y, fill, dark) {
  // Tall single cactus
  ctx.fillStyle = fill;
  ctx.fillRect(x + 8, y, 8, 50);
  ctx.fillRect(x, y + 14, 24, 8);
  // Left arm
  ctx.fillRect(x, y + 8, 8, 14);
  // Right arm
  ctx.fillRect(x + 16, y + 14, 8, 14);
  // Spine accents
  ctx.fillStyle = dark;
  ctx.fillRect(x + 8, y + 2, 2, 8);
  ctx.fillRect(x + 14, y + 2, 2, 8);
}

function drawCactusVariant1(x, y, fill, dark) {
  // Double cactus
  ctx.fillStyle = fill;
  ctx.fillRect(x + 4, y + 4, 8, 40);
  ctx.fillRect(x + 20, y, 8, 44);
  ctx.fillRect(x, y + 16, 28, 8);
  ctx.fillRect(x, y + 10, 8, 14);
  ctx.fillRect(x + 28, y + 12, 8, 14);
  ctx.fillStyle = dark;
  ctx.fillRect(x + 4, y + 6, 2, 10);
  ctx.fillRect(x + 20, y + 2, 2, 10);
}

function drawCactusVariant2(x, y, fill, dark) {
  // Triple cluster
  ctx.fillStyle = fill;
  ctx.fillRect(x + 6, y + 8, 8, 44);
  ctx.fillRect(x + 22, y, 8, 52);
  ctx.fillRect(x + 42, y + 6, 8, 46);
  ctx.fillRect(x, y + 20, 24, 8);
  ctx.fillRect(x + 24, y + 18, 26, 8);
  ctx.fillRect(x, y + 14, 8, 14);
  ctx.fillRect(x + 50, y + 12, 8, 14);
  ctx.fillStyle = dark;
  ctx.fillRect(x + 6, y + 10, 2, 12);
  ctx.fillRect(x + 22, y + 2, 2, 12);
  ctx.fillRect(x + 42, y + 8, 2, 12);
}

function drawBird(obs) {
  const isDark = currentTheme === 'dark';
  const bodyColor = isDark ? '#9b59b6' : '#8e44ad';
  const wingColor = isDark ? '#6c3483' : '#7d3c98';
  const eyeColor = '#f1c40f';
  const x = obs.x;
  const y = obs.y;

  ctx.fillStyle = bodyColor;
  // Body
  ctx.fillRect(x + 8, y + 8, 28, 16);
  // Head
  ctx.fillRect(x + 30, y + 4, 14, 14);
  // Beak
  ctx.fillStyle = eyeColor;
  ctx.fillRect(x + 42, y + 8, 8, 4);
  // Wing (animated)
  ctx.fillStyle = wingColor;
  if (obs.wingFrame === 0) {
    ctx.fillRect(x + 4, y + 2, 30, 10); // up position
    ctx.fillRect(x, y, 10, 6);
  } else {
    ctx.fillRect(x + 4, y + 14, 30, 10); // down position
    ctx.fillRect(x, y + 18, 10, 6);
  }
  // Tail feathers
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y + 8, 12, 8);
  ctx.fillRect(x - 4, y + 10, 6, 4);
  // Eye
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 36, y + 6, 5, 5);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 38, y + 7, 3, 3);
}

function drawDeathFlash() {
  let alpha = 0.5;
  const flash = () => {
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(255,80,80,${alpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    alpha -= 0.05;
    requestAnimationFrame(flash);
  };
  flash();
}

// ═══════════════════════════════════════════════
// HUD UPDATE
// ═══════════════════════════════════════════════

function updateHUD() {
  document.getElementById('hud-best').textContent = bestScore.toLocaleString();
  document.getElementById('hud-score').textContent = '0';
  document.getElementById('hud-coins').textContent = totalCoins.toLocaleString();
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', init);





function renderCoins() {
  chrome.storage.local.get(["coins"], (data) => {
    const el = document.getElementById("coins-display");

    // SAFE GUARD (IMPORTANT)
    if (!el) return;

    el.innerText = data.coins || 0;
  });
}




/* 1. initial load */
renderCoins();

/* 2. AUTO SYNC (PLACE HERE) */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.coins) {
    renderCoins();
  }
});





const slider = document.getElementById("volumeSlider");

slider.addEventListener("input", (e) => {
  volume = parseFloat(e.target.value);

  chrome.storage.local.set({ volume });
});


function playSound(audio) {
  audio.volume = volume;   // 🔥 THIS is the missing link
  audio.play();
}

function updateVolumeUI() {
  document.getElementById("volumeSlider").value = volume;
}

document.getElementById("soundBtn").addEventListener("click", () => {
  panelVisible = !panelVisible;

  document.getElementById("volumePanel").classList.toggle("hidden");
});


document.getElementById("volumeSlider").addEventListener("input", (e) => {
  volume = parseFloat(e.target.value);

  chrome.storage.local.set({ volume });
});

document.addEventListener("click", (e) => {
  const wrapper = document.querySelector(".sound-wrapper");

  if (!wrapper.contains(e.target)) {
    document.getElementById("volumePanel").classList.add("hidden");
    panelVisible = false;
  }
});

