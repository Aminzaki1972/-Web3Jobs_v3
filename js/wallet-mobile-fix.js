/* Web3Jobs — professional wallet chooser for company subscriptions */
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

  const requestProviders = () => {
    try { window.dispatchEvent(new CustomEvent("eip6963:requestProvider")); } catch (_) {}
    try {
      if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
        window.ethereum.providers.forEach((p, i) => add({
          provider: p,
          info: { name: p.isMetaMask ? "MetaMask" : `Web3 Wallet ${i + 1}` }
        }));
      }
      if (window.ethereum) add({
        provider: window.ethereum,
        info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Web3 Wallet" }
      });
    } catch (_) {}
  };

  window.addEventListener("eip6963:requestProvider", requestProviders);

  const getProviders = () => {
    requestProviders();
    return Array.from(providers.values());
  };

  const style = () => {
    if (document.getElementById("wj-wallet-picker-style")) return;
    const s = document.createElement("style");
    s.id = "wj-wallet-picker-style";
    s.textContent = `
      #wj-wallet-picker{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82);font-family:Arial,sans-serif}
      #wj-wallet-picker .wjwp-box{width:min(460px,100%);max-height:90vh;overflow:auto;background:#081423;color:#fff;border:1px solid #294663;border-radius:20px;padding:22px;box-shadow:0 20px 70px rgba(0,0,0,.55)}
      #wj-wallet-picker h3{margin:0 0 7px;font-size:21px}
      #wj-wallet-picker p{margin:0 0 16px;color:#aebed1;font-size:12px;line-height:1.55}
      .wjwp-section{margin:15px 0 7px;color:#7f93aa;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
      .wjwp-wallet{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0;padding:14px;border:1px solid #294663;border-radius:13px;background:#0d1d31;color:#fff;text-align:left;cursor:pointer;font-weight:800}
      .wjwp-wallet:hover{border-color:#4e86b5;background:#11253d}.wjwp-wallet:active{transform:scale(.99)}
      .wjwp-name{font-size:14px}.wjwp-sub{display:block;margin-top:4px;color:#7f93aa;font-size:10px;font-weight:400}
      .wjwp-arrow{font-size:22px;color:#91b5d4}.wjwp-link{background:#10263b}
      .wjwp-cancel{width:100%;margin-top:10px;padding:12px;border:0;border-radius:10px;background:#17263a;color:#fff;font-weight:700;cursor:pointer}
      .wjwp-note{margin-top:13px!important;margin-bottom:0!important;font-size:10px!important;color:#71879e!important}
    `;
    document.head.appendChild(s);
  };

  const currentUrl = () => {
    try { return window.location.href; } catch (_) { return "https://aminzaki1972.github.io/-Web3Jobs_v3/company-dashboard.html"; }
  };

  const openExternal = url => {
    try { window.location.href = url; } catch (_) { window.open(url, "_blank", "noopener,noreferrer"); }
  };

  const picker = async list => new Promise((resolve, reject) => {
    style();
    document.getElementById("wj-wallet-picker")?.remove();
    const m = document.createElement("div");
    m.id = "wj-wallet-picker";
    m.innerHTML = `
      <div class="wjwp-box">
        <h3>Connect your Web3 wallet</h3>
        <p>Select the wallet you want to use for <b>free ownership verification</b>. The signature step does <b>not</b> transfer USDT or send a blockchain transaction.</p>
        <div class="wjwp-section">Available wallets</div>
        <div id="wjwp-list"></div>
        <div class="wjwp-section">Mobile wallet browser</div>
        <button class="wjwp-wallet wjwp-link" data-wallet="trust" type="button"><span><span class="wjwp-name">Trust Wallet</span><span class="wjwp-sub">Open Web3Jobs in Trust Wallet DApp Browser</span></span><span class="wjwp-arrow">›</span></button>
        <button class="wjwp-wallet wjwp-link" data-wallet="browser" type="button"><span><span class="wjwp-name">Other wallet browser</span><span class="wjwp-sub">Open this page inside MetaMask, OKX, Binance or another wallet browser</span></span><span class="wjwp-arrow">›</span></button>
        <button class="wjwp-cancel" type="button">Cancel</button>
        <p class="wjwp-note">After connection: BSC check → free signature → server verification → separate USDT payment. Signature and payment are never combined.</p>
      </div>`;

    const listEl = m.querySelector("#wjwp-list");
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "wjwp-note";
      empty.textContent = "No injected wallet was detected in this browser. Use a wallet browser above, then return to this page.";
      listEl.appendChild(empty);
    } else {
      list.forEach((item, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "wjwp-wallet";
        b.innerHTML = `<span><span class="wjwp-name"></span><span class="wjwp-sub">Detected EIP-1193 wallet</span></span><span class="wjwp-arrow">›</span>`;
        b.querySelector(".wjwp-name").textContent = item.info?.name || `Web3 Wallet ${i + 1}`;
        b.onclick = () => { m.remove(); resolve(i); };
        listEl.appendChild(b);
      });
    }

    m.querySelector('[data-wallet="trust"]').onclick = () => {
      const url = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl())}`;
      openExternal(url);
    };
    m.querySelector('[data-wallet="browser"]').onclick = () => {
      alert("Open Web3Jobs from inside your wallet's DApp/Web3 browser (MetaMask, OKX, Binance, Trust Wallet, etc.). Then select the detected wallet here.");
    };
    m.querySelector(".wjwp-cancel").onclick = () => { m.remove(); reject(new Error("Wallet connection cancelled.")); };
    document.body.appendChild(m);
  });

  const getPlan = button => {
    const code = String(button?.dataset?.payPlan || button?.dataset?.plan || "").toLowerCase().trim();
    return ["starter", "professional", "enterprise"].includes(code) ? code : null;
  };

  const continueWithProvider = (button, selected) => {
    const originalEthereum = window.ethereum;
    let replaced = false;
    try {
      // The canonical controller already supports EIP-1193. Temporarily expose
      // only the wallet chosen by the user so its internal provider selector
      // cannot fall back to window.prompt or choose another wallet.
      window.ethereum = selected.provider;
      replaced = window.ethereum === selected.provider;
    } catch (_) {}

    if (!replaced) {
      throw new Error("The selected wallet could not be activated in this browser. Please open Web3Jobs inside that wallet's DApp browser and try again.");
    }

    window.__WJ_WALLET_FIX_BYPASS__ = true;
    button.click();

    // Restore the original provider after the canonical subscription modal has
    // been opened. The canonical flow keeps using the selected provider object.
    window.setTimeout(() => {
      try { window.ethereum = originalEthereum; } catch (_) {}
      delete window.__WJ_WALLET_FIX_BYPASS__;
      delete window.__WJ_SELECTED_WALLET_INDEX__;
      delete window.__WJ_SELECTED_WALLET_PROVIDER__;
    }, 1500);
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
    try {
      const selectedIndex = await picker(list);
      const selected = list[selectedIndex];
      if (!selected?.provider) throw new Error("The selected wallet is unavailable. Please try again.");
      window.__WJ_SELECTED_WALLET_INDEX__ = selectedIndex;
      window.__WJ_SELECTED_WALLET_PROVIDER__ = selected.provider;
      continueWithProvider(button, selected);
    } catch (e) {
      if (e?.message && e.message !== "Wallet connection cancelled.") alert(e.message);
    }
  }, true);
})();
