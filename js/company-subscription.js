/* =========================================================
   Web3Jobs Company Subscription
   ---------------------------------------------------------
   Purpose:
   - Load company subscription plans from payment_plans
   - Connect an EVM wallet on BNB Smart Chain
   - Pay USDT to the configured receiving wallet
   - Return the transaction hash for server-side verification

   IMPORTANT:
   This file intentionally does NOT activate a subscription in the
   browser. The transaction must be verified server-side before
   subscriptions.status is changed to active.
   ========================================================= */

"use strict";

(() => {
    const CONFIG = {
        chainId: "0x38",
        chainName: "BNB Smart Chain",
        nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18
        },
        // Binance-Peg USDT on BNB Smart Chain.
        usdtAddress: "0x55d398326f99059ff775485246999027b3197955",
        // TODO: replace with the platform's verified receiving wallet
        // before enabling production payments.
        receivingWallet: "0x17dDE403631e0fbe7cf8B2B6F7f8A5c3B4d5E6F7",
        usdtDecimals: 18
    };

    const ERC20_ABI = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address owner) view returns (uint256)"
    ];

    let plans = [];

    function getSupabase() {
        if (window.Web3JobsSupabase?.getClient) {
            return window.Web3JobsSupabase.getClient();
        }
        return window.supabaseClient || null;
    }

    async function loadPlans() {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase client is not available.");

        const { data, error } = await sb
            .from("payment_plans")
            .select("id, plan_code, plan_name, description, price, currency, duration_days, plan_type, is_active")
            .eq("is_active", true)
            .eq("plan_type", "company_subscription")
            .order("price", { ascending: true });

        if (error) throw error;
        plans = data || [];
        return plans;
    }

    async function ensureBSC(provider) {
        const current = await provider.request({ method: "eth_chainId" });
        if (current === CONFIG.chainId) return;

        try {
            await provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: CONFIG.chainId }]
            });
        } catch (error) {
            if (error?.code !== 4902) throw error;

            await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: CONFIG.chainId,
                    chainName: CONFIG.chainName,
                    nativeCurrency: CONFIG.nativeCurrency,
                    rpcUrls: ["https://bsc-dataseed.binance.org/"],
                    blockExplorerUrls: ["https://bscscan.com/"]
                }]
            });
        }
    }

    async function connectWallet() {
        if (!window.ethereum) {
            throw new Error("Please install or open MetaMask or another compatible Web3 wallet.");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        await ensureBSC(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (!accounts?.length) throw new Error("No wallet account was selected.");

        return {
            provider,
            address: ethers.getAddress(accounts[0])
        };
    }

    function findPlan(planCode) {
        return plans.find((p) => p.plan_code === planCode) || null;
    }

    async function payPlan(planCode) {
        const plan = findPlan(planCode) || (await loadPlans()).find((p) => p.plan_code === planCode);
        if (!plan) throw new Error(`Company plan not found: ${planCode}`);
        if (!plan.is_active) throw new Error("This plan is not active.");
        if (String(plan.currency).toUpperCase() !== "USD") {
            throw new Error("The configured company plan currency is not USD.");
        }
        if (!CONFIG.receivingWallet || !ethers.isAddress(CONFIG.receivingWallet)) {
            throw new Error("The platform receiving wallet is not configured correctly.");
        }

        const { provider, address } = await connectWallet();
        const signer = await provider.getSigner();
        const token = new ethers.Contract(CONFIG.usdtAddress, ERC20_ABI, signer);
        const decimals = await token.decimals();
        const amount = ethers.parseUnits(String(plan.price), decimals);

        const tx = await token.transfer(CONFIG.receivingWallet, amount);
        const receipt = await tx.wait();

        return {
            plan,
            walletAddress: address,
            transactionHash: receipt.hash,
            blockchainNetwork: "BNB Smart Chain",
            paymentMethod: "USDT",
            status: "pending_verification"
        };
    }

    window.Web3JobsCompanySubscription = {
        CONFIG,
        loadPlans,
        connectWallet,
        findPlan,
        payPlan
    };
})();
