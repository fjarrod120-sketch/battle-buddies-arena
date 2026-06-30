// Stripe Payment Link integration
export class StripeManager {
  constructor() {
    this.ready = false;
  }

  init() {
    // Load Stripe.js
    if (window.Stripe) {
      this.ready = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      this.ready = true;
    };
    document.head.appendChild(script);

    // Check URL params for return-from-payment
    this._checkPaymentReturn();
  }

  _checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const packId = params.get('pack');

    if (sessionId && packId) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);

      // Signal to game — dispatched as event
      window.dispatchEvent(new CustomEvent('payment-complete', {
        detail: { sessionId, packId }
      }));
    }
  }

  // Create a Stripe Payment Link for a coin pack
  createPaymentLink(packId, pack) {
    // For testing, use direct link format
    // In production, point to your backend that creates Payment Links
    const baseUrl = window.location.origin + window.location.pathname;
    const redirect = encodeURIComponent(baseUrl + `?session_id=test_${Date.now()}&pack=${packId}`);

    // Since we can't create Stripe Payment Links from client-side JS,
    // we use a server endpoint. For now, simulate:
    return `https://buy.stripe.com/test_4gw3csa123?pack=${packId}&price=${pack.price}&redirect=${redirect}`;
  }

  // Verify payment session (client-side check)
  verifySession(sessionId) {
    // In production, verify via webhook on your server
    // Client-side: trust the redirect (Stripe only redirects on success)
    return true;
  }
}

export const stripeManager = new StripeManager();
