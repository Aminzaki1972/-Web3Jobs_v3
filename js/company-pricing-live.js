"use strict";

(() => {
  const PLANS = {
    free: { price: 0, limit: 1 },
    starter: { price: 19, limit: 1 },
    professional: { price: 49, limit: 5 },
    enterprise: { price: 99, limit: 20 }
  };

  const USDT = "0x55d398326f99059fF775485246999027B3197955";
  const TREASURY = "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36";
  const BSC = "0x38";

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
        el.textContent = code === "enterprise" ? "20 jobs / month" : `${plan.limit} job${plan.limit === 1 ? "" : "s"} / month`;
      });
      document.querySelectorAll(`[data-plan-details="${code}"] .plan-details-price`).forEach(el => {
        el.textContent = `$${plan.price} USDT / month`;
      });
      document.querySelectorAll(`[data-plan-details="${code}"] .plan-feature`).forEach(el => {
        if (/job postings/i.test(el.textContent)) {
          el.querySelector("span:last-child").textContent = `${plan.limit} job${plan.limit === 1 ? "" : "s"} / month`;
        }
      });
      document.querySelectorAll(`[data-pay-plan="${code}"]`).forEach(btn => {
        if (code === "free") btn.textContent = "Use Free Plan";
        else btn.textContent = "Connect Wallet & Pay";
      });
    }
  }

  async function pay(planCode, button) {
    const plan = PLANS[planCode];
    if (!plan || plan.price <= 0) {
      alert("The Free plan is available by default. No payment is required.");
      return;
    }
    if (!window.ethereum || !window.ethers) throw new Error("A compatible Web3 wallet is required.");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) throw new Error("No wallet account selected.");
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC }] });
    } catch (e) {
      if (e.code !== 4902) throw e;
      throw new Error("Please add BNB Smart Chain to your wallet and try again.");
    }
    const wallet = accounts[0];
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(USDT,["function decimals() view returns (uint8)","function balanceOf(address) view returns (uint256)","function transfer(address,uint256) returns (bool)"],signer);
    const decimals = await token.decimals();
    const amount = ethers.parseUnits(String(plan.price), decimals);
    const balance = await token.balanceOf(wallet);
    if (balance < amount) throw new Error(`Insufficient USDT balance. You need ${plan.price} USDT.`);
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Confirm in wallet...";
    try {
      const tx = await token.transfer(TREASURY, amount);
      button.textContent = "Confirming...";
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Transaction confirmation failed.");
      const client = window.Web3JobsSupabase?.getClient?.() || window.supabaseClient;
      if (!client?.functions) throw new Error("Supabase client is unavailable.");
      const { data, error } = await client.functions.invoke("verify-payment", {
        body: { planCode, txHash: receipt.hash, wallet }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Payment verification failed.");
      alert(`${planCode} subscription activated successfully for 30 days.`);
      window.location.reload();
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function install() {
    updateDashboardPlanObject();
    updateVisiblePrices();
    document.addEventListener("click", async event => {
      const button = event.target.closest?.("[data-pay-plan]");
      if (!button) return;
      const code = button.dataset.payPlan;
      if (!PLANS[code]) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try { await pay(code, button); }
      catch (e) { console.error("Subscription payment:", e); alert(e?.message || String(e)); }
    }, true);
  }

  let tries = 0;
  const timer = setInterval(() => {
    updateDashboardPlanObject();
    updateVisiblePrices();
    if (++tries > 80) clearInterval(timer);
  }, 250);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
