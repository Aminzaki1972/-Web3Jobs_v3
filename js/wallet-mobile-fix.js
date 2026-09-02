/* Web3Jobs mobile wallet picker fix */
"use strict";
(() => {
  if (window.__WJ_WALLET_MOBILE_FIX__) return;
  window.__WJ_WALLET_MOBILE_FIX__ = true;

  const providers = new Map();
  const add = detail => {
    const p = detail?.provider;
    if (!p || typeof p.request !== "function") return;
    const info = detail?.info || {};
    const key = info.rdns || info.uuid || info.name || `provider-${providers.size}`;
    if (!providers.has(key)) providers.set(key, { provider: p, info });
  };

  window.addEventListener("eip6963:announceProvider", e => add(e.detail));
  window.addEventListener("eip6963:requestProvider", () => {
    try {
      if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
        window.ethereum.providers.forEach((p, i) => add({ provider: p, info: { name: p.isMetaMask ? "MetaMask" : `Web3 Wallet ${i + 1}` } }));
      }
      if (window.ethereum) add({ provider: window.ethereum, info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Web3 Wallet" } });
      providers.forEach(({ provider, info }) => {
        window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { provider, info } }));
      });
    } catch (_) {}
  });

  const getProviders = () => {
    try { window.dispatchEvent(new CustomEvent("eip6963:requestProvider")); } catch (_) {}
    if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
      window.ethereum.providers.forEach((p, i) => add({ provider: p, info: { name: p.isMetaMask ? "MetaMask" : `Web3 Wallet ${i + 1}` } }));
    }
    if (window.ethereum) add({ provider: window.ethereum, info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Web3 Wallet" } });
    return Array.from(providers.values());
  };

  const style = () => {
    if (document.getElementById("wj-wallet-picker-style")) return;
    const s = document.createElement("style");
    s.id = "wj-wallet-picker-style";
    s.textContent = `#wj-wallet-picker{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);font-family:Arial,sans-serif}#wj-wallet-picker .wjwp-box{width:min(430px,100%);background:#081423;color:#fff;border:1px solid #294663;border-radius:18px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.45)}#wj-wallet-picker h3{margin:0 0 7px;font-size:20px}#wj-wallet-picker p{margin:0 0 16px;color:#aebed1;font-size:12px;line-height:1.5}.wjwp-wallet{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:9px 0;padding:14px;border:1px solid #294663;border-radius:12px;background:#0d1d31;color:#fff;text-align:left;cursor:pointer;font-weight:800}.wjwp-wallet:active{transform:scale(.99)}.wjwp-name{font-size:14px}.wjwp-sub{display:block;margin-top:4px;color:#7f93aa;font-size:10px;font-weight:400}.wjwp-cancel{width:100%;margin-top:8px;padding:12px;border:0;border-radius:10px;background:#17263a;color:#fff;font-weight:700}`;
    document.head.appendChild(s);
  };

  const picker = async list => new Promise((resolve, reject) => {
    style();
    document.getElementById("wj-wallet-picker")?.remove();
    const m = document.createElement("div");
    m.id = "wj-wallet-picker";
    m.innerHTML = `<div class="wjwp-box"><h3>Choose your wallet</h3><p>Select a wallet to verify ownership. <b>No USDT and no blockchain transaction are used for the signature.</b></p><div id="wjwp-list"></div><button class="wjwp-cancel" type="button">Cancel</button></div>`;
    const listEl = m.querySelector("#wjwp-list");
    list.forEach((item, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wjwp-wallet";
      b.innerHTML = `<span><span class="wjwp-name"></span><span class="wjwp-sub">EIP-1193 Web3 wallet</span></span><span>›</span>`;
      b.querySelector(".wjwp-name").textContent = item.info?.name || `Web3 Wallet ${i + 1}`;
      b.onclick = () => { m.remove(); resolve(i); };
      listEl.appendChild(b);
    });
    m.querySelector(".wjwp-cancel").onclick = () => { m.remove(); reject(new Error("No wallet was selected.")); };
    document.body.appendChild(m);
  });

  const getPlan = button => {
    const code = String(button?.dataset?.payPlan || button?.dataset?.plan || "").toLowerCase().trim();
    return ["starter", "professional", "enterprise"].includes(code) ? code : null;
  };

  document.addEventListener("click", async event => {
    if (window.__WJ_WALLET_FIX_BYPASS__) return;
    const button = event.target?.closest?.(".plan-button,[data-pay-plan],.plan-pay-button");
    const plan = getPlan(button);
    if (!button || !plan) return;
    const api = window.Web3JobsCanonicalSubscription;
    if (!api?.discoverWalletProviders) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const list = getProviders();
    if (!list.length) {
      alert("No Web3 wallet was detected. Open Web3Jobs inside your wallet browser or install a compatible EIP-1193 wallet.");
      return;
    }
    try {
      const selected = await picker(list);
      window.__WJ_SELECTED_WALLET_INDEX__ = selected;
      window.__WJ_WALLET_FIX_BYPASS__ = true;
      const originalPrompt = window.prompt;
      window.prompt = () => String(selected + 1);
      button.click();
      window.setTimeout(() => {
        window.prompt = originalPrompt;
        delete window.__WJ_SELECTED_WALLET_INDEX__;
        delete window.__WJ_WALLET_FIX_BYPASS__;
      }, 60000);
      window.setTimeout(() => { delete window.__WJ_WALLET_FIX_BYPASS__; }, 1000);
    } catch (e) {
      alert(e?.message || "Wallet selection cancelled.");
    }
  }, true);
})();
