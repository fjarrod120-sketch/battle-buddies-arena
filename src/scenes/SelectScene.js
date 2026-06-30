// Phaser loaded as global from CDN
import { currencyManager } from '../systems/CurrencyManager.js';

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
    this.add.text(width / 2, 14, '⚔️ PICK BUDDY', {
      fontSize: '18px', color: colors.accent || '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Currency
    this.add.text(10, 30, `🪙${currencyManager.getCoins()}  💎${currencyManager.getGems()}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 1,
    });

    // Sort: owned + selected first, then owned, then locked by cost
    const sorted = [...characters].sort((a, b) => {
      const aU = currencyManager.isUnlocked(a.id) ? 1 : 0;
      const bU = currencyManager.isUnlocked(b.id) ? 1 : 0;
      if (aU !== bU) return bU - aU;
      if (a.id === currencyManager.getSelected()) return -1;
      if (b.id === currencyManager.getSelected()) return 1;
      return 0;
    });

    // Show only first 6 (2 rows of 3)
    const shown = sorted.slice(0, 6);

    const cols = 3;
    const cardW = 105;
    const cardH = 120;
    const startX = width / 2 - ((cols * cardW) / 2) + cardW / 2;
    const startY = 52;
    const gapX = 10;
    const gapY = 10;

    shown.forEach((char, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      const unlocked = currencyManager.isUnlocked(char.id);
      this._microCard(cx, cy, cardW, cardH, char, unlocked);
    });

    // Locked characters count
    const lockedCount = characters.length - currencyManager.data.unlockedCharacters.length;
    if (lockedCount > 0) {
      this.add.text(width / 2, startY + 2 * (cardH + gapY) - 5, `+${lockedCount} more locked — visit SHOP`, {
        fontSize: '9px', color: '#666666', fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // ⚔️ FIGHT! — BIG button at bottom
    const fightBtn = this.add.graphics();
    fightBtn.fillStyle(0xff4444, 1);
    fightBtn.fillRoundedRect(width / 2 - 85, height - 72, 170, 44, 14);
    fightBtn.lineStyle(3, 0xff8844, 1);
    fightBtn.strokeRoundedRect(width / 2 - 84, height - 71, 168, 42, 14);
    fightBtn.setInteractive(
      new Phaser.Geom.Rectangle(width / 2 - 85, height - 72, 170, 44),
      Phaser.Geom.Rectangle.Contains
    );
    fightBtn.on('pointerdown', () => {
      sound.menuClick();
      const selectedId = currencyManager.getSelected();
      const char = characters.find(c => c.id === selectedId);
      if (char) {
        this.scene.start('GameScene', { mode: this.mode, character: char });
      }
    });
    this.add.text(width / 2, height - 52, '⚔️ FIGHT!', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Selected character indicator
    const sel = characters.find(c => c.id === currencyManager.getSelected());
    this.add.text(width / 2, height - 28, `Using: ${sel?.name || '??'}`, {
      fontSize: '10px', color: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // ← BACK
    this.add.text(20, height - 10, '← BACK', {
      fontSize: '12px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sound.menuClick(); this.scene.start('MenuScene'); });
  }

  _microCard(x, y, w, h, char, unlocked) {
    const sound = this.game.sound_gen;
    const c1 = parseInt(char.color.replace('#', ''), 16);
    const c2 = parseInt(char.color2.replace('#', ''), 16);
    const isSelected = currencyManager.getSelected() === char.id;

    // Card bg
    const card = this.add.graphics();
    card.fillStyle(unlocked ? 0x1a1a3e : 0x111122, 0.9);
    card.fillRoundedRect(x - w/2, y - h/2, w, h, 8);
    card.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffdd00 : (unlocked ? c1 : 0x444444), 1);
    card.strokeRoundedRect(x - w/2, y - h/2, w, h, 8);

    if (unlocked) {
      this.add.image(x, y - 24, `char_${char.id}`).setScale(0.95);
      this.add.text(x, y + 10, char.name, {
        fontSize: '11px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);

      const btnColor = isSelected ? 0x44aa44 : 0x3388ff;
      const btn = this.add.graphics();
      btn.fillStyle(btnColor, 1);
      btn.fillRoundedRect(x - 34, y + 24, 68, 18, 6);
      btn.setInteractive(new Phaser.Geom.Rectangle(x - 34, y + 24, 68, 18), Phaser.Geom.Rectangle.Contains);
      this.add.text(x, y + 33, isSelected ? '✓ IN' : 'USE', {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial Black',
      }).setOrigin(0.5);
      if (!isSelected) btn.on('pointerdown', () => {
        sound.menuClick();
        currencyManager.setSelected(char.id);
        this.scene.restart({ mode: this.mode });
      });
    } else {
      this.add.text(x, y - 28, '🔒', { fontSize: '20px' }).setOrigin(0.5);
      const rarCol = { common: '#888', rare: '#44aaff', epic: '#aa44ff', legendary: '#ff8800' };
      this.add.text(x, y - 6, char.rarity.toUpperCase(), {
        fontSize: '8px', color: rarCol[char.rarity] || '#888', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this.add.text(x, y + 8, char.name, {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);
      this.add.text(x - 18, y + 28, char.cost > 0 ? `🪙${char.cost}` : '', {
        fontSize: '9px', color: currencyManager.getCoins() >= char.cost ? '#ffdd00' : '#886600', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this.add.text(x + 18, y + 28, char.gemCost > 0 ? `💎${char.gemCost}` : '', {
        fontSize: '9px', color: currencyManager.getGems() >= char.gemCost ? '#44ddff' : '#226688', fontFamily: 'Arial',
      }).setOrigin(0.5);
      const canBuy = (char.cost > 0 && currencyManager.getCoins() >= char.cost) || (char.gemCost > 0 && currencyManager.getGems() >= char.gemCost);
      const buyBtn = this.add.graphics();
      buyBtn.fillStyle(canBuy ? 0xff6b35 : 0x444444, 1);
      buyBtn.fillRoundedRect(x - 34, y + 40, 68, 16, 5);
      buyBtn.setInteractive(new Phaser.Geom.Rectangle(x - 34, y + 40, 68, 16), Phaser.Geom.Rectangle.Contains);
      this.add.text(x, y + 48, 'UNLOCK', {
        fontSize: '9px', color: '#ffffff', fontFamily: 'Arial Black',
      }).setOrigin(0.5);
      buyBtn.on('pointerdown', () => {
        if (char.cost > 0 && currencyManager.spendCoins(char.cost)) {
          currencyManager.unlockCharacter(char.id); sound.unlock(); this.scene.restart({ mode: this.mode });
        } else if (char.gemCost > 0 && currencyManager.spendGems(char.gemCost)) {
          currencyManager.unlockCharacter(char.id); sound.unlock(); this.scene.restart({ mode: this.mode });
        } else { sound.error(); }
      });
    }
  }
}
