/* Web3Jobs v3 — subscription UI: card selection + FREE signature + separate payment */
"use strict";
(() => {
  const CODES = ["starter", "professional", "enterprise"];
  const api = () => window.Web3JobsCompanySubscription;
  const findPlan = code => api()?.plans?.find(p => String(p.plan_code).toLowerCase() === code) || null;
  const codeFrom = el => {
    let n = el;
    for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
      const d = String(n.dataset?.payPlan || n.dataset?.plan || "").toLowerCase();
      if (CODES.includes(d)) return d;
      const id = String(n.id || "").toLowerCase();
      const hit = CODES.find(c => id.includes(c));
      if (hit) return hit;
    }
    return null;
  };
  const price = p => `${Number(p?.price || 0)} ${String(p?.currency || "USDT").toUpperCase()}`;

  function styles() {
    if (document.getElementById("wj-separated-style")) return;
    const s = document.createElement("style"); s.id = "wj-separated-style";
    s.textContent = `#wj-separated{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78)}#wj-separated .card{width:min(560px,100%);padding:24px;border-radius:18px;background:#081423;color:#fff;border:1px solid #294663;font-family:Arial,sans-serif}#wj-separated h3{margin:0 0 8px}.wj-sub{color:#9cafc5;font-size:12px;margin-bottom:16px}.wj-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px}.wj-row strong{color:#6ee7b7}.wj-actions{display:flex;gap:10px;margin-top:18px}.wj-actions button{flex:1;min-height:44px;border:0;border-radius:10px;font-weight:800;cursor:pointer}.wj-cancel{background:#17263a;color:#fff}.wj-main{background:#1c765a;color:#fff}.wj-stage{margin-top:14px;padding:12px;border-radius:10px;background:#0d1d31;color:#b9c9dc;font-size:12px;line-height:1.5}.wj-error{display:none;margin-top:14px;padding:12px;border-radius:10px;background:#3a1520;color:#ffb4c0;font-size:12px}`;
    document.head.appendChild(s);
  }

  async function openModal(code) {
    const a = api();
    if (!a) { alert("Subscription service is still loading. Please refresh and try again."); return; }
    if (!a.plans?.length && a.loadPlans) { try { await a.loadPlans(); } catch(e) {} }
    const p = findPlan(code);
    if (!p) { alert("This subscription plan is unavailable. Please refresh the page."); return; }
    styles();
    let m = document.getElementById("wj-separated");
    if (!m) {
      m = document.createElement("div"); m.id = "wj-separated";
      m.innerHTML = `<div class="card"><h3 id="wj-title"></h3><div class="wj-sub">Wallet ownership verification and payment are separate steps.</div><div id="wj-details"></div><div id="wj-stage" class="wj-stage" style="display:none"></div><div id="wj-error" class="wj-error"></div><div class="wj-actions"><button type="button" class="wj-cancel">Cancel</button><button type="button" class="wj-main" id="wj-main">Verify Wallet & Continue</button></div></div>`;
      document.body.appendChild(m);
      m.querySelector(".wj-cancel").onclick = () => m.style.display = "none";
    }
    m.style.display = "flex";
    m.querySelector("#wj-title").textContent = `${p.plan_name || code} — Monthly Subscription`;
    m.querySelector("#wj-details").innerHTML = `<div class="wj-row"><span>Amount</span><strong>${price(p)} / month</strong></div><div class="wj-row"><span>Network</span><strong>BNB Smart Chain (BSC)</strong></div><div class="wj-row"><span>USDT Contract</span><span style="font-family:monospace;font-size:10px;word-break:break-all">${a.CONFIG?.usdtAddress || ""}</span></div><div class="wj-row"><span>Payment Wallet</span><span style="font-family:monospace;font-size:10px;word-break:break-all">${a.CONFIG?.receivingWallet || ""}</span></div><div class="wj-row"><span>Duration</span><strong>${Number(p.duration_days || 30)} days</strong></div>`;
    const stage = m.querySelector("#wj-stage"), err = m.querySelector("#wj-error"), btn = m.querySelector("#wj-main");
    stage.style.display = "none"; err.style.display = "none"; btn.disabled = false; btn.textContent = "Verify Wallet & Continue";
    btn.onclick = async () => {
      btn.disabled = true; stage.style.display = "block"; stage.textContent = "Opening signature request — FREE. No transaction will be sent.";
      try {
        // STRICT: this calls only personal_sign/signMessage; no transfer, approve, estimateGas or transaction.
        await a.verifySelectedWallet();
        stage.textContent = "Wallet verified ✓ — 0 USDT / 0 gas. Now payment is a separate step.";
        btn.disabled = false; btn.textContent = `Pay ${price(p)}`;
        btn.onclick = async () => {
          btn.disabled = true; stage.textContent = `Opening separate ${price(p)} payment transaction...`;
          try {
            const result = await a.payAfterVerification(code, (k, label) => stage.textContent = label + "...");
            stage.textContent = `Payment submitted ✓ ${result.transactionHash}`;
            btn.textContent = "Done"; setTimeout(() => { m.style.display = "none"; location.reload(); }, 800);
          } catch (e) { err.textContent = e?.message || String(e); err.style.display = "block"; btn.disabled = false; btn.textContent = `Pay ${price(p)}`; }
        };
      } catch (e) { err.textContent = e?.message || String(e); err.style.display = "block"; btn.disabled = false; btn.textContent = "Verify Wallet & Continue"; }
    };
  }

  function capture(e) {
    const b = e.target?.closest?.(".plan-button, [data-pay-plan], .plan-pay-button");
    if (!b) return;
    const code = codeFrom(b);
    if (!code) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openModal(code);
  }
  function init() {
    document.addEventListener("click", capture, true);
    window.addEventListener("web3jobs:company-plans-loaded", () => {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
