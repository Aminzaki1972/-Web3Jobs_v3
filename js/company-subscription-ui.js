/* =========================================================
   Web3Jobs v3 - Company Subscription UI Bridge
   ---------------------------------------------------------
   Reads company plans from payment_plans and connects the
   existing Starter / Professional / Enterprise buttons to
   company-subscription-v2.js.
   ========================================================= */

"use strict";

(() => {
  const PLAN_CODES = ["starter", "professional", "enterprise"];

  function formatPrice(plan) {
    const price = Number(plan?.price ?? 0);
    const currency = String(plan?.currency || "USD").toUpperCase();
    return `$${price.toFixed(price % 1 ? 2 : 0)} USDT / month`;
  }

  function findPlan(code) {
    const plans = window.Web3JobsCompanySubscription?.plans || [];
    return plans.find(plan => plan.plan_code === code) || null;
  }

  function showPlan(code) {
    document.querySelectorAll("[data-plan-details]").forEach(el => {
      el.classList.toggle("active", el.dataset.planDetails === code);
    });

    document.querySelectorAll(".plan-button[data-plan]").forEach(el => {
      el.classList.toggle("active", el.dataset.plan === code);
    });
  }

  function syncPrices() {
    PLAN_CODES.forEach(code => {
      const plan = findPlan(code);
      if (!plan) return;

      document.querySelectorAll(`[data-plan="${code}"] .plan-button-price`).forEach(el => {
        el.textContent = formatPrice(plan);
      });

      document.querySelectorAll(`[data-plan-details="${code}"] .plan-details-price`).forEach(el => {
        el.textContent = formatPrice(plan);
      });

      document.querySelectorAll(`[data-pay-plan="${code}"]`).forEach(button => {
        button.dataset.paymentPlanId = String(plan.id);
        button.dataset.planCode = plan.plan_code;
      });
    });
  }

  async function handlePayment(code, button) {
    const api = window.Web3JobsCompanySubscription;
    if (!api) {
      alert("Subscription module is not loaded yet. Please refresh the page.");
      return;
    }

    const plan = findPlan(code);
    if (!plan) {
      alert("The selected company plan is not available.");
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Preparing...";

    try {
      // The module itself blocks live payment until the verified treasury
      // wallet is configured. No subscription is activated client-side.
      const result = await api.pay(code);
      console.log("Web3Jobs payment result:", result);
      alert(`Transaction confirmed. TX Hash:\n${result.transactionHash}\n\nSubscription activation will occur after server-side verification.`);
    } catch (error) {
      console.error("Web3Jobs subscription payment:", error);
      alert(error?.message || String(error));
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function initialize() {
    syncPrices();

    document.querySelectorAll(".plan-button[data-plan]").forEach(button => {
      button.addEventListener("click", () => showPlan(button.dataset.plan));
    });

    document.querySelectorAll("[data-pay-plan]").forEach(button => {
      button.addEventListener("click", () => handlePayment(button.dataset.payPlan, button));
    });
  }

  window.addEventListener("web3jobs:company-plans-loaded", syncPrices);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
