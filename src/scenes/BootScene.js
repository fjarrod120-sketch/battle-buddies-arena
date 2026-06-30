// Phaser loaded as global from CDN
import { SoundGenerator } from '../systems/SoundGenerator.js';
import { WEAPONS, ABILITIES } from '../entities/Characters.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.load.json('theme', './theme.json');
  }

  create() {
    const theme = this.cache.json.get('theme');
    this.game.themeData = theme || {};
    this.game.characters = theme?.characters || [];
    this.game.coinPacks = theme?.coinPacks || [];
    this.game.sound_gen = new SoundGenerator(this);

    this._genArena();
    this._genCharacters();
    this._genUI();
    this._genProjectiles();
    this._genParticles();

    this.scene.start('MenuScene');
  }

  _genCharacters() {
    (this.game.characters || []).forEach((char, i) => {
      const c1 = parseInt(char.color.replace('#',''), 16);
      const c2 = parseInt(char.color2.replace('#',''), 16);
      const key = `char_${char.id}`;

      const g = this.make.graphics({add:false});
      const S = 64;

      // Shadow
      g.fillStyle(0x000000,0.15);
      g.fillEllipse(32,62,40,10);

      // Legs
      g.fillStyle(0x333333,1);
      g.fillRoundedRect(18,48,10,12,3);
      g.fillRoundedRect(36,48,10,12,3);

      // Shoes
      g.fillStyle(0x222222,1);
      g.fillRoundedRect(16,56,14,6,3);
      g.fillRoundedRect(34,56,14,6,3);

      // Body
      g.fillStyle(c1,1);
      g.fillRoundedRect(12,22,40,30,8);

      // Belly accent
      g.fillStyle(c2,0.6);
      g.fillRoundedRect(18,28,28,18,6);

      // Arms
      g.fillStyle(c1,1);
      g.fillRoundedRect(2,24,12,8,4);
      g.fillRoundedRect(50,24,12,8,4);
      // Hands
      g.fillStyle(c2,1);
      g.fillCircle(6,28,5);
      g.fillCircle(58,28,5);

      // Head
      g.fillStyle(c2,1);
      g.fillCircle(32,14,14);

      // Hair / hat (unique per index)
      const hatColors = [0xff4444,0x44aaff,0x44ff44,0xffdd00,0xff88cc,0xff6622,0xaaddff,0x8844aa,0x886644,0xff00ff];
      g.fillStyle(hatColors[i%hatColors.length],0.8);
      g.fillEllipse(32,6,24,8);

      // Eyes
      g.fillStyle(0xffffff,1);
      g.fillCircle(26,12,5);
      g.fillCircle(38,12,5);
      g.fillStyle(0x222222,1);
      g.fillCircle(27,12,3);
      g.fillCircle(39,12,3);
      // Eye shine
      g.fillStyle(0xffffff,0.8);
      g.fillCircle(28,10,1.5);
      g.fillCircle(40,10,1.5);

      // Mouth
      g.lineStyle(2,0x222222,1);
      g.beginPath();
      g.arc(32,18,6,0.2,Math.PI-0.2,false);
      g.strokePath();

      // Cheeks
      g.fillStyle(0xff8888,0.3);
      g.fillCircle(20,16,4);
      g.fillCircle(44,16,4);

      g.generateTexture(key,S,S+2);
      g.destroy();

      // Weapon sprite per character
      const wk = `wp_${char.id}`;
      const wg = this.make.graphics({add:false});
      const wInfo = WEAPONS[char.weapon]||WEAPONS.laser;
      wg.fillStyle(wInfo.color,1);
      wg.fillRect(0,2,20,6);
      wg.fillRect(6,0,4,10);
      wg.fillCircle(18,5,4);
      wg.fillStyle(0xffffff,0.4);
      wg.fillCircle(16,4,2);
      wg.generateTexture(wk,24,16);
      wg.destroy();

      // Portrait icon (small)
      const pk = `port_${char.id}`;
      const pg = this.make.graphics({add:false});
      pg.fillStyle(c2,1);
      pg.fillCircle(10,9,9);
      pg.fillStyle(0xffffff,1);
      pg.fillCircle(8,7,3);
      pg.fillCircle(12,7,3);
      pg.fillStyle(0x222222,1);
      pg.fillCircle(8.5,7,1.5);
      pg.fillCircle(12.5,7,1.5);
      pg.lineStyle(1,0x222222,0.6);
      pg.beginPath();
      pg.arc(10,11,3,0.2,Math.PI-0.2,false);
      pg.strokePath();
      pg.generateTexture(pk,20,18);
      pg.destroy();
    });
  }

  _genArena() {
    // Floor
    const ft = this.make.graphics({add:false});
    ft.fillStyle(0x1a1a3a,1);
    ft.fillRect(0,0,64,64);
    ft.lineStyle(1,0x222244,0.3);
    ft.strokeRect(0,0,64,64);
    ft.fillStyle(0x222244,0.1);
    ft.fillCircle(32,32,20);
    ft.generateTexture('floor',64,64);
    ft.destroy();

    // Wall
    const w = this.make.graphics({add:false});
    w.fillStyle(0x3344aa,1);
    w.fillRect(0,0,20,20);
    w.lineStyle(2,0x5577cc,1);
    w.strokeRect(1,1,18,18);
    w.generateTexture('wall',20,20);
    w.destroy();

    // Obstacle (crate)
    const ob = this.make.graphics({add:false});
    ob.fillStyle(0x4a5a8a,1);
    ob.fillRoundedRect(0,0,40,40,4);
    ob.lineStyle(2,0x6a8abb,0.8);
    ob.strokeRoundedRect(1,1,38,38,4);
    ob.lineStyle(1,0x6a8abb,0.3);
    ob.lineBetween(0,20,40,20);
    ob.lineBetween(20,0,20,40);
    ob.generateTexture('crate',40,40);
    ob.destroy();

    // Power-up glow
    const pg = this.make.graphics({add:false});
    pg.fillStyle(0x44ff44,0.3);
    pg.fillCircle(16,16,16);
    pg.fillStyle(0xffffff,0.5);
    pg.fillCircle(16,12,4);
    pg.fillCircle(16,20,3);
    pg.generateTexture('powerup_glow',32,32);
    pg.destroy();

    // Coin pickup
    const cg = this.make.graphics({add:false});
    cg.fillStyle(0xffdd00,1);
    cg.fillCircle(8,8,8);
    cg.fillStyle(0xffcc00,1);
    cg.fillCircle(8,8,6);
    cg.lineStyle(2,0xffaa00,1);
    cg.strokeCircle(8,8,7);
    cg.fillStyle(0xffffff,0.3);
    cg.fillCircle(6,5,2);
    cg.generateTexture('coin_pickup',16,16);
    cg.destroy();

    // Spawn portal
    const sp = this.make.graphics({add:false});
    sp.fillStyle(0x8844ff,0.2);
    sp.fillCircle(20,20,20);
    sp.lineStyle(2,0xaa66ff,0.6);
    sp.strokeCircle(20,20,20);
    sp.generateTexture('spawn_portal',40,40);
    sp.destroy();
  }

  _genUI() {
    // Buttons
    const sizes = [
      ['btn_wide',220,50],
      ['btn_med',160,44],
      ['btn_sm',100,36],
      ['btn_tiny',72,24],
    ];
    const colors = [0xff6b35,0x00d4ff,0x44aa44,0xff4444,0x8844aa,0x3388ff];
    colors.forEach(c=>{
      sizes.forEach(([key,w,h])=>{
        const g = this.make.graphics({add:false});
        g.fillStyle(c,1);
        g.fillRoundedRect(0,0,w,h,10);
        g.lineStyle(2,Phaser.Display.Color.ValueToColor(c).brighten(15).color,0.8);
        g.strokeRoundedRect(1,1,w-2,h-2,10);
        g.generateTexture(`${key}_${c.toString(16)}`,w,h);
        g.destroy();
      });
    });

    // Coin icon (UI)
    const coin = this.make.graphics({add:false});
    coin.fillStyle(0xffdd00,1);
    coin.fillCircle(10,10,10);
    coin.fillStyle(0xffcc00,1);
    coin.fillCircle(10,10,7);
    coin.lineStyle(2,0xffaa00,1);
    coin.strokeCircle(10,10,9);
    coin.generateTexture('ui_coin',20,20);
    coin.destroy();

    // Gem icon
    const gem = this.make.graphics({add:false});
    gem.fillStyle(0x44ddff,1);
    gem.beginPath();
    gem.moveTo(10,0); gem.lineTo(20,7);
    gem.lineTo(16,20); gem.lineTo(4,20);
    gem.lineTo(0,7); gem.closePath();
    gem.fillPath();
    gem.fillStyle(0x88eeff,1);
    gem.beginPath();
    gem.moveTo(10,2); gem.lineTo(18,7);
    gem.lineTo(14,18); gem.lineTo(10,16);
    gem.closePath();
    gem.fillPath();
    gem.generateTexture('ui_gem',20,20);
    gem.destroy();

    // Crosshair
    const ch = this.make.graphics({add:false});
    ch.lineStyle(2,0xffffff,0.5);
    ch.strokeCircle(12,12,8);
    ch.lineBetween(12,2,12,6);
    ch.lineBetween(12,18,12,22);
    ch.lineBetween(2,12,6,12);
    ch.lineBetween(18,12,22,12);
    ch.fillStyle(0xff4444,0.8);
    ch.fillCircle(12,12,2);
    ch.generateTexture('crosshair',24,24);
    ch.destroy();

    // Health bar bg
    const hb = this.make.graphics({add:false});
    hb.fillStyle(0x333333,0.8);
    hb.fillRect(0,0,48,5);
    hb.generateTexture('hp_bg',48,5);
    hb.destroy();
  }

  _genProjectiles() {
    Object.entries(WEAPONS).forEach(([key,w])=>{
      const g = this.make.graphics({add:false});
      const s = Math.max(w.size+4,10);
      g.fillStyle(w.color,1);
      g.fillCircle(s/2,s/2,s/2);
      g.fillStyle(0xffffff,0.5);
      g.fillCircle(s/2-2,s/2-2,s/4);
      // Glow
      g.fillStyle(w.color,0.2);
      g.fillCircle(s/2,s/2,s/2+3);
      g.generateTexture(`proj_${key}`,s+6,s+6);
      g.destroy();
    });

    // Ability AoE ring
    Object.entries(ABILITIES).forEach(([key,a])=>{
      const g = this.make.graphics({add:false});
      g.lineStyle(3,a.color,0.7);
      g.strokeCircle(32,32,30);
      g.fillStyle(a.color,0.15);
      g.fillCircle(32,32,28);
      g.generateTexture(`aoe_${key}`,64,64);
      g.destroy();
    });
  }

  _genParticles() {
    // Circle particle
    const p = this.make.graphics({add:false});
    p.fillStyle(0xffffff,1);
    p.fillCircle(4,4,4);
    p.generateTexture('particle',8,8);
    p.destroy();

    // Star particle
    const s = this.make.graphics({add:false});
    s.fillStyle(0xffffff,1);
    s.beginPath();
    for(let i=0;i<10;i++){
      const r=i%2===0?6:3;
      const a=(i*Math.PI/5)-Math.PI/2;
      s.lineTo(6+Math.cos(a)*r,6+Math.sin(a)*r);
    }
    s.closePath(); s.fillPath();
    s.generateTexture('star_particle',12,12);
    s.destroy();

    // Spark
    const sp = this.make.graphics({add:false});
    sp.fillStyle(0xffffff,1);
    sp.fillRect(0,0,2,6);
    sp.generateTexture('spark',2,6);
    sp.destroy();

    // Shield bubble
    const sh = this.make.graphics({add:false});
    sh.fillStyle(0x4488ff,0.15);
    sh.fillCircle(28,28,28);
    sh.lineStyle(2,0x88bbff,0.5);
    sh.strokeCircle(28,28,28);
    sh.generateTexture('shield',56,56);
    sh.destroy();
  }
}
