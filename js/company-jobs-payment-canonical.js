/* Web3Jobs — route company-jobs subscription to the unified subscription selector. */
"use strict";
(() => {
  const BUTTON = "#connect-wallet-button";
  let ready = false;

  const route = event => {
    const button = event.target?.closest?.(BUTTON);
    if (!button || !ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.dataset.unifiedSubscriptionBusy === "1") return;
    button.dataset.unifiedSubscriptionBusy = "1";
    window.location.href = "company-dashboard.html#subscription";
  };

  const init = () => {
    ready = true;
    document.addEventListener("click", route, true);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
