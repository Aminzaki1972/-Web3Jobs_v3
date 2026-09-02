/* Web3Jobs — enforce one subscription payment path */
"use strict";
(() => {
  const getPlanCode = (el) => {
    let n = el;
    for (let i = 0; n && i < 10; i++, n = n.parentElement) {
      const code = String(n.dataset?.payPlan || n.dataset?.plan || "").trim().toLowerCase();
      if (code) return code;
      const id = String(n.id || "").toLowerCase();
      const match = ["starter", "professional", "enterprise"].find(k => id === k || id.includes(`-${k}`) || id.includes(`${k}-`));
      if (match) return match;
    }
    return null;
  };

  const canonicalOpen = (code) => {
    if (!code || typeof window.Web3JobsCanonicalSubscription?.loadPlan !== "function") {
      throw new Error("Canonical subscription controller is not ready.");
    }
    document.dispatchEvent(new CustomEvent("web3jobs:canonical-subscription", { detail: { planCode: code } }));
  };

  // Prevent legacy global payment handlers from creating a second payment path.
  window.paySubscription = (plan) => canonicalOpen(String(plan || "").toLowerCase());
  window.payUSDT = (plan) => canonicalOpen(String(plan?.code || plan || "").toLowerCase());

  // Final capture guard: every subscription button enters the canonical controller.
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".plan-button,[data-pay-plan],.plan-pay-button");
    if (!button) return;
    const code = getPlanCode(button);
    if (!code) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof window.Web3JobsCanonicalSubscription?.loadPlan === "function") {
      const controller = window.Web3JobsCanonicalSubscription;
      const openEvent = new CustomEvent("web3jobs:open-subscription", { detail: { planCode: code } });
      document.dispatchEvent(openEvent);
      // Canonical controller owns the actual wallet/payment flow.
      if (typeof window.showCanonicalSubscription === "function") {
        window.showCanonicalSubscription(code);
      }
    }
  }, true);

  window.Web3JobsPaymentPolicy = {
    mode: "canonical-only",
    network: "BSC",
    token: "USDT",
    treasury: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36"
  };
})();
