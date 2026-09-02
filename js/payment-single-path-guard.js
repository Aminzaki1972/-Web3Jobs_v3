/* Web3Jobs — enforce one subscription payment path */
"use strict";
(() => {
  // Legacy global payment entry points are deliberately disabled.
  // Subscription payments must go through company-subscription-canonical.js.
  const blocked = () => {
    throw new Error("Legacy subscription payment path disabled. Use the canonical secure subscription flow.");
  };
  window.paySubscription = blocked;
  window.payUSDT = blocked;

  window.Web3JobsPaymentPolicy = {
    mode: "canonical-only",
    network: "BSC",
    token: "USDT",
    treasury: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36"
  };
})();
