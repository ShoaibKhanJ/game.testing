// popup/popup.js

const SKIN_NAMES = {
  classic: 'Classic Dino',
  green:   'Green Dino',
  blue:    'Blue Dino',
  red:     'Red Dino',
  robot:   'Robot Dino',
  gold:    'Gold Dino'
};

const SKIN_COLORS = {
  classic: { body: '#5d5d5d', belly: '#888', eye: '#fff', pupil: '#222' },
  green:   { body: '#27ae60', belly: '#2ecc71', eye: '#fff', pupil: '#1a5c30' },
  blue:    { body: '#2980b9', belly: '#3498db', eye: '#fff', pupil: '#1a4a70' },
  red:     { body: '#c0392b', belly: '#e74c3c', eye: '#fff', pupil: '#6b1c14' },
  robot:   { body: '#7f8c8d', belly: '#95a5a6', eye: '#f39c12', pupil: '#e67e22' },
  gold:    { body: '#d4ac0d', belly: '#f1c40f', eye: '#fff', pupil: '#7d6608' }
};

const DIFFICULTY_LABELS = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

function drawDinoPreview(canvas, skinId) {
  const ctx = canvas.getContext('2d');
  const c = SKIN_COLORS[skinId] || SKIN_COLORS.classic;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const s = 2; // pixel scale
  ctx.fillStyle = c.body;

  // Body
  ctx.fillRect(20, 20, 24, 16);
  // Head
  ctx.fillRect(34, 8, 20, 16);
  // Tail
  ctx.fillRect(8, 22, 14, 8);
  ctx.fillRect(4, 26, 8, 4);
  // Neck connection
  ctx.fillRect(30, 14, 8, 8);
  // Legs
  ctx.fillRect(22, 36, 6, 12);
  ctx.fillRect(34, 36, 6, 12);

  // Belly accent
  ctx.fillStyle = c.belly;
  ctx.fillRect(22, 26, 16, 8);

  // Eye white
  ctx.fillStyle = c.eye;
  ctx.fillRect(46, 10, 6, 6);

  // Pupil
  ctx.fillStyle = c.pupil;
  ctx.fillRect(49, 11, 3, 3);

  // Nostril
  ctx.fillStyle = c.pupil;
  ctx.fillRect(52, 16, 2, 2);

  // Ground line
  ctx.fillStyle = 'rgba(128,128,160,0.4)';
  ctx.fillRect(0, 50, canvas.width, 2);
}

async function init() {
  const data = await Storage.get();

  // Apply theme
  document.body.className = `theme-${data.settings.theme || 'dark'}`;

  // Update stats
  document.getElementById('coins-display').textContent = data.coins.toLocaleString();
  document.getElementById('highscore-display').textContent = data.highScore.toLocaleString();

  // Update skin info
  const skinId = data.selectedSkin || 'classic';
  document.getElementById('skin-name-display').textContent = SKIN_NAMES[skinId] || 'Classic Dino';
  drawDinoPreview(document.getElementById('skin-preview'), skinId);

  // Update difficulty badge
  const diff = data.settings.difficulty || 'normal';
  const badge = document.getElementById('difficulty-badge');
  badge.textContent = DIFFICULTY_LABELS[diff];
  badge.className = `difficulty-badge ${diff}`;

  // Buttons
  document.getElementById('play-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('game/game.html') });
    window.close();
  });

  document.getElementById('shop-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('shop/shop.html') });
    window.close();
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    window.close();
  });


  document.getElementById('reward-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('reward/reward.html') });
    window.close();
  });

}
document.addEventListener('DOMContentLoaded', init);



//Reward

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







