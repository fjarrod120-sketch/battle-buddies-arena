import Phaser from 'phaser';
import { currencyManager } from '../systems/CurrencyManager.js';
import { adManager } from '../systems/AdManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width, height } = this.scale;
    const sound = this.game.sound_gen;
    const theme = this.game.themeData || {};
    const title = theme?.game?.title || 'Battle Buddies Arena';
    const sub = theme?.game?.subtitle || 'Brawl for Glory!';
    const colors = theme?.colors || {};
    const bgColor = parseInt(colors.background?.replace('#', '') || '0a0a1a', 16);

    this.cameras.main.setBackgroundColor(bgColor);

    // Animated background — floating circles
    for (let i = 0; i < 20; i++) {
      const c = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(10, 60),
        parseInt(colors.secondary?.replace('#', '') || '00d4ff', 16),
        Phaser.Math.FloatBetween(0.03, 0.08)
      );
      this.tweens.add({
        targets: c,
        y: c.y - Phaser.Math.Between(50, 200),
        x: c.x + Phaser.Math.Between(-50, 50),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000)
      });
    }

    // Title
    const titleText = this.add.text(width / 2, height * 0.15, title, {
      fontSize: '42px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: colors.accent || '#ffdd00',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(width / 2, height * 0.25, sub, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: colors.secondary || '#00d4ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Currency display
    this._updateCurrencyDisplay(width, height, colors);

    // Menu buttons
    const btnY = height * 0.45;
    const gap = 65;

    this._menuButton(width / 2, btnY, '⚔️  BATTLE!', colors.primary || '#ff6b35', () => {
      sound.menuClick();
      this.scene.start('SelectScene', { mode: 'battle' });
    });

    this._menuButton(width / 2, btnY + gap, '🏪  SHOP', colors.secondary || '#00d4ff', () => {
      sound.menuClick();
      this.scene.start('ShopScene');
    });

    this._menuButton(width / 2, btnY + gap * 2, '🎮  PRACTICE', '#44aa44', () => {
      sound.menuClick();
      this.scene.start('SelectScene', { mode: 'practice' });
    });

    // Stats bar
    const stats = this.add.text(width / 2, height - 50, '', {
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);
    this._refreshStats(stats);
    this.statsText = stats;

    // Version
    this.add.text(width / 2, height - 20, 'v' + (theme?.game?.version || '1.0.0'), {
      fontSize: '11px', color: '#555555', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  _menuButton(x, y, label, color, callback) {
    const btn = this.add.graphics();
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(x - 110, y - 25, 220, 50, 14);
    btn.lineStyle(2, Phaser.Display.Color.ValueToColor(color).brighten(20).color, 1);
    btn.strokeRoundedRect(x - 109, y - 24, 218, 48, 14);
    btn.setInteractive(new Phaser.Geom.Rectangle(x - 110, y - 25, 220, 50), Phaser.Geom.Rectangle.Contains);
    btn.on('pointerdown', callback);
    btn.on('pointerover', () => btn.setAlpha(0.85));
    btn.on('pointerout', () => btn.setAlpha(1));

    this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  _updateCurrencyDisplay(w, h, colors) {
    const coinColor = colors.accent || '#ffdd00';
    const gemColor = '#44ddff';

    // Background bar
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.5);
    bar.fillRoundedRect(w / 2 - 140, h * 0.31, 280, 36, 10);

    this.add.text(w / 2 - 125, h * 0.31 + 18, `🪙 ${currencyManager.getCoins()}`, {
      fontSize: '18px', color: coinColor, fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5);

    this.add.text(w / 2 + 20, h * 0.31 + 18, `💎 ${currencyManager.getGems()}`, {
      fontSize: '18px', color: gemColor, fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5);
  }

  _refreshStats(t) {
    const d = currencyManager.data;
    t.setText(`Matches: ${d.matchesPlayed}  |  Wins: ${d.wins}  |  High Score: ${d.highScore}`);
  }
}
