import Phaser from 'phaser';
import { SoundGenerator } from '../systems/SoundGenerator.js';
import { WEAPONS, ABILITIES } from '../entities/Characters.js';
import { COLORS, CURRENCY } from '../config.js';

// Procedural character sprites — generates all textures at boot
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Load theme.json
    this.load.json('theme', './theme.json');
  }

  create() {
    const theme = this.cache.json.get('theme');
    this.game.themeData = theme || {};
    this.game.characters = theme?.characters || [];
    this.game.coinPacks = theme?.coinPacks || [];

    // Generate all textures procedurally
    this._generateArenaTextures();
    this._generateCharacterTextures();
    this._generateUITextures();
    this._generateProjectileTextures();
    this._generateParticleTextures();

    // Init audio
    this.game.sound_gen = new SoundGenerator(this);

    this.scene.start('MenuScene');
  }

  _generateCharacterTextures() {
    const chars = this.game.characters;
    if (!chars.length) return;

    const S = 64; // sprite size

    chars.forEach((char, idx) => {
      const key = `char_${char.id}`;
      const g = this.make.graphics({ add: false });
      const c1 = parseInt(char.color.replace('#', ''), 16);
      const c2 = parseInt(char.color2.replace('#', ''), 16);

      // Body (rounded rect)
      g.fillStyle(c1, 1);
      g.fillRoundedRect(8, 20, 48, 38, 8);

      // Head (circle)
      g.fillStyle(c2, 1);
      g.fillCircle(32, 16, 16);

      // Eyes
      g.fillStyle(0xffffff, 1);
      g.fillCircle(26, 13, 5);
      g.fillCircle(38, 13, 5);
      g.fillStyle(0x000000, 1);
      g.fillCircle(27, 13, 3);
      g.fillCircle(39, 13, 3);

      // Mouth (wacky)
      g.lineStyle(2, 0x000000, 1);
      g.beginPath();
      g.arc(32, 20, 8, 0, Math.PI, false);
      g.strokePath();

      // Arms
      g.fillStyle(c1, 1);
      g.fillRect(2, 24, 8, 6);
      g.fillRect(54, 24, 8, 6);

      // Legs
      g.fillStyle(0x333333, 1);
      g.fillRect(16, 54, 10, 10);
      g.fillRect(38, 54, 10, 10);

      // Shoes
      g.fillStyle(0x222222, 1);
      g.fillRoundedRect(14, 60, 14, 6, 3);
      g.fillRoundedRect(36, 60, 14, 6, 3);

      g.generateTexture(key, S, S + 8);
      g.destroy();

      // Generate weapon overlay
      const wk = `weapon_${char.id}`;
      const wg = this.make.graphics({ add: false });
      const wInfo = WEAPONS[char.weapon] || WEAPONS.laser;
      wg.fillStyle(wInfo.color, 1);
      wg.fillRect(0, 0, 20, 6);
      wg.fillRect(4, 0, 4, 12);
      wg.fillCircle(18, 3, 4);
      wg.generateTexture(wk, 24, 16);
      wg.destroy();

      // Unlock icon (small portrait)
      const uk = `portrait_${char.id}`;
      const ug = this.make.graphics({ add: false });
      ug.fillStyle(c1, 1);
      ug.fillCircle(12, 10, 10);
      ug.fillStyle(c2, 1);
      ug.fillCircle(12, 10, 7);
      ug.fillStyle(0xffffff, 1);
      ug.fillCircle(10, 8, 3);
      ug.fillCircle(14, 8, 3);
      ug.generateTexture(uk, 24, 20);
      ug.destroy();
    });
  }

  _generateArenaTextures() {
    // Floor tile
    const ft = this.make.graphics({ add: false });
    ft.fillStyle(0x2a2a4a, 1);
    ft.fillRect(0, 0, 64, 64);
    ft.lineStyle(1, 0x333366, 1);
    ft.strokeRect(0, 0, 64, 64);
    ft.generateTexture('floor_tile', 64, 64);
    ft.destroy();

    // Wall
    const w = this.make.graphics({ add: false });
    w.fillStyle(0x4444aa, 1);
    w.fillRect(0, 0, 20, 20);
    w.lineStyle(2, 0x6666cc, 1);
    w.strokeRect(1, 1, 18, 18);
    w.generateTexture('wall', 20, 20);
    w.destroy();

    // Obstacle
    const ob = this.make.graphics({ add: false });
    ob.fillStyle(0x5566aa, 1);
    ob.fillRoundedRect(0, 0, 48, 48, 8);
    ob.lineStyle(3, 0x7788cc, 1);
    ob.strokeRoundedRect(1, 1, 46, 46, 8);
    ob.generateTexture('obstacle', 48, 48);
    ob.destroy();

    // Spawn pad
    const sp = this.make.graphics({ add: false });
    sp.fillStyle(0x00ff88, 0.3);
    sp.fillCircle(24, 24, 24);
    sp.lineStyle(2, 0x00ff88, 0.6);
    sp.strokeCircle(24, 24, 24);
    sp.generateTexture('spawn_pad', 48, 48);
    sp.destroy();
  }

  _generateUITextures() {
    // Button
    const btn = this.make.graphics({ add: false });
    btn.fillStyle(0xff6b35, 1);
    btn.fillRoundedRect(0, 0, 200, 54, 12);
    btn.lineStyle(2, 0xff8844, 1);
    btn.strokeRoundedRect(1, 1, 198, 52, 12);
    btn.generateTexture('btn_orange', 200, 54);
    btn.destroy();

    const btn2 = this.make.graphics({ add: false });
    btn2.fillStyle(0x00d4ff, 1);
    btn2.fillRoundedRect(0, 0, 200, 54, 12);
    btn2.lineStyle(2, 0x44ddff, 1);
    btn2.strokeRoundedRect(1, 1, 198, 52, 12);
    btn2.generateTexture('btn_blue', 200, 54);
    btn2.destroy();

    const btnSm = this.make.graphics({ add: false });
    btnSm.fillStyle(0x44aaff, 1);
    btnSm.fillRoundedRect(0, 0, 100, 40, 10);
    btnSm.generateTexture('btn_small', 100, 40);
    btnSm.destroy();

    // Coin icon
    const coin = this.make.graphics({ add: false });
    coin.fillStyle(0xffdd00, 1);
    coin.fillCircle(12, 12, 12);
    coin.fillStyle(0xffcc00, 1);
    coin.fillCircle(12, 12, 9);
    coin.lineStyle(2, 0xffaa00, 1);
    coin.strokeCircle(12, 12, 11);
    coin.generateTexture('coin_icon', 24, 24);
    coin.destroy();

    // Gem icon
    const gem = this.make.graphics({ add: false });
    gem.fillStyle(0x44ddff, 1);
    gem.beginPath();
    gem.moveTo(12, 0);
    gem.lineTo(24, 8);
    gem.lineTo(20, 24);
    gem.lineTo(4, 24);
    gem.lineTo(0, 8);
    gem.closePath();
    gem.fillPath();
    gem.fillStyle(0x88eeff, 1);
    gem.beginPath();
    gem.moveTo(12, 2);
    gem.lineTo(22, 8);
    gem.lineTo(18, 22);
    gem.lineTo(12, 20);
    gem.closePath();
    gem.fillPath();
    gem.generateTexture('gem_icon', 24, 24);
    gem.destroy();

    // Star
    const star = this.make.graphics({ add: false });
    star.fillStyle(0xffdd00, 1);
    this._drawStar(star, 16, 16, 5, 14, 7);
    star.generateTexture('star_icon', 32, 32);
    star.destroy();
  }

  _drawStar(g, cx, cy, points, outer, inner) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (i * Math.PI / points) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  }

  _generateProjectileTextures() {
    Object.entries(WEAPONS).forEach(([key, w]) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(w.color, 1);
      if (w.size > 10) {
        g.fillCircle(w.size / 2, w.size / 2, w.size / 2);
        g.fillStyle(0xffffff, 0.4);
        g.fillCircle(w.size / 2 - 2, w.size / 2 - 2, w.size / 4);
      } else {
        g.fillCircle(5, 5, 5);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(3, 3, 2);
      }
      g.generateTexture(`proj_${key}`, w.size + 4, w.size + 4);
      g.destroy();
    });

    // Ability circles
    Object.entries(ABILITIES).forEach(([key, a]) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(a.color, 0.6);
      g.fillCircle(32, 32, 32);
      g.lineStyle(3, a.color, 0.9);
      g.strokeCircle(32, 32, 32);
      g.generateTexture(`ability_${key}`, 64, 64);
      g.destroy();
    });
  }

  _generateParticleTextures() {
    const p = this.make.graphics({ add: false });
    p.fillStyle(0xffffff, 1);
    p.fillCircle(4, 4, 4);
    p.generateTexture('particle', 8, 8);
    p.destroy();

    const p2 = this.make.graphics({ add: false });
    p2.fillStyle(0xffffff, 1);
    p2.fillRect(0, 0, 4, 4);
    p2.generateTexture('particle_sq', 4, 4);
    p2.destroy();
  }
}
