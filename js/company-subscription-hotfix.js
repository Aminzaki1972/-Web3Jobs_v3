/* Web3Jobs - subscription button hardening */
"use strict";
(() => {
  const PLANS = ["starter", "professional", "enterprise"];
  const CONFIG = {
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    treasury: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36"
  };

  function codeFrom(button) {
    let n = button;
    for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
      const code = String(n.dataset?.payPlan || n.dataset?.plan || "").toLowerCase();
      if (PLANS.includes(code)) return code;
    }
    return null;
  }

  function getPlan(code) {
    const plans = window.Web3JobsCompanySubscription?.plans || [];
    return plans.find(p => String(p.plan_code).toLowerCase() === code) || null;
  }

  function ensureModal() {
    if (document.getElementById("wj-payment-modal-hotfix")) return document.getElementById("wj-payment-modal-hotfix");
    const style = document.createElement("style");
    style.textContent = `#wj-payment-modal-hotfix{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78)}#wj-payment-modal-hotfix .wj-card{width:min(560px,100%);background:#081423;color:#f5f8ff;border:1px solid #294663;border-radius:18px;padding:24px;box-shadow:0 30px 100px rgba(0,0,0,.6)}#wj-payment-modal-hotfix h3{margin:0 0 8px;font-size:21px}#wj-payment-modal-hotfix .wj-sub{color:#9cafc5;font-size:12px;margin-bottom:18px}.wj-row{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.09);font-size:12px}.wj-row strong{color:#6ee7b7}.wj-address{font-family:monospace;font-size:10px;word-break:break-all;text-align:right}.wj-actions{display:flex;gap:10px;margin-top:20px}.wj-actions button{flex:1;min-height:44px;border:0;border-radius:10px;font-weight:800;cursor:pointer}.wj-cancel{background:#17263a;color:#fff}.wj-pay{background:#1c765a;color:#fff}`;
    document.head.appendChild(style);
    const m = document.createElement("div");
    m.id = "wj-payment-modal-hotfix";
    m.innerHTML = `<div class="wj-card"><h3 id="wj-title">Monthly subscription</h3><div class="wj-sub">Review the payment details before opening your wallet.</div><div id="wj-details"></div><div class="wj-actions"><button class="wj-cancel" type="button">Cancel</button><button class="wj-pay" type="button">Connect Wallet & Pay</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector(".wj-cancel").onclick = () => { m.style.display = "none"; };
    m.addEventListener("click", e => { if (e.target === m) m.style.display = "none"; });
    return m;
  }

  function show(button, code, plan) {
    const m = ensureModal();
    const price = Number(plan?.price ?? 0);
    const currency = String(plan?.currency || "USDT").toUpperCase();
    const duration = Number(plan?.duration_days || 30);
    m.querySelector("#wj-title").textContent = `${plan?.plan_name || code} — monthly subscription`;
    m.querySelector("#wj-details").innerHTML = `<div class="wj-row"><span>Amount</span><strong>$${price.toFixed(price % 1 ? 2 : 0)} ${currency}</strong></div><div class="wj-row"><span>Network</span><strong>BNB Smart Chain (BSC)</strong></div><div class="wj-row"><span>USDT token contract</span><span class="wj-address">${CONFIG.usdt}</span></div><div class="wj-row"><span>Payment wallet</span><span class="wj-address">${CONFIG.treasury}</span></div><div class="wj-row"><span>Duration</span><strong>${duration} days</strong></div>`;
    m.style.display = "flex";
    const pay = m.querySelector(".wj-pay");
    pay.disabled = false;
    pay.textContent = "Connect Wallet & Pay";
    pay.onclick = async () => {
      const api = window.Web3JobsCompanySubscription;
      if (!api || typeof api.pay !== "function") {
        alert("Subscription payment system is still loading. Please refresh and try again.");
        return;
      }
      pay.disabled = true;
      pay.textContent = "Processing...";
      try {
        m.style.display = "none";
        await api.pay(code);
      } catch (e) {
        m.style.display = "flex";
        alert(e?.message || String(e));
      } finally {
        pay.disabled = false;
        pay.textContent = "Connect Wallet & Pay";
      }
    };
  }

  function install() {
    if (window.__wjSubscriptionHotfix) return;
    window.__wjSubscriptionHotfix = true;
    document.addEventListener("click", event => {
      const button = event.target?.closest?.(".plan-pay-button, [data-pay-plan]");
      if (!button) return;
      const code = codeFrom(button);
      if (!code) return;
      const plan = getPlan(code);
      if (!plan) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert("Company subscription plans are still loading. Please wait a moment and try again.");
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      show(button, code, plan);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
