/* Web3Jobs v3 - Live company subscription bootstrap */
"use strict";
(() => {
  const files = ["js/company-subscription-v2.js?v=20260819-3", "js/company-subscription-ui.js?v=20260819-3"];
  const loaded = new Set();
  function load(src) {
    return new Promise((resolve, reject) => {
      const key = src.split("?")[0];
      if (document.querySelector(`script[data-web3jobs-subscription="${key}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.defer = false;
      s.dataset.web3jobsSubscription = key;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }
  async function init() {
    try {
      for (const src of files) { await load(src); loaded.add(src); }
    } catch (e) { console.error("Web3Jobs subscription bootstrap:", e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
