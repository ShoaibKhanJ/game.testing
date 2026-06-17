// settings/settings.js

const SKIN_NAMES = {
  classic: 'Classic', green: 'Green', blue: 'Blue',
  red: 'Red', robot: 'Robot', gold: 'Gold'
};

let currentSettings = { difficulty: 'normal', theme: 'dark' };

function selectOption(group, value) {
  const btns = document.querySelectorAll(`[data-group="${group}"]`);
  btns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.value === value);
  });
}

async function handleOptionClick(e) {
  const btn = e.target.closest('.option-btn');
  if (!btn) return;

  const group = btn.dataset.group;
  const value = btn.dataset.value;

  if (!group || !value) return;

  selectOption(group, value);

  if (group === 'difficulty') {
    currentSettings.difficulty = value;
    await Storage.updateSettings({ difficulty: value });
    showToast(`Difficulty set to ${value.charAt(0).toUpperCase() + value.slice(1)}`, 'info');
  }

  if (group === 'theme') {
    currentSettings.theme = value;
    await Storage.updateSettings({ theme: value });
    document.body.className = `theme-${value}`;
    showToast(`Theme switched to ${value.charAt(0).toUpperCase() + value.slice(1)}`, 'info');
  }
}

async function handleReset() {
  if (!confirm('Reset all Dino+ data? This clears your score, coins, and unlocked skins. This cannot be undone.')) return;

  await Storage.set({
    highScore: 0,
    coins: 0,
    selectedSkin: 'classic',
    unlockedSkins: ['classic'],
    settings: { difficulty: 'normal', theme: 'dark' }
  });

  // Reload to reflect reset
  location.reload();
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2200);
}

async function init() {
  const slider = document.getElementById("volume-slider");

if (slider) {
  slider.addEventListener("input", (e) => {
    gameVolume = parseFloat(e.target.value);

    // Save for future sessions
    chrome.storage.local.set({ volume: gameVolume });
  });
}
  const data = await Storage.get();
  currentSettings = { ...data.settings };

  // Apply theme
  document.body.className = `theme-${currentSettings.theme}`;

  // Select current options
  selectOption('difficulty', currentSettings.difficulty);
  selectOption('theme', currentSettings.theme);

  // Populate stats
  document.getElementById('stat-best').textContent = (data.highScore || 0).toLocaleString();
  document.getElementById('stat-coins').textContent = (data.coins || 0).toLocaleString();
  document.getElementById('stat-skins').textContent = `${(data.unlockedSkins || ['classic']).length} / 6`;
  document.getElementById('stat-skin-name').textContent = SKIN_NAMES[data.selectedSkin] || 'Classic';

  // Events
  document.getElementById('difficulty-group').addEventListener('click', handleOptionClick);
  document.getElementById('theme-group').addEventListener('click', handleOptionClick);
  document.getElementById('reset-btn').addEventListener('click', handleReset);

  document.getElementById('back-btn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = chrome.runtime.getURL('game/game.html');
  });
}

document.addEventListener('DOMContentLoaded', init);


let gameVolume = 1;

const sounds = {
  jump: new Audio("assets/sounds/jump.mp3"),
  coin: new Audio("assets/sounds/coin.mp3"),
  hit: new Audio("assets/sounds/hit.mp3")
};

function playSound(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.volume = gameVolume;   // ⭐ IMPORTANT
  audio.play().catch(() => {});
}