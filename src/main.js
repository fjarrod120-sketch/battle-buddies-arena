// Phaser loaded as global from CDN
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { currencyManager } from './systems/CurrencyManager.js';
import { adManager } from './systems/AdManager.js';
import { stripeManager } from './systems/StripeManager.js';

// Measure viewport after page load — accounts for mobile browser chrome
function getGameSize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Cap ratio: use 9:16 portrait max, but always fill available space
  const maxW = Math.min(w, 420);
  const ratio = Math.min(maxW / w, h / h);
  return {
    width: Math.round(Math.min(w, maxW)),
    height: Math.round(Math.min(h, maxW * 1.3)), // slightly shorter than 9:16
  };
}

const size = getGameSize();

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: size.width,
  height: size.height,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, SelectScene, GameScene, ShopScene],
};

const game = new Phaser.Game(config);

// Re-scale on resize/orientation change
window.addEventListener('resize', () => {
  const s = getGameSize();
  game.scale.resize(s.width, s.height);
});

// Hide loading screen once game starts
game.events.on('ready', () => {
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
});

// Init managers
adManager.init();
stripeManager.init();

// Handle Stripe payment return
window.addEventListener('payment-complete', (event) => {
  const { sessionId, packId } = event.detail;
  const packs = game.themeData?.coinPacks || [];
  const pack = packs.find(p => p.id === packId);
  if (pack) {
    currencyManager.addCoins(pack.coins);
    currencyManager.addGems(pack.gems);
  }
});

// Resume AudioContext on first touch
document.addEventListener('pointerdown', () => {
  if (game.sound_gen) game.sound_gen.resume();
}, { once: true });
