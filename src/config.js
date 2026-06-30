// Game Configuration — edit these to re-skin the entire game
export const GAME = {
  title: 'Battle Buddies Arena',
  subtitle: 'Brawl for Glory!',
  version: '1.0.0',
};

export const COLORS = {
  background: 0x0a0a1a,
  primary: 0xff6b35,     // Vibrant orange
  secondary: 0x00d4ff,   // Cyan
  accent: 0xffdd00,      // Gold
  success: 0x44ff44,
  danger: 0xff4444,
  text: '#ffffff',
  textDark: '#1a1a2e',
  panelBg: 0x1a1a3e,
  panelBorder: 0x3344aa,
};

export const CURRENCY = {
  coinName: 'Gold Coins',
  coinIcon: '🪙',
  gemName: 'Gems',
  gemIcon: '💎',
  startingCoins: 100,
  startingGems: 10,
  coinsPerMatch: 15,
  coinsPerWin: 35,
  coinsPerAd: 75,
  adsPerDay: 10,
};

export const COIN_PACKS = [
  { id: 'small', name: 'Starter Pack', coins: 500, gems: 5, price: 1.99, popular: false },
  { id: 'medium', name: 'Power Pack', coins: 2000, gems: 25, price: 4.99, popular: true },
  { id: 'large', name: 'Mega Pack', coins: 8000, gems: 100, price: 9.99, popular: false },
  { id: 'whale', name: 'Ultimate Pack', coins: 25000, gems: 500, price: 24.99, popular: false },
];

export const ARENA = {
  width: 1200,
  height: 800,
  wallThickness: 20,
  obstacleCount: 5,
  matchDuration: 60,
  respawnTime: 3000,
};

export const AI_DIFFICULTY = {
  easy: { reactionMs: 800, accuracy: 0.4, aggressive: false },
  medium: { reactionMs: 500, accuracy: 0.6, aggressive: true },
  hard: { reactionMs: 300, accuracy: 0.8, aggressive: true },
};
