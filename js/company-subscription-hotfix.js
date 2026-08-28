/* Web3Jobs v3 - FINAL subscription wallet verification hotfix
   IMPORTANT:
   1) Wallet verification uses personal_sign only.
   2) Verification sends NO transaction and therefore costs 0 USDT and 0 BNB/gas.
   3) Subscription payment is a separate USDT transaction after verification.
   4) Never call transfer/approve/estimateGas during verification.
*/
"use strict";
(() => {
  const PLANS = ["starter", "professional", "enterprise"];
  const FALLBACK_PLANS = {
    starter: { plan_code: "starter", plan_name: "Starter", price: 19, currency: "USDT", duration_days: 30 },
    professional: { plan_code: "professional", plan_name: "Professional", price: 25, currency: "USDT", duration_days: 30 },
    enterprise: { plan_code: "enterprise", plan_name: "Enterprise", price: 50, currency: "USDT", duration_days: 30 }
  };
  const CONFIG = {
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    treasury: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36"
  };

  function codeFrom(button) {
    let node = button;
    for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
      const code = String(node.dataset?.payPlan || node.dataset?.plan || "").toLowerCase();
      if (PLANS.includes(code)) return code;
    }
    return null;
  }

  function getPlan(code) {
    const plans = window.Web3JobsCompanySubscription?.plans || [];
    const remote = plans.find(p => String(p.plan_code).toLowerCase() === code);
    // Keep the user-facing subscription price consistent with the agreed plans.
    // The secure payment intent remains the source of truth for the actual transfer amount.
    return { ...(FALLBACK_PLANS[code] || {}), ...(remote || {}) };
  }

  function ensureModal() {
    let modal = document.getElementById("wj-payment-modal-hotfix");
    if (modal) return modal;

    const style = document.createElement("style");
    style.textContent = `
      #wj-payment-modal-hotfix{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78);font-family:Arial,sans-serif}
      #wj-payment-modal-hotfix .wj-card{width:min(560px,100%);background:#081423;color:#f5f8ff;border:1px solid #294663;border-radius:18px;padding:24px;box-shadow:0 30px 100px rgba(0,0,0,.6)}
      #wj-payment-modal-hotfix h3{margin:0 0 8px;font-size:21px}
      #wj-payment-modal-hotfix .wj-sub{color:#9cafc5;font-size:12px;margin-bottom:18px}
      #wj-payment-modal-hotfix .wj-row{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.09);font-size:12px}
      #wj-payment-modal-hotfix .wj-row strong{color:#6ee7b7}
      #wj-payment-modal-hotfix .wj-address{font-family:monospace;font-size:10px;word-break:break-all;text-align:right}
      #wj-payment-modal-hotfix .wj-actions{display:flex;gap:10px;margin-top:20px}
      #wj-payment-modal-hotfix .wj-actions button{flex:1;min-height:44px;border:0;border-radius:10px;font-weight:800;cursor:pointer}
      #wj-payment-modal-hotfix .wj-cancel{background:#17263a;color:#fff}
      #wj-payment-modal-hotfix .wj-pay{background:#1c765a;color:#fff}
      #wj-payment-modal-hotfix .wj-stage{display:none;margin-top:14px;padding:12px;border-radius:10px;background:#0d1d31;color:#b9c9dc;font-size:12px}
      #wj-payment-modal-hotfix .wj-error{display:none;margin-top:14px;padding:12px;border-radius:10px;background:#3a1520;color:#ffb4c0;font-size:12px;line-height:1.6;word-break:break-word}
    `;
    document.head.appendChild(style);

    modal = document.createElement("div");
    modal.id = "wj-payment-modal-hotfix";
    modal.innerHTML = `
      <div class="wj-card">
        <h3 id="wj-title">Monthly subscription</h3>
        <div class="wj-sub">Step 1: Sign Wallet — FREE (0 USDT / 0 BNB gas). Step 2: Pay subscription separately.</div>
        <div id="wj-details"></div>
        <div id="wj-stage" class="wj-stage"></div>
        <div id="wj-error" class="wj-error"></div>
        <div class="wj-actions">
          <button class="wj-cancel" type="button">Cancel</button>
          <button class="wj-pay" type="button">Sign Wallet — FREE</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector(".wj-cancel").onclick = () => { modal.style.display = "none"; };
    modal.addEventListener("click", event => {
      if (event.target === modal) modal.style.display = "none";
    });
    return modal;
  }

  function show(code, plan) {
    const modal = ensureModal();
    const price = Number(plan?.price ?? FALLBACK_PLANS[code]?.price ?? 0);
    const duration = Number(plan?.duration_days || 30);
    const details = modal.querySelector("#wj-details");
    const errorBox = modal.querySelector("#wj-error");
    const stage = modal.querySelector("#wj-stage");
    const action = modal.querySelector(".wj-pay");

    modal.querySelector("#wj-title").textContent = `${plan?.plan_name || code} — Monthly Subscription`;
    details.innerHTML = `
      <div class="wj-row"><span>Step 1</span><strong>Sign Wallet — FREE</strong></div>
      <div class="wj-row"><span>Signature cost</span><strong>0 USDT / 0 BNB gas</strong></div>
      <div class="wj-row"><span>Subscription</span><strong>${price} USDT / month</strong></div>
      <div class="wj-row"><span>Network</span><strong>BNB Smart Chain (BSC)</strong></div>
      <div class="wj-row"><span>Payment wallet</span><span class="wj-address">${CONFIG.treasury}</span></div>
      <div class="wj-row"><span>Duration</span><strong>${duration} days</strong></div>`;

    errorBox.style.display = "none";
    stage.style.display = "none";
    modal.style.display = "flex";
    action.disabled = false;
    action.textContent = "Sign Wallet — FREE";

    action.onclick = async () => {
      const api = window.Web3JobsCompanySubscription;
      if (!api || typeof api.verifySelectedWallet !== "function") {
        errorBox.textContent = "Wallet verification service is still loading. Please refresh the page.";
        errorBox.style.display = "block";
        return;
      }

      action.disabled = true;
      errorBox.style.display = "none";
      stage.style.display = "block";
      stage.textContent = "Connecting wallet...";

      try {
        // This path performs wallet-auth + personal_sign only.
        // It does NOT call transfer, approve, estimateGas, or send a blockchain transaction.
        await api.verifySelectedWallet();

        stage.textContent = "Wallet signed successfully ✓ — 0 USDT and 0 BNB/gas paid.";
        action.textContent = `Pay ${price} USDT`;
        action.disabled = false;

        action.onclick = async () => {
          if (typeof api.payAfterVerification !== "function") {
            errorBox.textContent = "Separate payment service is unavailable.";
            errorBox.style.display = "block";
            return;
          }

          action.disabled = true;
          stage.textContent = "Preparing separate subscription payment...";

          try {
            await api.payAfterVerification(code, (key, label) => {
              stage.textContent = `${label}...`;
            });
            stage.textContent = "Subscription Activated ✓";
            action.textContent = "Done";
            setTimeout(() => {
              modal.style.display = "none";
              location.reload();
            }, 700);
          } catch (paymentError) {
            stage.style.display = "none";
            errorBox.textContent = paymentError?.message || String(paymentError);
            errorBox.style.display = "block";
            action.disabled = false;
            action.textContent = `Pay ${price} USDT`;
          }
        };
      } catch (verificationError) {
        stage.style.display = "none";
        errorBox.textContent = verificationError?.message || String(verificationError);
        errorBox.style.display = "block";
        action.disabled = false;
        action.textContent = "Sign Wallet — FREE";
      }
    };
  }

  function install() {
    if (window.__wjSubscriptionHotfixFinal) return;
    window.__wjSubscriptionHotfixFinal = true;

    // Intercept only actual payment buttons. Do not intercept plan-selector buttons.
    document.addEventListener("click", event => {
      const button = event.target?.closest?.(".plan-pay-button,[data-pay-plan]");
      if (!button) return;
      const code = codeFrom(button);
      if (!code) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      show(code, getPlan(code));
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
