/* Web3Jobs — canonical company subscription catalog */
"use strict";
(() => {
  const CATALOG = Object.freeze({
    free: { code: "free", name: "Free", price: 0, currency: "USDT", durationDays: 30, limit: 2 },
    starter: { code: "starter", name: "Starter", price: 19, currency: "USDT", durationDays: 30, limit: 10 },
    professional: { code: "professional", name: "Professional", price: 45, currency: "USDT", durationDays: 30, limit: 30 },
    enterprise: { code: "enterprise", name: "Enterprise", price: 99, currency: "USDT", durationDays: 30, limit: Infinity }
  });

  const apply = () => {
    document.querySelectorAll(".plan-button").forEach(button => {
      const code = String(button.dataset.plan || button.dataset.payPlan || "").toLowerCase().trim();
      const plan = CATALOG[code];
      if (!plan) return;
      const name = button.querySelector(".plan-button-name");
      const price = button.querySelector(".plan-button-price");
      const limit = button.querySelector(".plan-button-limit");
      if (name) name.textContent = plan.name;
      if (price) price.textContent = plan.price === 0 ? "$0 / month" : `$${plan.price} USDT / month`;
      if (limit) limit.textContent = plan.limit === Infinity ? "Unlimited jobs" : `${plan.limit} jobs / month`;
      if (plan.price > 0) button.dataset.payPlan = plan.code;
      else delete button.dataset.payPlan;
    });
    window.Web3JobsSubscriptionCatalog = CATALOG;
  };

  const handleFree = event => {
    const button = event.target?.closest?.('.plan-button[data-plan="free"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".plan-button").forEach(b => b.classList.toggle("active", b === button));
    const current = document.getElementById("current-plan-name");
    if (current) current.textContent = "Free";
    const note = document.getElementById("publish-note");
    if (note) note.textContent = "Free plan: 2 jobs / month";
  };

  const init = () => {
    apply();
    document.addEventListener("click", handleFree, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
