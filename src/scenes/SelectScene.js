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

    const isShort = height < 500;
    const topY = isShort ? 10 : 14;
    const btnFont = isShort ? 16 : 22;
    const smallFont = isShort ? 9 : 11;
    const tinyFont = isShort ? 8 : 10;

    // Title
    this.add.text(width / 2, topY, '⚔️ PICK BUDDY', {
      fontSize: isShort ? '15px' : '18px',
      color: colors.accent || '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Currency
    this.add.text(8, topY + 14, `🪙${currencyManager.getCoins()}`, {
      fontSize: '10px', color: '#ffdd00', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 1,
    });
    this.add.text(8, topY + 26, `💎${currencyManager.getGems()}`, {
      fontSize: '10px', color: '#44ddff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 1,
    });

    // Sort: owned+selected first, then owned, then locked
    const sorted = [...characters].sort((a, b) => {
      const aU = currencyManager.isUnlocked(a.id) ? 1 : 0;
      const bU = currencyManager.isUnlocked(b.id) ? 1 : 0;
      if (aU !== bU) return bU - aU;
      if (a.id === currencyManager.getSelected()) return -1;
      if (b.id === currencyManager.getSelected()) return 1;
      return 0;
    });

    // How many rows fit? Leave room for FIGHT button at bottom
    const fightH = isShort ? 36 : 44;
    const fightY = height - fightH - (isShort ? 6 : 10);
    const gridBottom = fightY - 10;
    const gridTop = topY + 36;

    // Card sizing based on available space
    const rowsThatFit = Math.max(1, Math.floor((gridBottom - gridTop) / (isShort ? 100 : 120)));
    const cardH = Math.min(116, Math.floor((gridBottom - gridTop) / Math.max(1, rowsThatFit)) - 8);
    const cardW = Math.min(105, Math.floor((width - 20) / 3) - 6);
    const cols = 3;
    const gapX = 6;
    const gapY = 6;
    const totalGridW = cols * cardW + (cols - 1) * gapX;
    const startX = width / 2 - totalGridW / 2 + cardW / 2;
    const startY = gridTop;

    const shown = sorted.slice(0, cols * rowsThatFit);

    shown.forEach((char, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      const unlocked = currencyManager.isUnlocked(char.id);
      this._microCard(cx, cy, cardW, cardH, char, unlocked, isShort);
    });

    // Locked count
    const lockedCount = characters.length - currencyManager.data.unlockedCharacters.length;
    if (lockedCount > 0 && rowsThatFit < 4 && sorted.length > shown.length) {
      this.add.text(width / 2, gridBottom - 4, `+${lockedCount} locked — SHOP`, {
        fontSize: '8px', color: '#555555', fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // ⚔️ FIGHT! button at bottom
    const fh = isShort ? 34 : 44;
    const fw = isShort ? 140 : 160;
    const fy = height - fh - 8;
    const fBtn = this.add.graphics();
    fBtn.fillStyle(0xff4444, 1);
    fBtn.fillRoundedRect(width / 2 - fw / 2, fy, fw, fh, 12);
    fBtn.lineStyle(3, 0xff8844, 1);
    fBtn.strokeRoundedRect(width / 2 - fw / 2 + 1, fy + 1, fw - 2, fh - 2, 12);
    fBtn.setInteractive(
      new Phaser.Geom.Rectangle(width / 2 - fw / 2, fy, fw, fh),
      Phaser.Geom.Rectangle.Contains
    );
    fBtn.on('pointerdown', () => {
      sound.menuClick();
      const selectedId = currencyManager.getSelected();
      const char = characters.find(c => c.id === selectedId);
      if (char) this.scene.start('GameScene', { mode: this.mode, character: char });
    });
    this.add.text(width / 2, fy + fh / 2, '⚔️ FIGHT!', {
      fontSize: isShort ? '16px' : '22px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Selected name
    const sel = characters.find(c => c.id === currencyManager.getSelected());
    this.add.text(width / 2, fy - 8, `Using: ${sel?.name || '??'}`, {
      fontSize: isShort ? '8px' : '10px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // ← BACK
    this.add.text(6, height - 6, '← BACK', {
      fontSize: '10px', color: '#666666', fontFamily: 'Arial',
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sound.menuClick(); this.scene.start('MenuScene'); });
  }

  _microCard(x, y, w, h, char, unlocked, compact) {
    const sound = this.game.sound_gen;
    const c1 = parseInt(char.color.replace('#', ''), 16);
    const isSelected = currencyManager.getSelected() === char.id;

    const card = this.add.graphics();
    card.fillStyle(unlocked ? 0x1a1a3e : 0x111122, 0.9);
    card.fillRoundedRect(x - w/2, y - h/2, w, h, 6);
    card.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffdd00 : (unlocked ? c1 : 0x444444), 1);
    card.strokeRoundedRect(x - w/2, y - h/2, w, h, 6);

    const imgY = y - h * 0.3;
    const nameY = y + h * 0.08;
    const btnY = y + h * 0.32;

    if (unlocked) {
      this.add.image(x, imgY, `char_${char.id}`).setScale(compact ? 0.75 : 0.9);
      this.add.text(x, nameY, char.name, {
        fontSize: compact ? '9px' : '11px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);

      const bw = compact ? 56 : 64;
      const bh = compact ? 16 : 18;
      const btn = this.add.graphics();
      btn.fillStyle(isSelected ? 0x44aa44 : 0x3388ff, 1);
      btn.fillRoundedRect(x - bw/2, btnY, bw, bh, 5);
      btn.setInteractive(new Phaser.Geom.Rectangle(x - bw/2, btnY, bw, bh), Phaser.Geom.Rectangle.Contains);
      this.add.text(x, btnY + bh/2, isSelected ? '✓ IN' : 'USE', {
        fontSize: compact ? '8px' : '9px', color: '#ffffff', fontFamily: 'Arial Black',
      }).setOrigin(0.5);
      if (!isSelected) btn.on('pointerdown', () => {
        sound.menuClick();
        currencyManager.setSelected(char.id);
        this.scene.restart({ mode: this.mode });
      });
    } else {
      this.add.text(x, imgY - 4, '🔒', { fontSize: compact ? '16px' : '20px' }).setOrigin(0.5);
      const rarCol = { common: '#888', rare: '#44aaff', epic: '#aa44ff', legendary: '#ff8800' };
      this.add.text(x, imgY + 10, char.rarity.toUpperCase(), {
        fontSize: compact ? '7px' : '8px', color: rarCol[char.rarity] || '#888', fontFamily: 'Arial',
      }).setOrigin(0.5);

      this.add.text(x, nameY + 4, char.name, {
        fontSize: compact ? '9px' : '10px', color: '#ffffff', fontFamily: 'Arial Black',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);

      const canBuyCoins = char.cost > 0 && currencyManager.getCoins() >= char.cost;
      const canBuyGems = char.gemCost > 0 && currencyManager.getGems() >= char.gemCost;
      this.add.text(x - 15, btnY, char.cost > 0 ? `🪙${char.cost}` : '', {
        fontSize: compact ? '8px' : '9px', color: canBuyCoins ? '#ffdd00' : '#886600', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this.add.text(x + 15, btnY, char.gemCost > 0 ? `💎${char.gemCost}` : '', {
        fontSize: compact ? '8px' : '9px', color: canBuyGems ? '#44ddff' : '#226688', fontFamily: 'Arial',
      }).setOrigin(0.5);

      const canBuy = canBuyCoins || canBuyGems;
      const bw = compact ? 56 : 64;
      const bh = compact ? 14 : 16;
      const buyBtn = this.add.graphics();
      buyBtn.fillStyle(canBuy ? 0xff6b35 : 0x444444, 1);
      buyBtn.fillRoundedRect(x - bw/2, btnY + (compact ? 12 : 14), bw, bh, 4);
      buyBtn.setInteractive(new Phaser.Geom.Rectangle(x - bw/2, btnY + (compact ? 12 : 14), bw, bh), Phaser.Geom.Rectangle.Contains);
      this.add.text(x, btnY + (compact ? 12 : 14) + bh/2, 'UNLOCK', {
        fontSize: compact ? '7px' : '9px', color: '#ffffff', fontFamily: 'Arial Black',
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
