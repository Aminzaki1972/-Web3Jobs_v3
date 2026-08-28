/* Web3Jobs v3 — single subscription entry point */
"use strict";
(() => {
  const SRC = "js/company-subscription-canonical.js?v=20260828-3";
  let started = false;
  function load() {
    if (started) return;
    started = true;
    const existing = document.querySelector('script[data-wj-subscription-canonical="true"]');
    if (existing) return;
    const s = document.createElement("script");
    s.src = SRC;
    s.async = false;
    s.dataset.wjSubscriptionCanonical = "true";
    s.onerror = () => console.error("Web3Jobs: canonical subscription module failed to load.");
    (document.head || document.documentElement).appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, {once:true});
  else load();
})();
