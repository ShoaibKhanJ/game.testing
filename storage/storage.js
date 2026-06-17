// storage/storage.js — Shared Chrome Storage helpers for Dino+

const DEFAULT_DATA = {
  highScore: 0,
  coins: 0,
  selectedSkin: 'classic',
  unlockedSkins: ['classic'],
  settings: {
    difficulty: 'normal',
    theme: 'dark'
  }
};

const Storage = {
  async get() {
    return new Promise((resolve) => {
      chrome.storage.local.get(DEFAULT_DATA, (data) => {
        // Ensure nested defaults are merged
        data.settings = Object.assign({}, DEFAULT_DATA.settings, data.settings || {});
        if (!Array.isArray(data.unlockedSkins)) data.unlockedSkins = ['classic'];
        resolve(data);
      });
    });
  },

  async set(updates) {
    return new Promise((resolve) => {
      chrome.storage.local.set(updates, resolve);
    });
  },

  async updateCoins(delta) {
    const data = await this.get();
    const newCoins = Math.max(0, (data.coins || 0) + delta);
    await this.set({ coins: newCoins });
    return newCoins;
  },

  async updateHighScore(score) {
    const data = await this.get();
    if (score > (data.highScore || 0)) {
      await this.set({ highScore: score });
      return score;
    }
    return data.highScore;
  },

  async unlockSkin(skinId) {
    const data = await this.get();
    if (!data.unlockedSkins.includes(skinId)) {
      data.unlockedSkins.push(skinId);
      await this.set({ unlockedSkins: data.unlockedSkins });
    }
  },

  async selectSkin(skinId) {
    await this.set({ selectedSkin: skinId });
  },

  async updateSettings(patch) {
    const data = await this.get();
    const newSettings = Object.assign({}, data.settings, patch);
    await this.set({ settings: newSettings });
    return newSettings;
  }
};

window.Storage = Storage;


chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.unlockedSkins) {
    state.unlockedSkins = (changes.unlockedSkins.newValue || ['classic']).map(id =>
      REWARD_SKIN_MAP[id] || id
    );
    refreshGrid();
  }
});