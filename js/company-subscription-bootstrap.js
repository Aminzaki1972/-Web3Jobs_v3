/* Web3Jobs v3 - reliable company subscription bootstrap */
"use strict";
(() => {
  const files = [
    "js/company-subscription-v2.js?v=20260819-4",
    "js/company-subscription-ui.js?v=20260819-4"
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
      for (const src of files) await load(src);

      // company-subscription-v2 used to rely only on DOMContentLoaded.
      // This bootstrap can itself be injected during DOMContentLoaded, so
      // explicitly initialize plans here as well.
      const api = window.Web3JobsCompanySubscription;
      if (api?.loadPlans) {
        try {
          const plans = await api.loadPlans();
          window.dispatchEvent(new CustomEvent("web3jobs:company-plans-loaded", {
            detail: plans || []
          }));
        } catch (error) {
          console.error("Web3Jobs: company subscription plans failed to load:", error);
          window.dispatchEvent(new CustomEvent("web3jobs:company-plans-error", {
            detail: { message: error?.message || String(error) }
          }));
        }
      }
    } catch (error) {
      console.error("Web3Jobs subscription bootstrap:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
