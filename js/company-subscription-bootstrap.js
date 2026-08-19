/* Web3Jobs v3 - reliable company subscription bootstrap */
"use strict";
(() => {
  const files = [
    "js/company-subscription-v2.js?v=20260819-6",
    "js/company-subscription-hotfix.js?v=20260819-2",
    "js/company-subscription-ui.js?v=20260819-6"
  ];

  let started = false;

  function load(src) {
    return new Promise((resolve, reject) => {
      const key = src.split("?")[0];
      const existing = document.querySelector(`script[data-web3jobs-subscription="${key}"]`);
      if (existing) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.dataset.web3jobsSubscription = key;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      (document.head || document.documentElement).appendChild(s);
    });
  }

  async function init() {
    if (started) return;
    started = true;
    try {
      // Load the payment API first, then install the hard capture handler
      // before the legacy subscription UI can consume the click.
      await load(files[0]);
      await load(files[1]);
      await load(files[2]);

      const api = window.Web3JobsCompanySubscription;
      if (api?.loadPlans) {
        try {
          const plans = await api.loadPlans();
          window.dispatchEvent(new CustomEvent("web3jobs:company-plans-loaded", { detail: plans || [] }));
        } catch (error) {
          console.error("Web3Jobs: company subscription plans failed to load:", error);
          window.dispatchEvent(new CustomEvent("web3jobs:company-plans-error", { detail: { message: error?.message || String(error) } }));
        }
      }
    } catch (error) {
      console.error("Web3Jobs subscription bootstrap:", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
