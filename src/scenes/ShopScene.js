import Phaser from 'phaser';
import { currencyManager } from '../systems/CurrencyManager.js';
import { adManager } from '../systems/AdManager.js';
import { stripeManager } from '../systems/StripeManager.js';
import { COIN_PACKS, COLORS } from '../config.js';

export class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    const { width, height } = this.scale;
    const sound = this.game.sound_gen;
    const theme = this.game.themeData || {};
    const colors = theme?.colors || {};
    const bgColor = parseInt(colors.background?.replace('#', '') || '0a0a1a', 16);

    this.cameras.main.setBackgroundColor(bgColor);

    // Title
    this.add.text(width / 2, 40, '🏪 SHOP', {
      fontSize: '32px', color: colors.accent || '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Currency display
    const coinColor = colors.accent || '#ffdd00';
    this.add.text(width / 2, 75, `🪙 ${currencyManager.getCoins()}  |  💎 ${currencyManager.getGems()}`, {
      fontSize: '18px', color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Coin packs
    const packs = this.game.coinPacks || COIN_PACKS;
    const startY = 120;
    const cardH = 80;
    const gap = 10;

    packs.forEach((pack, idx) => {
      this._packCard(width / 2, startY + idx * (cardH + gap), width - 40, cardH, pack);
    });

    // Rewarded ad button
    const adBtnY = startY + packs.length * (cardH + gap) + 20;
    if (currencyManager.canWatchAd()) {
      const adBtn = this.add.graphics();
      adBtn.fillStyle(0x8844aa, 1);
      adBtn.fillRoundedRect(width / 2 - 130, adBtnY, 260, 50, 12);
      adBtn.setInteractive(
        new Phaser.Geom.Rectangle(width / 2 - 130, adBtnY, 260, 50),
        Phaser.Geom.Rectangle.Contains
      );
      adBtn.on('pointerdown', () => {
        adManager.showRewarded(() => {
          currencyManager.watchAd();
          sound.coinCollect();
          this.scene.restart();
        });
      });
      this.add.text(width / 2, adBtnY + 25, `📺 Watch Ad  (+75 🪙)`, {
        fontSize: '18px', color: '#ffffff',
        fontFamily: 'Arial Black, Arial, sans-serif',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);

      const adCount = this.add.text(width / 2, adBtnY + 50, `${currencyManager.data.adsWatchedToday}/10 today`, {
        fontSize: '11px', color: '#aaaaaa',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, adBtnY + 15, '📺 No more ads today — come back tomorrow!', {
        fontSize: '14px', color: '#888888',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // "Why pay?" section
    const paywhyY = adBtnY + 70;
    this.add.text(width / 2, paywhyY, 'Why Pay?', {
      fontSize: '16px', color: '#ffdd00',
      fontFamily: 'Arial Black',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, paywhyY + 25, '• Unlock rare & epic characters faster\n• Skip the grind — get the best buddies NOW\n• Support development!', {
      fontSize: '13px', color: '#aaaaaa',
      fontFamily: 'Arial', align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(40, height - 30, '← BACK', {
      fontSize: '18px', color: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      sound.menuClick();
      this.scene.start('MenuScene');
    });
  }

  _packCard(x, y, w, h, pack) {
    const { width } = this.scale;
    const sound = this.game.sound_gen;

    // Card background
    const card = this.add.graphics();
    const bgColor = pack.popular ? 0x1a2a1a : 0x1a1a3e;
    card.fillStyle(bgColor, 0.95);
    card.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    if (pack.popular) {
      card.lineStyle(3, 0xffdd00, 0.8);
      card.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    } else {
      card.lineStyle(1, 0x3344aa, 0.5);
      card.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    }

    // "POPULAR" badge
    if (pack.popular) {
      this.add.text(x + w / 2 - 10, y - h / 2 + 5, '⭐ BEST VALUE', {
        fontSize: '10px', color: '#000000',
        fontFamily: 'Arial Black',
        backgroundColor: '#ffdd00',
        padding: { x: 4, y: 2 },
      }).setOrigin(1, 0);
    }

    // Pack name
    this.add.text(x - w / 2 + 20, y - 10, pack.name, {
      fontSize: '18px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial, sans-serif',
    }).setOrigin(0, 0.5);

    // Contents
    this.add.text(x - w / 2 + 20, y + 15, `🪙 ${pack.coins.toLocaleString()}`, {
      fontSize: '14px', color: '#ffdd00', fontFamily: 'Arial',
    }).setOrigin(0, 0.5);

    if (pack.gems > 0) {
      this.add.text(x - w / 2 + 130, y + 15, `💎 ${pack.gems}`, {
        fontSize: '14px', color: '#44ddff', fontFamily: 'Arial',
      }).setOrigin(0, 0.5);
    }

    // Buy button
    const buyBtn = this.add.graphics();
    const btnColor = pack.popular ? 0xff6b35 : 0x3388ff;
    buyBtn.fillStyle(btnColor, 1);
    buyBtn.fillRoundedRect(x + 130, y - 18, 90, 36, 10);
    buyBtn.setInteractive(
      new Phaser.Geom.Rectangle(x + 130, y - 18, 90, 36),
      Phaser.Geom.Rectangle.Contains
    );

    this.add.text(x + 175, y, `$${pack.price.toFixed(2)}`, {
      fontSize: '16px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);

    buyBtn.on('pointerdown', () => {
      sound.menuClick();
      // Create Stripe payment link
      const link = stripeManager.createPaymentLink(pack.id, pack);
      // For now, simulate purchase
      currencyManager.addCoins(pack.coins);
      currencyManager.addGems(pack.gems);
      sound.coinCollect();

      // Show confirmation
      const confirm = this.add.text(this.scale.width / 2, this.scale.height / 2, `+${pack.coins} 🪙\n+${pack.gems} 💎\nPurchased!`, {
        fontSize: '20px', color: '#44ff44',
        fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5).setDepth(100);

      this.tweens.add({
        targets: confirm, scaleX: 1.5, scaleY: 1.5, alpha: 0,
        duration: 1500,
        onComplete: () => {
          confirm.destroy();
          this.scene.restart();
        }
      });
    });
  }
}
