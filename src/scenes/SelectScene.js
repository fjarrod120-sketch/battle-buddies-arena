import Phaser from 'phaser';
import { currencyManager } from '../systems/CurrencyManager.js';
import { COLORS } from '../config.js';

export class SelectScene extends Phaser.Scene {
  constructor() { super('SelectScene'); }

  init(data) {
    this.mode = data?.mode || 'battle';
  }

  create() {
    const { width, height } = this.scale;
    const sound = this.game.sound_gen;
    const characters = this.game.characters || [];
    const theme = this.game.themeData || {};
    const colors = theme?.colors || {};
    const bgColor = parseInt(colors.background?.replace('#', '') || '0a0a1a', 16);

    this.cameras.main.setBackgroundColor(bgColor);

    // Title
    const modeLabel = this.mode === 'practice' ? '🎮 PRACTICE MODE' : '⚔️ PICK YOUR BUDDY';
    this.add.text(width / 2, 40, modeLabel, {
      fontSize: '28px', color: colors.accent || '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Currency bar
    this.add.text(width - 20, 15, `🪙 ${currencyManager.getCoins()}`, {
      fontSize: '16px', color: colors.accent || '#ffdd00',
      fontFamily: 'Arial',
    }).setOrigin(1, 0);

    // Character grid
    const cols = 3;
    const cardW = 180;
    const cardH = 220;
    const startX = width / 2 - ((cols * cardW) / 2) + cardW / 2;
    const startY = 100;
    const gapX = 20;
    const gapY = 20;

    characters.forEach((char, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      const unlocked = currencyManager.isUnlocked(char.id);
      this._characterCard(cx, cy, cardW, cardH, char, unlocked);
    });

    // Back button
    const backBtn = this.add.text(40, height - 40, '← BACK', {
      fontSize: '18px', color: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      sound.menuClick();
      this.scene.start('MenuScene');
    });

    // No characters fallback
    if (!characters.length) {
      this.add.text(width / 2, height / 2, 'No characters loaded!\nCheck theme.json', {
        fontSize: '18px', color: '#ff4444', fontFamily: 'Arial',
        align: 'center',
      }).setOrigin(0.5);
    }
  }

  _characterCard(x, y, w, h, char, unlocked) {
    const sound = this.game.sound_gen;
    const c1 = parseInt(char.color.replace('#', ''), 16);
    const c2 = parseInt(char.color2.replace('#', ''), 16);

    // Card bg
    const card = this.add.graphics();
    card.fillStyle(unlocked ? 0x1a1a3e : 0x111122, 0.9);
    card.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    card.lineStyle(2, unlocked ? c1 : 0x444444, 1);
    card.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    // Character sprite
    if (unlocked) {
      const sprite = this.add.image(x, y - 40, `char_${char.id}`).setScale(1.5);
      this.tweens.add({
        targets: sprite, y: sprite.y - 5,
        duration: 1500, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      const lock = this.add.text(x, y - 40, '🔒', { fontSize: '40px' }).setOrigin(0.5);
      this.tweens.add({
        targets: lock, y: lock.y - 3,
        duration: 1200, yoyo: true, repeat: -1,
      });

      // Rarity color
      const rarityColors = { common: '#888', rare: '#44aaff', epic: '#aa44ff', legendary: '#ff8800' };
      this.add.text(x, y - 10, char.rarity.toUpperCase(), {
        fontSize: '10px', color: rarityColors[char.rarity] || '#888',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // Name
    this.add.text(x, y + 40, char.name, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    if (unlocked) {
      // Already owned label
      this.add.text(x, y + 65, '✓ OWNED', {
        fontSize: '11px', color: '#44ff44', fontFamily: 'Arial',
      }).setOrigin(0.5);

      // Select button
      const isSelected = currencyManager.getSelected() === char.id;
      const btnColor = isSelected ? 0x44aa44 : 0x3388ff;
      const selectBtn = this.add.graphics();
      selectBtn.fillStyle(btnColor, 1);
      selectBtn.fillRoundedRect(x - 50, y + 80, 100, 30, 8);
      selectBtn.setInteractive(
        new Phaser.Geom.Rectangle(x - 50, y + 80, 100, 30),
        Phaser.Geom.Rectangle.Contains
      );

      const btnText = this.add.text(x, y + 95, isSelected ? 'SELECTED' : 'SELECT', {
        fontSize: '13px', color: '#ffffff', fontFamily: 'Arial Black, Arial, sans-serif',
      }).setOrigin(0.5);

      if (!isSelected) {
        selectBtn.on('pointerdown', () => {
          sound.menuClick();
          currencyManager.setSelected(char.id);
          // Reload scene to refresh
          this.scene.restart({ mode: this.mode });
        });
      }
    } else {
      // Cost display
      const costY = y + 60;
      if (char.cost > 0) {
        this.add.text(x - 30, costY, `🪙 ${char.cost}`, {
          fontSize: '13px', color: '#ffdd00', fontFamily: 'Arial',
        }).setOrigin(0.5);
      }
      if (char.gemCost > 0) {
        this.add.text(x + 30, costY, `💎 ${char.gemCost}`, {
          fontSize: '13px', color: '#44ddff', fontFamily: 'Arial',
        }).setOrigin(0.5);
      }

      // Unlock button
      const canBuyCoins = currencyManager.getCoins() >= (char.cost || Infinity);
      const canBuyGems = currencyManager.getGems() >= (char.gemCost || Infinity);

      const buyBtn = this.add.graphics();
      const btnColor = (canBuyCoins || canBuyGems) ? 0xff6b35 : 0x555555;
      buyBtn.fillStyle(btnColor, 1);
      buyBtn.fillRoundedRect(x - 50, y + 80, 100, 30, 8);
      buyBtn.setInteractive(
        new Phaser.Geom.Rectangle(x - 50, y + 80, 100, 30),
        Phaser.Geom.Rectangle.Contains
      );

      this.add.text(x, y + 95, 'UNLOCK', {
        fontSize: '13px', color: '#ffffff', fontFamily: 'Arial Black, Arial, sans-serif',
      }).setOrigin(0.5);

      buyBtn.on('pointerdown', () => {
        if (canBuyCoins && char.cost > 0) {
          currencyManager.spendCoins(char.cost);
          currencyManager.unlockCharacter(char.id);
          sound.unlock();
          this.scene.restart({ mode: this.mode });
        } else if (canBuyGems && char.gemCost > 0) {
          currencyManager.spendGems(char.gemCost);
          currencyManager.unlockCharacter(char.id);
          sound.unlock();
          this.scene.restart({ mode: this.mode });
        } else {
          sound.error();
        }
      });
    }

    // Bottom tooltip for description
    if (unlocked) {
      this.add.text(x, y + h / 2 - 10, char.description || '', {
        fontSize: '10px', color: '#888888', fontFamily: 'Arial',
        wordWrap: { width: w - 10 }, align: 'center',
      }).setOrigin(0.5);
    }
  }
}
