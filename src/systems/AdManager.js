// AdMob Rewarded Ads integration
export class AdManager {
  constructor() {
    this.ready = false;
    this.rewardCallback = null;
  }

  init() {
    // On native (Capacitor), init AdMob plugin
    if (window.capacitor && window.AdMob) {
      window.AdMob.initialize({
        requestTrackingAuthorization: true,
      }).then(() => {
        this.ready = true;
      });
    }
    // In browser/web, use simulated ads
    this.ready = true;
  }

  showRewarded(callback) {
    this.rewardCallback = callback;

    if (window.capacitor && window.AdMob) {
      // Native AdMob rewarded ad
      window.AdMob.prepareRewardVideoAd({
        adId: 'ca-app-pub-3940256099942544/5224354917', // Test ID
      }).then(() => {
        window.AdMob.showRewardVideoAd();
      });

      // Listen for reward
      document.addEventListener('onRewardedVideoAdReward', (event) => {
        if (this.rewardCallback) this.rewardCallback();
      });
    } else {
      // Browser fallback — simulate 3-second ad
      if (this.rewardCallback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: #111; color: #ffdd00; font-family: Arial, sans-serif;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 999999; font-size: 24px; text-align: center;
        `;
        overlay.innerHTML = `
          <div style="margin-bottom:20px">📺 Watching ad...</div>
          <div style="font-size:48px" id="ad-timer">3</div>
          <div style="margin-top:10px;color:#888;font-size:14px">(Reward: 75 🪙)</div>
        `;
        document.body.appendChild(overlay);

        let sec = 3;
        const timer = setInterval(() => {
          sec--;
          const el = document.getElementById('ad-timer');
          if (el) el.textContent = sec;
          if (sec <= 0) {
            clearInterval(timer);
            overlay.remove();
            if (this.rewardCallback) this.rewardCallback();
          }
        }, 1000);
      }
    }
  }
}

export const adManager = new AdManager();
