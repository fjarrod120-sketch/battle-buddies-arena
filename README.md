# Battle Buddies Arena 🎮

A re-skinnable mobile hero arena brawler built with **Phaser.js + Vite + Capacitor**. Bright colours, wacky sounds, unlockable characters, in-game currency, Stripe coin packs, and AdMob rewarded ads.

## Quick Start

```bash
npm install
npm run dev      # Dev server on port 3000
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Features

| Feature | Details |
|---------|---------|
| **Arena Combat** | Top-down real-time brawling with AI enemies |
| **10 Characters** | Blaze, Splash, Bounce, Sparky, Poppy, Chompy, Frosty, Shadow, Rocky, Cosmo |
| **Rarity System** | Common → Rare → Epic → Legendary |
| **Currency** | Gold Coins (earn/buy) + Gems (premium) |
| **Shop** | 4 coin packs via Stripe ($1.99 - $24.99) |
| **Rewarded Ads** | 75 coins/ad, 10/day via AdMob |
| **3 Game Modes** | Battle (3v3), Practice (2v1), more coming |
| **Procedural Art** | All sprites generated at boot — no external assets needed |
| **Wacky Sounds** | Procedural Web Audio API — no audio files needed |
| **Re-skinnable** | Edit `public/theme.json` to change everything |

## Re-skinning

Edit **`public/theme.json`** to change:
- Game title & subtitle
- All colours (background, primary, accent, etc.)
- Character roster (names, colours, stats, costs, rarities)
- Coin packs (prices, amounts)
- Gameplay parameters (match duration, coin rewards, etc.)

After editing, rebuild: `npm run build`

## Characters

| Name | Rarity | Cost | Weapon | Ability |
|------|--------|------|--------|---------|
| Blaze | Common | Free | Laser | Fireball |
| Splash | Common | 🪙100 | Bubble | Heal |
| Bounce | Common | 🪙150 | Bouncy | Speed Boost |
| Sparky | Rare | 🪙500 / 💎50 | Zap | Stun |
| Poppy | Rare | 🪙600 / 💎60 | Confetti | Confetti Bomb |
| Chompy | Rare | 🪙750 / 💎75 | Chomp | Bite |
| Frosty | Epic | 🪙2000 / 💎200 | Ice | Freeze |
| Shadow | Epic | 🪙2500 / 💎250 | Dark | Teleport |
| Rocky | Epic | 🪙3000 / 💎300 | Rock | Shield |
| Cosmo | Legendary | 🪙8000 / 💎800 | Star | Meteor |

## Monetization

### Stripe Coin Packs
- Starter Pack: $1.99 → 🪙500 + 💎5
- Power Pack: $4.99 → 🪙2000 + 💎25 ⭐ BEST VALUE
- Mega Pack: $9.99 → 🪙8000 + 💎100
- Ultimate Pack: $24.99 → 🪙25000 + 💎500

### Google AdMob
- Rewarded video ads: 75 coins per watch
- Cap: 10 ads/day per user
- Test ID pre-configured (`ca-app-pub-3940256099942544/5224354917`)

## Deploying to Mobile (Google Play)

### Prerequisites
- Google Play Developer account ($25 one-time)
- Android Studio (for signing)

### Steps

```bash
npm install @capacitor/cli @capacitor/core @capacitor/android
npx cap add android
npx cap sync
# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Generate signed APK/AAB
2. Build → Generate Signed Bundle / APK
3. Upload to Google Play Console

### For iOS (Apple App Store)
```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync
npx cap open ios
```

Requires Apple Developer account ($99/year) and Xcode.

## PWA Deployment (Browser Install)

Also deployable as a PWA:
1. `npm run build`
2. Upload `dist/` to any static host
3. Users can "Add to Home Screen" on mobile browsers

## Tech Stack

- **Phaser.js 4** — Game framework
- **Vite 8** — Build tool
- **Capacitor** — Native mobile wrapper
- **Stripe** — Payment processing
- **Google AdMob** — Rewarded video ads
- **Web Audio API** — Procedural sound effects

## License

MIT
