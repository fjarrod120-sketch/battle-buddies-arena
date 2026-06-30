// Character definitions — load from theme.json at runtime
export const WEAPONS = {
  laser: { range: 400, fireRate: 400, speed: 600, color: 0xff4444, size: 6, wacky: true },
  bubble: { range: 350, fireRate: 500, speed: 400, color: 0x44aaff, size: 10, wacky: true },
  bouncy: { range: 300, fireRate: 300, speed: 500, color: 0x44ff44, size: 8, wacky: true },
  zap: { range: 250, fireRate: 600, speed: 800, color: 0xffdd00, size: 5, wacky: true },
  confetti: { range: 300, fireRate: 350, speed: 450, color: 0xff88cc, size: 9, wacky: true },
  chomp: { range: 120, fireRate: 800, speed: 0, color: 0xff6622, size: 16, wacky: true },
  ice: { range: 350, fireRate: 550, speed: 500, color: 0xaaddff, size: 8, wacky: true },
  dark: { range: 400, fireRate: 450, speed: 650, color: 0x8844aa, size: 7, wacky: true },
  rock: { range: 280, fireRate: 700, speed: 350, color: 0x886644, size: 14, wacky: true },
  star: { range: 450, fireRate: 380, speed: 700, color: 0xff00ff, size: 8, wacky: true },
};

export const ABILITIES = {
  fireball: { cooldown: 5000, damage: 30, radius: 60, color: 0xff4400, name: 'Fireball' },
  heal: { cooldown: 8000, healAmt: 40, radius: 0, color: 0x44ff44, name: 'Heal' },
  speed_boost: { cooldown: 7000, duration: 3000, multiplier: 1.8, color: 0x44ff44, name: 'Speed Boost' },
  stun: { cooldown: 6000, duration: 1500, radius: 80, color: 0xffff00, name: 'Stun' },
  confetti_bomb: { cooldown: 7000, damage: 20, radius: 100, color: 0xff88cc, name: 'Confetti Bomb' },
  bite: { cooldown: 4000, damage: 35, radius: 50, color: 0xff4422, name: 'Bite' },
  freeze: { cooldown: 8000, duration: 2000, radius: 70, color: 0x88ddff, name: 'Freeze' },
  teleport: { cooldown: 6000, distance: 200, color: 0xcc66ff, name: 'Teleport' },
  shield: { cooldown: 10000, duration: 4000, color: 0xaaccff, name: 'Shield' },
  meteor: { cooldown: 10000, damage: 50, radius: 120, color: 0xff00ff, name: 'Meteor' },
};

export function getCharacterById(id) {
  // Runtime lookup — characters loaded from theme.json
  return null; // Stub, resolved in BootScene
}
