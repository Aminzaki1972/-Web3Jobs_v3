/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   Company Dashboard
   Supabase + Jobs + Applications
   USDT BEP-20 / BNB Smart Chain

   Plans:
   Free         = 2 jobs / month
   Starter      = $19 USDT / month = 5 jobs
   Professional = $49 USDT / month = 20 jobs
   Enterprise   = $99 USDT / month = Unlimited
   ========================================================= */

"use strict";

(() => {

    /* =====================================================
       CONFIG
       ===================================================== */

    const CONFIG = {

        bscChainId: "0x38",

        bscChainName: "BNB Smart Chain",

        paymentWallet:
            "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

        usdtContract:
            "0x55d398326f99059fF775485246999027B3197955",

        usdtDecimals: 18,

        plans: {

            free: {
                code: "free",
                name: "Free",
                price: 0,
                limit: 2,
                days: 30
            },

            starter: {
                code: "starter",
                name: "Starter",
                price: 19,
                limit: 5,
                days: 30
            },

            professional: {
                code: "professional",
                name: "Professional",
                price: 49,
                limit: 20,
                days: 30
            },

            enterprise: {
                code: "enterprise",
                name: "Enterprise",
                price: 99,
                limit: null,
                days: 30
            }

        }

    };


    /* =====================================================
       STATE
       ===================================================== */

    let sb = null;

    let user = null;

    let profile = null;

    let jobs = [];

    let applications = [];

    let currentPlan =
        CONFIG.plans.free;

    let selectedPlan = null;

    let wallet = null;

    let paymentBusy = false;


    /* =====================================================
       BASIC HELPERS
       ===================================================== */

    const $ = id =>
        document.getElementById(id);


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function setText(id, value) {

        const element = $(id);

        if (element) {
            element.textContent =
                value ?? "";
        }

    }


    function showLoading() {

        const loading =
            $("loading-spinner");

        const dashboard =
            $("dashboard-content");


        if (loading) {
            loading.style.display =
                "flex";
        }


        if (dashboard) {
            dashboard.style.display =
                "none";
        }

    }


    function showDashboard() {

        const loading =
            $("loading-spinner");

        const dashboard =
            $("dashboard-content");


        if (loading) {
            loading.style.display =
                "none";
        }


        if (dashboard) {
            dashboard.style.display =
                "block";
        }

    }


    function notify(
        message,
        type = "success"
    ) {

        if (
            typeof window.showDashboardAlert ===
            "function"
        ) {

            window.showDashboardAlert(
                message,
                type
            );

            return;
        }


        if (
            typeof window.showAlert ===
            "function"
        ) {

            window.showAlert(
                message,
                type
            );

            return;
        }


        const alertBox =
            $("dashboard-alert");


        if (alertBox) {

            alertBox.textContent =
                message;

            alertBox.className =
                type || "success";

            alertBox.style.display =
                "block";


            window.clearTimeout(
                alertBox._timer
            );


            alertBox._timer =
                window.setTimeout(
                    () => {

                        alertBox.style.display =
                            "none";

                    },
                    4500
                );


            return;
        }


        window.alert(message);

    }


    window.showDashboardAlert =
        notify;


    function shortAddress(address) {

        if (!address) {
            return "Not connected";
        }


        return (
            address.slice(0, 6) +
            "..." +
            address.slice(-4)
        );

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    }


    function getPlan(code) {

        const key =
            String(
                code || "free"
            ).toLowerCase();


        return (
            CONFIG.plans[key] ||
            CONFIG.plans.free
        );

    }


    function companyName() {

        return (
            profile?.company_name ||
            user?.user_metadata?.company_name ||
            user?.user_metadata?.name ||
            "Company"
        );

    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabase() {

        if (sb) {
            return sb;
        }


        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase
                .getClient ===
                "function"
        ) {

            sb =
                window.Web3JobsSupabase
                    .getClient();

            return sb;
        }


        if (
            window.supabaseClient &&
            typeof window.supabaseClient
                .from ===
                "function"
        ) {

            sb =
                window.supabaseClient;

            return sb;
        }


        if (
            window.supabase &&
            typeof window.supabase
                .createClient ===
                "function" &&
            window.SUPABASE_URL &&
            window.SUPABASE_ANON_KEY
        ) {

            sb =
                window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );

            return sb;
        }


        throw new Error(
            "Supabase client is not initialized."
        );

    }


    /* =====================================================
       AUTH
       ===================================================== */

    async function verifyCompanyAccess() {

        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client.auth.getUser();


        if (error) {
            throw error;
        }


        user =
            data?.user || null;


        if (!user) {

            window.location.replace(
                "login.html"
            );

            return false;
        }


        /*
         * Use the existing authentication helper
         * when available.
         */

        if (
            window.Web3JobsAuth &&
            typeof window.Web3JobsAuth
                .getAccountRole ===
                "function"
        ) {

            try {

                const role =
                    await window.Web3JobsAuth
                        .getAccountRole();


                if (
                    role &&
                    String(role)
                        .toLowerCase() !==
                        "company"
                ) {

                    window.location.replace(
                        "dashboard.html"
                    );

                    return false;
                }

            } catch (error) {

                console.warn(
                    "Role check skipped:",
                    error.message
                );

            }

        }


        return true;

    }


    /* =====================================================
       COMPANY PROFILE
       ===================================================== */

    async function loadCompanyProfile() {

        const client =
            getSupabase();


        const {
            data,
            error
        } =
            await client
                .from("company_profiles")
                .select("*")
                .eq(
                    "user_id",
                    user.id
                )
                .maybeSingle();


        if (error) {

            console.warn(
                "Company profile:",
                error.message
            );


            profile = null;

            renderCompanyProfile();

            loadStoredPlan();

            return;
        }


        profile =
            data || null;


        renderCompanyProfile();

        loadStoredPlan();

    }


    function renderCompanyProfile() {

        const name =
            companyName();


        setText(
            "company-name",
            name
        );


        setText(
            "sidebar-company-name",
            name
        );


        const fields = {

            "company-name-input":
                profile?.company_name || "",

            "company-website":
                profile?.website || "",

            "company-location":
                profile?.location || "",

            "company-linkedin":
                profile?.linkedin || "",

            "company-description":
                profile?.description || ""

        };


        Object.keys(fields)
            .forEach(id => {

                const element =
                    $(id);


                if (
                    element &&
                    "value" in element
                ) {

                    element.value =
                        fields[id];

                }

            });


        const companyInput =
            $("job-company");


        if (companyInput) {

            companyInput.value =
                name;

        }

    }


    async function saveCompanyProfile(event) {

        event.preventDefault();


        const form =
            event.currentTarget;


        const button =
            form.querySelector(
                "button[type='submit']"
            );


        const get = selector =>
            String(
                form.querySelector(
                    selector
                )?.value || ""
            ).trim();


        const record = {

            user_id:
                user.id,

            company_name:
                get(
                    "[name='company_name'],#company-name-input"
                ),

            website:
                get(
                    "[name='website'],#company-website"
                ),

            location:
                get(
                    "[name='location'],#company-location"
                ),

            linkedin:
                get(
                    "[name='linkedin'],#company-linkedin"
                ),

            description:
                get(
                    "[name='description'],#company-description"
                )

        };


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Saving...";

            }


            const {
                data,
                error
            } =
                await getSupabase()
                    .from("company_profiles")
                    .upsert(
                        record,
                        {
                            onConflict:
                                "user_id"
                        }
                    )
                    .select()
                    .maybeSingle();


            if (error) {
                throw error;
            }


            profile =
                data || record;


            renderCompanyProfile();


            notify(
                "Company profile saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Save company profile:",
                error
            );


            notify(
                error.message ||
                "Unable to save company profile.",
                "error"
            );


        } finally {

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "Save Profile";

            }

        }

    }


    /* =====================================================
       PLAN / SUBSCRIPTION
       ===================================================== */

    function getStoredPlanCode() {

        const values = [

            profile?.subscription_plan,

            profile?.plan,

            profile?.subscription,

            user?.user_metadata
                ?.subscription_plan,

            user?.user_metadata?.plan

        ];


        for (const value of values) {

            if (!value) {
                continue;
            }


            const code =
                String(value)
                    .toLowerCase()
                    .trim();


            if (CONFIG.plans[code]) {

                return code;

            }

        }


        try {

            const stored =
                localStorage.getItem(
                    `web3jobs_plan_${user.id}`
                );


            if (
                stored &&
                CONFIG.plans[stored]
            ) {

                return stored;

            }

        } catch (error) {

            console.warn(
                "Local plan read:",
                error
            );

        }


        return "free";

    }


    function loadStoredPlan() {

        currentPlan =
            getPlan(
                getStoredPlanCode()
            );


        renderSubscription();

    }


    function renderSubscription() {

        const plan =
            currentPlan ||
            CONFIG.plans.free;


        document
            .querySelectorAll(
                ".plan-button"
            )
            .forEach(button => {

                const code =
                    String(
                        button.dataset.plan ||
                        ""
                    ).toLowerCase();


                button.classList.toggle(
                    "active",
                    code === plan.code
                );

            });


        const publishNote =
            $("publish-note");


        if (publishNote) {

            const limitText =
                plan.limit === null
                    ? "Unlimited jobs"
                    : `${plan.limit} jobs / month`;


            publishNote.textContent =
                `Current plan: ${plan.name} — ${limitText}.`;

        }

    }


    function openPlans() {

        const section =
            $("subscription-section");


        if (!section) {
            return;
        }


        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    function monthlyJobs() {

        const now =
            new Date();


        return jobs.filter(job => {

            if (!job.created_at) {
                return false;
            }


            const date =
                new Date(
                    job.created_at
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return false;

            }


            return (
                date.getUTCFullYear() ===
                    now.getUTCFullYear() &&
                date.getUTCMonth() ===
                    now.getUTCMonth()
            );

        }).length;

    }


    /* =====================================================
       SAVE SUBSCRIPTION
       ===================================================== */

    async function saveSubscription(
        plan,
        transactionHash = ""
    ) {

        const expires =
            new Date();


        expires.setDate(
            expires.getDate() +
            plan.days
        );


        /*
         * Always save a local copy.
         * This prevents the UI from immediately
         * falling back to Free if the optional
         * database subscription columns do not exist.
         */

        try {

            localStorage.setItem(
                `web3jobs_plan_${user.id}`,
                plan.code
            );

            localStorage.setItem(
                `web3jobs_plan_expiry_${user.id}`,
                expires.toISOString()
            );

            if (transactionHash) {

                localStorage.setItem(
                    `web3jobs_payment_${user.id}`,
                    transactionHash
                );

            }

        } catch (error) {

            console.warn(
                "Local subscription save:",
                error
            );

        }


        /*
         * Try to save subscription information
         * to company_profiles.
         *
         * If these columns do not exist in the
         * current database, the payment is NOT
         * considered failed.
         */

        try {

            const updates = {

                subscription_plan:
                    plan.code,

                subscription_expires_at:
                    expires.toISOString()

            };


            const {
                error
            } =
                await getSupabase()
                    .from("company_profiles")
                    .update(updates)
                    .eq(
                        "user_id",
                        user.id
                    );


            if (error) {

                console.warn(
                    "Optional subscription columns unavailable:",
                    error.message
                );

            } else if (profile) {

                profile.subscription_plan =
                    plan.code;

                profile.subscription_expires_at =
                    expires.toISOString();

            }

        } catch (error) {

            console.warn(
                "Subscription database save skipped:",
                error.message
            );

        }


        currentPlan =
            plan;


        renderSubscription();

    }


    /* =====================================================
       WALLET
       ===================================================== */

    function getEthereum() {

        if (
            typeof window.ethereum ===
            "undefined"
        ) {

            return null;

        }


        return window.ethereum;

    }


    async function getWalletAccounts() {

        const ethereum =
            getEthereum();


        if (!ethereum) {
            return [];
        }


        return await ethereum.request({
            method: "eth_accounts"
        });

    }


    async function connectWallet() {

        const ethereum =
            getEthereum();


        if (!ethereum) {

            notify(
                "Please install MetaMask or another Web3 wallet first.",
                "error"
            );

            return null;

        }


        try {

            const accounts =
                await ethereum.request({
                    method:
                        "eth_requestAccounts"
                });


            const address =
                accounts?.[0];


            if (!address) {

                notify(
                    "No wallet account was selected.",
                    "error"
                );

                return null;

            }


            wallet =
                address;


            return address;

        } catch (error) {

            console.error(
                "Wallet connection:",
                error
            );


            if (
                error?.code === 4001
            ) {

                notify(
                    "Wallet connection was cancelled.",
                    "error"
                );

            } else {

                notify(
                    error?.message ||
                    "Unable to connect wallet.",
                    "error"
                );

            }


            return null;

        }

    }


    async function ensureBscNetwork() {

        const ethereum =
            getEthereum();


        if (!ethereum) {

            throw new Error(
                "Web3 wallet is not available."
            );

        }


        const chainId =
            await ethereum.request({
                method: "eth_chainId"
            });


        if (
            String(chainId).toLowerCase() ===
            CONFIG.bscChainId
        ) {

            return true;

        }


        try {

            await ethereum.request({

                method:
                    "wallet_switchEthereumChain",

                params: [
                    {
                        chainId:
                            CONFIG.bscChainId
                    }
                ]

            });

        } catch (error) {

            /*
             * BNB Smart Chain normally already exists
             * in MetaMask. If it does not, request adding it.
             */

            if (
                error?.code === 4902
            ) {

                await ethereum.request({

                    method:
                        "wallet_addEthereumChain",

                    params: [

                        {

                            chainId:
                                CONFIG.bscChainId,

                            chainName:
                                "BNB Smart Chain",

                            nativeCurrency: {

                                name: "BNB",

                                symbol: "BNB",

                                decimals: 18

                            },

                            rpcUrls: [
                                "https://bsc-dataseed.binance.org/"
                            ],

                            blockExplorerUrls: [
                                "https://bscscan.com/"
                            ]

                        }

                    ]

                });

            } else {

                throw error;

            }

        }


        const newChainId =
            await ethereum.request({
                method: "eth_chainId"
            });


        if (
            String(newChainId).toLowerCase() !==
            CONFIG.bscChainId
        ) {

            throw new Error(
                "Please switch your wallet to BNB Smart Chain."
            );

        }


        return true;

    }


    function isValidAddress(address) {

        return /^0x[a-fA-F0-9]{40}$/
            .test(
                String(address || "")
            );

    }


    function decimalToHexAmount(
        amount,
        decimals
    ) {

        /*
         * Convert the plan price into the smallest
         * USDT unit without using BigInt on decimals.
         */

        const value =
            String(amount);


        const parts =
            value.split(".");


        const whole =
            parts[0] || "0";


        const fraction =
            (parts[1] || "")
                .padEnd(
                    decimals,
                    "0"
                )
                .slice(
                    0,
                    decimals
                );


        const combined =
            whole + fraction;


        const normalized =
            combined.replace(
                /^0+(?=\d)/,
                ""
            ) || "0";


        return BigInt(
            normalized
        );

    }


    function encodeTransfer(
        recipient,
        amount
    ) {

        /*
         * ERC-20 transfer(address,uint256)
         *
         * Function selector:
         * a9059cbb
         */

        const cleanAddress =
            recipient
                .replace(
                    /^0x/,
                    ""
                )
                .toLowerCase();


        const addressWord =
            cleanAddress.padStart(
                64,
                "0"
            );


        const amountWord =
            amount
                .toString(16)
                .padStart(
                    64,
                    "0"
                );


        return (
            "0xa9059cbb" +
            addressWord +
            amountWord
        );

    }


    async function waitForTransaction(
        txHash,
        timeoutMs = 180000
    ) {

        const ethereum =
            getEthereum();


        const started =
            Date.now();


        while (
            Date.now() -
            started <
            timeoutMs
        ) {

            const receipt =
                await ethereum.request({

                    method:
                        "eth_getTransactionReceipt",

                    params: [
                        txHash
                    ]

                });


            if (receipt) {

                return receipt;

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        2500
                    )
            );

        }


        throw new Error(
            "Payment transaction confirmation timed out. Please check the transaction on BscScan."
        );

    }


    /* =====================================================
       PAYMENT
       ===================================================== */

    async function handlePlanSelection(
        planCode
    ) {

        if (paymentBusy) {

            notify(
                "A payment is already being processed.",
                "error"
            );

            return;

        }


        const plan =
            getPlan(planCode);


        if (
            plan.code === "free"
        ) {

            currentPlan =
                plan;

            renderSubscription();

            notify(
                "Free plan selected.",
                "success"
            );

            return;

        }


        if (
            !isValidAddress(
                CONFIG.paymentWallet
            )
        ) {

            notify(
                "The payment wallet address is invalid.",
                "error"
            );

            return;

        }


        if (
            !isValidAddress(
                CONFIG.usdtContract
            )
        ) {

            notify(
                "The USDT contract address is invalid.",
                "error"
            );

            return;

        }


        const ethereum =
            getEthereum();


        if (!ethereum) {

            notify(
                "Please install MetaMask or another BNB Smart Chain wallet to continue.",
                "error"
            );

            return;

        }


        paymentBusy =
            true;


        selectedPlan =
            plan;


        let button = null;

        document
            .querySelectorAll(
                `[data-pay-plan="${plan.code}"]`
            )
            .forEach(
                element => {
                    button = element;
                }
            );


        const originalText =
            button
                ? button.textContent
                : "";


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Connecting Wallet...";

            }


            const address =
                await connectWallet();


            if (!address) {
                return;
            }


            await ensureBscNetwork();


            if (button) {
                button.textContent =
                    "Confirm Payment...";
            }


            const amount =
                decimalToHexAmount(
                    plan.price,
                    CONFIG.usdtDecimals
                );


            const data =
                encodeTransfer(
                    CONFIG.paymentWallet,
                    amount
                );


            /*
             * The transaction is sent to the USDT
             * contract. The contract executes transfer()
             * to the Web3Jobs payment wallet.
             */

            const txHash =
                await ethereum.request({

                    method:
                        "eth_sendTransaction",

                    params: [

                        {

                            from:
                                address,

                            to:
                                CONFIG.usdtContract,

                            data

                        }

                    ]

                });


            if (!txHash) {

                throw new Error(
                    "The wallet did not return a transaction hash."
                );

            }


            if (button) {
                button.textContent =
                    "Confirming...";
            }


            notify(
                "Payment sent. Waiting for blockchain confirmation...",
                "success"
            );


            const receipt =
                await waitForTransaction(
                    txHash
                );


            /*
             * Status 0x1 = successful EVM transaction.
             */

            if (
                receipt.status &&
                String(
                    receipt.status
                ).toLowerCase() ===
                    "0x0"
            ) {

                throw new Error(
                    "The blockchain transaction failed."
                );

            }


            await saveSubscription(
                plan,
                txHash
            );


            notify(
                `${plan.name} plan activated successfully. Transaction: ${shortAddress(txHash)}`,
                "success"
            );


            /*
             * Refresh the current jobs/limit display.
             */

            renderSubscription();


        } catch (error) {

            console.error(
                "Subscription payment error:",
                error
            );


            let message =
                "Unable to complete the payment.";


            if (
                error?.code === 4001
            ) {

                message =
                    "Payment was cancelled in your wallet.";

            } else if (
                error?.message
            ) {

                message =
                    error.message;

            }


            notify(
                message,
                "error"
            );


        } finally {

            paymentBusy =
                false;


            selectedPlan =
                null;


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    originalText ||
                    "Choose Plan & Pay";

            }

        }

    }


    window.handlePlanSelection =
        handlePlanSelection;


    window.selectPlan =
        handlePlanSelection;


    /* =====================================================
       JOBS
       ===================================================== */

    async function loadJobs() {

        const container =
            $("company-jobs-list");


        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    Loading your jobs...
                </div>
            `;

        }


        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .select("*")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (error) {
                throw error;
            }


            jobs =
                data || [];


            renderJobs();

            renderSubscription();


            await loadApplications();


        } catch (error) {

            console.error(
                "Jobs loading:",
                error
            );


            jobs = [];


            if (container) {

                container.innerHTML = `
                    <div class="empty-state">
                        Unable to load your jobs.
                    </div>
                `;

            }


            renderSubscription();

        }

    }


    function renderJobs() {

        const container =
            $("company-jobs-list");


        if (!container) {
            return;
        }


        if (!jobs.length) {

            container.innerHTML = `
                <div class="empty-state">
                    You have not published any jobs yet.
                </div>
            `;

            return;

        }


        container.innerHTML =
            jobs.map(job => {

                return `

                    <div class="job-card">

                        <div class="job-card-header">

                            <div>

                                <div class="job-title">
                                    ${escapeHtml(
                                        job.title ||
                                        "Untitled Job"
                                    )}
                                </div>

                                <div class="job-meta">

                                    <span>
                                        ${escapeHtml(
                                            job.company ||
                                            companyName()
                                        )}
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            job.location ||
                                            "Remote"
                                        )}
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            job.type ||
                                            "Full-time"
                                        )}
                                    </span>

                                    <span>
                                        ${formatDate(
                                            job.created_at
                                        )}
                                    </span>

                                </div>

                            </div>


                            <div class="job-actions">

                                <button
                                    type="button"
                                    class="small-button delete"
                                    data-delete-job="${escapeHtml(
                                        job.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>


                        <div class="job-description">
                            ${escapeHtml(
                                job.description ||
                                ""
                            )}
                        </div>

                    </div>

                `;

            }).join("");


        container
            .querySelectorAll(
                "[data-delete-job]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteJob(
                            button.dataset.deleteJob
                        );

                    }
                );

            });

    }


    async function deleteJob(id) {

        if (
            !id ||
            !user?.id
        ) {

            return;

        }


        if (
            !window.confirm(
                "Are you sure you want to delete this job?"
            )
        ) {

            return;

        }


        try {

            const {
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .delete()
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "user_id",
                        user.id
                    );


            if (error) {
                throw error;
            }


            notify(
                "Job deleted successfully.",
                "success"
            );


            await loadJobs();


        } catch (error) {

            console.error(
                "Delete job:",
                error
            );


            notify(
                error.message ||
                "Unable to delete job.",
                "error"
            );

        }

    }


    async function publishJob(event) {

        event.preventDefault();


        const form =
            event.currentTarget;


        const get = name =>
            String(
                form.querySelector(
                    `[name="${name}"]`
                )?.value || ""
            ).trim();


        const title =
            get("title");


        const company =
            get("company") ||
            companyName();


        const location =
            get("location");


        const type =
            get("type") ||
            "Full-time";


        const description =
            get("description");


        const applyLink =
            get("apply_link");


        if (
            !title ||
            !description ||
            !applyLink
        ) {

            notify(
                "Please complete all required job fields.",
                "error"
            );

            return;

        }


        /*
         * Check the current monthly limit
         * before inserting the job.
         */

        if (
            currentPlan.limit !== null &&
            monthlyJobs() >=
                currentPlan.limit
        ) {

            notify(
                `You reached the ${currentPlan.name} plan limit of ${currentPlan.limit} jobs this month.`,
                "error"
            );


            openPlans();

            return;

        }


        const button =
            form.querySelector(
                "button[type='submit']"
            );


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Publishing...";

            }


            const {
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .insert({

                        user_id:
                            user.id,

                        title,

                        company,

                        location,

                        type,

                        description,

                        apply_link:
                            applyLink

                    });


            if (error) {
                throw error;
            }


            form.reset();


            const companyInput =
                $("job-company");


            if (companyInput) {

                companyInput.value =
                    companyName();

            }


            notify(
                "Job published successfully.",
                "success"
            );


            await loadJobs();


            const jobsSection =
                $("my-jobs");


            if (jobsSection) {

                jobsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }


        } catch (error) {

            console.error(
                "Publish job:",
                error
            );


            notify(
                error.message ||
                "Unable to publish job.",
                "error"
            );


        } finally {

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "Publish Job";

            }

        }

    }


    /* =====================================================
       APPLICATIONS
       ===================================================== */

    async function loadApplications() {

        const body =
            $("applications-table-body");


        if (!body) {
            return;
        }


        body.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="empty-state"
                >
                    Loading applications...
                </td>
            </tr>
        `;


        if (!jobs.length) {

            applications = [];


            body.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
                        No applications yet.
                    </td>
                </tr>
            `;


            return;

        }


        const jobIds =
            jobs
                .map(job => job.id)
                .filter(Boolean);


        if (!jobIds.length) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
                        No applications yet.
                    </td>
                </tr>
            `;

            return;

        }


        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("applications")
                    .select("*")
                    .in(
                        "job_id",
                        jobIds
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (error) {
                throw error;
            }


            applications =
                data || [];


            renderApplications();


        } catch (error) {

            console.error(
                "Applications loading:",
                error
            );


            body.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
                        Unable to load applications.
                    </td>
                </tr>
            `;

        }

    }


    function getJobById(id) {

        return jobs.find(
            job =>
                String(job.id) ===
                String(id)
        );

    }


    function statusClass(status) {

        const value =
            String(
                status || "pending"
            ).toLowerCase();


        if (
            value === "approved" ||
            value === "accepted" ||
            value === "hired"
        ) {

            return "approved";

        }


        if (
            value === "rejected" ||
            value === "declined"
        ) {

            return "rejected";

        }


        return "pending";

    }


    function renderApplications() {

        const body =
            $("applications-table-body");


        if (!body) {
            return;
        }


        if (!applications.length) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
                        No applications yet.
                    </td>
                </tr>
            `;

            return;

        }


        body.innerHTML =
            applications.map(application => {

                const job =
                    getJobById(
                        application.job_id
                    );


                const status =
                    String(
                        application.status ||
                        "pending"
                    );


                const candidate =
                    application.email ||
                    application.candidate_email ||
                    application.user_email ||
                    application.user_id ||
                    "Candidate";


                return `

                    <tr>

                        <td>
                            ${escapeHtml(
                                candidate
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                job?.title ||
                                "Job"
                            )}
                        </td>

                        <td>

                            <span
                                class="status ${statusClass(status)}"
                            >
                                ${escapeHtml(
                                    status
                                )}
                            </span>

                        </td>

                        <td>
                            ${formatDate(
                                application.created_at
                            )}
                        </td>

                    </tr>

                `;

            }).join("");

    }


    /* =====================================================
       UI EVENTS
       ===================================================== */

    function setupPlanButtons() {

        const buttons =
            document.querySelectorAll(
                ".plan-button"
            );


        const details =
            document.querySelectorAll(
                ".plan-details"
            );


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const plan =
                        button.dataset.plan;


                    const detail =
                        document.querySelector(
                            `[data-plan-details="${plan}"]`
                        );


                    if (!detail) {
                        return;
                    }


                    const isOpen =
                        detail.classList.contains(
                            "active"
                        );


                    buttons.forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                    details.forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                    if (!isOpen) {

                        button.classList.add(
                            "active"
                        );


                        detail.classList.add(
                            "active"
                        );


                        window.setTimeout(
                            () => {

                                detail.scrollIntoView({
                                    behavior:
                                        "smooth",
                                    block:
                                        "nearest"
                                });

                            },
                            50
                        );

                    }

                }
            );

        });

    }


    function setupPaymentButtons() {

        document
            .querySelectorAll(
                "[data-pay-plan]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        handlePlanSelection(
                            button.dataset.payPlan
                        );

                    }
                );

            });

    }


    function setupPublishForm() {

        const form =
            $("post-job-form");


        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            publishJob
        );

    }


    function setupProfileForm() {

        const form =
            document.querySelector(
                "#company-profile-form"
            );


        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            saveCompanyProfile
        );

    }


    function setupLogout() {

        const button =
            $("sidebar-logout-button");


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async () => {

                try {

                    const client =
                        getSupabase();


                    await client.auth.signOut();


                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                }


                try {

                    if (
                        typeof window.logout ===
                        "function"
                    ) {

                        await window.logout();

                    }

                } catch (error) {

                    console.warn(
                        "Secondary logout:",
                        error
                    );

                }


                window.location.replace(
                    "login.html"
                );

            }
        );

    }


    function setupMobileSidebar() {

        const sidebar =
            $("dashboard-sidebar");


        const menuButton =
            $("mobile-menu-button");


        const overlay =
            $("sidebar-overlay");


        if (!sidebar) {
            return;
        }


        function openSidebar() {

            sidebar.classList.add(
                "open"
            );


            if (overlay) {

                overlay.classList.add(
                    "active"
                );

            }

        }


        function closeSidebar() {

            sidebar.classList.remove(
                "open"
            );


            if (overlay) {

                overlay.classList.remove(
                    "active"
                );

            }

        }


        if (menuButton) {

            menuButton.addEventListener(
                "click",
                openSidebar
            );

        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        document
            .querySelectorAll(
                ".sidebar-link"
            )
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );

            });

    }


    function setupWalletListeners() {

        const ethereum =
            getEthereum();


        if (!ethereum) {
            return;
        }


        if (
            typeof ethereum.on ===
            "function"
        ) {

            ethereum.on(
                "accountsChanged",
                accounts => {

                    wallet =
                        accounts?.[0] ||
                        null;


                    if (wallet) {

                        console.log(
                            "Wallet connected:",
                            shortAddress(wallet)
                        );

                    }

                }
            );


            ethereum.on(
                "chainChanged",
                chainId => {

                    console.log(
                        "Wallet network changed:",
                        chainId
                    );

                }
            );

        }

    }


    /* =====================================================
       INITIAL COMPANY NAME
       ===================================================== */

    function setupCompanyNameObserver() {

        const nameElement =
            $("company-name");


        const sidebarName =
            $("sidebar-company-name");


        if (
            !nameElement ||
            !sidebarName
        ) {

            return;

        }


        function update() {

            const value =
                nameElement.textContent
                    .trim();


            sidebarName.textContent =
                value ||
                "Company";

        }


        update();


        if (
            typeof MutationObserver !==
            "undefined"
        ) {

            const observer =
                new MutationObserver(
                    update
                );


            observer.observe(
                nameElement,
                {
                    childList: true,
                    characterData: true,
                    subtree: true
                }
            );

        }

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        showLoading();


        try {

            const access =
                await verifyCompanyAccess();


            if (!access) {
                return;
            }


            await loadCompanyProfile();


            setupCompanyNameObserver();

            setupPlanButtons();

            setupPaymentButtons();

            setupPublishForm();

            setupProfileForm();

            setupLogout();

            setupMobileSidebar();

            setupWalletListeners();


            const companyInput =
                $("job-company");


            if (companyInput) {

                companyInput.value =
                    companyName();

            }


            await loadJobs();


            showDashboard();


        } catch (error) {

            console.error(
                "Company dashboard initialization error:",
                error
            );


            const message =
                error?.message ||
                "Unable to load the company dashboard.";


            notify(
                message,
                "error"
            );


            /*
             * Do not leave the user permanently
             * behind the loading screen.
             */

            showDashboard();

        }

    }


    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.Web3JobsCompanyDashboard = {

        init,

        loadJobs,

        loadCompanyProfile,

        publishJob,

        deleteJob,

        loadApplications,

        saveCompanyProfile,

        connectWallet,

        handlePlanSelection,

        selectPlan:
            handlePlanSelection,

        getCurrentPlan:
            () => currentPlan,

        getCurrentWallet:
            () => wallet

    };


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
