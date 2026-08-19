/* Web3Jobs v3 - company subscription payment module */
"use strict";
(() => {
  const CONFIG = {
    bscChainId: "0x38",
    bscChainName: "BNB Smart Chain",
    usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
    paymentWallet: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",
    supabaseUrl: "https://jqhemwskrnlycximjpag.supabase.co",
    publishableKey: "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp"
  };
  const state = { user: null, plans: [] };
  const sb = () => window.supabaseClient || window.Web3JobsSupabase?.getClient?.() || null;

  async function getUser() {
    const client = sb();
    if (!client) throw new Error("Supabase client is not available. Please refresh the page.");
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error("Please sign in before subscribing.");
    state.user = data.user;
    return state.user;
  }

  async function loadPlans() {
    const client = sb();
    if (!client) throw new Error("Supabase client is not available. Please refresh the page.");
    const { data, error } = await client.from("payment_plans")
      .select("id,plan_code,plan_name,description,price,currency,duration_days,plan_type,is_active")
      .eq("plan_type", "company_subscription")
      .eq("is_active", true)
      .order("price", { ascending: true });
    if (error) throw error;
    state.plans = data || [];
    window.dispatchEvent(new CustomEvent("web3jobs:company-plans-loaded", { detail: state.plans }));
    return state.plans;
  }

  async function switchToBSC() {
    if (!window.ethereum) throw new Error("Web3 wallet not found. Open this page in MetaMask or another compatible wallet.");
    const current = await window.ethereum.request({ method: "eth_chainId" });
    if (String(current).toLowerCase() === CONFIG.bscChainId) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.bscChainId }] });
    } catch (e) {
      if (e?.code !== 4902) throw e;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFIG.bscChainId,
          chainName: CONFIG.bscChainName,
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com/"]
        }]
      });
    }
  }

  async function connectWallet() {
    if (!window.ethereum) throw new Error("Web3 wallet not found. Open this page in MetaMask or another compatible wallet.");
    await switchToBSC();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) throw new Error("No wallet account selected.");
    return ethers.getAddress(accounts[0]);
  }

  async function pay(planCode) {
    if (!CONFIG.paymentWallet || !ethers.isAddress(CONFIG.paymentWallet)) {
      throw new Error("The platform payment wallet is not configured correctly; payment was blocked for safety.");
    }
    if (!window.ethers) throw new Error("Ethers library is not loaded. Please refresh the page.");
    const user = state.user || await getUser();
    const plan = state.plans.find(p => p.plan_code === planCode) || (await loadPlans()).find(p => p.plan_code === planCode);
    if (!plan) throw new Error("Selected company plan was not found.");
    if (!plan.is_active) throw new Error("This company plan is not active.");
    const currency = String(plan.currency || "USDT").toUpperCase();
    if (currency !== "USD" && currency !== "USDT") throw new Error(`Unsupported subscription currency: ${currency}`);

    const walletAddress = await connectWallet();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(CONFIG.usdtAddress, [
      "function decimals() view returns (uint8)",
      "function transfer(address,uint256) returns (bool)"
    ], signer);
    const decimals = await token.decimals();
    const amount = ethers.parseUnits(String(plan.price), decimals);
    const tx = await token.transfer(CONFIG.paymentWallet, amount);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error("Transaction confirmation failed.");

    const session = await clientSession();
    const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.publishableKey,
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ planCode: plan.plan_code, txHash: receipt.hash, wallet: walletAddress })
    });
    const result = await response.json().catch(() => ({ success: false, error: "Invalid verifier response." }));
    if (!response.ok || !result.success) throw new Error(result.error || "Payment verification failed. The subscription was not activated.");

    return {
      userId: user.id,
      planId: plan.id,
      planCode: plan.plan_code,
      planName: plan.plan_name,
      amount: Number(plan.price),
      currency,
      walletAddress,
      transactionHash: receipt.hash,
      blockchainNetwork: "BSC",
      durationDays: plan.duration_days,
      verification: result
    };
  }

  async function clientSession() {
    const client = sb();
    if (!client) throw new Error("Supabase client is not available.");
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token) throw new Error("Your login session is unavailable. Please sign in again.");
    return data.session;
  }

  window.Web3JobsCompanySubscription = {
    CONFIG,
    getUser,
    loadPlans,
    connectWallet,
    pay,
    get plans() { return state.plans; }
  };

  // Also initialize when this file is loaded directly, including dynamic loads
  // that happen after DOMContentLoaded.
  (async function bootstrapDirect() {
    try {
      await getUser();
      if (!state.plans.length) await loadPlans();
    } catch (e) {
      console.error("Company subscription initialization failed:", e);
    }
  })();
})();
