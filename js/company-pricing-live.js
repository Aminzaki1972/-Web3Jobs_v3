"use strict";

/* Web3Jobs v3 - company pricing display only
   Payment actions are handled by company-subscription-ui.js.
   This file intentionally contains NO wallet/payment click handler,
   preventing two competing subscription handlers from intercepting the same button. */
(() => {
  const PLANS = {
    starter: { price: 19, limit: 1 },
    professional: { price: 49, limit: 5 },
    enterprise: { price: 99, limit: 20 }
  };

  function updateDashboardPlanObject() {
    const api = window.Web3JobsCompanyDashboard;
    if (!api?.plans) return false;
    for (const [code, value] of Object.entries(PLANS)) {
      if (api.plans[code]) {
        api.plans[code].price = value.price;
        api.plans[code].limit = value.limit;
        api.plans[code].durationDays = 30;
      }
    }
    return true;
  }

  function updateVisiblePrices() {
    for (const [code, plan] of Object.entries(PLANS)) {
      document.querySelectorAll(`[data-plan="${code}"] .plan-button-price`).forEach(el => {
        el.textContent = `$${plan.price} USDT / month`;
      });
      document.querySelectorAll(`[data-plan="${code}"] .plan-button-limit`).forEach(el => {
        el.textContent = `${plan.limit} job${plan.limit === 1 ? "" : "s"} / month`;
      });
      document.querySelectorAll(`[data-plan-details="${code}"] .plan-details-price`).forEach(el => {
        el.textContent = `$${plan.price} USDT / month`;
      });
      document.querySelectorAll(`[data-plan-details="${code}"] .plan-feature`).forEach(el => {
        if (/job postings/i.test(el.textContent)) {
          const target = el.querySelector("span:last-child");
          if (target) target.textContent = `${plan.limit} job${plan.limit === 1 ? "" : "s"} / month`;
        }
      });
      document.querySelectorAll(`[data-pay-plan="${code}"]`).forEach(btn => {
        btn.textContent = "Subscribe & Pay";
        btn.disabled = false;
      });
    }
  }

  function install() {
    updateDashboardPlanObject();
    updateVisiblePrices();
  }

  let tries = 0;
  const timer = setInterval(() => {
    updateDashboardPlanObject();
    updateVisiblePrices();
    if (++tries > 80) clearInterval(timer);
  }, 250);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
