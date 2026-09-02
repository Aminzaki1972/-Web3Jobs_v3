/* Web3Jobs — single canonical company subscription controller */
"use strict";
(() => {
  const BSC = "0x38";
  const USDT = "0x55d398326f99059fF775485246999027B3197955";
  const FUNCTION_CREATE = "create-payment-intent";
  const FUNCTION_VERIFY = "verify-payment";
  let verified = null;
  let cachedPlans = new Map();

  const getSupabase = async () => {
    if (typeof window.waitForSupabase === "function") {
      const client = await window.waitForSupabase();
      if (client) return client;
    }
    if (window.supabaseClient?.functions) return window.supabaseClient;
    throw new Error("Supabase connection is not initialized.");
  };

  const ensureSession = async sb => {
    try {
      let { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (!data?.session?.user) {
        throw new Error("Please log in to Web3Jobs before verifying your wallet.");
      }
      // Refresh the access token immediately before protected Edge Function calls.
      // This prevents an expired/stale JWT from reaching wallet-auth and returning
      // the generic "Edge Function returned a non-2xx status code" message.
      const refreshed = await sb.auth.refreshSession();
      if (refreshed.error) throw refreshed.error;
      if (!refreshed.data?.session?.user) {
        throw new Error("Your Web3Jobs login session could not be refreshed. Please log in again.");
      }
      return refreshed.data.session;
    } catch (e) {
      throw new Error(e?.message || "Your Web3Jobs login session is unavailable. Please log in again.");
    }
  };

  const functionError = async (error, fallback) => {
    if (!error) return new Error(fallback);
    try {
      const response = error.context;
      if (response && typeof response.clone === "function") {
        const copy = response.clone();
        const text = await copy.text();
        if (text) {
          try {
            const body = JSON.parse(text);
            if (body?.error) return new Error(String(body.error));
            if (body?.message) return new Error(String(body.message));
          } catch (_) {
            if (text.length < 500) return new Error(text);
          }
        }
        if (response.status === 401) return new Error("Web3Jobs login session is invalid or expired. Please log in again.");
        if (response.status === 403) return new Error("Wallet verification is not authorized for this account.");
        if (response.status === 404) return new Error("Wallet verification service was not found.");
        if (response.status >= 500) return new Error("Wallet verification service encountered a server error. Please try again.");
      }
    } catch (_) {}
    return new Error(error.message || fallback);
  };

  const connect = async () => {
    if (!window.ethereum) throw new Error("Please open MetaMask or a compatible Web3 wallet.");
    const chain = await ethereum.request({ method: "eth_chainId" });
    if (chain !== BSC) {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC }] });
    }
    if (!window.ethers?.BrowserProvider) throw new Error("Web3 wallet library is not available.");
    const provider = new ethers.BrowserProvider(ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts?.[0]) throw new Error("No wallet account was selected.");
    return { provider, address: ethers.getAddress(accounts[0]) };
  };

  const verifyWallet = async () => {
    const { provider, address } = await connect();
    const sb = await getSupabase();
    await ensureSession(sb);
    const { data: challenge, error: challengeError } = await sb.functions.invoke("wallet-auth", {
      body: { action: "challenge", wallet: address }
    });
    if (challengeError) throw await functionError(challengeError, "Unable to start wallet verification.");
    if (!challenge?.success || !challenge.message || !challenge.nonce) {
      throw new Error(challenge?.error || "Unable to start wallet verification.");
    }
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(challenge.message);
    const { data: result, error: verifyError } = await sb.functions.invoke("wallet-auth", {
      body: { action: "verify", wallet: address, nonce: challenge.nonce, message: challenge.message, signature }
    });
    if (verifyError) throw await functionError(verifyError, "Wallet verification request failed.");
    if (!result?.success) throw new Error(result?.error || "Wallet verification failed.");
    verified = { address: result.wallet || address };
    return verified;
  };

  const loadPlan = async code => {
    const key = String(code || "").trim().toLowerCase();
    if (cachedPlans.has(key)) return cachedPlans.get(key);
    const sb = await getSupabase();
    const { data, error } = await sb.from("payment_plans").select("id,plan_code,plan_name,description,price,currency,duration_days,is_active,plan_type").eq("plan_code", key).eq("plan_type", "company_subscription").eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Subscription plan is not active.");
    if (String(data.currency).toUpperCase() !== "USDT") throw new Error("This subscription is not configured for USDT.");
    if (Number(data.price) <= 0) throw new Error("Invalid subscription price.");
    cachedPlans.set(key, data);
    return data;
  };

  const createIntent = async (planCode, wallet) => {
    const sb = await getSupabase();
    await ensureSession(sb);
    const { data, error } = await sb.functions.invoke(FUNCTION_CREATE, { body: { planCode, wallet } });
    if (error) throw await functionError(error, "Unable to create payment intent.");
    if (!data?.success || !data.paymentIntent) throw new Error(data?.error || "Unable to create payment intent.");
    return data;
  };

  const payAndVerify = async (intent, wallet) => {
    if (!window.ethers?.BrowserProvider) throw new Error("Web3 wallet library is not available.");
    const { provider, address } = await connect();
    if (address.toLowerCase() !== wallet.toLowerCase()) {
      verified = null;
      throw new Error("The wallet changed after verification. Please verify again.");
    }
    if (String(intent.chain_id) !== "56" || intent.token_address.toLowerCase() !== USDT.toLowerCase()) throw new Error("Payment intent network or token is invalid.");
    const amount = ethers.parseUnits(String(intent.amount), 18);
    const abi = ["function balanceOf(address) view returns (uint256)", "function transfer(address,uint256) returns (bool)"];
    const token = new ethers.Contract(intent.token_address, abi, await provider.getSigner());
    const balance = await token.balanceOf(address);
    if (balance < amount) throw new Error(`Insufficient USDT balance. Required: ${intent.amount} USDT.`);
    const tx = await token.transfer(intent.merchant_wallet, amount);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error("USDT transaction failed or was not confirmed.");
    const sb = await getSupabase();
    await ensureSession(sb);
    const { data: result, error } = await sb.functions.invoke(FUNCTION_VERIFY, { body: { paymentIntentId: intent.id, txHash: receipt.hash, wallet: address } });
    if (error) throw await functionError(error, "On-chain payment verification request failed.");
    if (!result?.success) throw new Error(result?.error || "On-chain payment verification failed.");
    return result;
  };

  const getPlanCode = el => {
    let n = el;
    for (let i = 0; n && i < 10; i++, n = n.parentElement) {
      const explicit = String(n.dataset?.payPlan || n.dataset?.plan || "").toLowerCase().trim();
      if (explicit) return explicit;
      const id = String(n.id || "").toLowerCase();
      if (id) {
        const match = ["starter", "professional", "enterprise"].find(k => id === k || id.includes(`-${k}`) || id.includes(`${k}-`));
        if (match) return match;
      }
    }
    return null;
  };

  const css = () => {
    if (document.getElementById("wj-canonical-sub-style")) return;
    const s = document.createElement("style");
    s.id = "wj-canonical-sub-style";
    s.textContent = `#wj-canonical-sub{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78);font-family:Arial,sans-serif}#wj-canonical-sub .box{width:min(560px,100%);padding:24px;border:1px solid #294663;border-radius:18px;background:#081423;color:#fff}.wjc-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px}.wjc-green{color:#6ee7b7}.wjc-actions{display:flex;gap:10px;margin-top:18px}.wjc-actions button{flex:1;min-height:44px;border:0;border-radius:10px;font-weight:800;cursor:pointer}.wjc-cancel{background:#17263a;color:#fff}.wjc-action{background:#1c765a;color:#fff}.wjc-status{margin-top:14px;padding:12px;border-radius:10px;background:#0d1d31;color:#b9c9dc;font-size:12px}.wjc-error{display:none;margin-top:12px;padding:10px;border-radius:10px;background:#3a1520;color:#ffb4c0;font-size:12px}`;
    document.head.appendChild(s);
  };

  const open = async code => {
    css();
    document.getElementById("wj-canonical-sub")?.remove();
    verified = null;
    let plan;
    try { plan = await loadPlan(code); } catch (e) { alert(e?.message || String(e)); return; }
    const m = document.createElement("div");
    m.id = "wj-canonical-sub";
    m.innerHTML = `<div class="box"><h2>${String(plan.plan_name)} — Monthly Subscription</h2><p>One secure flow: wallet verification → payment intent → USDT transfer → on-chain verification → activation.</p><div class="wjc-row"><span>Amount</span><strong class="wjc-green">${Number(plan.price)} USDT / month</strong></div><div class="wjc-row"><span>Network</span><strong>BNB Smart Chain (BSC)</strong></div><div class="wjc-row"><span>USDT Contract</span><span style="font-size:10px;word-break:break-all">${USDT}</span></div><div class="wjc-row"><span>Duration</span><strong>${Number(plan.duration_days || 30)} days</strong></div><div id="wjc-status" class="wjc-status">Step 1 — Verify wallet ownership. <b>0 USDT payment</b>.</div><div id="wjc-error" class="wjc-error"></div><div class="wjc-actions"><button class="wjc-cancel" type="button">Cancel</button><button id="wjc-action" class="wjc-action" type="button">Verify Wallet & Continue</button></div></div>`;
    document.body.appendChild(m);
    const status = m.querySelector("#wjc-status");
    const error = m.querySelector("#wjc-error");
    const btn = m.querySelector("#wjc-action");
    m.querySelector(".wjc-cancel").onclick = () => m.remove();
    btn.onclick = async () => {
      btn.disabled = true;
      error.style.display = "none";
      try {
        if (!verified) {
          status.innerHTML = "Opening <b>free wallet signature</b> — <b>0 USDT / 0 Gas</b>...";
          verified = await verifyWallet();
          status.innerHTML = "Wallet verified ✓ — now creating a server-side payment intent.";
          const intentResponse = await createIntent(plan.plan_code, verified.address);
          const intent = intentResponse.paymentIntent;
          plan = intentResponse.plan || plan;
          status.innerHTML = `Payment intent created ✓ — ${Number(intent.amount)} USDT. Review the wallet transaction to continue.`;
          btn.textContent = `Pay ${Number(intent.amount)} USDT`;
          btn.dataset.intent = intent.id;
          btn._intent = intent;
          btn.disabled = false;
          return;
        }
        const intent = btn._intent;
        if (!intent) throw new Error("Payment intent is missing. Please restart the payment flow.");
        status.textContent = `Sending exactly ${Number(intent.amount)} USDT to the configured treasury...`;
        const result = await payAndVerify(intent, verified.address);
        status.innerHTML = `Payment verified on-chain ✓<br>Subscription activated ✓<br><span style="font-size:10px;word-break:break-all">${result.payment?.transaction_hash || intent.tx_hash || "Confirmed"}</span>`;
        btn.textContent = "Done";
        btn.disabled = false;
        btn.onclick = () => { m.remove(); window.location.reload(); };
      } catch (e) {
        error.textContent = e?.code === 4001 ? "Wallet request was cancelled." : (e?.message || String(e));
        error.style.display = "block";
        btn.disabled = false;
        btn.textContent = verified && btn._intent ? `Pay ${Number(btn._intent.amount)} USDT` : "Verify Wallet & Continue";
      }
    };
  };

  const init = () => {
    document.querySelectorAll(".plan-button,[data-pay-plan],.plan-pay-button").forEach(b => { b.disabled = false; b.style.pointerEvents = "auto"; b.style.cursor = "pointer"; });
    document.addEventListener("click", e => {
      const b = e.target?.closest?.(".plan-button,[data-pay-plan],.plan-pay-button");
      if (!b) return;
      const code = getPlanCode(b);
      if (!code) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open(code);
    }, true);
  };

  window.Web3JobsCanonicalSubscription = { verifyWallet, createIntent, payAndVerify, loadPlan };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
