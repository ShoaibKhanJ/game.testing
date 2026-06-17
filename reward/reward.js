const wheel = document.getElementById("wheel");
const btn = document.getElementById("spinBtn");
const result = document.getElementById("result");
const timer = document.getElementById("timer");
const info = document.getElementById("info");

const MAX_SPINS = 1;
const DAY = 60 * 60 * 1000;;

const rewards = [
  { type: "coins", value: 1, weight: 5 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 10, weight: 2 },
  { type: "coins", value: 20, weight: 2 },
  { type: "coins", value: 30, weight: 1 },
  { type: "skin", value: "green_dino", weight: 1 }
];

let rotation = 0;
const angle = 360 / rewards.length;

/* STORAGE */
function getState() {
  return JSON.parse(localStorage.getItem("spinState")) || {
    spinsUsed: 0,
    lastReset: Date.now()
  };
}

function saveState(state) {
  localStorage.setItem("spinState", JSON.stringify(state));
}

/* RESET */
function syncState(state) {
  if (Date.now() - state.lastReset >= DAY) {
    state.spinsUsed = 0;
    state.lastReset = Date.now();
  }
}

/* FORMAT */
function format(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

/* UI */
function updateUI(state) {
  info.innerText = `Spins left: ${MAX_SPINS - state.spinsUsed}/${MAX_SPINS}`;

  const nextReset = state.lastReset + DAY;
  const diff = nextReset - Date.now();

  timer.innerText =
    diff > 0 ? `Next reset: ${format(diff)}` : "Reset available";
}

/* ADD COINS */
function addCoins(amount) {
  chrome.storage.local.get(["coins"], (data) => {
    const coins = data.coins || 0;

    chrome.storage.local.set({
      coins: coins + amount
    });
  });
}

/* ADD SKIN */
function unlockSkin(skinId) {
  chrome.storage.local.get(["unlockedSkins"], (data) => {
    const skins = data.unlockedSkins || [];

    if (!skins.includes(skinId)) {
      skins.push(skinId);
    }

    chrome.storage.local.set({
      unlockedSkins: skins
    });
  });
}

/* SPIN */
btn.addEventListener("click", () => {

  let state = getState();
  syncState(state);

  if (state.spinsUsed >= MAX_SPINS) {
    result.innerText = "No spins left ⛔";
    saveState(state);
    updateUI(state);
    return;
  }

  btn.disabled = true;
  result.innerText = "Spinning...";

  const index = Math.floor(Math.random() * rewards.length);
  const reward = rewards[index];

  const target = index * angle + angle / 2;
  rotation += (5 * 360) + (360 - target);

  wheel.style.transform = `rotate(${rotation}deg)`;

  setTimeout(() => {

    state.spinsUsed++;

    if (reward.type === "coins") {
      addCoins(reward.value);
      result.innerText = `+${reward.value} Coins 🪙`;
    }

    if (reward.type === "skin") {
      unlockSkin(reward.value);
      result.innerText = `🟢 Green Dino Unlocked`;
    }

    saveState(state);

    btn.disabled = false;
    updateUI(state);

  }, 5200);

});

/* TIMER */
setInterval(() => {
  let state = getState();
  syncState(state);
  updateUI(state);
}, 1000);

updateUI(getState());