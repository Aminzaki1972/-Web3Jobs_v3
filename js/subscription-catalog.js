/* Web3Jobs — canonical company subscription catalog */
"use strict";
(() => {
  const CATALOG = Object.freeze({
    free: { code: "free", name: "Free", price: 0, currency: "USDT", durationDays: 30, limit: 2 },
    starter: { code: "starter", name: "Starter", price: 19, currency: "USDT", durationDays: 30, limit: 5 },
    professional: { code: "professional", name: "Professional", price: 45, currency: "USDT", durationDays: 30, limit: 20 },
    enterprise: { code: "enterprise", name: "Enterprise", price: 99, currency: "USDT", durationDays: 30, limit: Infinity }
  });

  const apply = () => {
    document.querySelectorAll(".plan-button").forEach(button => {
      const code = String(button.dataset.plan || button.dataset.payPlan || "").toLowerCase().trim();
      const plan = CATALOG[code];
      if (!plan) {
        button.hidden = true;
        return;
      }
      const name = button.querySelector(".plan-button-name");
      const price = button.querySelector(".plan-button-price");
      const limit = button.querySelector(".plan-button-limit");
      if (name) name.textContent = plan.name;
      if (price) price.textContent = plan.price === 0 ? "$0 / month" : `${plan.price} USDT / month`;
      if (limit) limit.textContent = plan.limit === Infinity ? "Unlimited jobs" : `${plan.limit} jobs / month`;
      button.dataset.payPlan = plan.code;
    });
    window.Web3JobsSubscriptionCatalog = CATALOG;
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
})();
