// Phaser loaded as global from CDN
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
    const modeLabel = this.mode === 'practice' ? '🎮 PRACTICE' : '⚔️ PICK BUDDY';
    this.add.text(width / 2, 20, modeLabel, {
      fontSize: '22px', color: colors.accent || '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // FIGHT button — TOP, always visible
    const fightBtn = this.add.graphics();
    fightBtn.fillStyle(0xff4444, 1);
    fightBtn.fillRoundedRect(width / 2 - 70, 42, 140, 36, 12);
    fightBtn.lineStyle(3, 0xff8844, 1);
    fightBtn.strokeRoundedRect(width / 2 - 70, 42, 140, 36, 12);
    fightBtn.setInteractive(
      new Phaser.Geom.Rectangle(width / 2 - 70, 42, 140, 36),
      Phaser.Geom.Rectangle.Contains
    );
    fightBtn.on('pointerdown', () => {
      sound.menuClick();
      const selectedId = currencyManager.getSelected();
      const char = characters.find(c => c.id === selectedId);
      if (char) {
        this.scene.start('GameScene', {
          mode: this.mode,
          character: char
        });
      }
    });
    this.add.text(width / 2, 60, '⚔️ FIGHT!', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Selected character name
    const selectedId = currencyManager.getSelected();
    const selChar = characters.find(c => c.id === selectedId);
    this.add.text(width / 2, 88, `Selected: ${selChar?.name || '??'}`, {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Currency
    this.add.text(10, 95, `🪙${currencyManager.getCoins()}  💎${currencyManager.getGems()}`, {
      fontSize: '12px', color: '#ffffff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 1,
    });

    // Character grid — smaller cards
    const cols = 3;
    const cardW = 110;
    const cardH = 130;
    const startX = width / 2 - ((cols * cardW) / 2) + cardW / 2;
    const startY = 115;
    const gapX = 10;
    const gapY = 10;

    characters.forEach((char, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      const unlocked = currencyManager.isUnlocked(char.id);
      this._miniCard(cx, cy, cardW, cardH, char, unlocked);

      // If selected, highlight border
      if (char.id === selectedId) {
        const highlight = this.add.graphics();
        highlight.lineStyle(3, 0xffdd00, 1);
        highlight.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
        highlight.setDepth(10);
      }
    });

    // Back button
    const backBtn = this.add.text(30, height - 15, '← BACK', {
      fontSize: '13px', color: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      sound.menuClick();
      this.scene.start('MenuScene');
    });

    // No characters fallback
    if (!characters.length) {
      this.add.text(width / 2, height / 2, 'No characters loaded!\nCheck theme.json', {
        fontSize: '16px', color: '#ff4444', fontFamily: 'Arial',
        align: 'center',
      }).setOrigin(0.5);
    }
  }

  _miniCard(x, y, w, h, char, unlocked) {
    const sound = this.game.sound_gen;
    const c1 = parseInt(char.color.replace('#', ''), 16);
    const c2 = parseInt(char.color2.replace('#', ''), 16);

    // Card bg
    const card = this.add.graphics();
    card.fillStyle(unlocked ? 0x1a1a3e : 0x111122, 0.9);
    card.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    card.lineStyle(1, unlocked ? c1 : 0x444444, 1);
    card.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    const isSelected = currencyManager.getSelected() === char.id;

    if (unlocked) {
      // Mini character sprite
      const sprite = this.add.image(x, y - 28, `char_${char.id}`).setScale(1.1);

      // Name
      this.add.text(x, y + 8, char.name, {
        fontSize: '12px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);

      // Select/SELECTED button
      const btnColor = isSelected ? 0x44aa44 : 0x3388ff;
      const btn = this.add.graphics();
      btn.fillStyle(btnColor, 1);
      btn.fillRoundedRect(x - 38, y + 22, 76, 20, 6);
      btn.setInteractive(
        new Phaser.Geom.Rectangle(x - 38, y + 22, 76, 20),
        Phaser.Geom.Rectangle.Contains
      );
      this.add.text(x, y + 31, isSelected ? '✓ IN' : 'SELECT', {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);

      if (!isSelected) {
        btn.on('pointerdown', () => {
          sound.menuClick();
          currencyManager.setSelected(char.id);
          this.scene.restart({ mode: this.mode });
        });
      }
    } else {
      // Lock icon
      this.add.text(x, y - 28, '🔒', { fontSize: '24px' }).setOrigin(0.5);

      // Rarity
      const rarityColors = { common: '#888', rare: '#44aaff', epic: '#aa44ff', legendary: '#ff8800' };
      this.add.text(x, y - 5, char.rarity.toUpperCase(), {
        fontSize: '9px', color: rarityColors[char.rarity] || '#888', fontFamily: 'Arial',
      }).setOrigin(0.5);

      // Name
      this.add.text(x, y + 10, char.name, {
        fontSize: '11px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);

      // Cost
      const canBuyCoins = currencyManager.getCoins() >= (char.cost || Infinity);
      const canBuyGems = currencyManager.getGems() >= (char.gemCost || Infinity);
      const hasCoinCost = char.cost && char.cost > 0;
      const hasGemCost = char.gemCost && char.gemCost > 0;

      this.add.text(x - 20, y + 30, hasCoinCost ? `🪙${char.cost}` : '', {
        fontSize: '10px', color: canBuyCoins ? '#ffdd00' : '#886600', fontFamily: 'Arial',
      }).setOrigin(0.5);

      this.add.text(x + 20, y + 30, hasGemCost ? `💎${char.gemCost}` : '', {
        fontSize: '10px', color: canBuyGems ? '#44ddff' : '#226688', fontFamily: 'Arial',
      }).setOrigin(0.5);

      // Unlock button
      const canBuy = canBuyCoins || canBuyGems;
      const buyBtn = this.add.graphics();
      buyBtn.fillStyle(canBuy ? 0xff6b35 : 0x444444, 1);
      buyBtn.fillRoundedRect(x - 38, y + 44, 76, 18, 6);
      buyBtn.setInteractive(
        new Phaser.Geom.Rectangle(x - 38, y + 44, 76, 18),
        Phaser.Geom.Rectangle.Contains
      );
      this.add.text(x, y + 53, 'UNLOCK', {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
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
  }
}
