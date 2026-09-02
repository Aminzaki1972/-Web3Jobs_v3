/* Web3Jobs — route the company-jobs subscription button to the canonical flow. */
"use strict";
(() => {
  const PLAN = "starter";
  const BUTTON = "#connect-wallet-button";
  let ready = false;

  const loadCanonical = () => new Promise((resolve, reject) => {
    if (window.Web3JobsCanonicalSubscription) return resolve();
    const existing = document.querySelector('script[data-wj-canonical-sub="1"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "js/company-subscription-canonical.js?v=20260902-6";
    s.async = false;
    s.dataset.wjCanonicalSub = "1";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load canonical subscription controller."));
    (document.head || document.documentElement).appendChild(s);
  });

  const route = async (event) => {
    const button = event.target?.closest?.(BUTTON);
    if (!button || !ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.dataset.canonicalBusy === "1") return;
    button.dataset.canonicalBusy = "1";
    try {
      let trigger = document.getElementById("wj-company-jobs-plan-trigger");
      if (!trigger) {
        trigger = document.createElement("button");
        trigger.type = "button";
        trigger.id = "wj-company-jobs-plan-trigger";
        trigger.className = "plan-button";
        trigger.dataset.payPlan = PLAN;
        trigger.style.display = "none";
        document.body.appendChild(trigger);
      }
      trigger.click();
    } catch (error) {
      console.error("Canonical subscription routing failed:", error);
    } finally {
      window.setTimeout(() => { delete button.dataset.canonicalBusy; }, 1000);
    }
  };

  const init = async () => {
    try {
      await loadCanonical();
      ready = true;
      document.addEventListener("click", route, true);
    } catch (error) {
      console.error(error);
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
