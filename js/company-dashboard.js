/* Web3Jobs Company Dashboard entry point */
"use strict";
(() => {
  const modules = [
    "js/company-dashboard-core.js?v=20260828-1",
    "js/company-subscription-canonical.js?v=20260828-3"
  ];
  const load = src => new Promise((resolve, reject) => {
    const key = src.split("?")[0];
    if (document.querySelector(`script[data-wj-module="${key}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.dataset.wjModule = key;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    (document.head || document.documentElement).appendChild(s);
  });
  async function init() {
    for (const src of modules) await load(src);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
