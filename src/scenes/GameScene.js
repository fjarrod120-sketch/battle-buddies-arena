import Phaser from 'phaser';
import { currencyManager } from '../systems/CurrencyManager.js';
import { WEAPONS, ABILITIES } from '../entities/Characters.js';
import { adManager } from '../systems/AdManager.js';
import { COLORS, CURRENCY, ARENA } from '../config.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.mode = data?.mode || 'battle';
    this.playerChar = data?.character || null;
  }

  create() {
    const { width, height } = this.scale;
    const sound = this.game.sound_gen;
    const theme = this.game.themeData || {};
    const characters = this.game.characters || [];
    const colors = theme?.colors || {};
    const bgColor = parseInt(colors.background?.replace('#', '') || '0a0a1a', 16);

    this.cameras.main.setBackgroundColor(bgColor);

    // Get player character data
    const selectedId = this.playerChar || currencyManager.getSelected();
    this.playerData = characters.find(c => c.id === selectedId) || characters[0];
    if (!this.playerData) {
      this.add.text(width / 2, height / 2, 'No character selected!', { fontSize: '24px', color: '#ff4444' }).setOrigin(0.5);
      this.time.delayedCall(1500, () => this.scene.start('SelectScene'));
      return;
    }

    // State
    this.score = 0;
    this.kills = 0;
    this.matchTime = 60;
    this.gameOver = false;
    this.paused = false;
    this.bullets = [];
    this.abilities = [];
    this.enemies = [];
    this.particles = [];
    this.abilityCooldown = 0;
    this.shieldActive = false;

    // Build arena
    this._buildArena(width, height);

    // Spawn player
    this.player = this._spawnCharacter(
      Phaser.Math.Between(100, width - 100),
      Phaser.Math.Between(100, height - 100),
      this.playerData, true
    );

    // Spawn enemies
    const enemyCount = this.mode === 'practice' ? 2 : 3;
    const unlockedChars = characters.filter(c => c.id !== selectedId);
    for (let i = 0; i < enemyCount; i++) {
      const eData = Phaser.Math.RND.pick(unlockedChars);
      if (eData) {
        const ex = Phaser.Math.Between(width - 300, width - 100);
        const ey = Phaser.Math.Between(100, height - 100);
        this.enemies.push(this._spawnCharacter(ex, ey, eData, false));
      }
    }

    // HUD
    this._createHUD(width);

    // Controls
    this._setupControls(width, height);

    // Countdown
    this._startCountdown();
  }

  _buildArena(w, h) {
    // Arena background
    this.arenaBg = this.add.graphics();
    this.arenaBg.fillStyle(0x151530, 1);
    this.arenaBg.fillRect(0, 0, w, h);

    // Grid pattern
    this.arenaBg.lineStyle(1, 0x1a1a3a, 0.3);
    for (let x = 0; x < w; x += 64) this.arenaBg.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 64) this.arenaBg.lineBetween(0, y, w, y);

    // Walls
    this.walls = this.physics.add.staticGroup();
    const wallThick = 16;
    this._addWall(w / 2, wallThick / 2, w, wallThick);           // top
    this._addWall(w / 2, h - wallThick / 2, w, wallThick);       // bottom
    this._addWall(wallThick / 2, h / 2, wallThick, h);           // left
    this._addWall(w - wallThick / 2, h / 2, wallThick, h);       // right

    // Obstacles
    this.obstacles = [];
    const obsCount = Phaser.Math.Between(3, 6);
    for (let i = 0; i < obsCount; i++) {
      const ox = Phaser.Math.Between(80, w - 80);
      const oy = Phaser.Math.Between(80, h - 80);
      const size = Phaser.Math.Between(30, 60);
      const obs = this.add.graphics();
      const c = Phaser.Display.Color.GetColor(
        Phaser.Math.Between(40, 80),
        Phaser.Math.Between(50, 100),
        Phaser.Math.Between(120, 200)
      );
      obs.fillStyle(c, 1);
      obs.fillRoundedRect(-size / 2, -size / 2, size, size, 6);
      obs.lineStyle(2, 0x6677bb, 0.6);
      obs.strokeRoundedRect(-size / 2, -size / 2, size, size, 6);
      obs.setPosition(ox, oy);
      this.physics.add.existing(obs, true); // static body
      this.obstacles.push(obs);
    }
  }

  _addWall(x, y, w, h) {
    const wall = this.add.graphics();
    wall.fillStyle(0x3344aa, 1);
    wall.fillRect(-w / 2, -h / 2, w, h);
    wall.setPosition(x, y);
    this.walls.add(wall);
  }

  _spawnCharacter(x, y, data, isPlayer) {
    const c1 = parseInt(data.color.replace('#', ''), 16);
    const c2 = parseInt(data.color2.replace('#', ''), 16);
    const size = 28;

    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.circle(2, 2, size * 0.6, 0x000000, 0.3);
    container.add(shadow);

    // Body
    const body = this.add.graphics();
    body.fillStyle(c1, 1);
    body.fillCircle(0, 0, size);
    body.fillStyle(c2, 1);
    body.fillCircle(0, -2, size * 0.7);
    // Eyes
    body.fillStyle(0xffffff, 1);
    body.fillCircle(-6, -4, 5);
    body.fillCircle(6, -4, 5);
    body.fillStyle(0x111111, 1);
    body.fillCircle(-5, -4, 3);
    body.fillCircle(7, -4, 3);
    container.add(body);

    // Health bar background
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x333333, 0.8);
    hpBg.fillRect(-24, -size - 12, 48, 6);
    container.add(hpBg);

    // Health bar fill
    const hpFill = this.add.graphics();
    hpFill.fillStyle(isPlayer ? 0x44ff44 : 0xff4444, 1);
    hpFill.fillRect(-23, -size - 11, 46, 4);
    container.add(hpFill);

    // Name
    const nameText = this.add.text(0, -size - 18, data.name, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(nameText);

    // Physics
    this.physics.add.existing(container);
    container.body.setCircle(size, -size, -size);
    container.body.setCollideWorldBounds(false); // We handle walls manually

    // Character data
    container.charData = data;
    container.isPlayer = isPlayer;
    container.hp = data.hp;
    container.maxHp = data.hp;
    container.speed = data.speed;
    container.alive = true;
    container.invulnerable = false;
    container.stunned = false;
    container.shielded = false;

    // Weapon
    const wInfo = WEAPONS[data.weapon] || WEAPONS.laser;
    container.weaponData = wInfo;
    container.lastFired = 0;

    return container;
  }

  _createHUD(w) {
    // Timer
    this.timerText = this.add.text(w / 2, 15, '60', {
      fontSize: '28px', color: '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    // Score
    this.scoreText = this.add.text(20, 10, 'Score: 0', {
      fontSize: '16px', color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);

    // HP display
    this.hpText = this.add.text(20, 32, '', {
      fontSize: '13px', color: '#44ff44',
      fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);

    // Coins earned
    this.coinsEarned = 0;
    this.coinText = this.add.text(w - 20, 10, '🪙 +0', {
      fontSize: '16px', color: '#ffdd00',
      fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100);

    // Kills counter
    this.killText = this.add.text(w - 20, 32, '💀 0', {
      fontSize: '13px', color: '#ff6666',
      fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100);
  }

  _setupControls(w, h) {
    this.keys = {
      W: this.input.keyboard.addKey('W'),
      A: this.input.keyboard.addKey('A'),
      S: this.input.keyboard.addKey('S'),
      D: this.input.keyboard.addKey('D'),
      SPACE: this.input.keyboard.addKey('SPACE'),
      Q: this.input.keyboard.addKey('Q'),
      E: this.input.keyboard.addKey('E'),
    };

    // Virtual joystick via touch
    this.joystickActive = false;
    this.joystickPos = { x: 0, y: 0 };
    this.joystickBase = null;
    this.joystickThumb = null;

    // Touch/mouse aim and shoot
    this.aimX = w / 2;
    this.aimY = h / 2;

    this.input.on('pointermove', (pointer) => {
      this.aimX = pointer.x;
      this.aimY = pointer.y;
    });

    this.input.on('pointerdown', (pointer) => {
      sound.resume();
    });
  }

  _startCountdown() {
    const { width, height } = this.scale;
    const sound = this.game.sound_gen;
    this.matchStarted = false;
    this.paused = true;

    const countText = this.add.text(width / 2, height / 2, '3', {
      fontSize: '72px', color: '#ffdd00',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(200);

    let count = 3;
    const timer = this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          countText.setText(count.toString());
          sound.countdown();
          this.tweens.add({
            targets: countText, scaleX: 1.5, scaleY: 1.5,
            duration: 200, yoyo: true,
          });
        } else if (count === 0) {
          countText.setText('GO!');
          countText.setColor('#44ff44');
          sound.go();
          this.tweens.add({
            targets: countText, scaleX: 2, scaleY: 2, alpha: 0,
            duration: 500,
            onComplete: () => {
              countText.destroy();
              this.matchStarted = true;
              this.paused = false;
            }
          });
        }
      }
    });
  }

  update(time, delta) {
    if (this.paused || this.gameOver || !this.matchStarted) return;

    const sound = this.game.sound_gen;
    const { width, height } = this.scale;

    // Match timer
    this.matchTime -= delta / 1000;
    if (this.matchTime <= 0) {
      this.matchTime = 0;
      this._endMatch();
      return;
    }
    this.timerText.setText(Math.ceil(this.matchTime).toString());

    // Player movement
    if (this.player && this.player.alive && !this.player.stunned) {
      let vx = 0, vy = 0;
      if (this.keys.A.isDown || this.keys.LEFT) vx = -1;
      if (this.keys.D.isDown || this.keys.RIGHT) vx = 1;
      if (this.keys.W.isDown || this.keys.UP) vy = -1;
      if (this.keys.S.isDown || this.keys.DOWN) vy = 1;

      // Normalize diagonal
      if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
      }

      this.player.body.setVelocity(vx * this.player.speed, vy * this.player.speed);

      // Face aim direction
      const angle = Phaser.Math.Angle.Between(
        this.player.x, this.player.y, this.aimX, this.aimY
      );
      this.player.setRotation(angle);

      // Auto-shoot (hold space or click)
      if (this.keys.SPACE.isDown || this.input.activePointer.isDown) {
        this._tryShoot(this.player, this.aimX, this.aimY);
      }

      // Ability (Q key)
      if (this.keys.Q.isDown && this.abilityCooldown <= 0) {
        this._useAbility(this.player, this.aimX, this.aimY);
      }
    }

    // Update ability cooldown
    if (this.abilityCooldown > 0) this.abilityCooldown -= delta;

    // AI enemies
    this.enemies.forEach(enemy => {
      if (!enemy.alive || !enemy.active) return;

      if (enemy.stunned) return;

      // Move toward player
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

      if (dist > 200) {
        // Chase
        enemy.body.setVelocity(
          Math.cos(angle) * enemy.speed * 0.8,
          Math.sin(angle) * enemy.speed * 0.8
        );
      } else if (dist < 120) {
        // Back off
        enemy.body.setVelocity(
          -Math.cos(angle) * enemy.speed * 0.5,
          -Math.sin(angle) * enemy.speed * 0.5
        );
      } else {
        // Strafe
        enemy.body.setVelocity(
          Math.cos(angle + Math.PI / 2) * enemy.speed * 0.4,
          Math.sin(angle + Math.PI / 2) * enemy.speed * 0.4
        );
      }

      enemy.setRotation(angle);

      // AI shoot
      const wData = enemy.weaponData;
      const now = time;
      const aiReaction = 600 + Math.random() * 400;
      if (now - enemy.lastFired > wData.fireRate + aiReaction && dist < 500) {
        this._tryShoot(enemy, this.player.x, this.player.y);
      }

      // AI use ability
      const abil = ABILITIES[enemy.charData.ability];
      if (abil && enemy._abilCooldown !== undefined) {
        if (enemy._abilCooldown <= 0) {
          const abilChance = Math.random();
          if (abilChance < 0.003) {
            this._useAbility(enemy, this.player.x, this.player.y);
            enemy._abilCooldown = abil.cooldown;
          }
        } else {
          enemy._abilCooldown -= delta;
        }
      }
    });

    // Update bullets
    this.bullets = this.bullets.filter(b => {
      if (!b.active) return false;
      // Check wall collisions
      this._checkBulletWallCollision(b);
      // Check obstacle collisions
      this.obstacles.forEach(obs => {
        if (b.active && Phaser.Math.Distance.Between(b.x, b.y, obs.x, obs.y) < 30) {
          b.destroy();
          sound.hit();
          this._spawnParticles(b.x, b.y, 0x6677bb, 5);
        }
      });
      // Check hit on enemies
      if (b.active && !b.fromEnemy) {
        this.enemies.forEach(enemy => {
          if (enemy.alive && b.active) {
            const d = Phaser.Math.Distance.Between(b.x, b.y, enemy.x, enemy.y);
            if (d < 30) {
              this._applyDamage(enemy, b.damage || 10);
              b.destroy();
              sound.hit();
            }
          }
        });
      }
      // Check hit on player
      if (b.active && b.fromEnemy && this.player && this.player.alive) {
        const d = Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y);
        if (d < 30) {
          this._applyDamage(this.player, b.damage || 8);
          b.destroy();
          sound.hit();
        }
      }

      // Out of bounds
      if (b.x < -50 || b.x > width + 50 || b.y < -50 || b.y > height + 50) {
        b.destroy();
        return false;
      }
      return b.active;
    });

    // Update HP display
    if (this.player && this.player.alive) {
      this.hpText.setText(`HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    }
  }

  _tryShoot(char, targetX, targetY) {
    const now = this.time.now;
    const wData = char.weaponData;
    if (now - char.lastFired < wData.fireRate) return;
    char.lastFired = now;

    const sound = this.game.sound_gen;
    sound.shoot();

    const angle = Phaser.Math.Angle.Between(char.x, char.y, targetX, targetY);
    const speed = wData.speed || 500;

    const bullet = this.add.circle(char.x, char.y, wData.size / 2, wData.color, 1);
    this.physics.add.existing(bullet);
    bullet.damage = char.charData.damage || 10;
    bullet.fromEnemy = !char.isPlayer;
    bullet.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    bullet.setDepth(50);

    // Bullet trail
    this.tweens.add({
      targets: bullet,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
    });

    this.time.delayedCall(2000, () => {
      if (bullet.active) bullet.destroy();
    });

    this.bullets.push(bullet);
  }

  _useAbility(char, targetX, targetY) {
    const abil = ABILITIES[char.charData.ability];
    if (!abil) return;

    const sound = this.game.sound_gen;
    sound.ability();

    // Visual indicator
    const indicator = this.add.circle(char.x, char.y, 20, abil.color, 0.5);
    this.tweens.add({
      targets: indicator,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => indicator.destroy(),
    });

    switch (char.charData.ability) {
      case 'fireball':
      case 'confetti_bomb':
      case 'meteor': {
        // AoE damage
        const aoe = this.add.circle(char.x, char.y, abil.radius, abil.color, 0.2);
        aoe.setDepth(40);
        this.tweens.add({
          targets: aoe,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 500,
          onComplete: () => aoe.destroy(),
        });

        const targets = char.isPlayer ? this.enemies : [this.player];
        targets.forEach(t => {
          if (t && t.alive) {
            const d = Phaser.Math.Distance.Between(char.x, char.y, t.x, t.y);
            if (d < abil.radius) {
              this._applyDamage(t, abil.damage || 30);
              if (abil.duration) { // stun/freeze
                this._applyStatus(t, 'stun', abil.duration);
              }
            }
          }
        });
        break;
      }
      case 'heal': {
        char.hp = Math.min(char.maxHp, char.hp + abil.healAmt);
        this._spawnParticles(char.x, char.y, 0x44ff44, 10);
        break;
      }
      case 'speed_boost': {
        if (char.isPlayer) {
          char.speed = char.charData.speed * abil.multiplier;
          this.time.delayedCall(abil.duration, () => {
            char.speed = char.charData.speed;
          });
        }
        break;
      }
      case 'stun':
      case 'freeze': {
        // Applied to targets via AoE above
        break;
      }
      case 'bite': {
        // Melee damage
        const targets = char.isPlayer ? this.enemies : [this.player];
        targets.forEach(t => {
          if (t && t.alive) {
            const d = Phaser.Math.Distance.Between(char.x, char.y, t.x, t.y);
            if (d < abil.radius) {
              this._applyDamage(t, abil.damage || 35);
            }
          }
        });
        break;
      }
      case 'teleport': {
        const tx = char.x + (targetX - char.x > 0 ? abil.distance : -abil.distance);
        const ty = char.y + (targetY - char.y > 0 ? abil.distance : -abil.distance);
        char.setPosition(
          Phaser.Math.Clamp(tx, 30, this.scale.width - 30),
          Phaser.Math.Clamp(ty, 30, this.scale.height - 30)
        );
        this._spawnParticles(char.x, char.y, 0xcc66ff, 8);
        break;
      }
      case 'shield': {
        char.shielded = true;
        const shield = this.add.circle(char.x, char.y, 35, abil.color, 0.2);
        shield.setStrokeStyle(3, abil.color, 0.6);
        char._shieldGraphic = shield;
        this.time.delayedCall(abil.duration, () => {
          char.shielded = false;
          if (shield) shield.destroy();
        });
        break;
      }
    }

    // Set cooldown for player
    if (char.isPlayer) {
      this.abilityCooldown = abil.cooldown;
    }
  }

  _applyDamage(char, damage) {
    if (!char.alive || char.invulnerable) return;
    if (char.shielded) {
      damage *= 0.3; // 70% reduction
      this._spawnParticles(char.x, char.y, 0xaaccff, 5);
    }

    char.hp -= damage;

    // Damage flash
    const flash = this.add.circle(char.x, char.y, 25, 0xffffff, 0.5);
    flash.setDepth(60);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Floating damage text
    const dmgText = this.add.text(
      char.x + Phaser.Math.Between(-15, 15),
      char.y - 20,
      `-${Math.ceil(damage)}`,
      {
        fontSize: '16px',
        color: char.isPlayer ? '#ff4444' : '#ffdd00',
        fontFamily: 'Arial Black, Arial, sans-serif',
        stroke: '#000', strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(80);

    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgText.destroy(),
    });

    if (char.hp <= 0) {
      this._killCharacter(char);
    }
  }

  _applyStatus(char, type, duration) {
    if (type === 'stun' || type === 'freeze') {
      char.stunned = true;
      char.body.setVelocity(0, 0);
      const stunText = this.add.text(char.x, char.y - 30, '⚡ STUNNED!', {
        fontSize: '12px', color: '#ffff00',
        fontFamily: 'Arial Black', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(80);
      this.time.delayedCall(duration, () => {
        char.stunned = false;
        stunText.destroy();
      });
    }
  }

  _killCharacter(char) {
    char.alive = false;
    char.setVisible(false);
    if (char.body) char.body.setVelocity(0, 0);

    const sound = this.game.sound_gen;
    sound.explosion();

    this._spawnParticles(char.x, char.y, 0xff4444, 15);

    if (!char.isPlayer) {
      this.kills++;
      this.score += 100;
      this.coinsEarned += 10;
      this.scoreText.setText(`Score: ${this.score}`);
      this.killText.setText(`💀 ${this.kills}`);
      this.coinText.setText(`🪙 +${this.coinsEarned}`);

      // Score popup
      const popup = this.add.text(char.x, char.y, '+100', {
        fontSize: '24px', color: '#ffdd00',
        fontFamily: 'Arial Black', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(80);
      this.tweens.add({
        targets: popup, y: popup.y - 50, alpha: 0,
        duration: 1000,
        onComplete: () => popup.destroy(),
      });

      // Respawn enemy
      this.time.delayedCall(3000, () => {
        if (this.gameOver) return;
        const chars = this.game.characters.filter(c => c.id !== this.playerData.id);
        const eData = Phaser.Math.RND.pick(chars) || this.game.characters[0];
        const newEnemy = this._spawnCharacter(
          Phaser.Math.Between(this.scale.width - 300, this.scale.width - 100),
          Phaser.Math.Between(100, this.scale.height - 100),
          eData, false
        );
        newEnemy._abilCooldown = Math.random() * 5000;
        this.enemies.push(newEnemy);
        sound.coinCollect();
      });

      // Remove from active list (replaced on respawn)
      this.time.delayedCall(100, () => {
        const idx = this.enemies.indexOf(char);
        if (idx >= 0) this.enemies.splice(idx, 1);
      });

    } else {
      // Player death — game over
      sound.defeat();
      this.time.delayedCall(500, () => this._endMatch());
    }
  }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(
        x, y, Phaser.Math.Between(2, 5),
        color, 1
      ).setDepth(70);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-60, 60),
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(300, 600),
        onComplete: () => p.destroy(),
      });
    }
  }

  _checkBulletWallCollision(bullet) {
    const { width, height } = this.scale;
    if (bullet.x < 16 || bullet.x > width - 16 ||
        bullet.y < 16 || bullet.y > height - 16) {
      bullet.destroy();
    }
  }

  _endMatch() {
    if (this.gameOver) return;
    this.gameOver = true;

    // Stop all enemies
    this.enemies.forEach(e => {
      if (e.body) e.body.setVelocity(0, 0);
    });
    if (this.player && this.player.body) this.player.body.setVelocity(0, 0);

    const sound = this.game.sound_gen;
    const won = this.player && this.player.alive;

    // Calculate rewards
    const coinReward = won ? CURRENCY.coinsPerWin : CURRENCY.coinsPerMatch;
    this.coinsEarned += coinReward;
    currencyManager.addCoins(this.coinsEarned);
    currencyManager.recordMatch(won);
    if (this.score > currencyManager.getHighScore()) {
      currencyManager.setHighScore(this.score);
    }

    if (won) sound.victory();
    else sound.defeat();

    // Result overlay
    const { width, height } = this.scale;
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    const resultText = won ? '🎉 VICTORY!' : '💀 DEFEATED';
    const resultColor = won ? '#44ff44' : '#ff4444';

    this.add.text(width / 2, height * 0.3, resultText, {
      fontSize: '48px', color: resultColor,
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(201);

    this.add.text(width / 2, height * 0.4, `Score: ${this.score}  |  Kills: ${this.kills}`, {
      fontSize: '20px', color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201);

    // Coin reward
    this.add.text(width / 2, height * 0.47, `🪙 +${this.coinsEarned}`, {
      fontSize: '24px', color: '#ffdd00',
      fontFamily: 'Arial Black',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201);

    // Buttons
    this._resultButton(width / 2, height * 0.58, '⚔️ PLAY AGAIN', 0xff6b35, () => {
      this.scene.restart({ mode: this.mode });
    });

    this._resultButton(width / 2, height * 0.66, '🏠 MAIN MENU', 0x44aaff, () => {
      this.scene.start('MenuScene');
    });

    this._resultButton(width / 2, height * 0.74, '🏪 SHOP', 0x00d4ff, () => {
      this.scene.start('ShopScene');
    });

    // Ad button
    if (currencyManager.canWatchAd()) {
      this._resultButton(width / 2, height * 0.82, '📺 +75 COINS (AD)', 0x8844aa, () => {
        adManager.showRewarded(() => {
          currencyManager.watchAd();
          // Refresh display
          this.scene.restart({ mode: this.mode });
        });
      });
    }
  }

  _resultButton(x, y, label, color, callback) {
    const btn = this.add.graphics().setDepth(201);
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(x - 110, y - 22, 220, 44, 12);
    btn.setInteractive(new Phaser.Geom.Rectangle(x - 110, y - 22, 220, 44), Phaser.Geom.Rectangle.Contains);
    btn.on('pointerdown', callback);

    this.add.text(x, y, label, {
      fontSize: '16px', color: '#ffffff',
      fontFamily: 'Arial Black, Arial, sans-serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(202);
  }
}
