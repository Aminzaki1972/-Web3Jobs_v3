/* =========================================================
   Web3Jobs
   File: js/company-dashboard.js
   Company Dashboard
   Supabase + BNB Smart Chain + Payments + Subscriptions
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPANY_DASHBOARD_CONFIG = {

    receiverWallet:
        "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

    chainId:
        "0x38",

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

    explorer:
        "https://bscscan.com",

    bnbPriceApi:
        "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT",

    plans: {
        starter: {
            code: "starter",
            name: "Starter",
            price: 19,
            durationDays: 30
        },

        professional: {
            code: "professional",
            name: "Professional",
            price: 49,
            durationDays: 30
        },

        business: {
            code: "business",
            name: "Business",
            price: 99,
            durationDays: 30
        }
    }
};


/* =========================================================
   STATE
   ========================================================= */

const CompanyDashboardState = {

    user: null,

    session: null,

    companyProfile: null,

    plans: [],

    selectedPlan: null,

    walletAddress: null,

    provider: null,

    signer: null,

    paymentPending: false,

    initialized: false,

    currentSubscription: null
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function $$(selector) {
    return Array.from(
        document.querySelectorAll(selector)
    );
}


function getElement(...selectors) {

    for (const selector of selectors) {

        const element =
            document.querySelector(selector);

        if (element) {
            return element;
        }
    }

    return null;
}


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabaseClient() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.from === "function"
    ) {
        return window.supabase;
    }

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {

        const url =
            window.SUPABASE_URL ||
            window.JOBS_SUPABASE_URL;

        const key =
            window.SUPABASE_ANON_KEY ||
            window.JOBS_SUPABASE_KEY ||
            window.SUPABASE_KEY;

        if (!url || !key) {
            return null;
        }

        try {

            window.supabaseClient =
                window.supabase.createClient(
                    url,
                    key
                );

            return window.supabaseClient;

        } catch (error) {

            console.error(
                "Supabase initialization error:",
                error
            );
        }
    }

    return null;
}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading() {

    const loading =
        $("#loading-spinner");

    const content =
        $("#dashboard-content");

    if (loading) {
        loading.style.display = "flex";
    }

    if (content) {
        content.style.display = "none";
    }
}


function hideLoading() {

    const loading =
        $("#loading-spinner");

    const content =
        $("#dashboard-content");

    if (loading) {
        loading.style.display = "none";
    }

    if (content) {
        content.style.display = "block";
    }
}


/* =========================================================
   MESSAGES
   ========================================================= */

function showMessage(
    message,
    type = "info"
) {

    let box =
        document.getElementById(
            "dashboard-message"
        );

    if (!box) {

        box =
            document.createElement("div");

        box.id =
            "dashboard-message";

        box.style.position = "fixed";
        box.style.left = "20px";
        box.style.right = "20px";
        box.style.bottom = "20px";
        box.style.zIndex = "999999";
        box.style.maxWidth = "620px";
        box.style.margin = "0 auto";
        box.style.padding = "15px 18px";
        box.style.borderRadius = "12px";
        box.style.fontSize = "14px";
        box.style.fontWeight = "700";
        box.style.lineHeight = "1.5";
        box.style.boxShadow =
            "0 15px 40px rgba(0,0,0,.35)";

        document.body.appendChild(box);
    }

    box.textContent =
        message;

    if (type === "success") {

        box.style.background =
            "#064e3b";

        box.style.border =
            "1px solid #10b981";

        box.style.color =
            "#d1fae5";

    } else if (type === "error") {

        box.style.background =
            "#450a0a";

        box.style.border =
            "1px solid #ef4444";

        box.style.color =
            "#fee2e2";

    } else {

        box.style.background =
            "#10233a";

        box.style.border =
            "1px solid #294563";

        box.style.color =
            "#f5f8ff";
    }

    clearTimeout(box._timer);

    box._timer =
        setTimeout(() => {

            if (box.parentNode) {
                box.remove();
            }

        }, 5000);
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function getCurrentSession() {

    const client =
        getSupabaseClient();

    if (!client) {

        throw new Error(
            "Supabase client is not available."
        );
    }

    const result =
        await client.auth.getSession();

    if (result.error) {
        throw result.error;
    }

    return result.data.session;
}


async function requireCompanySession() {

    const session =
        await getCurrentSession();

    if (
        !session ||
        !session.user
    ) {

        window.location.href =
            "login.html";

        return null;
    }

    CompanyDashboardState.session =
        session;

    CompanyDashboardState.user =
        session.user;

    return session;
}


/* =========================================================
   COMPANY PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    const client =
        getSupabaseClient();

    const user =
        CompanyDashboardState.user;

    if (!client || !user) {
        return null;
    }

    let profile = null;

    try {

        const result =
            await client
                .from("company_profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

        if (
            !result.error &&
            result.data
        ) {

            profile =
                result.data;
        }

    } catch (error) {

        console.warn(
            "Company profile lookup failed:",
            error
        );
    }

    if (!profile) {

        try {

            const result =
                await client
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

            if (
                !result.error &&
                result.data
            ) {

                profile =
                    result.data;
            }

        } catch (error) {

            console.warn(
                "Profile lookup failed:",
                error
            );
        }
    }

    CompanyDashboardState.companyProfile =
        profile || {};

    renderCompanyProfile();

    return profile;
}


/* =========================================================
   COMPANY NAME
   ========================================================= */

function getCompanyName() {

    const profile =
        CompanyDashboardState.companyProfile || {};

    const user =
        CompanyDashboardState.user || {};

    return (

        profile.company_name ||

        profile.name ||

        profile.company ||

        profile.business_name ||

        user.user_metadata?.company_name ||

        user.user_metadata?.company ||

        user.user_metadata?.name ||

        "Company"
    );
}


/* =========================================================
   COMPANY PROFILE UI
   ========================================================= */

function renderCompanyProfile() {

    const companyName =
        getCompanyName();

    const user =
        CompanyDashboardState.user || {};

    const profile =
        CompanyDashboardState.companyProfile || {};

    const email =
        profile.email ||
        user.email ||
        "";

    [
        "#company-name",
        "#company-title",
        "#brand-company-name",
        "#welcome-company-name",
        "[data-company-name]"
    ].forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                companyName;
        });
    });


    [
        "#company-email",
        "[data-company-email]"
    ].forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                email;
        });
    });
}


/* =========================================================
   JOB STATISTICS
   ========================================================= */

async function loadJobStatistics() {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    const companyName =
        getCompanyName();

    try {

        const result =
            await client
                .from("jobs")
                .select(
                    "id,title,company,created_at",
                    {
                        count: "exact"
                    }
                )
                .eq(
                    "company",
                    companyName
                );

        if (result.error) {

            console.warn(
                "Job statistics error:",
                result.error
            );

            return;
        }

        const jobs =
            result.data || [];

        const count =
            result.count !== null
                ? result.count
                : jobs.length;

        setStatistic(
            [
                "#published-jobs",
                "#publishedJobs",
                "[data-stat='published-jobs']"
            ],
            count
        );

        setStatistic(
            [
                "#active-jobs",
                "#activeJobs",
                "[data-stat='active-jobs']"
            ],
            count
        );

        await loadApplicationStatistics(
            jobs.map(job => job.id)
        );

    } catch (error) {

        console.warn(
            "Job statistics failed:",
            error
        );
    }
}


/* =========================================================
   STATISTICS HELPER
   ========================================================= */

function setStatistic(
    selectors,
    value
) {

    selectors.forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                String(value);
        });
    });
}


/* =========================================================
   APPLICATION STATISTICS
   ========================================================= */

async function loadApplicationStatistics(
    jobIds = []
) {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }

    if (!jobIds.length) {

        setStatistic(
            [
                "#total-applications",
                "#totalApplications",
                "[data-stat='applications']"
            ],
            0
        );

        return;
    }

    try {

        const result =
            await client
                .from("applications")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .in(
                    "job_id",
                    jobIds
                );

        if (result.error) {

            console.warn(
                "Application statistics error:",
                result.error
            );

            return;
        }

        setStatistic(
            [
                "#total-applications",
                "#totalApplications",
                "[data-stat='applications']"
            ],
            result.count || 0
        );

    } catch (error) {

        console.warn(
            "Application statistics failed:",
            error
        );
    }
}


/* =========================================================
   SUBSCRIPTION PLANS
   ========================================================= */

async function loadSubscriptionPlans() {

    const client =
        getSupabaseClient();

    if (!client) {

        renderDefaultPlans();

        return;
    }

    try {

        const result =
            await client
                .from("plans")
                .select(
                    "id,plan_code,plan_name,description,price,currency,duration_days,plan_type,is_active"
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "price",
                    {
                        ascending: true
                    }
                );

        if (
            result.error ||
            !result.data ||
            !result.data.length
        ) {

            console.warn(
                "Plans table unavailable. Using default plans.",
                result.error || ""
            );

            renderDefaultPlans();

            return;
        }

        CompanyDashboardState.plans =
            result.data;

        renderPlans(
            result.data
        );

    } catch (error) {

        console.warn(
            "Subscription plans failed:",
            error
        );

        renderDefaultPlans();
    }
}


/* =========================================================
   DEFAULT PLANS
   ========================================================= */

function renderDefaultPlans() {

    const plans = [

        {
            id: "starter",

            plan_code:
                "starter",

            plan_name:
                "Starter",

            description:
                "For small teams starting with Web3 hiring.",

            price:
                19,

            currency:
                "USD",

            duration_days:
                30,

            plan_type:
                "monthly",

            is_active:
                true
        },

        {
            id: "professional",

            plan_code:
                "professional",

            plan_name:
                "Professional",

            description:
                "For growing Web3 companies.",

            price:
                49,

            currency:
                "USD",

            duration_days:
                30,

            plan_type:
                "monthly",

            is_active:
                true
        },

        {
            id: "business",

            plan_code:
                "business",

            plan_name:
                "Business",

            description:
                "For companies with advanced hiring needs.",

            price:
                99,

            currency:
                "USD",

            duration_days:
                30,

            plan_type:
                "monthly",

            is_active:
                true
        }
    ];

    CompanyDashboardState.plans =
        plans;

    renderPlans(plans);
}


/* =========================================================
   PLANS CONTAINER
   ========================================================= */

function getPlansContainer() {

    return getElement(
        "#subscriptions",
        "#subscription-plans",
        "#plans-container",
        "#plans-list"
    );
}


/* =========================================================
   RENDER PLANS
   ========================================================= */

function renderPlans(plans) {

    const container =
        getPlansContainer();

    if (
        !container ||
        !Array.isArray(plans)
    ) {
        return;
    }

    container.innerHTML =
        plans
            .map(createPlanHtml)
            .join("");

    bindPlanButtons();

    if (
        CompanyDashboardState.selectedPlan
    ) {

        markSelectedPlan(
            CompanyDashboardState.selectedPlan
        );
    }
}


/* =========================================================
   PLAN HTML
   ========================================================= */

function createPlanHtml(plan) {

    const id =
        escapeHtml(
            plan.id ||
            plan.plan_code
        );

    const code =
        escapeHtml(
            plan.plan_code ||
            plan.id
        );

    const name =
        escapeHtml(
            plan.plan_name ||
            plan.name ||
            code
        );

    const description =
        escapeHtml(
            plan.description ||
            ""
        );

    const price =
        Number(plan.price || 0)
            .toFixed(2);

    const duration =
        Number(
            plan.duration_days || 30
        );

    return `
        <div
            class="subscription-plan-card"
            data-plan-card="${id}"
            data-plan-code="${code}"
        >

            <div class="plan-card-content">

                <h3>${name}</h3>

                <div class="plan-price">

                    <strong>
                        $${price}
                    </strong>

                    <span>
                        / ${duration} days
                    </span>

                </div>

                <p>
                    ${description}
                </p>

                <button
                    type="button"
                    class="plan-button"
                    data-plan="${id}"
                    data-plan-code="${code}"
                >
                    Choose ${name}
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   PLAN BUTTONS
   ========================================================= */

function bindPlanButtons() {

    $$(".plan-button, [data-plan-select]")
        .forEach(button => {

            if (
                button.dataset
                    .dashboardBound === "true"
            ) {
                return;
            }

            button.dataset
                .dashboardBound =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const planId =
                        button.dataset.plan ||
                        button.dataset.planId ||
                        button.dataset.id;

                    const planCode =
                        button.dataset.planCode ||
                        button.dataset.code;

                    const plan =
                        findPlan(
                            planId,
                            planCode
                        );

                    if (!plan) {

                        showMessage(
                            "Please select a valid subscription plan.",
                            "error"
                        );

                        return;
                    }

                    selectPlan(plan);
                }
            );
        });
}


/* =========================================================
   FIND PLAN
   ========================================================= */

function findPlan(
    planId,
    planCode
) {

    const plans =
        CompanyDashboardState.plans || [];

    let plan = null;

    if (planId !== undefined) {

        plan =
            plans.find(item =>
                String(item.id) ===
                String(planId)
            );
    }

    if (!plan && planCode) {

        plan =
            plans.find(item =>
                String(
                    item.plan_code || ""
                ).toLowerCase() ===
                String(planCode).toLowerCase()
            );
    }

    if (!plan && planId) {

        const fallbackPlans =
            Object.values(
                COMPANY_DASHBOARD_CONFIG.plans
            );

        plan =
            fallbackPlans.find(item =>
                item.code ===
                String(planId)
            );
    }

    return plan || null;
}


/* =========================================================
   SELECT PLAN
   ========================================================= */

function selectPlan(plan) {

    if (!plan) {

        showMessage(
            "Please select a valid subscription plan.",
            "error"
        );

        return;
    }

    CompanyDashboardState.selectedPlan =
        plan;

    markSelectedPlan(plan);

    updatePaymentPanel(plan);

    const panel =
        getElement(
            "#payment-panel",
            "#subscription-payment",
            "#payment-section"
        );

    if (panel) {

        panel.style.display =
            "block";

        panel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    const name =
        plan.plan_name ||
        plan.name ||
        plan.plan_code ||
        "Subscription";

    showMessage(
        `${name} selected successfully.`,
        "success"
    );

    updateSubscribeButton();
}


/* =========================================================
   MARK SELECTED PLAN
   ========================================================= */

function markSelectedPlan(plan) {

    $$(".subscription-plan-card")
        .forEach(card => {

            card.classList.remove(
                "selected",
                "active",
                "is-selected"
            );
        });

    $$(".plan-button")
        .forEach(button => {

            button.classList.remove(
                "selected",
                "active"
            );
        });

    $$(".subscription-plan-card")
        .forEach(card => {

            const cardCode =
                card.dataset.planCode;

            const cardId =
                card.dataset.planCard;

            if (

                String(cardId) ===
                    String(plan.id)

                ||

                String(cardCode).toLowerCase() ===
                    String(
                        plan.plan_code || ""
                    ).toLowerCase()

            ) {

                card.classList.add(
                    "selected",
                    "active",
                    "is-selected"
                );
            }
        });


    $$(".plan-button")
        .forEach(button => {

            const buttonCode =
                button.dataset.planCode;

            const buttonId =
                button.dataset.plan;

            if (

                String(buttonId) ===
                    String(plan.id)

                ||

                String(buttonCode).toLowerCase() ===
                    String(
                        plan.plan_code || ""
                    ).toLowerCase()

            ) {

                button.classList.add(
                    "selected",
                    "active"
                );
            }
        });
}


/* =========================================================
   PAYMENT PANEL
   ========================================================= */

function updatePaymentPanel(plan) {

    const name =
        plan.plan_name ||
        plan.name ||
        plan.plan_code ||
        "Subscription";

    const price =
        Number(plan.price || 0)
            .toFixed(2);

    [
        "#selected-plan-name",
        "#payment-plan-name",
        "[data-selected-plan]"
    ].forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                name;
        });
    });


    [
        "#selected-plan-price",
        "#payment-plan-price",
        "[data-selected-price]"
    ].forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                `$${price}`;
        });
    });

    updateWalletUI();

    updateSubscribeButton();
}


/* =========================================================
   PAYMENT BUTTON
   ========================================================= */

function updateSubscribeButton() {

    const buttons = [

        "#send-payment",

        "#subscribe-button",

        "#pay-button",

        "#confirm-subscription",

        "[data-subscribe]"
    ];

    buttons.forEach(selector => {

        $$(selector).forEach(button => {

            button.disabled =
                !CompanyDashboardState.selectedPlan ||
                CompanyDashboardState.paymentPending;

            if (
                !CompanyDashboardState.selectedPlan
            ) {

                button.title =
                    "Select a subscription plan first.";

            } else {

                button.title = "";
            }
        });
    });
}


/* =========================================================
   WALLET
   ========================================================= */

function walletAvailable() {

    return Boolean(
        window.ethereum
    );
}


/* =========================================================
   CONNECT WALLET
   ========================================================= */

async function connectWallet() {

    if (!walletAvailable()) {

        showMessage(
            "Please install MetaMask or another compatible Web3 wallet.",
            "error"
        );

        return null;
    }

    try {

        const accounts =
            await window.ethereum.request({
                method:
                    "eth_requestAccounts"
            });

        if (
            !accounts ||
            !accounts.length
        ) {

            throw new Error(
                "No wallet account was returned."
            );
        }

        await switchToBNBChain();

        CompanyDashboardState.walletAddress =
            accounts[0];

        await initializeEthers();

        updateWalletUI();

        updateSubscribeButton();

        showMessage(
            "Wallet connected successfully.",
            "success"
        );

        return accounts[0];

    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to connect wallet.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   ETHERS INITIALIZATION
   ========================================================= */

async function initializeEthers() {

    if (!window.ethers) {

        throw new Error(
            "Ethers library is not loaded."
        );
    }

    if (!window.ethereum) {

        throw new Error(
            "Web3 wallet is not available."
        );
    }

    CompanyDashboardState.provider =
        new window.ethers.BrowserProvider(
            window.ethereum
        );

    CompanyDashboardState.signer =
        await CompanyDashboardState
            .provider
            .getSigner();

    return {
        provider:
            CompanyDashboardState.provider,

        signer:
            CompanyDashboardState.signer
    };
}


/* =========================================================
   BNB CHAIN
   ========================================================= */

async function switchToBNBChain() {

    if (!window.ethereum) {

        throw new Error(
            "Web3 wallet is not available."
        );
    }

    try {

        await window.ethereum.request({

            method:
                "wallet_switchEthereumChain",

            params: [
                {
                    chainId:
                        COMPANY_DASHBOARD_CONFIG
                            .chainId
                }
            ]
        });

    } catch (error) {

        if (error.code !== 4902) {
            throw error;
        }

        await window.ethereum.request({

            method:
                "wallet_addEthereumChain",

            params: [
                {
                    chainId:
                        COMPANY_DASHBOARD_CONFIG
                            .chainId,

                    chainName:
                        COMPANY_DASHBOARD_CONFIG
                            .chainName,

                    nativeCurrency:
                        COMPANY_DASHBOARD_CONFIG
                            .nativeCurrency,

                    rpcUrls:
                        COMPANY_DASHBOARD_CONFIG
                            .rpcUrls,

                    blockExplorerUrls: [
                        COMPANY_DASHBOARD_CONFIG
                            .explorer
                    ]
                }
            ]
        });
    }
}


/* =========================================================
   WALLET UI
   ========================================================= */

function updateWalletUI() {

    const address =
        CompanyDashboardState.walletAddress;

    const shortAddress =
        address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect Wallet";


    $$("#wallet-address")
        .forEach(element => {

            element.textContent =
                shortAddress;
        });


    $$("#payment-wallet")
        .forEach(element => {

            element.textContent =
                shortAddress;
        });


    $$("#connect-wallet")
        .forEach(button => {

            button.textContent =
                address
                    ? shortAddress
                    : "Connect Wallet";
        });
}


/* =========================================================
   BNB PRICE
   ========================================================= */

async function getBnbPrice() {

    const response =
        await fetch(
            COMPANY_DASHBOARD_CONFIG
                .bnbPriceApi,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {

        throw new Error(
            "Unable to retrieve the current BNB price."
        );
    }

    const data =
        await response.json();

    const price =
        Number(data.price);

    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {

        throw new Error(
            "Invalid BNB price."
        );
    }

    return price;
}


/* =========================================================
   USD TO BNB
   ========================================================= */

async function usdToBnb(
    usdAmount
) {

    const price =
        await getBnbPrice();

    const amount =
        Number(usdAmount) /
        price;

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Invalid BNB amount."
        );
    }

    return amount;
}


/* =========================================================
   PAYMENT STATUS
   ========================================================= */

function showPaymentStatus(message) {

    const element =
        getElement(
            "#payment-status",
            "#subscription-status"
        );

    if (element) {

        element.textContent =
            message;
    }
}


/* =========================================================
   SEND SUBSCRIPTION PAYMENT
   ========================================================= */

async function sendSubscriptionPayment() {

    const plan =
        CompanyDashboardState.selectedPlan;

    if (!plan) {

        showMessage(
            "Please select a subscription plan first.",
            "error"
        );

        return;
    }

    if (
        CompanyDashboardState.paymentPending
    ) {
        return;
    }

    if (!walletAvailable()) {

        showMessage(
            "Please connect your Web3 wallet first.",
            "error"
        );

        return;
    }

    CompanyDashboardState.paymentPending =
        true;

    updateSubscribeButton();

    try {

        let address =
            CompanyDashboardState.walletAddress;

        if (!address) {

            address =
                await connectWallet();
        }

        if (!address) {

            throw new Error(
                "Wallet connection is required."
            );
        }

        await switchToBNBChain();

        await initializeEthers();

        const network =
            await CompanyDashboardState
                .provider
                .getNetwork();

        if (
            network.chainId !==
            56n
        ) {

            throw new Error(
                "Please switch your wallet to BNB Smart Chain."
            );
        }

        const usdAmount =
            Number(plan.price);

        if (
            !Number.isFinite(usdAmount) ||
            usdAmount <= 0
        ) {

            throw new Error(
                "Invalid subscription price."
            );
        }

        showPaymentStatus(
            "Getting the current BNB price..."
        );

        const bnbAmount =
            await usdToBnb(
                usdAmount
            );

        const roundedBnb =
            Number(
                bnbAmount.toFixed(8)
            );

        if (
            !Number.isFinite(roundedBnb) ||
            roundedBnb <= 0
        ) {

            throw new Error(
                "Invalid BNB payment amount."
            );
        }

        const value =
            window.ethers.parseEther(
                roundedBnb.toFixed(8)
            );

        showPaymentStatus(
            `Payment amount: ${roundedBnb.toFixed(8)} BNB`
        );


        /* =========================================
           CHECK BALANCE
           ========================================= */

        const balance =
            await CompanyDashboardState
                .provider
                .getBalance(address);

        if (balance < value) {

            throw new Error(
                "Insufficient BNB balance for this payment."
            );
        }


        /* =========================================
           SEND TRANSACTION
           ========================================= */

        const transaction =
            await CompanyDashboardState
                .signer
                .sendTransaction({

                    to:
                        COMPANY_DASHBOARD_CONFIG
                            .receiverWallet,

                    value:
                        value
                });


        showPaymentStatus(
            "Transaction submitted. Waiting for confirmation..."
        );


        /* =========================================
           WAIT CONFIRMATION
           ========================================= */

        const receipt =
            await transaction.wait();

        if (
            !receipt ||
            Number(receipt.status) !== 1
        ) {

            throw new Error(
                "The blockchain transaction failed."
            );
        }


        showPaymentStatus(
            "Transaction confirmed. Saving payment..."
        );


        /* =========================================
           SAVE PAYMENT
           ========================================= */

        const payment =
            await savePayment({

                transactionHash:
                    transaction.hash,

                bnbAmount:
                    roundedBnb,

                usdAmount:
                    usdAmount,

                plan:
                    plan,

                walletAddress:
                    address,

                blockNumber:
                    receipt.blockNumber
            });


        /* =========================================
           ACTIVATE SUBSCRIPTION
           ========================================= */

        showPaymentStatus(
            "Payment confirmed. Activating subscription..."
        );

        const subscription =
            await activateSubscription({

                paymentId:
                    payment?.id || null,

                transactionHash:
                    transaction.hash,

                plan:
                    plan,

                walletAddress:
                    address,

                usdAmount:
                    usdAmount,

                bnbAmount:
                    roundedBnb
            });


        if (subscription) {

            CompanyDashboardState
                .currentSubscription =
                subscription;

            showPaymentStatus(
                "Payment confirmed and subscription activated successfully."
            );

            showMessage(
                "Payment confirmed. Your subscription is now active.",
                "success"
            );

        } else {

            showPaymentStatus(
                "Payment confirmed. Subscription activation record could not be created automatically."
            );

            showMessage(
                "Payment confirmed successfully. The payment has been recorded.",
                "success"
            );
        }


    } catch (error) {

        console.error(
            "Subscription payment error:",
            error
        );

        showPaymentStatus(
            error.message ||
            "Payment failed."
        );

        showMessage(
            error.message ||
            "Payment failed.",
            "error"
        );

    } finally {

        CompanyDashboardState.paymentPending =
            false;

        updateSubscribeButton();
    }
}


/* =========================================================
   SAVE PAYMENT
   ========================================================= */

async function savePayment({

    transactionHash,

    bnbAmount,

    usdAmount,

    plan,

    walletAddress,

    blockNumber

}) {

    const client =
        getSupabaseClient();

    if (!client) {

        throw new Error(
            "Supabase client is not available."
        );
    }

    const userId =
        CompanyDashboardState.user?.id;

    if (!userId) {

        throw new Error(
            "Authenticated user was not found."
        );
    }

    const planCode =
        plan.plan_code ||
        plan.code ||
        plan.id ||
        null;


    /* =========================================
       PAYMENT DATA
       ========================================= */

    const paymentData = {

        user_id:
            userId,

        payment_provider:
            "BNB Smart Chain",

        payment_method:
            "BNB",

        payment_type:
            "subscription",

        amount:
            usdAmount,

        currency:
            "USD",

        status:
            "confirmed",

        provider_payment_id:
            transactionHash,

        transaction_hash:
            transactionHash,

        blockchain_network:
            "BNB Smart Chain"
    };


    /* =========================================
       INSERT PAYMENT
       ========================================= */

    const result =
        await client
            .from("payments")
            .insert(
                paymentData
            )
            .select()
            .maybeSingle();


    if (result.error) {

        /*
         * If the database rejects confirmed status,
         * retry as pending. This keeps the payment
         * record from being lost.
         */

        const fallbackData = {

            ...paymentData,

            status:
                "pending"
        };

        const fallback =
            await client
                .from("payments")
                .insert(
                    fallbackData
                )
                .select()
                .maybeSingle();

        if (fallback.error) {

            throw fallback.error;
        }

        console.warn(
            "Payment saved as pending:",
            fallback.data
        );

        return fallback.data;
    }


    console.log(
        "Payment saved:",
        {
            transactionHash,
            bnbAmount,
            usdAmount,
            planCode,
            walletAddress,
            blockNumber
        }
    );

    return result.data;
}


/* =========================================================
   SUBSCRIPTION TABLE DETECTION
   ========================================================= */

async function findSubscriptionTable() {

    const client =
        getSupabaseClient();

    if (!client) {
        return null;
    }

    const possibleTables = [

        "subscriptions",

        "company_subscriptions"
    ];

    for (
        const tableName of possibleTables
    ) {

        try {

            const result =
                await client
                    .from(tableName)
                    .select("*")
                    .limit(1);

            if (!result.error) {

                return tableName;
            }

        } catch (error) {

            console.warn(
                `Subscription table check failed for ${tableName}:`,
                error
            );
        }
    }

    return null;
}


/* =========================================================
   ACTIVATE SUBSCRIPTION
   ========================================================= */

async function activateSubscription({

    paymentId,

    transactionHash,

    plan,

    walletAddress,

    usdAmount,

    bnbAmount

}) {

    const client =
        getSupabaseClient();

    if (!client) {
        return null;
    }

    const userId =
        CompanyDashboardState.user?.id;

    if (!userId) {
        return null;
    }

    const tableName =
        await findSubscriptionTable();

    if (!tableName) {

        console.warn(
            "No subscription table was found."
        );

        return null;
    }


    const planCode =
        plan.plan_code ||
        plan.code ||
        plan.id ||
        null;

    const planName =
        plan.plan_name ||
        plan.name ||
        planCode ||
        "Subscription";

    const durationDays =
        Number(
            plan.duration_days ||
            plan.durationDays ||
            30
        );


    /* =========================================
       DATES
       ========================================= */

    const startedAt =
        new Date();

    const expiresAt =
        new Date(
            startedAt.getTime() +
            durationDays *
            24 *
            60 *
            60 *
            1000
        );


    /* =========================================
       BUILD DATA
       ========================================= */

    const data = {

        user_id:
            userId,

        plan_code:
            planCode,

        plan_name:
            planName,

        status:
            "active",

        start_date:
            startedAt.toISOString(),

        end_date:
            expiresAt.toISOString(),

        started_at:
            startedAt.toISOString(),

        expires_at:
            expiresAt.toISOString(),

        payment_id:
            paymentId,

        transaction_hash:
            transactionHash,

        wallet_address:
            walletAddress,

        amount:
            usdAmount,

        currency:
            "USD",

        bnb_amount:
            bnbAmount
    };


    /* =========================================
       REMOVE UNKNOWN COLUMNS
       ========================================= */

    const cleanedData =
        await cleanSubscriptionData(
            tableName,
            data
        );


    /* =========================================
       CHECK EXISTING ACTIVE SUBSCRIPTION
       ========================================= */

    let existing = null;

    try {

        const result =
            await client
                .from(tableName)
                .select("*")
                .eq(
                    "user_id",
                    userId
                )
                .eq(
                    "status",
                    "active"
                )
                .order(
                    "expires_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();

        if (!result.error) {

            existing =
                result.data;
        }

    } catch (error) {

        console.warn(
            "Existing subscription lookup failed:",
            error
        );
    }


    /* =========================================
       INSERT OR UPDATE
       ========================================= */

    if (existing) {

        const existingExpiry =
            new Date(
                existing.expires_at ||
                existing.end_date ||
                Date.now()
            );

        const now =
            new Date();

        const baseDate =
            existingExpiry > now
                ? existingExpiry
                : now;

        const newExpiry =
            new Date(
                baseDate.getTime() +
                durationDays *
                24 *
                60 *
                60 *
                1000
            );


        const updateData =
            await cleanSubscriptionData(
                tableName,
                {
                    ...cleanedData,

                    status:
                        "active",

                    expires_at:
                        newExpiry.toISOString(),

                    end_date:
                        newExpiry.toISOString(),

                    updated_at:
                        new Date().toISOString()
                }
            );


        try {

            const result =
                await client
                    .from(tableName)
                    .update(
                        updateData
                    )
                    .eq(
                        "id",
                        existing.id
                    )
                    .select()
                    .maybeSingle();

            if (
                !result.error
            ) {

                return result.data;
            }

            console.warn(
                "Subscription update failed:",
                result.error
            );

        } catch (error) {

            console.warn(
                "Subscription update exception:",
                error
            );
        }
    }


    /* =========================================
       CREATE NEW SUBSCRIPTION
       ========================================= */

    try {

        const result =
            await client
                .from(tableName)
                .insert(
                    cleanedData
                )
                .select()
                .maybeSingle();

        if (result.error) {

            console.warn(
                "Subscription activation failed:",
                result.error
            );

            return null;
        }

        return result.data;

    } catch (error) {

        console.warn(
            "Subscription activation exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   CLEAN SUBSCRIPTION DATA
   ========================================================= */

async function cleanSubscriptionData(
    tableName,
    data
) {

    const client =
        getSupabaseClient();

    if (!client) {
        return data;
    }

    try {

        const result =
            await client
                .from(tableName)
                .select("*")
                .limit(1);

        if (
            result.error
        ) {

            return data;
        }

        const columns =
            result.data &&
            result.data.length
                ? Object.keys(
                    result.data[0]
                )
                : null;

        /*
         * If the table is empty, Supabase does not
         * expose its columns through select().
         * Keep the standard payload.
         */

        if (!columns) {
            return data;
        }

        const cleaned = {};

        Object.keys(data)
            .forEach(key => {

                if (
                    columns.includes(key)
                ) {

                    cleaned[key] =
                        data[key];
                }
            });

        return cleaned;

    } catch (error) {

        console.warn(
            "Subscription data cleanup failed:",
            error
        );

        return data;
    }
}


/* =========================================================
   LOAD CURRENT SUBSCRIPTION
   ========================================================= */

async function loadCurrentSubscription() {

    const client =
        getSupabaseClient();

    const userId =
        CompanyDashboardState.user?.id;

    if (!client || !userId) {
        return null;
    }

    const tableName =
        await findSubscriptionTable();

    if (!tableName) {
        return null;
    }

    try {

        const result =
            await client
                .from(tableName)
                .select("*")
                .eq(
                    "user_id",
                    userId
                )
                .order(
                    "expires_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();

        if (result.error) {

            console.warn(
                "Current subscription lookup failed:",
                result.error
            );

            return null;
        }

        CompanyDashboardState
            .currentSubscription =
            result.data;

        renderCurrentSubscription(
            result.data
        );

        return result.data;

    } catch (error) {

        console.warn(
            "Current subscription loading failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   CURRENT SUBSCRIPTION UI
   ========================================================= */

function renderCurrentSubscription(
    subscription
) {

    if (!subscription) {
        return;
    }

    const status =
        subscription.status ||
        "";

    const planName =
        subscription.plan_name ||
        subscription.plan_code ||
        "";

    const expiresAt =
        subscription.expires_at ||
        subscription.end_date ||
        "";


    $$(
        "[data-subscription-status]"
    ).forEach(element => {

        element.textContent =
            status;
    });


    $$(
        "[data-subscription-plan]"
    ).forEach(element => {

        element.textContent =
            planName;
    });


    $$(
        "[data-subscription-expires]"
    ).forEach(element => {

        element.textContent =
            expiresAt
                ? formatDate(expiresAt)
                : "";
    });
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(value) {

    try {

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);
        }

        return date.toLocaleDateString(
            "en-US",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    } catch (error) {

        return String(value);
    }
}


/* =========================================================
   EVENTS
   ========================================================= */

function bindDashboardEvents() {


    /* =========================================
       CONNECT WALLET
       ========================================= */

    $$("#connect-wallet")
        .forEach(button => {

            if (
                button.dataset
                    .dashboardBound === "true"
            ) {
                return;
            }

            button.dataset
                .dashboardBound =
                "true";

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    await connectWallet();
                }
            );
        });


    /* =========================================
       PAYMENT
       ========================================= */

    [

        "#send-payment",

        "#subscribe-button",

        "#pay-button",

        "#confirm-subscription",

        "[data-subscribe]"

    ].forEach(selector => {

        $$(selector)
            .forEach(button => {

                if (
                    button.dataset
                        .dashboardBound === "true"
                ) {
                    return;
                }

                button.dataset
                    .dashboardBound =
                    "true";

                button.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();

                        await sendSubscriptionPayment();
                    }
                );
            });
    });


    /* =========================================
       LOGOUT
       ========================================= */

    $$("#logout-button")
        .forEach(button => {

            if (
                button.dataset
                    .dashboardBound === "true"
            ) {
                return;
            }

            button.dataset
                .dashboardBound =
                "true";

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    await logoutCompany();
                }
            );
        });


    bindPlanButtons();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutCompany() {

    try {

        const client =
            getSupabaseClient();

        if (client) {

            await client.auth.signOut();
        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        window.location.href =
            "login.html";
    }
}


/* =========================================================
   WALLET EVENTS
   ========================================================= */

function bindWalletEvents() {

    if (!window.ethereum) {
        return;
    }

    if (
        window.__web3JobsWalletEventsBound
    ) {
        return;
    }

    window.__web3JobsWalletEventsBound =
        true;


    /* =========================================
       ACCOUNT CHANGED
       ========================================= */

    window.ethereum.on(
        "accountsChanged",
        accounts => {

            if (
                !accounts ||
                !accounts.length
            ) {

                CompanyDashboardState
                    .walletAddress =
                    null;

                CompanyDashboardState
                    .provider =
                    null;

                CompanyDashboardState
                    .signer =
                    null;

            } else {

                CompanyDashboardState
                    .walletAddress =
                    accounts[0];

                CompanyDashboardState
                    .provider =
                    null;

                CompanyDashboardState
                    .signer =
                    null;
            }

            updateWalletUI();

            updateSubscribeButton();
        }
    );


    /* =========================================
       CHAIN CHANGED
       ========================================= */

    window.ethereum.on(
        "chainChanged",
        () => {

            CompanyDashboardState
                .provider =
                null;

            CompanyDashboardState
                .signer =
                null;

            updateSubscribeButton();
        }
    );
}


/* =========================================================
   EXISTING WALLET
   ========================================================= */

async function detectExistingWallet() {

    if (!window.ethereum) {
        return;
    }

    try {

        const accounts =
            await window.ethereum.request({

                method:
                    "eth_accounts"
            });

        if (
            accounts &&
            accounts.length
        ) {

            CompanyDashboardState
                .walletAddress =
                accounts[0];

            updateWalletUI();
        }

    } catch (error) {

        console.warn(
            "Wallet detection failed:",
            error
        );
    }
}


/* =========================================================
   LOADING ERROR
   ========================================================= */

function showLoadingError(message) {

    const loading =
        $("#loading-spinner");

    if (!loading) {

        hideLoading();

        showMessage(
            message,
            "error"
        );

        return;
    }

    loading.innerHTML = `

        <div class="loading-card">

            <div class="loading-logo">
                !
            </div>

            <h2>
                Dashboard Error
            </h2>

            <p>
                ${escapeHtml(message)}
            </p>

            <button
                type="button"
                class="header-button"
                id="dashboard-retry"
                style="margin-top:20px;"
            >
                Retry
            </button>

        </div>
    `;


    const retry =
        $("#dashboard-retry");

    if (retry) {

        retry.addEventListener(
            "click",
            () => {

                window.location.reload();
            }
        );
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeCompanyDashboard() {

    if (
        CompanyDashboardState.initialized
    ) {
        return;
    }

    CompanyDashboardState.initialized =
        true;

    showLoading();

    try {

        const session =
            await requireCompanySession();

        if (!session) {
            return;
        }


        /* =========================================
           COMPANY PROFILE
           ========================================= */

        try {

            await loadCompanyProfile();

        } catch (error) {

            console.warn(
                "Company profile loading failed:",
                error
            );
        }


        /* =========================================
           SHOW DASHBOARD
           ========================================= */

        hideLoading();


        /* =========================================
           EVENTS
           ========================================= */

        bindDashboardEvents();

        bindWalletEvents();


        /* =========================================
           WALLET
           ========================================= */

        await detectExistingWallet();


        updateWalletUI();

        updateSubscribeButton();


        /* =========================================
           JOB STATISTICS
           ========================================= */

        loadJobStatistics()
            .catch(error =>
                console.warn(
                    "Job statistics failed:",
                    error
                )
            );


        /* =========================================
           PLANS
           ========================================= */

        loadSubscriptionPlans()
            .catch(error =>
                console.warn(
                    "Subscription plans failed:",
                    error
                )
            );


        /* =========================================
           CURRENT SUBSCRIPTION
           ========================================= */

        loadCurrentSubscription()
            .catch(error =>
                console.warn(
                    "Current subscription loading failed:",
                    error
                )
            );


    } catch (error) {

        console.error(
            "Company dashboard initialization error:",
            error
        );

        showLoadingError(
            error.message ||
            "Unable to load the company dashboard."
        );
    }
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3JobsCompanyDashboard = {

    state:
        CompanyDashboardState,

    selectPlan:
        selectPlan,

    connectWallet:
        connectWallet,

    subscribe:
        sendSubscriptionPayment,

    reloadPlans:
        loadSubscriptionPlans,

    reloadStatistics:
        loadJobStatistics,

    reloadSubscription:
        loadCurrentSubscription
};


/* =========================================================
   BACKWARD COMPATIBILITY
   ========================================================= */

window.selectPlan =
    function(planId) {

        const plan =
            findPlan(
                planId,
                planId
            );

        if (!plan) {

            showMessage(
                "Please select a valid subscription plan.",
                "error"
            );

            return;
        }

        selectPlan(plan);
    };


window.connectCompanyWallet =
    connectWallet;


window.subscribeToPlan =
    sendSubscriptionPayment;


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCompanyDashboard
    );

} else {

    initializeCompanyDashboard();
}


/* =========================================================
   END
   ========================================================= */
