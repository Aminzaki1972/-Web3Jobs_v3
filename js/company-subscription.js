/* Web3Jobs Company Subscription — SEPARATED WALLET SIGNING / PAYMENT */
"use strict";
(() => {
  const CONFIG = {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    usdtAddress: "0x55d398326f99059ff775485246999027b3197955",
    receivingWallet: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",
    usdtDecimals: 18
  };
  const ERC20_ABI = ["function transfer(address to,uint256 amount) returns (bool)","function decimals() view returns (uint8)"];
  let plans = [];

  function getSupabase() { return window.Web3JobsSupabase?.getClient?.() || window.supabaseClient || null; }
  async function loadPlans() {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase client is not available.");
    const { data, error } = await sb.from("payment_plans").select("id,plan_code,plan_name,description,price,currency,duration_days,plan_type,is_active").eq("is_active",true).eq("plan_type","company_subscription").order("price",{ascending:true});
    if (error) throw error;
    plans = data || [];
    window.dispatchEvent(new CustomEvent("web3jobs:company-plans-loaded"));
    return plans;
  }
  async function ensureBSC(provider) {
    const current = await provider.request({method:"eth_chainId"});
    if (current === CONFIG.chainId) return;
    await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:CONFIG.chainId}]});
  }
  async function connectWallet() {
    if (!window.ethereum) throw new Error("Please install or open a compatible Web3 wallet.");
    await ensureBSC(window.ethereum);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts",[]);
    if (!accounts?.length) throw new Error("No wallet account was selected.");
    return { provider, address: ethers.getAddress(accounts[0]) };
  }
  function findPlan(planCode) { return plans.find(p => p.plan_code === planCode) || null; }

  /* GASLESS AUTH ONLY. This function can NEVER send a blockchain transaction. */
  async function verifySelectedWallet() {
    const { provider, address } = await connectWallet();
    const signer = await provider.getSigner();
    const message = `Web3Jobs Wallet Verification\n\nWallet: ${address}\nPurpose: Verify wallet ownership only.\nNo payment is authorized by this signature.`;
    const signature = await signer.signMessage(message);
    return { walletAddress: address, message, signature, gasless: true };
  }

  /* PAYMENT ONLY. This function is intentionally separate from verifySelectedWallet. */
  async function payAfterVerification(planCode, progress) {
    const plan = findPlan(planCode) || (await loadPlans()).find(p => p.plan_code === planCode);
    if (!plan) throw new Error(`Company plan not found: ${planCode}`);
    if (!plan.is_active) throw new Error("This plan is not active.");
    if (String(plan.currency).toUpperCase() !== "USDT" && String(plan.currency).toUpperCase() !== "USD") throw new Error("The configured company plan currency is invalid.");
    if (!ethers.isAddress(CONFIG.receivingWallet)) throw new Error("The platform receiving wallet is not configured correctly.");
    const { provider, address } = await connectWallet();
    const signer = await provider.getSigner();
    const token = new ethers.Contract(CONFIG.usdtAddress, ERC20_ABI, signer);
    progress?.("token", "Preparing USDT payment");
    const decimals = await token.decimals();
    const amount = ethers.parseUnits(String(plan.price), decimals);
    progress?.("payment", `Paying ${plan.price} USDT`);
    const tx = await token.transfer(CONFIG.receivingWallet, amount);
    const receipt = await tx.wait();
    return { plan, walletAddress: address, transactionHash: receipt.hash, blockchainNetwork: "BNB Smart Chain", paymentMethod: "USDT", status: "pending_verification" };
  }

  window.Web3JobsCompanySubscription = { CONFIG, loadPlans, connectWallet, findPlan, verifySelectedWallet, payAfterVerification, plans };
  loadPlans().catch(e => console.error("Company subscription plans load failed:",e));
})();
