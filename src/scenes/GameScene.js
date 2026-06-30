// Phaser loaded as global from CDN
import { currencyManager } from '../systems/CurrencyManager.js';
import { WEAPONS, ABILITIES } from '../entities/Characters.js';

// ─── Perks the player can pick on level-up ───
const PERKS = [
  { id: 'dmg', name: '⚡ +Damage', desc: '+25% damage', apply: p => { p.dmgMult = (p.dmgMult||1)*1.25; } },
  { id: 'spd', name: '💨 +Speed', desc: '+20% speed', apply: p => { p.spdMult = (p.spdMult||1)*1.25; } },
  { id: 'hp', name: '❤️ +Max HP', desc: '+50 max HP, full heal', apply: p => { p.maxHp += 50; p.player.hp = Math.min(p.player.hp+50, p.player.maxHp); } },
  { id: 'rof', name: '🔫 +Fire Rate', desc: '-15% fire interval', apply: p => { p.rofMult = (p.rofMult||1)*0.85; } },
  { id: 'shield', name: '🛡️ Shield', desc: 'Absorb next hit', apply: p => { p.hasShield = true; } },
  { id: 'aoe', name: '💥 Explosive', desc: 'Bullets explode on hit', apply: p => { p.explosive = true; } },
];

function getEnemyArchetype(wave) {
  if (wave % 5 === 0) return 'boss';
  const roll = Math.random();
  if (wave < 3) return roll < 0.7 ? 'rusher' : 'shooter';
  if (wave < 6) return roll < 0.4 ? 'rusher' : roll < 0.75 ? 'shooter' : 'tank';
  return roll < 0.3 ? 'rusher' : roll < 0.6 ? 'shooter' : roll < 0.85 ? 'tank' : 'boss';
}

function archetypeStats(arch, wave) {
  const s = 1 + (wave - 1) * 0.12;
  switch (arch) {
    case 'rusher':
      return { hp: Math.round(40*s), speed: 120+wave*5, dmg: 10+wave, fireRate: 600, range: 60, size: 24, color: 0xff4444, label: 'Rusher' };
    case 'shooter':
      return { hp: Math.round(30*s), speed: 70+wave*3, dmg: 8+wave, fireRate: 900, range: 350, size: 22, color: 0x44aaff, label: 'Shooter' };
    case 'tank':
      return { hp: Math.round(120*s*1.3), speed: 45+wave*2, dmg: 15+wave*2, fireRate: 1200, range: 200, size: 34, color: 0xaa44ff, label: 'Tank' };
    case 'boss':
      return { hp: Math.round(300*s*2), speed: 55+wave*2, dmg: 25+wave*3, fireRate: 800, range: 350, size: 46, color: 0xff8800, label: 'BOSS' };
    default: return null;
  }
}

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.mode = data?.mode || 'battle';
    this.playerChar = data?.character || null;
  }

  create() {
    const {width,height} = this.scale;
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x0a0a1a);

    this.WW = 1600;
    this.WH = 1200;
    cam.setBounds(0, 0, this.WW, this.WH);

    const chars = this.game.characters||[];
    const sid = this.playerChar?.id || currencyManager.getSelected();
    this.pData = chars.find(c=>c.id===sid) || chars[0];
    if(!this.pData){ this.scene.start('SelectScene'); return; }

    this.score = 0; this.kills = 0; this.combo = 0; this.comboTimer = 0;
    this.wave = 1; this.waveState = 'spawning'; this.enemiesAlive = 0;
    this.enemiesToSpawn = 0; this.enemiesSpawned = 0;
    this.gameOver = false; this.paused = true; this.matchStarted = false;
    this.level = 1; this.xp = 0; this.xpToNext = 3; this.perks = [];
    this.dmgMult = 1; this.spdMult = 1; this.rofMult = 1;
    this.maxHp = this.pData.hp; this.hasShield = false; this.explosive = false;
    this.speedBoostTime = 0; this.shieldTime = 0; this.multishotTime = 0; this.abilityCD = 0;
    this.bullets = []; this.enemies = []; this.pickups = [];
    this.lastShootTime = 0;
    this.coinsEarned = 0;

    this._buildArena(this.WW, this.WH);
    this.player = this._spawnPlayer(this.WW/2, this.WH/2, this.pData);
    cam.startFollow(this.player, false, 0.08, 0.08);
    cam.setDeadzone(60, 60);
    this._createHUD(width, height);
    this._setupControls(width, height);
    this._countdown(width, height);
  }

  // ════════════ ARENA ════════════
  _buildArena(w, h) {
    this.walls = this.physics.add.staticGroup();

    for (let x = 0; x < w; x += 64)
      for (let y = 0; y < h; y += 64)
        this.add.image(x+32, y+32, 'floor').setDepth(-1);

    const wallGfx = this.add.graphics().setDepth(-0.5);
    wallGfx.fillStyle(0x3344aa, 1);
    wallGfx.fillRect(0, 0, w, 24);
    wallGfx.fillRect(0, h-24, w, 24);
    wallGfx.fillRect(0, 0, 24, h);
    wallGfx.fillRect(w-24, 0, 24, h);
    wallGfx.lineStyle(2, 0x5577cc, 0.4);
    wallGfx.strokeRect(2, 2, w-4, h-4);

    const t = 24;
    this._addWallRect(w/2, t/2, w, t);
    this._addWallRect(w/2, h-t/2, w, t);
    this._addWallRect(t/2, h/2, t, h);
    this._addWallRect(w-t/2, h/2, t, h);

    this.crates = [];
    for (let i = 0; i < 12; i++) {
      let cx, cy, ok = false;
      for (let a = 0; a < 20; a++) {
        cx = Phaser.Math.Between(80,w-80); cy = Phaser.Math.Between(80,h-80);
        if(Math.abs(cx-w/2)<120&&Math.abs(cy-h/2)<120)continue;
        if(!this.crates.some(c=>Phaser.Math.Distance.Between(cx,cy,c.x,c.y)<100)){ok=true;break;}
      }
      if(!ok)continue;
      const crate = this.add.image(cx,cy,'crate');
      this.physics.add.existing(crate,true); this.crates.push(crate);
    }
  }

  _addWallRect(x,y,w,h) {
    const g = this.add.graphics();
    g.fillStyle(0x3344aa,0.5); g.fillRect(-w/2,-h/2,w,h); g.setPosition(x,y);
    this.walls.add(g);
  }

  // ════════════ PLAYER ════════════
  _spawnPlayer(x,y,data) {
    const c1 = parseInt(data.color.replace('#',''),16);
    const c2 = parseInt(data.color2.replace('#',''),16);
    const container = this.add.container(x,y);

    container.add(this.add.circle(3,32,25,0x000000,0.2));
    const body = this.add.graphics();
    body.fillStyle(c1,1); body.fillRoundedRect(-20,-8,40,36,8);
    body.fillStyle(c2,0.5); body.fillRoundedRect(-12,0,24,20,6);
    container.add(body);
    const legs = this.add.graphics();
    legs.fillStyle(0x333355,1); legs.fillRoundedRect(-14,28,10,12,4); legs.fillRoundedRect(4,28,10,12,4);
    legs.fillStyle(0x222244,1); legs.fillRoundedRect(-16,36,14,6,3); legs.fillRoundedRect(2,36,14,6,3);
    container.add(legs);
    const arms = this.add.graphics();
    arms.fillStyle(c1,1); arms.fillRoundedRect(-28,0,10,8,4); arms.fillRoundedRect(18,0,10,8,4);
    container.add(arms);
    const head = this.add.graphics();
    head.fillStyle(c2,1); head.fillCircle(0,-16,18);
    head.fillStyle(Phaser.Display.Color.IntegerToColor(c2).darken(15).color,1); head.fillEllipse(0,-28,28,14);
    head.fillStyle(0xffffff,1); head.fillCircle(-7,-18,6); head.fillCircle(7,-18,6);
    head.fillStyle(0x222222,1); head.fillCircle(-6,-18,3.5); head.fillCircle(8,-18,3.5);
    head.fillStyle(0xffffff,0.8); head.fillCircle(-5,-20,1.5); head.fillCircle(9,-20,1.5);
    head.lineStyle(2,0x222222,0.6); head.beginPath(); head.arc(0,-10,6,0.1,Math.PI-0.1,false); head.strokePath();
    head.fillStyle(0xff8888,0.25); head.fillCircle(-13,-14,5); head.fillCircle(13,-14,5);
    container.add(head);

    const weapon = this.add.graphics(); container.add(weapon); container.weaponGfx = weapon;

    const hpBg = this.add.image(0,-40,'hp_bg').setScale(1,1); container.add(hpBg);
    const hpFill = this.add.graphics();
    hpFill.fillStyle(0x44ff44,1); hpFill.fillRect(-23,-39,46,5);
    container.add(hpFill); container.hpFill = hpFill; container.hpBg = hpBg;

    const shieldVis = this.add.image(0,0,'shield').setScale(1.2).setAlpha(0).setDepth(3); container.add(shieldVis); container.shieldVis = shieldVis;
    const lvlBadge = this.add.text(18,-42,'Lv1',{fontSize:'9px',color:'#ffdd00',fontFamily:'Arial Black',stroke:'#000',strokeThickness:2}).setOrigin(0,0.5).setScale(0);
    container.add(lvlBadge); container.lvlBadge = lvlBadge;

    this.physics.add.existing(container);
    container.body.setCircle(24,-24,-24);

    container.charData = data; container.isPlayer = true;
    container.hp = this.maxHp; container.maxHp = this.maxHp;
    container.baseSpeed = data.speed||100; container.alive = true;
    container.invuln = false; container.stunned = false; container.shielded = false;
    container.lastFired = 0; container.dmgMult = 1; container.spdMult = 1;
    return container;
  }

  // ════════════ ENEMY SPAWN ════════════
  _spawnEnemy(wave) {
    const arch = getEnemyArchetype(wave);
    const stats = archetypeStats(arch, wave);
    const {width,height} = this.scale;
    const cam = this.cameras.main;
    const vx=cam.scrollX, vy=cam.scrollY, m=60;
    let sx,sy;
    switch(Phaser.Math.Between(0,3)){
      case 0:sx=Phaser.Math.Between(vx-m,vx+width+m);sy=vy-m;break;
      case 1:sx=Phaser.Math.Between(vx-m,vx+width+m);sy=vy+height+m;break;
      case 2:sx=vx-m;sy=Phaser.Math.Between(vy-m,vy+height+m);break;
      case 3:sx=vx+width+m;sy=Phaser.Math.Between(vy-m,vy+height+m);break;
    }
    sx=Phaser.Math.Clamp(sx,20,this.WW-20); sy=Phaser.Math.Clamp(sy,20,this.WH-20);
    const c = this.add.container(sx,sy);
    const color=stats.color, s=stats.size;

    c.add(this.add.circle(2,s*0.5+2,s*0.4,0x000000,0.2));
    const body = this.add.graphics();

    if(arch==='rusher'){
      body.fillStyle(color,1); body.beginPath(); body.moveTo(0,-s); body.lineTo(s*0.8,s*0.3); body.lineTo(s*0.4,s); body.lineTo(-s*0.4,s); body.lineTo(-s*0.8,s*0.3); body.closePath(); body.fillPath();
      body.fillStyle(0xffffff,1); body.fillCircle(-s*0.25,-s*0.15,4); body.fillCircle(s*0.25,-s*0.15,4);
      body.fillStyle(0xff0000,1); body.fillCircle(-s*0.2,-s*0.15,2.5); body.fillCircle(s*0.3,-s*0.15,2.5);
    }else if(arch==='shooter'){
      body.fillStyle(color,1); body.fillCircle(0,0,s*0.7);
      body.fillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(20).color,0.6); body.fillCircle(0,-s*0.1,s*0.45);
      body.fillStyle(0xffffff,1); body.fillCircle(-s*0.25,-s*0.2,5); body.fillCircle(s*0.25,-s*0.2,5);
      body.fillStyle(0x222222,1); body.fillCircle(-s*0.2,-s*0.2,3); body.fillCircle(s*0.3,-s*0.2,3);
    }else if(arch==='tank'){
      body.fillStyle(color,1); body.fillRoundedRect(-s*0.8,-s*0.7,s*1.6,s*1.4,8);
      body.fillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(10).color,0.5); body.fillRoundedRect(-s*0.5,-s*0.3,s,s*0.7,6);
      body.fillStyle(0xffffff,1); body.fillCircle(-s*0.25,-s*0.25,3); body.fillCircle(s*0.25,-s*0.25,3);
      body.fillStyle(0x222222,1); body.fillCircle(-s*0.2,-s*0.25,2); body.fillCircle(s*0.3,-s*0.25,2);
    }else if(arch==='boss'){
      body.fillStyle(color,1); body.fillCircle(0,0,s*0.8);
      body.fillStyle(0xffdd00,0.8); for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*0.4;body.fillTriangle(Math.cos(a)*s*0.65,Math.sin(a)*s*0.65,Math.cos(a+0.15)*s*0.85,Math.sin(a+0.15)*s*0.85,Math.cos(a-0.15)*s*0.85,Math.sin(a-0.15)*s*0.85);}
      body.fillStyle(0xff0000,1); body.fillCircle(-s*0.25,-s*0.15,6); body.fillCircle(s*0.25,-s*0.15,6);
      body.fillStyle(0xffff00,1); body.fillCircle(-s*0.2,-s*0.15,3); body.fillCircle(s*0.3,-s*0.15,3);
      body.lineStyle(3,0xff4400,0.8); body.beginPath(); body.arc(0,s*0.15,s*0.25,0.1,Math.PI-0.1,false); body.strokePath();
      const glow=this.add.circle(0,0,s*0.9,color,0.1).setDepth(-1); c.add(glow);
      this.tweens.add({targets:glow,scaleX:1.2,scaleY:1.2,alpha:0.15,duration:800,yoyo:true,repeat:-1});
    }
    c.add(body);

    const tag=this.add.text(0,-s-10,arch==='boss'?`⚠️ ${stats.label} ⚠️`:stats.label,{fontSize:arch==='boss'?'12px':'9px',color:arch==='boss'?'#ff8800':'#fff',fontFamily:'Arial Black',stroke:'#000',strokeThickness:2}).setOrigin(0.5);c.add(tag);
    const hpBg=this.add.image(0,-s-2,'hp_bg').setScale(stats.hp>200?1.5:1,1);c.add(hpBg);
    const hpFill=this.add.graphics();hpFill.fillStyle(arch==='boss'?0xff8800:(arch==='tank'?0xaa44ff:0xff4444),1);hpFill.fillRect(-23*(stats.hp>200?1.5:1),-s-1,46*(stats.hp>200?1.5:1),4);c.add(hpFill);c.hpFill=hpFill;c.hpBg=hpBg;

    this.physics.add.existing(c); c.body.setCircle(s*0.55,-s*0.55,-s*0.55);
    c.alive=true;c.arch=arch;c.hp=stats.hp;c.maxHp=stats.hp;c.speed=stats.speed;c.dmg=stats.dmg;c.fireRate=stats.fireRate;c.range=stats.range;c.size=s;c.invuln=false;c.stunned=false;c.lastFired=0;c.abilCD=Math.random()*3000;
    if(arch==='boss'){c.phase=1;c.maxPhase=3;}

    const portal=this.add.image(sx,sy,'spawn_portal').setScale(0.5).setAlpha(0);
    this.tweens.add({targets:portal,alpha:0.8,scaleX:1.2,scaleY:1.2,duration:250,yoyo:true,onComplete:()=>{this.tweens.add({targets:portal,alpha:0,duration:200,onComplete:()=>portal.destroy()});}});
    c.setAlpha(0); this.tweens.add({targets:c,alpha:1,duration:300});
    this.enemies.push(c); this.enemiesAlive++; this.enemiesSpawned++;
  }

  // ════════════ CONTROLS ════════════
  _setupControls(w,h) {
    this.joystick={active:false,pointerId:-1,baseX:0,baseY:0,dx:0,dy:0,dist:0};
    this.joystickBase=this.add.circle(0,0,55,0xffffff,0.12).setDepth(9999).setAlpha(0).setScrollFactor(0);
    this.joystickBase.setStrokeStyle(2,0xffffff,0.2);
    this.joystickThumb=this.add.circle(0,0,24,0xffffff,0.3).setDepth(10000).setAlpha(0).setScrollFactor(0);
    this.joystickThumb.setStrokeStyle(2,0xffffff,0.5);
    this.firing=false;

    this.abilBtn=this.add.circle(w-55,h-55,30,0xff6b35,0.8).setDepth(9999).setScrollFactor(0);
    this.abilBtn.setStrokeStyle(3,0xff8844,1);
    this.abilLabel=this.add.text(w-55,h-55,'⚡',{fontSize:'24px'}).setOrigin(0.5).setDepth(10000).setScrollFactor(0);
    this.abilOverlay=this.add.circle(w-55,h-55,30,0x000000,0).setDepth(10001).setScrollFactor(0);
    this.abilCDText=this.add.text(w-55,h-55,'',{fontSize:'15px',color:'#fff',fontFamily:'Arial Black'}).setOrigin(0.5).setDepth(10002).setScrollFactor(0);
    this.crosshair=this.add.image(0,0,'crosshair').setDepth(9990).setAlpha(0).setScrollFactor(0);

    this.input.on('pointerdown',(p)=>{
      if(this.game.sound_gen)this.game.sound_gen.resume();
      if(Phaser.Math.Distance.Between(p.x,p.y,w-55,h-55)<35&&this.abilityCD<=0){this._useAbility(this.player,this.player.x+1,this.player.y+1);return;}
      if(p.x<w*0.5){this.joystick.active=true;this.joystick.pointerId=p.id;this.joystick.baseX=p.x;this.joystick.baseY=p.y;this.joystickBase.setPosition(p.x,p.y).setAlpha(1);this.joystickThumb.setPosition(p.x,p.y).setAlpha(1);}
      else{this.firing=true;}
    });
    this.input.on('pointermove',(p)=>{
      if(this.joystick.active&&p.id===this.joystick.pointerId){
        const dx=p.x-this.joystick.baseX,dy=p.y-this.joystick.baseY,dist=Math.sqrt(dx*dx+dy*dy),maxDist=50,deadZone=10;
        if(dist<deadZone){this.joystick.dx=0;this.joystick.dy=0;this.joystick.dist=0;}
        else{const clamped=Math.min(dist,maxDist),a=Math.atan2(dy,dx),norm=clamped/maxDist;this.joystick.dx=Math.cos(a)*norm;this.joystick.dy=Math.sin(a)*norm;this.joystick.dist=norm;this.joystickThumb.setPosition(this.joystick.baseX+Math.cos(a)*clamped,this.joystick.baseY+Math.sin(a)*clamped);}
      }
    });
    this.input.on('pointerup',(p)=>{
      if(p.id===this.joystick.pointerId){this.joystick.active=false;this.joystick.dx=0;this.joystick.dy=0;this.joystick.dist=0;this.joystickBase.setAlpha(0);this.joystickThumb.setAlpha(0);}
      this.firing=false;
    });
    if(this.input.keyboard)this.keys={W:this.input.keyboard.addKey('W'),A:this.input.keyboard.addKey('A'),S:this.input.keyboard.addKey('S'),D:this.input.keyboard.addKey('D'),SPACE:this.input.keyboard.addKey('SPACE'),Q:this.input.keyboard.addKey('Q')};
  }

  // ════════════ COUNTDOWN ════════════
  _countdown(w,h) {
    this.paused=true; this.matchStarted=false; let c=3;
    const ct=this.add.text(w/2,h/2,'3',{fontSize:'80px',color:'#ffdd00',fontFamily:'Arial Black',stroke:'#000',strokeThickness:10}).setOrigin(0.5).setDepth(1000).setScrollFactor(0);
    this.time.addEvent({delay:700,repeat:3,callback:()=>{c--;if(c>0){ct.setText(c.toString());this.tweens.add({targets:ct,scaleX:1.4,scaleY:1.4,duration:150,yoyo:true});}else if(c===0){ct.setText('GO!');ct.setColor('#44ff44');this.tweens.add({targets:ct,scaleX:2.5,scaleY:2.5,alpha:0,duration:600,onComplete:()=>{ct.destroy();this.paused=false;this.matchStarted=true;this._startWave(1);}});}}});
  }

  // ════════════ WAVE SYSTEM ════════════
  _startWave(waveNum) {
    if(this.gameOver)return;
    this.wave=waveNum; this.waveState='spawning'; this.enemiesSpawned=0;
    this.enemiesToSpawn=Math.min(2+Math.floor(waveNum/2),8);
    const{width,height}=this.scale;
    const isBoss=waveNum%5===0;
    const wt=this.add.text(width/2,height*0.25,isBoss?`⚠️ WAVE ${waveNum} — BOSS ⚠️`:`WAVE ${waveNum}`,{fontSize:isBoss?'26px':'22px',color:isBoss?'#ff8800':'#ff8844',fontFamily:'Arial Black',stroke:'#000',strokeThickness:4}).setOrigin(0.5).setDepth(10000).setScrollFactor(0);
    this.tweens.add({targets:wt,alpha:0,y:wt.y-40,duration:2000,onComplete:()=>wt.destroy()});
    this.cameras.main.flash(300,255,255,255,false,null,this);
    const delay=isBoss?1500:700;
    for(let i=0;i<this.enemiesToSpawn;i++)this.time.delayedCall(i*delay,()=>{if(!this.gameOver)this._spawnEnemy(waveNum);if(i===this.enemiesToSpawn-1&&isBoss)this.time.delayedCall(1200,()=>{if(!this.gameOver)this._spawnEnemy(waveNum);this.enemiesToSpawn++;});});
  }

  // ════════════ HUD ════════════
  _createHUD(w,h) {
    const sf=0; // scroll factor 0 for all HUD
    const topBar=this.add.graphics().setDepth(9998).setScrollFactor(0);
    topBar.fillStyle(0x000000,0.5); topBar.fillRect(0,0,w,40);

    this.timerText=this.add.text(w/2,8,'∞',{fontSize:'18px',color:'#aaa',fontFamily:'Arial Black',stroke:'#000',strokeThickness:2}).setOrigin(0.5,0).setDepth(9999).setScrollFactor(0);
    this.scoreText=this.add.text(8,4,'Score: 0',{fontSize:'12px',color:'#fff',fontFamily:'Arial',stroke:'#000',strokeThickness:2}).setDepth(9999).setScrollFactor(0);
    this.hpText=this.add.text(8,22,`❤️ ${this.maxHp}`,{fontSize:'11px',color:'#44ff44',fontFamily:'Arial',stroke:'#000',strokeThickness:1}).setDepth(9999).setScrollFactor(0);
    this.waveText=this.add.text(w/2,24,'Wave 1',{fontSize:'10px',color:'#aaa',fontFamily:'Arial'}).setOrigin(0.5,0).setDepth(9999).setScrollFactor(0);
    this.killText=this.add.text(w-8,4,'💀 0',{fontSize:'12px',color:'#ff6666',fontFamily:'Arial',stroke:'#000',strokeThickness:2}).setOrigin(1,0).setDepth(9999).setScrollFactor(0);
    this.coinText=this.add.text(w-8,22,'🪙 0',{fontSize:'11px',color:'#ffdd00',fontFamily:'Arial',stroke:'#000',strokeThickness:1}).setOrigin(1,0).setDepth(9999).setScrollFactor(0);
    this.comboText=this.add.text(w/2,h-25,'',{fontSize:'16px',color:'#ffdd00',fontFamily:'Arial Black',stroke:'#000',strokeThickness:3}).setOrigin(0.5,1).setDepth(9999).setScrollFactor(0);

    this.xpBarBg=this.add.graphics().setDepth(9999).setScrollFactor(0);
    this.xpBarBg.fillStyle(0x333333,0.6); this.xpBarBg.fillRoundedRect(w/2-60,h-10,120,6,3);
    this.xpBarFill=this.add.graphics().setDepth(10000).setScrollFactor(0);
    this.levelText=this.add.text(w/2,h-12,'Lv.1',{fontSize:'9px',color:'#ffdd00',fontFamily:'Arial Black',stroke:'#000',strokeThickness:1}).setOrigin(0.5,1).setDepth(10000).setScrollFactor(0);
    this.abilLabel=this.add.text(w-55,h-90,'ABILITY',{fontSize:'8px',color:'#aaa',fontFamily:'Arial'}).setOrigin(0.5).setDepth(9999).setScrollFactor(0);
  }

  // ════════════ UPDATE ════════════
  update(time,delta){
    if(this.paused||this.gameOver||!this.matchStarted)return;
    const{width,height}=this.scale;

    if(this.waveState==='spawning'&&this.enemiesSpawned>=this.enemiesToSpawn)this.waveState='fighting';
    if(this.waveState==='fighting'&&this.enemiesAlive<=0){
      this.waveState='clearing';
      const bonus=50*this.wave;this.score+=bonus;
      this._spawnParticles(this.player.x,this.player.y,0xffdd00,10,5);
      this._floatingText(this.player.x,this.player.y-40,`+${bonus} WAVE CLEAR!`,0xffdd00,22);
      this.wave++;this.time.delayedCall(1500,()=>{if(!this.gameOver)this._startWave(this.wave);});
    }

    if(this.player&&this.player.alive&&!this.player.stunned){
      let vx=0,vy=0;
      if(this.keys){if(this.keys.W.isDown)vy=-1;if(this.keys.S.isDown)vy=1;if(this.keys.A.isDown)vx=-1;if(this.keys.D.isDown)vx=1;}
      if(this.joystick.active&&this.joystick.dist>0.15){vx=this.joystick.dx;vy=this.joystick.dy;}
      if(vx!==0&&vy!==0&&!this.joystick.active){vx*=0.707;vy*=0.707;}
      let spd=this.player.baseSpeed*this.spdMult;if(this.speedBoostTime>0)spd*=1.6;
      const lerp=0.25;
      this.player.body.setVelocity(
        this.player.body.velocity.x+(vx*spd-this.player.body.velocity.x)*lerp,
        this.player.body.velocity.y+(vy*spd-this.player.body.velocity.y)*lerp
      );
      this.player.x=Phaser.Math.Clamp(this.player.x,30,this.WW-30);
      this.player.y=Phaser.Math.Clamp(this.player.y,30,this.WH-30);

      let nearest=null,nearestDist=9999;
      this.enemies.forEach(e=>{if(!e.alive)return;const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);if(d<nearestDist){nearestDist=d;nearest=e;}});
      if(nearest){
        const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,nearest.x,nearest.y);
        this.player.rotation=a;
        this._drawWeapon(this.player.weaponGfx,a,true);
        this.crosshair.setPosition(nearest.x-this.cameras.main.scrollX,nearest.y-this.cameras.main.scrollY).setAlpha(0.6);
      }else this.crosshair.setAlpha(0);

      if(this.firing||(this.keys&&this.keys.SPACE.isDown)){
        const wd=WEAPONS[this.pData.weapon]||WEAPONS.laser;
        if(time-this.lastShootTime>wd.fireRate*this.rofMult){this._shoot(this.player,(nearest||{x:this.player.x+100,y:this.player.y}).x,(nearest||{x:this.player.x+100,y:this.player.y}).y,1*this.dmgMult);this.lastShootTime=time;}
      }
      if(this.keys&&this.keys.Q.isDown&&this.abilityCD<=0&&!this.player.stunned)this._useAbility(this.player,this.player.x+1,this.player.y+1);
    }

    if(this.abilityCD>0)this.abilityCD-=delta;
    if(this.speedBoostTime>0){this.speedBoostTime-=delta;if(this.speedBoostTime<=0){this._hidePowerBar();if(this.player)this._floatingText(this.player.x,this.player.y-20,'Speed worn off',0x888888,14);}}
    if(this.shieldTime>0){this.shieldTime-=delta;if(this.shieldTime<=0&&this.player){this.player.shielded=false;if(this.player.shieldVis)this.player.shieldVis.setAlpha(0);}}
    if(this.multishotTime>0)this.multishotTime-=delta;
    if(this.combo>0){this.comboTimer-=delta;if(this.comboTimer<=0)this.combo=0;}
    if(this.abilityCD>0){this.abilOverlay.setAlpha(0.55);this.abilCDText.setText(Math.ceil(this.abilityCD/1000)+'s');}else{this.abilOverlay.setAlpha(0);this.abilCDText.setText('');}

    // AI
    this.enemies.forEach(e=>{
      if(!e.alive||!e.active||e.stunned)return;
      const d=Phaser.Math.Distance.Between(e.x,e.y,this.player.x,this.player.y);
      const a=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y);
      switch(e.arch){
        case'rusher':{const spd=d<100?e.speed*1.3:e.speed;e.body.setVelocity(Math.cos(a)*spd,Math.sin(a)*spd);if(d<e.range&&time-e.lastFired>e.fireRate){this._damage(this.player,e.dmg);e.lastFired=time;e.body.setVelocity(Math.cos(a)*spd*3,Math.sin(a)*spd*3);this._spawnParticles(e.x,e.y,0xff4444,5,3);}break;}
        case'shooter':{if(d>e.range*0.8)e.body.setVelocity(Math.cos(a)*e.speed,Math.sin(a)*e.speed);else if(d<e.range*0.3)e.body.setVelocity(-Math.cos(a)*e.speed,-Math.sin(a)*e.speed);else e.body.setVelocity(Math.cos(a+Math.PI/2)*e.speed*0.5,Math.sin(a+Math.PI/2)*e.speed*0.5);if(d<e.range&&time-e.lastFired>e.fireRate){this._spawnEnemyBullet(e,this.player.x,this.player.y,e.dmg);e.lastFired=time;}break;}
        case'tank':{if(d>e.range*1.2)e.body.setVelocity(Math.cos(a)*e.speed,Math.sin(a)*e.speed);else if(d<e.range*0.4)e.body.setVelocity(-Math.cos(a)*e.speed*0.5,-Math.sin(a)*e.speed*0.5);else e.body.setVelocity(0,0);if(d<e.range&&time-e.lastFired>e.fireRate){this._spawnEnemyBullet(e,this.player.x,this.player.y,e.dmg*1.5);e.lastFired=time;this.cameras.main.shake(60,0.004);}break;}
        case'boss':{if(e.phase===1){if(d>200)e.body.setVelocity(Math.cos(a)*e.speed*0.6,Math.sin(a)*e.speed*0.6);else e.body.setVelocity(0,0);if(d<e.range&&time-e.lastFired>e.fireRate*0.7){[-0.15,0,0.15].forEach(s=>{this._spawnEnemyBullet(e,this.player.x+Math.sin(s)*50,this.player.y+Math.cos(s)*50,e.dmg*0.6);});e.lastFired=time;}}else if(e.phase===2){if(d<e.range*1.2&&time-e.lastFired>e.fireRate*0.4){for(let i=0;i<5;i++){const aa=a+(i-2)*0.2;this._spawnEnemyBullet(e,e.x+Math.cos(aa)*50,e.y+Math.sin(aa)*50,e.dmg*0.8);}e.lastFired=time;}if(d>150)e.body.setVelocity(Math.cos(a)*e.speed*1.2,Math.sin(a)*e.speed*1.2);this.cameras.main.shake(80,0.003);}break;}
      }
      e.rotation=a;
    });

    // Bullets
    this.bullets=this.bullets.filter(b=>{
      if(!b.active)return false;
      if(b.x<-50||b.x>this.WW+50||b.y<-50||b.y>this.WH+50){b.destroy();return false;}
      for(const crate of this.crates){if(crate.active&&Phaser.Math.Distance.Between(b.x,b.y,crate.x,crate.y)<28){this._spawnParticles(crate.x,crate.y,0x6677bb,5,3);if(this.explosive&&!b.fromEnemy)this._explosionAt(b.x,b.y,50,b.dmg*0.5);b.destroy();return false;}}
      if(b.x<25||b.x>this.WW-25||b.y<25||b.y>this.WH-25){this._spawnParticles(b.x,b.y,0x5577cc,3,2);b.destroy();return false;}
      if(!b.fromEnemy){for(const e of this.enemies){if(e.active&&e.alive&&Phaser.Math.Distance.Between(b.x,b.y,e.x,e.y)<e.size*0.5+8){const dmg=Math.round(b.dmg);this._damage(e,dmg);if(this.explosive)this._explosionAt(b.x,b.y,40,b.dmg*0.4);if(this.lifesteal){if(this.player)this.player.hp=Math.min(this.player.maxHp,this.player.hp+Math.round(dmg*0.2));}b.destroy();return false;}}}
      if(b.fromEnemy&&this.player&&this.player.alive&&Phaser.Math.Distance.Between(b.x,b.y,this.player.x,this.player.y)<28){this._damage(this.player,b.dmg);b.destroy();return false;}
      return b.active;
    });

    // Pickups
    this.pickups=this.pickups.filter(p=>{
      if(!p.active)return false;
      if(this.player&&this.player.alive&&Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<35){
        if(p.pType==='coins'){currencyManager.addCoins(p.value);this.coinsEarned+=p.value;this._floatingText(p.x,p.y-15,`+${p.value} 🪙`,0xffdd00,16);}
        else if(p.pType==='health'){this.player.hp=Math.min(this.player.maxHp,this.player.hp+p.value);this._floatingText(p.x,p.y-15,`+${p.value} ❤️`,0x44ff44,16);}
        else if(p.pType==='speed'){this.speedBoostTime=3000;}
        this._spawnParticles(p.x,p.y,0x44ff44,5,3);p.destroy();return false;
      }
      return true;
    });

    // HP bar
    if(this.player&&this.player.alive){
      const hpPct=Math.max(0,this.player.hp/this.player.maxHp);
      this.player.hpFill.clear();const hc=hpPct>0.5?0x44ff44:(hpPct>0.25?0xffdd00:0xff4444);
      this.player.hpFill.fillStyle(hc,1);this.player.hpFill.fillRect(-23,-39,46*hpPct,5);
      this.hpText.setText(`❤️ ${Math.ceil(this.player.hp)}`);
    }

    this.scoreText.setText(`Score: ${this.score}`);this.killText.setText(`💀 ${this.kills}`);this.waveText.setText(`Wave ${this.wave}`);
    if(this.combo>=3)this.comboText.setText(`🔥 ${this.combo}x COMBO`);else this.comboText.setText('');
    const xpPct=this.xp/this.xpToNext;this.xpBarFill.clear();this.xpBarFill.fillStyle(0x44aaff,1);this.xpBarFill.fillRoundedRect(this.scale.width/2-59,this.scale.height-9,118*xpPct,4,2);
  }

  // ════════════ SHOOTING ════════════
  _drawWeapon(gfx,a,isPlayer){
    gfx.clear();
    const wd=WEAPONS[this.pData.weapon]||WEAPONS.laser;
    const dir=isPlayer?1:-1;
    gfx.fillStyle(wd.color,1);gfx.fillRect(dir>0?10:-30,2,24,5);gfx.fillRect(dir>0?6:-10,7,8,7);
    gfx.fillStyle(Phaser.Display.Color.IntegerToColor(wd.color).brighten(30).color,0.7);gfx.fillCircle(dir>0?34:-34,5,3);
  }

  _shoot(char,tx,ty,dmgMult){
    const wd=WEAPONS[char.charData.weapon]||WEAPONS.laser;
    const a=Phaser.Math.Angle.Between(char.x,char.y,tx,ty),spd=wd.speed||500,dmg=Math.round((char.charData.damage||10)*dmgMult);
    const count=this.multishotTime>0?3:1;
    if(this.game.sound_gen)this.game.sound_gen.shoot();
    for(let i=0;i<count;i++){
      const ba=a+(i===0?0:Phaser.Math.FloatBetween(-0.12,0.12));
      const glow=this.add.circle(char.x+Math.cos(ba)*24,char.y+Math.sin(ba)*24,(wd.size||5)*0.8,wd.color,0.15).setDepth(49);
      this.tweens.add({targets:glow,alpha:0,duration:150,onComplete:()=>glow.destroy()});
      const bul=this.add.circle(char.x+Math.cos(ba)*24,char.y+Math.sin(ba)*24,(wd.size||5)/2,wd.color,1).setDepth(50);
      this.physics.add.existing(bul);bul.dmg=dmg;bul.fromEnemy=!char.isPlayer;bul.body.setVelocity(Math.cos(ba)*spd,Math.sin(ba)*spd);this.bullets.push(bul);
      this.time.delayedCall(3000,()=>{if(bul.active){this._spawnParticles(bul.x,bul.y,wd.color,3,2);bul.destroy();}});
    }
  }

  _spawnEnemyBullet(e,tx,ty,dmg){
    const a=Phaser.Math.Angle.Between(e.x,e.y,tx,ty),spd=e.arch==='tank'?350:(e.arch==='boss'?400:500);
    const sz=e.arch==='tank'?8:(e.arch==='boss'?7:5);
    const col=e.arch==='rusher'?0xff4444:(e.arch==='boss'?0xff8800:(e.arch==='tank'?0xaa44ff:0x44aaff));
    const glow=this.add.circle(e.x,e.y,sz*0.8,col,0.15).setDepth(49);
    this.tweens.add({targets:glow,alpha:0,duration:150,onComplete:()=>glow.destroy()});
    const bul=this.add.circle(e.x,e.y,sz/2,col,1).setDepth(50);
    this.physics.add.existing(bul);bul.dmg=dmg;bul.fromEnemy=true;bul.body.setVelocity(Math.cos(a)*spd,Math.sin(a)*spd);this.bullets.push(bul);
    this.time.delayedCall(3000,()=>{if(bul.active)bul.destroy();});
  }

  // ════════════ DAMAGE ════════════
  _damage(char,dmg){
    if(!char.alive||char.invuln)return;
    if(char.shielded){dmg=Math.floor(dmg*0.25);this._spawnParticles(char.x,char.y,0x88bbff,5,4);this._floatingText(char.x,char.y-25,'BLOCKED!',0x88bbff,14);}
    if(char.isPlayer&&this.hasShield&&dmg>0){this.hasShield=false;this._floatingText(char.x,char.y-35,'🛡️ ABSORBED!',0x88bbff,18);this._spawnParticles(char.x,char.y,0x88bbff,10,5);return;}
    const isCrit=Math.random()<0.1;const finalDmg=isCrit?Math.round(dmg*2):dmg;
    char.hp-=finalDmg;
    this._spawnParticles(char.x,char.y,char.isPlayer?0xff4444:0xffdd00,5,3);
    this._floatingText(char.x+Phaser.Math.Between(-12,12),char.y-15-(char.size||20),isCrit?`💥 ${finalDmg}`:`-${finalDmg}`,isCrit?0xff8800:(char.isPlayer?0xff4444:0xffdd00),isCrit?22:16);
    this.cameras.main.shake(100,char.arch==='boss'?0.008:(char.isPlayer?0.006:0.003));

    char.invuln=true;
    this.tweens.add({targets:char,alpha:0.3,duration:50,yoyo:true,repeat:2,onComplete:()=>{if(char.alive)char.invuln=false;}});

    if(char.hpFill&&char.hpBg){
      const hpPct=Math.max(0,char.hp/char.maxHp);char.hpFill.clear();
      const hc=char.isPlayer?(hpPct>0.5?0x44ff44:(hpPct>0.25?0xffdd00:0xff4444)):(char.arch==='boss'?0xff8800:(char.arch==='tank'?0xaa44ff:0xff4444));
      char.hpFill.fillStyle(hc,1);char.hpFill.fillRect(-23*(char.hpBg.scaleX||1),-1,46*hpPct*(char.hpBg.scaleX||1),4);
    }

    if(char.arch==='boss'&&char.hp<=char.maxHp*(1-char.phase/char.maxPhase)){char.phase=Math.min(char.phase+1,char.maxPhase);char.speed*=1.15;char.fireRate*=0.8;this._spawnParticles(char.x,char.y,0xff8800,20,6);this.cameras.main.shake(200,0.01);this._floatingText(char.x,char.y-50,'⚠️ ENRAGED! ⚠️',0xff4400,24);}
    if(char.hp<=0)this._kill(char);
  }

  _kill(char){
    char.alive=false;char.setVisible(false);if(char.body)char.body.setVelocity(0,0);
    this._spawnParticles(char.x,char.y,char.isPlayer?0xff4444:0xff8844,25,8);this._spawnParticles(char.x,char.y,0xffffff,10,4);this.cameras.main.shake(150,char.arch==='boss'?0.012:0.006);
    const ring=this.add.circle(char.x,char.y,5,0xffffff,0.4).setDepth(60);this.tweens.add({targets:ring,scaleX:5,scaleY:5,alpha:0,duration:400,onComplete:()=>ring.destroy()});
    if(this.game.sound_gen)this.game.sound_gen.explosion();

    if(!char.isPlayer){
      this.kills++;this.combo++;this.comboTimer=3000;
      this.xp++;if(this.xp>=this.xpToNext)this._levelUp(char.x,char.y);
      const ab=char.arch==='boss'?500:(char.arch==='tank'?150:(char.arch==='shooter'?80:100));const cb=Math.floor(this.combo*0.3);
      this.score+=ab+cb*10;this._floatingText(char.x,char.y-30,`+${ab+cb*10}`,0xffdd00,22);
      this._spawnPickup(char.x,char.y,'coins',char.arch==='boss'?30:(char.arch==='tank'?12:5));
      if(Math.random()<0.3)this._spawnPickup(char.x+Phaser.Math.Between(-20,20),char.y+Phaser.Math.Between(-20,20),'health',20);
      if(Math.random()<0.1)this._spawnPickup(char.x+Phaser.Math.Between(-20,20),char.y+Phaser.Math.Between(-20,20),'speed',0);
      if(char.arch==='boss'){this._floatingText(char.x,char.y-50,'💀 BOSS DEFEATED!',0xff8800,28);this.cameras.main.shake(300,0.015);for(let i=0;i<3;i++)this._spawnPickup(char.x+Phaser.Math.Between(-40,40),char.y+Phaser.Math.Between(-40,40),'coins',20);this._spawnPickup(char.x,char.y-30,'health',50);this.xp+=2;if(this.xp>=this.xpToNext)this._levelUp(char.x,char.y);}
      this.enemiesAlive--;
      this.time.delayedCall(50,()=>{const i=this.enemies.indexOf(char);if(i>=0)this.enemies.splice(i,1);});
    }else{if(this.game.sound_gen)this.game.sound_gen.defeat();this.time.delayedCall(800,()=>this._endMatch());}
  }

  // ════════════ LEVEL UP ════════════
  _levelUp(x,y){
    this.level++;this.xp=0;this.xpToNext=Math.min(3+this.level*2,15);
    this._floatingText(x,y-40,`⬆️ LEVEL ${this.level}!`,0x44aaff,26);this._spawnParticles(x,y,0x44aaff,15,5);this.cameras.main.shake(100,0.005);
    this._showPerkPicker();
    if(this.player&&this.player.lvlBadge){this.player.lvlBadge.setText(`Lv${this.level}`);this.tweens.add({targets:this.player.lvlBadge,scaleX:1,scaleY:1,duration:300,ease:'Back.easeOut'});}
    this.levelText.setText(`Lv.${this.level}`);
  }

  _showPerkPicker() {
    const{width,height}=this.scale;
    const shuffled=Phaser.Utils.Array.Shuffle([...PERKS]);const choices=shuffled.slice(0,3);
    const overlay=this.add.graphics().setDepth(20000).setScrollFactor(0);
    overlay.fillStyle(0x000000,0.7);overlay.fillRect(0,0,width,height);
    this.add.text(width/2,height*0.15,'⬆️ LEVEL UP! Select a perk:',{fontSize:'18px',color:'#44aaff',fontFamily:'Arial Black',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(20001).setScrollFactor(0);
    choices.forEach((perk,i)=>{
      const cardX=width/2,cardY=height*0.3+i*85,cardW=width-40,cardH=65;
      const card=this.add.graphics().setDepth(20002).setScrollFactor(0);
      card.fillStyle(0x1a1a3e,0.95);card.fillRoundedRect(cardX-cardW/2,cardY-cardH/2,cardW,cardH,10);
      card.lineStyle(2,0x44aaff,0.6);card.strokeRoundedRect(cardX-cardW/2+1,cardY-cardH/2+1,cardW-2,cardH-2,10);
      card.setInteractive(new Phaser.Geom.Rectangle(cardX-cardW/2,cardY-cardH/2,cardW,cardH),Phaser.Geom.Rectangle.Contains);
      card.on('pointerdown',()=>{perk.apply(this);this.perks.push(perk.id);this._floatingText(this.player.x,this.player.y-30,perk.name,0x44ff44,18);overlay.destroy();choices.forEach((_,j)=>{this.scene.children.remove(this[`lvlc${j}`],true);this.scene.children.remove(this[`lvln${j}`],true);});});
      this[`lvlc${i}`]=card;
      this.add.text(cardX-cardW/2+20,cardY,perk.name.split(' ')[0],{fontSize:'22px'}).setOrigin(0.5).setDepth(20003).setScrollFactor(0);
      const n=this.add.text(cardX-cardW/2+60,cardY-8,perk.name,{fontSize:'16px',color:'#fff',fontFamily:'Arial Black',stroke:'#000',strokeThickness:2}).setOrigin(0,0.5).setDepth(20003).setScrollFactor(0);this[`lvln${i}`]=n;
      this.add.text(cardX-cardW/2+60,cardY+10,perk.desc,{fontSize:'12px',color:'#aaa',fontFamily:'Arial'}).setOrigin(0,0.5).setDepth(20003).setScrollFactor(0);
    });
  }

  // ════════════ PICKUPS ════════════
  _spawnPickup(x,y,type,value){
    let icon,color;if(type==='coins'){icon='🪙';color=0xffdd00;}else if(type==='health'){icon='❤️';color=0x44ff44;}else if(type==='speed'){icon='💨';color=0x44ddff;}else return;
    const p=this.add.container(x,y);
    const glow=this.add.circle(0,0,14,color,0.2).setDepth(70);p.add(glow);
    this.tweens.add({targets:glow,scaleX:1.3,scaleY:1.3,alpha:0.1,duration:600,yoyo:true,repeat:-1});
    p.add(this.add.text(0,0,icon,{fontSize:'20px'}).setOrigin(0.5).setDepth(71));
    this.tweens.add({targets:p,y:y+Phaser.Math.Between(-5,5),duration:800,yoyo:true,repeat:-1});
    p.pType=type;p.value=value;this.pickups.push(p);
  }

  // ════════════ ABILITIES ════════════
  _useAbility(char,tx,ty){
    const abil=ABILITIES[char.charData.ability];if(!abil)return;
    if(this.game.sound_gen)this.game.sound_gen.ability();
    const ring = this.add.image(char.x,char.y,'aoe_'+char.charData.ability).setDepth(40).setAlpha(0.5).setScale(0.5);
    this.tweens.add({targets:ring,scaleX:2,scaleY:2,alpha:0,duration:400,onComplete:()=>ring.destroy()});
    const skill=char.charData.ability;
    if(skill==='fireball'||skill==='confetti_bomb'||skill==='meteor'){(char.isPlayer?this.enemies:[this.player]).forEach(t=>{if(t&&t.alive&&Phaser.Math.Distance.Between(char.x,char.y,t.x,t.y)<(abil.radius||80)){this._damage(t,Math.round(abil.damage*this.dmgMult));if(abil.duration)this._stun(t,abil.duration);}});}
    else if(skill==='heal'){char.hp=Math.min(char.maxHp,(char.hp||0)+(abil.healAmt||30));this._spawnParticles(char.x,char.y,0x44ff44,8,4);this._floatingText(char.x,char.y-20,`+${abil.healAmt||30}`,0x44ff44,18);}
    else if(skill==='speed_boost'){this.speedBoostTime=abil.duration||3000;}
    else if(skill==='stun'||skill==='freeze'){this.enemies.forEach(e=>{if(e.alive&&Phaser.Math.Distance.Between(char.x,char.y,e.x,e.y)<(abil.radius||80))this._stun(e,abil.duration||1500);});}
    else if(skill==='bite'){this.enemies.forEach(e=>{if(e.alive&&Phaser.Math.Distance.Between(char.x,char.y,e.x,e.y)<(abil.radius||50))this._damage(e,Math.round(abil.damage*this.dmgMult));});}
    else if(skill==='teleport'){const a=Phaser.Math.Angle.Between(char.x,char.y,tx,ty),d=abil.distance||180;char.setPosition(Phaser.Math.Clamp(char.x+Math.cos(a)*d,30,this.WW-30),Phaser.Math.Clamp(char.y+Math.sin(a)*d,30,this.WH-30));this._spawnParticles(char.x,char.y,0xcc66ff,10,4);}
    else if(skill==='shield'){char.shielded=true;if(char.shieldVis)char.shieldVis.setAlpha(0.6);this.shieldTime=abil.duration||4000;}
    else if(skill==='multishot'){this.multishotTime=abil.duration||5000;}
    if(char.isPlayer)this.abilityCD=abil.cooldown||5000;
  }

  _stun(char,d){char.stunned=true;if(char.body)char.body.setVelocity(0,0);const st=this.add.text(char.x,char.y-(char.size||30)-5,'⚡ STUNNED',{fontSize:'12px',color:'#ff0',fontFamily:'Arial Black',stroke:'#000',strokeThickness:2}).setOrigin(0.5).setDepth(80);this.time.delayedCall(d,()=>{char.stunned=false;st.destroy();});}
  _explosionAt(x,y,r,dmg){this._spawnParticles(x,y,0xff8800,20,6);this._spawnParticles(x,y,0xffdd00,10,4);this.cameras.main.shake(120,0.006);this.enemies.forEach(e=>{if(!e.alive)return;if(Phaser.Math.Distance.Between(x,y,e.x,e.y)<r)this._damage(e,Math.round(dmg));});const ring=this.add.circle(x,y,5,0xff8800,0.5).setDepth(60);this.tweens.add({targets:ring,scaleX:r/5,scaleY:r/5,alpha:0,duration:300,onComplete:()=>ring.destroy()});}
  _spawnParticles(x,y,c,count,size){for(let i=0;i<count;i++){const s=Phaser.Math.Between(size||3,(size||3)+4);const p=this.add.circle(x,y,s,c,1).setDepth(70);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-60,60),y:y+Phaser.Math.Between(-60,60),alpha:0,scaleX:0.2,scaleY:0.2,duration:Phaser.Math.Between(200,500),onComplete:()=>p.destroy()});}}
  _floatingText(x,y,text,c,size){const ft=this.add.text(x,y,text,{fontSize:`${size||16}px`,color:`#${c.toString(16).padStart(6,'0')}`,fontFamily:'Arial Black',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(80);this.tweens.add({targets:ft,y:y-50,alpha:0,duration:900,onComplete:()=>ft.destroy()});}
  _showPowerBar(color,label){}
  _hidePowerBar(){}

  // ════════════ END ════════════
  _endMatch(){
    if(this.gameOver)return;this.gameOver=true;
    this.enemies.forEach(e=>{if(e.body)e.body.setVelocity(0,0);});if(this.player&&this.player.body)this.player.body.setVelocity(0,0);
    const won=this.player&&this.player.alive;const reward=won?35+this.wave*5:15+this.wave*2;
    currencyManager.addCoins(reward);currencyManager.recordMatch(won);
    if(this.score>(currencyManager.getHighScore?.()||0))currencyManager.setHighScore?.(this.score);
    if(this.game.sound_gen){if(won)this.game.sound_gen.victory();else this.game.sound_gen.defeat();}
    const{width,height}=this.scale;
    const ov=this.add.graphics().setDepth(200).setScrollFactor(0);ov.fillStyle(0x000000,0.78);ov.fillRect(0,0,width,height);
    this.add.text(width/2,height*0.15,won?'🎉 VICTORY!':'💀 DEFEATED',{fontSize:'38px',color:won?'#44ff44':'#ff4444',fontFamily:'Arial Black',stroke:'#000',strokeThickness:6}).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    this.add.text(width/2,height*0.24,`Score: ${this.score}  |  Kills: ${this.kills}  |  Wave: ${this.wave}  |  Lv.${this.level}`,{fontSize:'12px',color:'#ccc',fontFamily:'Arial',stroke:'#000',strokeThickness:1}).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    this.add.text(width/2,height*0.3,`🪙 +${reward}`,{fontSize:'24px',color:'#ffdd00',fontFamily:'Arial Black',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    const by=height*0.38;this._btn(width/2,by,'⚔️ PLAY AGAIN',0xff6b35,()=>this.scene.restart({}));this._btn(width/2,by+55,'🏠 MENU',0x3388ff,()=>this.scene.start('MenuScene'));this._btn(width/2,by+110,'🏪 SHOP',0x00d4ff,()=>this.scene.start('ShopScene'));
  }
  _btn(x,y,lbl,color,cb){const h=40,w=180;const b=this.add.graphics().setDepth(201).setScrollFactor(0);b.fillStyle(color,1);b.fillRoundedRect(x-w/2,y-h/2,w,h,12);b.setInteractive(new Phaser.Geom.Rectangle(x-w/2,y-h/2,w,h),Phaser.Geom.Rectangle.Contains);b.on('pointerdown',cb);this.add.text(x,y,lbl,{fontSize:'17px',color:'#fff',fontFamily:'Arial Black',stroke:'#000',strokeThickness:2}).setOrigin(0.5).setDepth(202).setScrollFactor(0);}
}
