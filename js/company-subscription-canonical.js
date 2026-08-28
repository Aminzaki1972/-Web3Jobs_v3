/* Web3Jobs — single canonical company subscription controller */
"use strict";
(() => {
  const PLANS = {
    starter: { name: "Starter", price: 19, duration: 30 },
    professional: { name: "Professional", price: 49, duration: 30 },
    enterprise: { name: "Enterprise", price: 99, duration: 30 }
  };
  const BSC = "0x38";
  const USDT = "0x55d398326f99059fF775485246999027B3197955";
  const RECEIVER = "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36";
  const ABI = ["function balanceOf(address) view returns (uint256)", "function transfer(address,uint256) returns (bool)"];
  let verified = null;

  const connect = async () => {
    if (!window.ethereum) throw new Error("Please open MetaMask or a compatible Web3 wallet.");
    if (await ethereum.request({ method: "eth_chainId" }) !== BSC) {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC }] });
    }
    const provider = new ethers.BrowserProvider(ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts?.[0]) throw new Error("No wallet account was selected.");
    return { provider, address: ethers.getAddress(accounts[0]) };
  };

  const signOnly = async () => {
    const { provider, address } = await connect();
    const signer = await provider.getSigner();
    const message = `Web3Jobs Wallet Verification\n\nWallet: ${address}\nPurpose: Verify wallet ownership only.\nNo payment is authorized by this signature.`;
    const signature = await signer.signMessage(message);
    verified = { address, message, signature };
    return verified;
  };

  const payOnly = async code => {
    if (!verified) throw new Error("Wallet verification is required before payment.");
    const plan = PLANS[code];
    if (!plan) throw new Error("Invalid subscription plan.");
    const { provider, address } = await connect();
    if (address.toLowerCase() !== verified.address.toLowerCase()) throw new Error("The wallet changed after verification. Please verify again.");
    const signer = await provider.getSigner();
    const token = new ethers.Contract(USDT, ABI, signer);
    const amount = ethers.parseUnits(String(plan.price), 18);
    const balance = await token.balanceOf(address);
    if (balance < amount) throw new Error(`Insufficient USDT balance. Required: ${plan.price} USDT`);
    const tx = await token.transfer(RECEIVER, amount);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error("USDT payment was not confirmed.");
    return receipt.hash;
  };

  const getPlanCode = el => {
    let n = el;
    for (let i = 0; n && i < 10; i++, n = n.parentElement) {
      const explicit = String(n.dataset?.payPlan || n.dataset?.plan || "").toLowerCase().trim();
      if (PLANS[explicit]) return explicit;
      const id = String(n.id || "").toLowerCase();
      const idMatch = Object.keys(PLANS).find(k => id === k || id.includes(`-${k}`) || id.includes(`${k}-`));
      if (idMatch) return idMatch;
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

  const open = code => {
    const plan = PLANS[code];
    if (!plan) return;
    css();
    document.getElementById("wj-canonical-sub")?.remove();
    verified = null;
    const m = document.createElement("div");
    m.id = "wj-canonical-sub";
    m.innerHTML = `<div class="box"><h2>${plan.name} — Monthly Subscription</h2><p>Wallet ownership verification and payment are separate steps.</p><div class="wjc-row"><span>Amount</span><strong class="wjc-green">${plan.price} USDT / month</strong></div><div class="wjc-row"><span>Network</span><strong>BNB Smart Chain (BSC)</strong></div><div class="wjc-row"><span>USDT Contract</span><span style="font-size:10px;word-break:break-all">${USDT}</span></div><div class="wjc-row"><span>Payment Wallet</span><span style="font-size:10px;word-break:break-all">${RECEIVER}</span></div><div class="wjc-row"><span>Duration</span><strong>${plan.duration} days</strong></div><div id="wjc-status" class="wjc-status">Step 1 — Verify wallet ownership. <b>FREE: 0 USDT / 0 Gas.</b></div><div id="wjc-error" class="wjc-error"></div><div class="wjc-actions"><button class="wjc-cancel" type="button">Cancel</button><button id="wjc-action" class="wjc-action" type="button">Verify Wallet & Continue</button></div></div>`;
    document.body.appendChild(m);
    const status = m.querySelector("#wjc-status"), error = m.querySelector("#wjc-error"), btn = m.querySelector("#wjc-action");
    m.querySelector(".wjc-cancel").onclick = () => m.remove();
    btn.onclick = async () => {
      btn.disabled = true;
      error.style.display = "none";
      try {
        if (!verified) {
          status.innerHTML = "Opening <b>Signature Request</b> — <b>0 USDT / 0 Gas</b>...";
          await signOnly();
          status.innerHTML = "Wallet verified ✓ — <b>0 USDT / 0 Gas</b>. No payment was made.";
          btn.disabled = false;
          btn.textContent = `Pay ${plan.price} USDT`;
        } else {
          status.textContent = `Opening separate ${plan.price} USDT payment transaction...`;
          const hash = await payOnly(code);
          status.textContent = `Payment confirmed ✓ ${hash}`;
          btn.textContent = "Done";
          btn.disabled = false;
          btn.onclick = () => m.remove();
        }
      } catch (e) {
        error.textContent = e?.code === 4001 ? "Wallet request was cancelled." : (e?.message || String(e));
        error.style.display = "block";
        btn.disabled = false;
        btn.textContent = verified ? `Pay ${plan.price} USDT` : "Verify Wallet & Continue";
      }
    };
  };

  const init = () => {
    document.querySelectorAll(".plan-button,[data-pay-plan],.plan-pay-button").forEach(b => {
      b.disabled = false;
      b.style.pointerEvents = "auto";
      b.style.cursor = "pointer";
    });
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

  window.Web3JobsCanonicalSubscription = { signOnly, payOnly, PLANS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
