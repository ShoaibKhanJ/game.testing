// shop/shop.js
renderCoins();

const REWARD_SKIN_MAP = {
  green_dino: 'green'
};

const SKINS = [
  { id: 'classic', name: 'Classic Dino', price: 0,    description: 'The original gray champion.' },
  { id: 'green',   name: 'Green Dino',   price: 50,   description: 'Fresh jungle green vibes.' },
  { id: 'blue',    name: 'Blue Dino',    price: 150,  description: 'Cool ocean blue style.' },
  { id: 'red',     name: 'Red Dino',     price: 350,  description: 'Fierce fiery red edition.' },
  { id: 'robot',   name: 'Robot Dino',   price: 800,  description: 'Cyberpunk chrome armor.' },
  { id: 'gold',    name: 'Gold Dino',    price: 2000, description: 'Legendary golden crown.' }
];

const SKIN_COLORS = {
  classic: { body: '#5d5d5d', belly: '#999',    eye: '#fff', pupil: '#222', accent: '#444' },
  green:   { body: '#a4ba24', belly: '#aee22a', eye: '#fff', pupil: '#145a32', accent: '#1e8449' },
  blue:    { body: '#2471a3', belly: '#3498db', eye: '#fff', pupil: '#1a4a70', accent: '#1a6090' },
  red:     { body: '#b03a2e', belly: '#e74c3c', eye: '#fff', pupil: '#6b1c14', accent: '#922b21' },
  robot:   { body: '#717d7e', belly: '#aab7b8', eye: '#f39c12', pupil: '#e67e22', accent: '#566573' },
  gold:    { body: '#b7950b', belly: '#f1c40f', eye: '#fff', pupil: '#7d6608', accent: '#d4ac0d' }
};

let state = {
  coins: 0,
  selectedSkin: 'classic',
  unlockedSkins: ['classic'],
  theme: 'dark'
};



let activeSkinId = null; // skin being previewed in modal

// ── DRAW DINO ON CANVAS ──
function drawDino(canvas, skinId, scale = 2) {
  const ctx = canvas.getContext('2d');
  const c = SKIN_COLORS[skinId] || SKIN_COLORS.classic;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const x = w * 0.1;
  const y = h * 0.18;

  ctx.fillStyle = c.body;
  // Body
  ctx.fillRect(x + 8*scale, y + 20*scale, 24*scale, 20*scale);
  // Head
  ctx.fillRect(x + 18*scale, y + 2*scale, 22*scale, 20*scale);
  // Neck
  ctx.fillRect(x + 16*scale, y + 12*scale, 8*scale, 12*scale);
  // Tail
  ctx.fillRect(x, y + 24*scale, 12*scale, 10*scale);
  ctx.fillRect(x - 6*scale, y + 28*scale, 8*scale, 6*scale);
  // Snout
  ctx.fillRect(x + 36*scale, y + 14*scale, 6*scale, 8*scale);

  // Belly
  ctx.fillStyle = c.belly;
  ctx.fillRect(x + 10*scale, y + 28*scale, 18*scale, 10*scale);

  // Legs (standing pose)
  ctx.fillStyle = c.body;
  ctx.fillRect(x + 10*scale, y + 40*scale, 8*scale, 14*scale);
  ctx.fillRect(x + 22*scale, y + 40*scale, 8*scale, 8*scale);

  // Eye white
  ctx.fillStyle = c.eye;
  ctx.fillRect(x + 32*scale, y + 4*scale, 6*scale, 6*scale);
  // Pupil
  ctx.fillStyle = c.pupil;
  ctx.fillRect(x + 35*scale, y + 5*scale, 3*scale, 3*scale);
  // Nostril
  ctx.fillStyle = c.pupil;
  ctx.fillRect(x + 39*scale, y + 14*scale, 2*scale, 2*scale);

  // Robot panel
  if (skinId === 'robot') {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 12*scale, y + 22*scale, 14*scale, 10*scale);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x + 14*scale, y + 24*scale, 4*scale, 4*scale);
    ctx.fillRect(x + 20*scale, y + 24*scale, 4*scale, 4*scale);
  }

  // Gold crown
  if (skinId === 'gold') {
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x + 18*scale, y - 4*scale, 18*scale, 6*scale);
    ctx.fillRect(x + 18*scale, y - 8*scale, 4*scale, 4*scale);
    ctx.fillRect(x + 24*scale, y - 10*scale, 4*scale, 6*scale);
    ctx.fillRect(x + 30*scale, y - 8*scale, 4*scale, 4*scale);
  }
}

// ── CARD RENDERING ──
function createSkinCard(skin) {
  const unlocked = state.unlockedSkins.includes(skin.id);
  const isActive = state.selectedSkin === skin.id;
  const isFree = skin.price === 0;

  const card = document.createElement('div');
  card.className = `skin-card ${isActive ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;
  card.dataset.skinId = skin.id;

  // Active badge
  if (isActive) {
    const badge = document.createElement('div');
    badge.className = 'active-badge';
    badge.textContent = 'Equipped';
    card.appendChild(badge);
  } else if (!unlocked) {
    const lock = document.createElement('div');
    lock.className = 'lock-overlay';
    lock.textContent = '🔒';
    card.appendChild(lock);
  }

  // Canvas preview
  const previewDiv = document.createElement('div');
  previewDiv.className = 'card-preview';
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 100;
  previewCanvas.height = 80;
  previewDiv.appendChild(previewCanvas);
  card.appendChild(previewDiv);

  // Render dino
  drawDino(previewCanvas, skin.id, 1.2);

  // Info
  const info = document.createElement('div');
  info.className = 'card-info';

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = skin.name;

  const price = document.createElement('div');
  price.className = 'card-price';
  if (isActive || unlocked) {
    price.textContent = isActive ? '✓ Equipped' : 'Owned';
    price.classList.add(isActive ? 'owned' : 'owned');
  } else if (isFree) {
    price.textContent = 'Free';
    price.classList.add('free');
  } else {
    price.textContent = `🪙 ${skin.price.toLocaleString()} coins`;
    price.classList.add('gold');
  }

  info.appendChild(name);
  info.appendChild(price);
  card.appendChild(info);

  card.addEventListener('click', () => openModal(skin));

  return card;
}

// ── MODAL ──
function openModal(skin) {
  activeSkinId = skin.id;
  const unlocked = state.unlockedSkins.includes(skin.id);
  const isActive = state.selectedSkin === skin.id;

  document.getElementById('modal-title').textContent = skin.name;
  document.getElementById('modal-price').textContent = skin.price === 0 ? 'Free' : `🪙 ${skin.price.toLocaleString()} coins`;
  document.getElementById('modal-status').textContent = skin.description;

  // Draw modal preview
  const modalCanvas = document.getElementById('modal-canvas');
  drawDino(modalCanvas, skin.id, 2);

  // Buttons
  const buyBtn = document.getElementById('modal-buy-btn');
  const selectBtn = document.getElementById('modal-select-btn');
  const activeBtn = document.getElementById('modal-active-btn');

  buyBtn.classList.add('hidden');
  selectBtn.classList.add('hidden');
  activeBtn.classList.add('hidden');

  if (isActive) {
    activeBtn.classList.remove('hidden');
  } else if (unlocked) {
    selectBtn.classList.remove('hidden');
  } else {
    buyBtn.classList.remove('hidden');
    const canAfford = state.coins >= skin.price;
    buyBtn.style.opacity = canAfford ? '1' : '0.5';
    buyBtn.title = canAfford ? '' : `Need ${skin.price - state.coins} more coins`;
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  activeSkinId = null;
}

// ── SHOP ACTIONS ──
async function buySkin() {
  const skin = SKINS.find(s => s.id === activeSkinId);
  if (!skin) return;

  if (state.coins < skin.price) {
    showToast(`Need ${(skin.price - state.coins).toLocaleString()} more coins!`, 'error');
    return;
  }

  await Storage.updateCoins(-skin.price);
  await Storage.unlockSkin(skin.id);

  state.coins -= skin.price;
  state.unlockedSkins.push(skin.id);

  updateBalance();
  refreshGrid();
  closeModal();
  showToast(`✓ ${skin.name} unlocked!`, 'success');

  // Auto-equip if just bought
  await selectSkin();
}

async function selectSkin() {
  if (!activeSkinId) return;

  // STEP 1: find name BEFORE any state change
  const skinName = SKINS.find(s => s.id === activeSkinId)?.name || "Skin";

  // STEP 2: update storage
  await Storage.selectSkin(activeSkinId);

  // STEP 3: update state
  state.selectedSkin = activeSkinId;

  // STEP 4: UI updates
  refreshGrid();
  closeModal();

  // STEP 5: toast LAST
  showToast(`✓ ${skinName} equipped!`, 'info');
}

// ── UTILS ──
function updateBalance() {
  document.getElementById('balance-display').textContent = state.coins.toLocaleString();
}

function refreshGrid() {
  const grid = document.getElementById('skins-grid');
  grid.innerHTML = '';
  SKINS.forEach(skin => grid.appendChild(createSkinCard(skin)));
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2400);
}

// ── INIT ──
async function init() {
  const data = await Storage.get();
  state.coins = data.coins || 0;
  state.selectedSkin = data.selectedSkin || 'classic';
  state.unlockedSkins = (data.unlockedSkins || ['classic'])
  .map(id => REWARD_SKIN_MAP[id] || id);
  state.theme = data.settings?.theme || 'dark';

  document.body.className = `theme-${state.theme}`;
  if (!state.unlockedSkins.includes('classic')) {
  state.unlockedSkins.push('classic');
}
  updateBalance();
  refreshGrid();

  // Modal events
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('modal-buy-btn').addEventListener('click', buySkin);
  document.getElementById('modal-select-btn').addEventListener('click', selectSkin);

  // Back button
  document.getElementById('back-btn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = chrome.runtime.getURL('game/game.html');
  });
}

document.addEventListener('DOMContentLoaded', init);






 // Reward
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


