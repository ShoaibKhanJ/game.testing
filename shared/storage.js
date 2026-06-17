const Storage = {

  get(callback) {
    chrome.storage.local.get(["coins", "skins", "spins"], (data) => {
      callback({
        coins: data.coins || 0,
        skins: data.skins || [],
        spins: data.spins || 0
      });
    });
  },

  set(data, callback) {
    chrome.storage.local.set(data, callback);
  },

  addCoins(amount, callback) {
    this.get((data) => {
      data.coins += amount;
      chrome.storage.local.set({ coins: data.coins }, callback);
    });
  }

};