// Currency & save data management
const SAVE_KEY = 'battle_buddies_save';

const DEFAULTS = {
  coins: 100,
  gems: 10,
  unlockedCharacters: ['blaze', 'splash', 'bounce'],
  selectedCharacter: 'blaze',
  matchesPlayed: 0,
  wins: 0,
  adsWatchedToday: 0,
  adDate: '',
  highScore: 0,
  totalCoinsEarned: 0,
};

export class CurrencyManager {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...parsed };
      }
    } catch(e) { /* ignore corrupt save */ }
    return { ...DEFAULTS };
  }

  _save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch(e) { /* storage full */ }
  }

  getCoins() { return this.data.coins; }
  getGems() { return this.data.gems; }
  addCoins(amt) {
    this.data.coins += amt;
    this.data.totalCoinsEarned += amt;
    this._save();
  }
  spendCoins(amt) {
    if (this.data.coins < amt) return false;
    this.data.coins -= amt;
    this._save();
    return true;
  }
  addGems(amt) {
    this.data.gems += amt;
    this._save();
  }
  spendGems(amt) {
    if (this.data.gems < amt) return false;
    this.data.gems -= amt;
    this._save();
    return true;
  }

  isUnlocked(charId) {
    return this.data.unlockedCharacters.includes(charId);
  }
  unlockCharacter(charId) {
    if (!this.isUnlocked(charId)) {
      this.data.unlockedCharacters.push(charId);
      this._save();
      return true;
    }
    return false;
  }

  getSelected() { return this.data.selectedCharacter; }
  setSelected(charId) {
    this.data.selectedCharacter = charId;
    this._save();
  }

  recordMatch(won) {
    this.data.matchesPlayed++;
    if (won) this.data.wins++;
    this._save();
  }

  getHighScore() { return this.data.highScore; }
  setHighScore(s) {
    if (s > this.data.highScore) {
      this.data.highScore = s;
      this._save();
    }
  }

  canWatchAd() {
    const today = new Date().toDateString();
    if (this.data.adDate !== today) {
      this.data.adDate = today;
      this.data.adsWatchedToday = 0;
      this._save();
    }
    return this.data.adsWatchedToday < 10;
  }

  watchAd() {
    if (!this.canWatchAd()) return false;
    this.data.adsWatchedToday++;
    this.addCoins(75);
    return true;
  }

  reset() {
    this.data = { ...DEFAULTS };
    this._save();
  }
}

// Singleton
export const currencyManager = new CurrencyManager();
