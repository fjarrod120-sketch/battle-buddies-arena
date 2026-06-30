// Phaser loaded as global from CDN
import { currencyManager } from '../systems/CurrencyManager.js';
import { WEAPONS, ABILITIES } from '../entities/Characters.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.mode = data?.mode || 'battle';
    this.playerChar = data?.character || null;
  }

  create() {
    const {width,height} = this.scale;
    const sound = this.game.sound_gen;
    this.cameras.main.setBackgroundColor(0x0a0a1a);

    // Load character
    const chars = this.game.characters||[];
    const sid = this.playerChar?.id||currencyManager.getSelected();
    this.pData = chars.find(c=>c.id===sid)||chars[0];
    if(!this.pData){this.scene.start('SelectScene');return;}

    // Game state
    this.score=0; this.kills=0; this.coinsEarned=0; this.combo=0;
    this.matchTime=60; this.gameOver=false; this.paused=true;
    this.wave=1; this.enemiesPerWave=2; this.enemiesSpawned=0;
    this.waveCleared=false; this.abilityCD=0; this.shieldTime=0;
    this.speedBoostTime=0; this.multishotTime=0;
    this.bullets=[]; this.enemies=[]; this.pickups=[];
    this.playerDead=false; this.lastShootTime=0;

    // Build arena
    this._buildArena(width,height);

    // Spawn player
    this.player=this._spawnChar(width/2-80,height/2,this.pData,true);

    // Camera
    this.cameras.main.startFollow(this.player,false,0.08,0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setDeadzone(40,40);

    // HUD
    this._createHUD(width,height);

    // Controls
    this._setupControls(width,height);

    // Countdown
    this._countdown(width,height);
  }

  // ========== ARENA ==========
  _buildArena(w,h){
    // Tiled floor
    for(let x=0;x<w;x+=64)for(let y=0;y<h;y+=64)
      this.add.image(x+32,y+32,'floor').setDepth(-1);

    // Walls
    this.walls=this.physics.add.staticGroup();
    const t=16;
    this._wall(w/2,t/2,w,t);
    this._wall(w/2,h-t/2,w,t);
    this._wall(t/2,h/2,t,h);
    this._wall(w-t/2,h/2,t,h);

    // Random crates
    this.crates=[];
    for(let i=0;i<Phaser.Math.Between(4,8);i++){
      const cx=Phaser.Math.Between(80,w-80);
      const cy=Phaser.Math.Between(80,h-80);
      // Keep away from spawn zones
      if(Math.abs(cx-w/2)<100&&Math.abs(cy-h/2)<100)continue;
      const crate=this.add.image(cx,cy,'crate');
      this.physics.add.existing(crate,true);
      this.crates.push(crate);
    }
  }
  _wall(x,y,w,h){
    const g=this.add.graphics();
    g.fillStyle(0x3344aa,1);g.fillRect(-w/2,-h/2,w,h);
    g.setPosition(x,y);this.walls.add(g);
  }

  // ========== CHARACTER ==========
  _spawnChar(x,y,data,isPlayer){
    const c1=parseInt(data.color.replace('#',''),16);
    const size=isPlayer?30:26;

    const container=this.add.container(x,y);

    // Shadow
    container.add(this.add.circle(2,size*0.6,size*0.5,0x000000,0.15));

    // Sprite
    const sprite=this.add.image(0,0,`char_${data.id}`);
    sprite.setScale(isPlayer?0.9:0.8);
    container.add(sprite);

    // Weapon
    const weapon=this.add.image(isPlayer?20:-20,6,`wp_${data.id}`);
    weapon.setScale(0.9);
    container.add(weapon);
    container.weaponSprite=weapon;

    // Name
    const nt=this.add.text(0,-size-4,data.name,{
      fontSize:'10px',color:'#fff',fontFamily:'Arial',
      stroke:'#000',strokeThickness:2,
    }).setOrigin(0.5);
    container.add(nt);

    // HP bar
    const hpBg=this.add.image(0,-size-14,'hp_bg').setScale(1,1);
    container.add(hpBg);
    const hpFill=this.add.graphics();
    hpFill.fillStyle(isPlayer?0x44ff44:0xff4444,1);
    hpFill.fillRect(-23,-size-13,46,4);
    container.add(hpFill);
    container.hpFill=hpFill;

    // Shield visual
    const shield=this.add.image(0,0,'shield').setScale(0.8).setAlpha(0).setDepth(2);
    container.add(shield);
    container.shieldVis=shield;

    // Physics
    this.physics.add.existing(container);
    container.body.setCircle(size,-size,-size);
    container.body.setCollideWorldBounds(false);

    container.charData=data;
    container.isPlayer=isPlayer;
    container.hp=data.hp;
    container.maxHp=data.hp;
    container.speed=data.speed;
    container.alive=true;
    container.invuln=false;
    container.stunned=false;
    container.shielded=false;
    container.lastFired=0;
    container.abilCD=0;

    return container;
  }

  // ========== JOYSTICK ==========
  _setupControls(w,h){
    // Joystick state
    this.js={active:false,id:-1,startX:0,startY:0,dx:0,dy:0,dist:0};
    this.autoFire=false;

    // Visual joystick (always visible, bottom-left)
    this.jsBase=this.add.circle(70,h-70,48,0xffffff,0.1).setDepth(99);
    this.jsBase.setStrokeStyle(2,0xffffff,0.2);
    this.jsThumb=this.add.circle(70,h-70,22,0xffffff,0.25).setDepth(100);
    this.jsThumb.setStrokeStyle(2,0xffffff,0.4);

    // Ability button (bottom-right)
    this.abilBtn=this.add.circle(w-60,h-60,28,0xff6b35,0.7).setDepth(99);
    this.abilBtn.setStrokeStyle(3,0xff8844,1);
    this.abilLabel=this.add.text(w-60,h-60,'⚡',{fontSize:'22px'}).setOrigin(0.5).setDepth(100);
    this.abilOverlay=this.add.circle(w-60,h-60,28,0x000000,0).setDepth(101);
    this.abilCDText=this.add.text(w-60,h-60,'',{
      fontSize:'14px',color:'#fff',fontFamily:'Arial Black'
    }).setOrigin(0.5).setDepth(102);

    // Shoot button (bottom-center-right)
    this.shootBtn=this.add.circle(w-60,h-130,24,0xff4444,0.5).setDepth(99);
    this.shootBtn.setStrokeStyle(3,0xff6666,0.8);
    this.add.text(w-60,h-130,'🔥',{fontSize:'18px'}).setOrigin(0.5).setDepth(100);

    // Crosshair (auto-aim indicator)
    this.crosshair=this.add.image(0,0,'crosshair').setDepth(90).setAlpha(0);

    // Context: right-side buttons area
    const btnZoneW=100;
    const btnZoneLeft=w-btnZoneW;

    // Touch handlers
    this.input.on('pointerdown',(p)=>{
      sound.resume();
      // Ability button
      if(Phaser.Math.Distance.Between(p.x,p.y,w-60,h-60)<32&&this.abilityCD<=0){
        this._useAbility(this.player,this.player.x+1,this.player.y+1);
        return;
      }
      // Shoot button
      if(Phaser.Math.Distance.Between(p.x,p.y,w-60,h-130)<30){
        this.autoFire=true;
        return;
      }
      // Left side = joystick
      if(p.x<w/2){
        this.js.active=true;
        this.js.id=p.id;
        this.js.startX=p.x;this.js.startY=p.y;
      }else if(p.x<btnZoneLeft){
        // Middle-right = aim & fire
        this.autoFire=true;
      }
    });

    this.input.on('pointermove',(p)=>{
      if(this.js.active&&p.id===this.js.id){
        const dx=p.x-this.js.startX;
        const dy=p.y-this.js.startY;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const maxDist=44;
        const deadZone=8;
        if(dist<deadZone){this.js.dx=0;this.js.dy=0;this.js.dist=0;}
        else{
          const clamped=Math.min(dist,maxDist);
          const a=Math.atan2(dy,dx);
          this.js.dx=Math.cos(a)*(clamped/maxDist);
          this.js.dy=Math.sin(a)*(clamped/maxDist);
          this.js.dist=clamped/maxDist;
          this.jsThumb.setPosition(
            this.js.startX+Math.cos(a)*clamped,
            this.js.startY+Math.sin(a)*clamped
          );
        }
      }
    });

    this.input.on('pointerup',(p)=>{
      if(p.id===this.js.id){this.js.active=false;this.js.dx=0;this.js.dy=0;this.js.dist=0;}
      this.autoFire=false;
    });

    // Keyboard
    if(this.input.keyboard){
      this.kW=this.input.keyboard.addKey('W');
      this.kA=this.input.keyboard.addKey('A');
      this.kS=this.input.keyboard.addKey('S');
      this.kD=this.input.keyboard.addKey('D');
      this.kSpace=this.input.keyboard.addKey('SPACE');
      this.kQ=this.input.keyboard.addKey('Q');
    }
  }

  // ========== COUNTDOWN ==========
  _countdown(w,h){
    const sound=this.game.sound_gen;
    this.paused=true;
    let c=3;
    const ct=this.add.text(w/2,h/2,'3',{
      fontSize:'72px',color:'#ffdd00',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:8,
    }).setOrigin(0.5).setDepth(200);

    this.time.addEvent({delay:700,repeat:3,callback:()=>{
      c--;
      if(c>0){ct.setText(c.toString());sound.countdown();
        this.tweens.add({targets:ct,scaleX:1.4,scaleY:1.4,duration:150,yoyo:true});}
      else if(c===0){
        ct.setText('GO!');ct.setColor('#44ff44');sound.go();
        this.tweens.add({targets:ct,scaleX:2,scaleY:2,alpha:0,duration:500,
          onComplete:()=>{ct.destroy();this.paused=false;this._spawnWave();}
        });
      }
    }});
  }

  // ========== WAVES ==========
  _spawnWave(){
    if(this.gameOver)return;
    this.waveCleared=false;
    this.enemiesSpawned=0;
    const count=this.enemiesPerWave+this.wave-1;
    this.waveEnemyCount=Math.min(count,6);

    // Wave announcement
    const {width,height}=this.scale;
    const wt=this.add.text(width/2,height/3,`WAVE ${this.wave}`,{
      fontSize:'28px',color:'#ff8844',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:4,
    }).setOrigin(0.5).setDepth(150);
    this.tweens.add({targets:wt,alpha:0,y:wt.y-30,duration:2000,
      onComplete:()=>wt.destroy()});

    // Stagger spawns
    for(let i=0;i<this.waveEnemyCount;i++){
      this.time.delayedCall(800*i,()=>{
        if(!this.gameOver)this._spawnEnemy();
      });
    }
  }

  _spawnEnemy(){
    const {width,height}=this.scale;
    const chars=this.game.characters||[];
    const others=chars.filter(c=>c.id!==this.pData.id);
    const eData=Phaser.Math.RND.pick(others)||chars[0];

    // Spawn from edge
    const side=Phaser.Math.Between(0,3);
    let sx,sy;
    if(side===0){sx=Phaser.Math.Between(20,width-20);sy=20;}
    else if(side===1){sx=Phaser.Math.Between(20,width-20);sy=height-20;}
    else if(side===2){sx=20;sy=Phaser.Math.Between(20,height-20);}
    else{sx=width-20;sy=Phaser.Math.Between(20,height-20);}

    // Portal effect
    const portal=this.add.image(sx,sy,'spawn_portal').setScale(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({targets:portal,alpha:1,scaleX:1,scaleY:1,duration:300});

    const enemy=this._spawnChar(sx,sy,eData,false);
    enemy.setAlpha(0);
    this.tweens.add({targets:enemy,alpha:1,duration:400,
      onComplete:()=>{portal.destroy();}});
    enemy._abilCD=Math.random()*4000+2000;
    enemy._lastDirChange=0;
    this.enemies.push(enemy);
    this.enemiesSpawned++;
  }

  // ========== HUD ==========
  _createHUD(w,h){
    const top=this.add.graphics().setDepth(100);
    top.fillStyle(0x000000,0.4);
    top.fillRect(0,0,w,36);

    this.timerText=this.add.text(w/2,8,'60',{
      fontSize:'22px',color:'#ffdd00',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:3,
    }).setOrigin(0.5,0).setDepth(101);

    this.scoreText=this.add.text(8,6,'Score: 0',{
      fontSize:'13px',color:'#fff',fontFamily:'Arial',
      stroke:'#000',strokeThickness:2,
    }).setDepth(101);

    this.hpText=this.add.text(8,20,'❤️ 100',{
      fontSize:'11px',color:'#44ff44',fontFamily:'Arial',
      stroke:'#000',strokeThickness:1,
    }).setDepth(101);

    this.coinText=this.add.text(w-8,6,'🪙 0',{
      fontSize:'13px',color:'#ffdd00',fontFamily:'Arial',
      stroke:'#000',strokeThickness:2,
    }).setOrigin(1,0).setDepth(101);

    this.killText=this.add.text(w-8,20,'💀 0',{
      fontSize:'11px',color:'#ff6666',fontFamily:'Arial',
      stroke:'#000',strokeThickness:1,
    }).setOrigin(1,0).setDepth(101);

    this.waveText=this.add.text(w/2,22,'Wave 1',{
      fontSize:'10px',color:'#aaaaaa',fontFamily:'Arial',
    }).setOrigin(0.5,0).setDepth(101);

    this.comboText=this.add.text(w/2,h-20,'',{
      fontSize:'14px',color:'#ffdd00',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:2,
    }).setOrigin(0.5,1).setDepth(101);

    // Power-up bar
    this.powerBarBg=this.add.graphics().setDepth(101).setAlpha(0);
    this.powerBarBg.fillStyle(0x000000,0.5);
    this.powerBarBg.fillRect(w/2-40,40,80,6);
    this.powerBarFill=this.add.graphics().setDepth(102).setAlpha(0);
  }

  // ========== UPDATE ==========
  update(time,delta){
    if(this.paused||this.gameOver||!this.matchStarted)return;
    const {width,height}=this.scale;
    const sound=this.game.sound_gen;

    // Timer
    this.matchTime-=delta/1000;
    if(this.matchTime<=0){this.matchTime=0;this._endMatch();return;}
    this.timerText.setText(Math.ceil(this.matchTime).toString());

    // Check wave clear
    if(!this.waveCleared&&this.enemiesSpawned>=this.waveEnemyCount){
      const alive=this.enemies.filter(e=>e.alive).length;
      if(alive===0){
        this.waveCleared=true;
        this.wave++;
        this.score+=50*this.wave;
        this.scoreText.setText(`Score: ${this.score}`);
        this.waveText.setText(`Wave ${this.wave}`);
        sound.coinCollect();
        this.floatingText(width/2,height/3,'+50 WAVE BONUS!',0xff8844,24);
        this.time.delayedCall(1500,()=>this._spawnWave());
      }
    }

    // Player movement
    if(this.player&&this.player.alive&&!this.player.stunned){
      let vx=0,vy=0;

      // Keyboard
      if(this.kW&&this.kW.isDown)vy=-1;
      if(this.kS&&this.kS.isDown)vy=1;
      if(this.kA&&this.kA.isDown)vx=-1;
      if(this.kD&&this.kD.isDown)vx=1;

      // Joystick
      if(this.js.active&&this.js.dist>0.15){
        vx=this.js.dx;
        vy=this.js.dy;
      }

      // Normalize keyboard diagonal
      if(vx!==0&&vy!==0&&!this.js.active){
        vx*=0.707;vy*=0.707;
      }

      // Apply speed boost
      let spd=this.player.speed;
      if(this.speedBoostTime>0)spd*=1.6;
      this.player.body.setVelocity(vx*spd,vy*spd);
      if(vx!==0||vy!==0)this.player.weaponSprite.setScale(0.9);
      else this.player.weaponSprite.setScale(0.8);

      // Auto-aim at nearest enemy
      let nearest=null,nearestDist=9999;
      this.enemies.forEach(e=>{
        if(!e.alive)return;
        const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);
        if(d<nearestDist){nearestDist=d;nearest=e;}
      });

      if(nearest){
        const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,nearest.x,nearest.y);
        this.player.setRotation(a);
        this.player.weaponSprite.setPosition(22,6);
        this.crosshair.setPosition(nearest.x,nearest.y).setAlpha(nearestDist<500?0.6:0);
      }else{
        this.crosshair.setAlpha(0);
      }

      // Auto-fire
      if(this.autoFire||(this.kSpace&&this.kSpace.isDown)){
        const wData=WEAPONS[this.pData.weapon]||WEAPONS.laser;
        if(time-this.lastShootTime>wData.fireRate){
          const target=nearest||{x:this.player.x+100,y:this.player.y};
          this._shoot(this.player,target.x,target.y);
          this.lastShootTime=time;
        }
      }

      // Ability key
      if(this.kQ&&this.kQ.isDown&&this.abilityCD<=0&&!this.player.stunned){
        this._useAbility(this.player,this.player.x+1,this.player.y+1);
      }
    }

    // Timers
    if(this.abilityCD>0)this.abilityCD-=delta;
    if(this.speedBoostTime>0){this.speedBoostTime-=delta;
      if(this.speedBoostTime<=0)this._hidePowerBar();}
    if(this.shieldTime>0){this.shieldTime-=delta;
      if(this.shieldTime<=0&&this.player){this.player.shielded=false;
        if(this.player.shieldVis)this.player.shieldVis.setAlpha(0);}}
    if(this.multishotTime>0)this.multishotTime-=delta;

    // Update ability button cooldown
    if(this.abilityCD>0){
      const pct=Math.max(0,this.abilityCD/5000);
      this.abilOverlay.setAlpha(0.6);
      this.abilCDText.setText(Math.ceil(this.abilityCD/1000)+'s');
    }else{
      this.abilOverlay.setAlpha(0);
      this.abilCDText.setText('');
    }

    // AI enemies
    this.enemies.forEach(e=>{
      if(!e.alive||!e.active)return;
      if(e.stunned)return;

      const d=Phaser.Math.Distance.Between(e.x,e.y,this.player.x,this.player.y);
      const a=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y);

      // Movement: chase, strafe, or back off
      if(d>250)e.body.setVelocity(Math.cos(a)*e.speed*0.7,Math.sin(a)*e.speed*0.7);
      else if(d<100)e.body.setVelocity(-Math.cos(a)*e.speed*0.4,-Math.sin(a)*e.speed*0.4);
      else e.body.setVelocity(
        Math.cos(a+Math.PI/2)*e.speed*0.35,
        Math.sin(a+Math.PI/2)*e.speed*0.35
      );

      e.setRotation(a);
      e.weaponSprite.setPosition(-18,5);

      // AI shoot
      const wData=WEAPONS[e.charData.weapon]||WEAPONS.laser;
      if(d<450&&time-e.lastFired>wData.fireRate+600+Math.random()*400){
        this._shoot(e,this.player.x,this.player.y);
        e.lastFired=time;
      }

      // AI ability
      if(e._abilCD<=0&&d<300){
        this._enemyAbility(e);
        e._abilCD=Math.random()*6000+3000;
      }
      e._abilCD-=delta;
    });

    // Update bullets
    this.bullets=this.bullets.filter(b=>{
      if(!b.active)return false;
      const{w,h}=this.scale;
      if(b.x<-30||b.x>w+30||b.y<-30||b.y>h+30){b.destroy();return false;}

      // Crate collision
      for(let crate of this.crates){
        if(crate.active&&Phaser.Math.Distance.Between(b.x,b.y,crate.x,crate.y)<28){
          this._spawnParticles(crate.x,crate.y,0x6677bb,5,3);
          b.destroy();return false;
        }
      }

      // Hit enemies
      if(!b.fromEnemy){
        for(let e of this.enemies){
          if(e.active&&e.alive&&Phaser.Math.Distance.Between(b.x,b.y,e.x,e.y)<28){
            this._damage(e,b.dmg||10);b.destroy();return false;
          }
        }
      }
      // Hit player
      if(b.fromEnemy&&this.player&&this.player.alive){
        if(Phaser.Math.Distance.Between(b.x,b.y,this.player.x,this.player.y)<28){
          this._damage(this.player,b.dmg||8);b.destroy();return false;
        }
      }
      return b.active;
    });

    // HUD updates
    if(this.player&&this.player.alive)
      this.hpText.setText(`❤️ ${Math.ceil(this.player.hp)}`);

    // Combo display
    if(this.combo>=3)this.comboText.setText(`🔥 ${this.combo}x COMBO`);
    else this.comboText.setText('');
  }

  // ========== SHOOTING ==========
  _shoot(char,tx,ty){
    const wData=WEAPONS[char.charData.weapon]||WEAPONS.laser;
    const a=Phaser.Math.Angle.Between(char.x,char.y,tx,ty);
    const spd=wData.speed||500;
    const dmg=char.charData.damage||10;
    const count=char.isPlayer&&this.multishotTime>0?3:1;

    this.game.sound_gen.shoot();

    for(let i=0;i<count;i++){
      const spread=i===0?0:Phaser.Math.FloatBetween(-0.15,0.15);
      const ba=a+spread;
      const bul=this.add.circle(
        char.x+Math.cos(ba)*20,char.y+Math.sin(ba)*20,
        (wData.size||5)/2,wData.color,1
      ).setDepth(50);
      this.physics.add.existing(bul);
      bul.dmg=dmg;
      bul.fromEnemy=!char.isPlayer;
      bul.body.setVelocity(Math.cos(ba)*spd,Math.sin(ba)*spd);
      this.tweens.add({targets:bul,scaleX:0.6,scaleY:0.6,duration:150});
      this.time.delayedCall(2000,()=>{if(bul.active)bul.destroy();});
      this.bullets.push(bul);
    }
  }

  // ========== DAMAGE ==========
  _damage(char,dmg){
    if(!char.alive||char.invuln)return;
    if(char.shielded){dmg=Math.floor(dmg*0.3);
      this._spawnParticles(char.x,char.y,0x88bbff,3,3);}

    char.hp-=dmg;
    this._spawnParticles(char.x,char.y,0xffffff,4,3);
    this.floatingText(char.x+Phaser.Math.Between(-10,10),char.y-20,
      `-${dmg}`,char.isPlayer?0xff4444:0xffdd00,16);

    // Screen shake
    if(char.isPlayer)this.cameras.main.shake(120,0.005);
    else this.cameras.main.shake(80,0.003);

    // Combo on enemy hit
    if(!char.isPlayer){this.combo++;
      this.time.delayedCall(3000,()=>{if(this.combo>0)this.combo--;});}

    if(char.hp<=0)this._kill(char);
    else{
      // Flash
      char.invuln=true;
      this.tweens.add({targets:char,alpha:0.3,duration:60,yoyo:true,repeat:2,
        onComplete:()=>{if(char.alive)char.invuln=false;}});
    }
  }

  _kill(char){
    char.alive=false;
    char.setVisible(false);
    if(char.body)char.body.setVelocity(0,0);
    this.game.sound_gen.explosion();
    this._spawnParticles(char.x,char.y,0xff4444,15,5);

    if(!char.isPlayer){
      const bonus=Math.floor(this.combo*0.5);
      const pts=100+bonus*10;
      this.score+=pts;this.kills++;
      this.coinsEarned+=8+this.wave;
      this.scoreText.setText(`Score: ${this.score}`);
      this.killText.setText(`💀 ${this.kills}`);
      this.floatingText(char.x,char.y-30,`+${pts}`,0xffdd00,20);

      // Coin drop
      const drop=this.add.image(char.x,char.y,'coin_pickup').setDepth(60).setScale(0.8);
      this.tweens.add({targets:drop,y:drop.y-40,alpha:0,duration:600,
        onComplete:()=>drop.destroy()});

      // Respawn
      this.time.delayedCall(2000,()=>{
        if(!this.gameOver&&this.enemiesSpawned<this.waveEnemyCount+2)
          this._spawnEnemy();
      });

      // Remove from tracking
      this.time.delayedCall(100,()=>{
        const idx=this.enemies.indexOf(char);
        if(idx>=0)this.enemies.splice(idx,1);
      });
    }else{
      this.playerDead=true;
      this.game.sound_gen.defeat();
      this.time.delayedCall(600,()=>this._endMatch());
    }
  }

  // ========== ABILITIES ==========
  _useAbility(char,tx,ty){
    const abil=ABILITIES[char.charData.ability];
    if(!abil)return;
    const sound=this.game.sound_gen;
    sound.ability();

    // Flash
    const ring=this.add.image(char.x,char.y,'aoe_'+char.charData.ability).setDepth(40).setAlpha(0.6);
    this.tweens.add({targets:ring,scaleX:2,scaleY:2,alpha:0,duration:400,
      onComplete:()=>ring.destroy()});

    const skill=char.charData.ability;
    if(skill==='fireball'||skill==='confetti_bomb'||skill==='meteor'){
      const targets=char.isPlayer?this.enemies:[this.player];
      targets.forEach(t=>{
        if(t&&t.alive&&Phaser.Math.Distance.Between(char.x,char.y,t.x,t.y)<(abil.radius||80)){
          this._damage(t,abil.damage||25);
          if(abil.duration)this._stun(t,abil.duration);
        }
      });
    }else if(skill==='heal'){
      char.hp=Math.min(char.maxHp,(char.hp||0)+(abil.healAmt||30));
      this._spawnParticles(char.x,char.y,0x44ff44,8,4);
      this.floatingText(char.x,char.y-20,`+${abil.healAmt||30}`,0x44ff44,18);
    }else if(skill==='speed_boost'){
      this.speedBoostTime=abil.duration||3000;
      this._showPowerBar(0xffdd00,'⚡ SPEED');
    }else if(skill==='stun'||skill==='freeze'){
      this.enemies.forEach(e=>{
        if(e.alive&&Phaser.Math.Distance.Between(char.x,char.y,e.x,e.y)<(abil.radius||80))
          this._stun(e,abil.duration||1500);
      });
    }else if(skill==='bite'){
      this.enemies.forEach(e=>{
        if(e.alive&&Phaser.Math.Distance.Between(char.x,char.y,e.x,e.y)<(abil.radius||50))
          this._damage(e,abil.damage||35);
      });
    }else if(skill==='teleport'){
      const angle=Phaser.Math.Angle.Between(char.x,char.y,tx,ty);
      const dist=abil.distance||180;
      char.setPosition(
        Phaser.Math.Clamp(char.x+Math.cos(angle)*dist,30,this.scale.width-30),
        Phaser.Math.Clamp(char.y+Math.sin(angle)*dist,30,this.scale.height-30)
      );
      this._spawnParticles(char.x,char.y,0xcc66ff,10,4);
    }else if(skill==='shield'){
      char.shielded=true;
      if(char.shieldVis)char.shieldVis.setAlpha(0.5);
      this.shieldTime=abil.duration||4000;
      this._showPowerBar(0x4488ff,'🛡️ SHIELD');
    }else if(skill==='multishot'){
      this.multishotTime=abil.duration||5000;
      this._showPowerBar(0xff44ff,'🔫 MULTI-SHOT');
    }

    if(char.isPlayer)this.abilityCD=abil.cooldown||5000;
  }

  _enemyAbility(enemy){
    const abil=ABILITIES[enemy.charData.ability];
    if(!abil)return;
    const skill=enemy.charData.ability;
    if(skill==='fireball'||skill==='confetti_bomb'||skill==='meteor'){
      this._spawnParticles(enemy.x,enemy.y,abil.color,8,4);
      if(this.player&&this.player.alive&&
         Phaser.Math.Distance.Between(enemy.x,enemy.y,this.player.x,this.player.y)<(abil.radius||80))
        this._damage(this.player,abil.damage||15);
    }else if(skill==='heal'){
      enemy.hp=Math.min(enemy.maxHp,enemy.hp+(abil.healAmt||20));
    }else if(skill==='bite'){
      if(this.player&&this.player.alive&&
         Phaser.Math.Distance.Between(enemy.x,enemy.y,this.player.x,this.player.y)<50)
        this._damage(this.player,abil.damage||25);
    }else if(skill==='stun'||skill==='freeze'){
      if(this.player&&this.player.alive&&
         Phaser.Math.Distance.Between(enemy.x,enemy.y,this.player.x,this.player.y)<(abil.radius||80))
        this._stun(this.player,abil.duration||1500);
    }else if(skill==='shield'){
      enemy.shielded=true;
      if(enemy.shieldVis)enemy.shieldVis.setAlpha(0.5);
      this.time.delayedCall(abil.duration||4000,()=>{
        enemy.shielded=false;
        if(enemy.shieldVis)enemy.shieldVis.setAlpha(0);
      });
    }
  }

  _stun(char,duration){
    char.stunned=true;
    if(char.body)char.body.setVelocity(0,0);
    const st=this.add.text(char.x,char.y-30,'⚡',{
      fontSize:'18px',color:'#ffff00',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:2,
    }).setOrigin(0.5).setDepth(80);
    this.time.delayedCall(duration,()=>{
      char.stunned=false;
      st.destroy();
    });
  }

  // ========== EFFECTS ==========
  _spawnParticles(x,y,color,count,size){
    for(let i=0;i<count;i++){
      const p=this.add.circle(x,y,Phaser.Math.Between(size||2,size?size+2:5),color,1).setDepth(70);
      this.tweens.add({targets:p,
        x:x+Phaser.Math.Between(-50,50),y:y+Phaser.Math.Between(-50,50),
        alpha:0,scaleX:0,scaleY:0,
        duration:Phaser.Math.Between(200,500),
        onComplete:()=>p.destroy()
      });
    }
  }

  floatingText(x,y,text,color,size){
    const ft=this.add.text(x,y,text,{
      fontSize:`${size||16}px`,color:`#${color.toString(16).padStart(6,'0')}`,
      fontFamily:'Arial Black',stroke:'#000',strokeThickness:3,
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({targets:ft,y:y-50,alpha:0,duration:800,
      onComplete:()=>ft.destroy()});
  }

  _showPowerBar(color,label){
    const{width}=this.scale;
    this.powerBarBg.setAlpha(1);
    this.powerBarFill.clear();
    this.powerBarFill.fillStyle(color,1);
    this.powerBarFill.fillRect(width/2-39,41,78,4);
    this.powerBarFill.setAlpha(1);
  }
  _hidePowerBar(){
    this.powerBarBg.setAlpha(0);
    this.powerBarFill.setAlpha(0);
  }

  // ========== END ==========
  _endMatch(){
    if(this.gameOver)return;
    this.gameOver=true;
    this.enemies.forEach(e=>{if(e.body)e.body.setVelocity(0,0);});
    if(this.player&&this.player.body)this.player.body.setVelocity(0,0);

    const won=this.player&&this.player.alive;
    const reward=won?35:15;
    this.coinsEarned+=reward;
    currencyManager.addCoins(this.coinsEarned);
    currencyManager.recordMatch(won);
    if(this.score>currencyManager.getHighScore())
      currencyManager.setHighScore(this.score);

    if(won)this.game.sound_gen.victory();
    else this.game.sound_gen.defeat();

    const{width,height}=this.scale;
    const ov=this.add.graphics().setDepth(200);
    ov.fillStyle(0x000000,0.75);
    ov.fillRect(0,0,width,height);

    const r=won?'🎉 VICTORY!':'💀 DEFEATED';
    const rc=won?'#44ff44':'#ff4444';
    this.add.text(width/2,height*0.22,r,{
      fontSize:'36px',color:rc,fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:5,
    }).setOrigin(0.5).setDepth(201);

    this.add.text(width/2,height*0.31,`Score: ${this.score}  |  Kills: ${this.kills}  |  Wave: ${this.wave}`,{
      fontSize:'15px',color:'#fff',fontFamily:'Arial',
      stroke:'#000',strokeThickness:2,
    }).setOrigin(0.5).setDepth(201);

    this.add.text(width/2,height*0.37,`🪙 +${this.coinsEarned}`,{
      fontSize:'22px',color:'#ffdd00',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:3,
    }).setOrigin(0.5).setDepth(201);

    const btnY=height*0.46;
    this._btn(width/2,btnY,'⚔️ PLAY AGAIN',0xff6b35,()=>this.scene.restart({}));
    this._btn(width/2,btnY+50,'🏠 MENU',0x3388ff,()=>this.scene.start('MenuScene'));
    this._btn(width/2,btnY+100,'🏪 SHOP',0x00d4ff,()=>this.scene.start('ShopScene'));
  }

  _btn(x,y,label,color,cb){
    const h=36,w=160;
    const b=this.add.graphics().setDepth(201);
    b.fillStyle(color,1);b.fillRoundedRect(x-w/2,y-h/2,w,h,10);
    b.setInteractive(new Phaser.Geom.Rectangle(x-w/2,y-h/2,w,h),Phaser.Geom.Rectangle.Contains);
    b.on('pointerdown',cb);
    this.add.text(x,y,label,{fontSize:'15px',color:'#fff',fontFamily:'Arial Black',
      stroke:'#000',strokeThickness:2,
    }).setOrigin(0.5).setDepth(202);
  }
}
