// Phaser loaded as global from CDN
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { currencyManager } from './systems/CurrencyManager.js';
import { adManager } from './systems/AdManager.js';
import { stripeManager } from './systems/StripeManager.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 420,
  height: 700,
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
