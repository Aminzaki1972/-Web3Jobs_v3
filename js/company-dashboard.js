/* =========================================================
   Web3Jobs
   File: js/company-dashboard.js
   Company Dashboard
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

    nativeCurrency:
        "BNB",

    rpcUrls: [
        "https://bsc-dataseed.binance.org/"
    ],

    explorer:
        "https://bscscan.com",

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

    selectedPlan: null,

    plans: [],

    walletAddress: null,

    provider: null,

    signer: null,

    paymentPending: false,

    initialized: false

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
   SUPABASE CLIENT
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

        if (url && key) {

            window.supabaseClient =
                window.supabase.createClient(
                    url,
                    key
                );

            return window.supabaseClient;

        }

    }

    return null;

}


/* =========================================================
   SAFE TEXT
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {

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
   NOTIFICATIONS
   ========================================================= */

function showMessage(message, type = "info") {

    let box =
        document.getElementById(
            "dashboard-message"
        );

    if (!box) {

        box =
            document.createElement("div");

        box.id =
            "dashboard-message";

        box.style.position =
            "fixed";

        box.style.left =
            "20px";

        box.style.right =
            "20px";

        box.style.bottom =
            "20px";

        box.style.zIndex =
            "999999";

        box.style.maxWidth =
            "600px";

        box.style.margin =
            "0 auto";

        box.style.padding =
            "14px 18px";

        box.style.borderRadius =
            "12px";

        box.style.fontSize =
            "13px";

        box.style.fontWeight =
            "700";

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

    clearTimeout(
        box._timer
    );

    box._timer =
        setTimeout(() => {

            box.remove();

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

    if (!session || !session.user) {

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

    if (!client ||
        !CompanyDashboardState.user) {

        return null;

    }

    const userId =
        CompanyDashboardState.user.id;

    let profile =
        null;

    const companyResult =
        await client
            .from("company_profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

    if (
        !companyResult.error &&
        companyResult.data
    ) {

        profile =
            companyResult.data;

    }

    if (!profile) {

        const profileResult =
            await client
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

        if (
            !profileResult.error &&
            profileResult.data
        ) {

            profile =
                profileResult.data;

        }

    }

    CompanyDashboardState.companyProfile =
        profile || {};

    renderCompanyProfile();

    return profile;

}


/* =========================================================
   COMPANY PROFILE UI
   ========================================================= */

function renderCompanyProfile() {

    const profile =
        CompanyDashboardState.companyProfile ||
        {};

    const user =
        CompanyDashboardState.user ||
        {};

    const companyName =
        profile.company_name ||
        profile.name ||
        profile.company ||
        user.user_metadata?.company_name ||
        user.user_metadata?.name ||
        "Company";

    const email =
        profile.email ||
        user.email ||
        "";

    const companyNameElements = [
        "#company-name",
        "#company-title",
        "[data-company-name]"
    ];

    companyNameElements.forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                companyName;

        });

    });

    const emailElement =
        getElement(
            "#company-email",
            "[data-company-email]"
        );

    if (emailElement) {

        emailElement.textContent =
            email;

    }

    const brandElement =
        getElement(
            "#brand-company-name",
            ".brand-title"
        );

    if (brandElement) {

        brandElement.textContent =
            companyName;

    }

    const welcomeElement =
        getElement(
            "#welcome-company-name"
        );

    if (welcomeElement) {

        welcomeElement.textContent =
            companyName;

    }

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

    const profile =
        CompanyDashboardState.companyProfile ||
        {};

    const companyName =
        profile.company_name ||
        profile.name ||
        profile.company ||
        CompanyDashboardState.user
            ?.user_metadata
            ?.company_name ||
        null;

    let query =
        client
            .from("jobs")
            .select(
                "id,title,company,created_at",
                {
                    count: "exact"
                }
            );

    if (companyName) {

        query =
            query.eq(
                "company",
                companyName
            );

    }

    const result =
        await query;

    if (result.error) {

        return;

    }

    const jobs =
        result.data || [];

    const totalJobs =
        result.count !== null
            ? result.count
            : jobs.length;

    const published =
        getElement(
            "#published-jobs",
            "#publishedJobs",
            "[data-stat='published-jobs']"
        );

    if (published) {

        published.textContent =
            String(totalJobs);

    }

    const active =
        getElement(
            "#active-jobs",
            "#activeJobs",
            "[data-stat='active-jobs']"
        );

    if (active) {

        active.textContent =
            String(totalJobs);

    }

    await loadApplicationStatistics(
        jobs.map(job => job.id)
    );

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

        updateApplicationCount(0);

        return;

    }

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

        updateApplicationCount(0);

        return;

    }

    updateApplicationCount(
        result.count || 0
    );

}


function updateApplicationCount(count) {

    const elements = [
        "#total-applications",
        "#totalApplications",
        "[data-stat='applications']"
    ];

    elements.forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                String(count);

        });

    });

}


/* =========================================================
   LOAD PLANS
   ========================================================= */

async function loadSubscriptionPlans() {

    const client =
        getSupabaseClient();

    if (!client) {

        renderDefaultPlans();

        return;

    }

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

        renderDefaultPlans();

        return;

    }

    CompanyDashboardState.plans =
        result.data;

    renderPlans(
        result.data
    );

}


/* =========================================================
   DEFAULT PLANS
   ========================================================= */

function renderDefaultPlans() {

    CompanyDashboardState.plans = [

        {
            id: "starter",
            plan_code: "starter",
            plan_name: "Starter",
            description:
                "For small teams starting with Web3 hiring.",
            price: 19,
            currency: "USD",
            duration_days: 30,
            plan_type: "monthly",
            is_active: true
        },

        {
            id: "professional",
            plan_code: "professional",
            plan_name: "Professional",
            description:
                "For growing Web3 companies.",
            price: 49,
            currency: "USD",
            duration_days: 30,
            plan_type: "monthly",
            is_active: true
        },

        {
            id: "business",
            plan_code: "business",
            plan_name: "Business",
            description:
                "For companies with advanced hiring needs.",
            price: 99,
            currency: "USD",
            duration_days: 30,
            plan_type: "monthly",
            is_active: true
        }

    ];

    renderPlans(
        CompanyDashboardState.plans
    );

}


/* =========================================================
   RENDER PLANS
   ========================================================= */

function renderPlans(plans) {

    const containers = [
        "#subscriptions",
        "#subscription-plans",
        "#plans-container",
        "#plans-list"
    ];

    let container =
        null;

    for (const selector of containers) {

        container =
            document.querySelector(selector);

        if (container) {

            break;

        }

    }

    if (!container) {

        return;

    }

    container.innerHTML =
        plans.map(
            plan => createPlanHtml(plan)
        ).join("");

    bindPlanButtons();

}


/* =========================================================
   PLAN HTML
   ========================================================= */

function createPlanHtml(plan) {

    const id =
        escapeHtml(
            plan.id
        );

    const code =
        escapeHtml(
            plan.plan_code || plan.id
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
        Number(
            plan.price || 0
        ).toFixed(2);

    const currency =
        escapeHtml(
            plan.currency ||
            "USD"
        );

    const duration =
        Number(
            plan.duration_days ||
            30
        );

    return `
        <div
            class="subscription-plan-card"
            data-plan-card="${id}"
            data-plan-code="${code}"
        >

            <div class="plan-card-content">

                <h3>
                    ${name}
                </h3>

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
                    data-price="${price}"
                    data-plan-name="${name}"
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

    const buttons =
        $$(
            ".plan-button, " +
            ".subscription-plan-card button, " +
            "[data-pay-bnb]"
        );

    buttons.forEach(button => {

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
            function(event) {

                event.preventDefault();

                const planId =
                    this.dataset.plan ||
                    this.dataset.planId ||
                    this.dataset.id;

                const planCode =
                    this.dataset.planCode ||
                    this.dataset.code;

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

                selectPlan(
                    plan
                );

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
        CompanyDashboardState.plans ||
        [];

    let plan =
        plans.find(
            item =>
                String(item.id) ===
                String(planId)
        );

    if (!plan && planCode) {

        plan =
            plans.find(
                item =>
                    String(
                        item.plan_code
                    ).toLowerCase() ===
                    String(
                        planCode
                    ).toLowerCase()
            );

    }

    if (!plan && planId) {

        const configPlans =
            Object.values(
                COMPANY_DASHBOARD_CONFIG.plans
            );

        plan =
            configPlans.find(
                item =>
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

    markSelectedPlan(
        plan
    );

    updatePaymentPanel(
        plan
    );

    const paymentPanel =
        getElement(
            "#payment-panel",
            "#subscription-payment",
            "#payment-section"
        );

    if (paymentPanel) {

        paymentPanel.style.display =
            "block";

        paymentPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

    const selectedName =
        plan.plan_name ||
        plan.name ||
        plan.plan_code ||
        "Selected plan";

    showMessage(
        `${selectedName} selected.`,
        "success"
    );

    updateSubscribeButton();

}


/* =========================================================
   MARK SELECTED PLAN
   ========================================================= */

function markSelectedPlan(plan) {

    $$(".subscription-plan-card").forEach(
        card => {

            card.classList.remove(
                "selected",
                "active",
                "is-selected"
            );

        }
    );

    const card =
        document.querySelector(
            `[data-plan-card="${CSS.escape(String(plan.id))}"]`
        );

    if (card) {

        card.classList.add(
            "selected",
            "active",
            "is-selected"
        );

    }

    $$(".plan-button").forEach(
        button => {

            button.classList.remove(
                "selected",
                "active"
            );

            const buttonPlan =
                button.dataset.plan ||
                button.dataset.planId;

            if (
                String(buttonPlan) ===
                String(plan.id)
            ) {

                button.classList.add(
                    "selected",
                    "active"
                );

            }

        }
    );

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
        Number(
            plan.price || 0
        ).toFixed(2);

    const nameElements = [
        "#selected-plan-name",
        "#payment-plan-name",
        "[data-selected-plan]"
    ];

    nameElements.forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                name;

        });

    });

    const priceElements = [
        "#selected-plan-price",
        "#payment-plan-price",
        "[data-selected-price]"
    ];

    priceElements.forEach(selector => {

        $$(selector).forEach(element => {

            element.textContent =
                `$${price}`;

        });

    });

    const walletElement =
        getElement(
            "#payment-wallet",
            "#wallet-address"
        );

    if (
        walletElement &&
        !CompanyDashboardState.walletAddress
    ) {

        walletElement.textContent =
            "Wallet not connected";

    }

    updateSubscribeButton();

}


/* =========================================================
   SUBSCRIBE BUTTON
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

        });

    });

}


/* =========================================================
   WALLET SUPPORT
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
            "Please install a Web3 wallet such as MetaMask.",
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

        const address =
            accounts[0];

        CompanyDashboardState.walletAddress =
            address;

        if (
            window.ethers &&
            window.ethers.BrowserProvider
        ) {

            CompanyDashboardState.provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );

            CompanyDashboardState.signer =
                await CompanyDashboardState.provider.getSigner();

        }

        updateWalletUI();

        showMessage(
            "Wallet connected successfully.",
            "success"
        );

        updateSubscribeButton();

        return address;

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
   BNB SMART CHAIN
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
                        COMPANY_DASHBOARD_CONFIG.chainId
                }
            ]
        });

    } catch (error) {

        if (
            error.code !== 4902
        ) {

            throw error;

        }

        await window.ethereum.request({
            method:
                "wallet_addEthereumChain",
            params: [
                {
                    chainId:
                        COMPANY_DASHBOARD_CONFIG.chainId,

                    chainName:
                        COMPANY_DASHBOARD_CONFIG.chainName,

                    nativeCurrency: {
                        name:
                            "BNB",

                        symbol:
                            "BNB",

                        decimals:
                            18
                    },

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

    const displayAddress =
        address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect wallet";

    $$("#wallet-address").forEach(
        element => {

            element.textContent =
                displayAddress;

        }
    );

    $$("#payment-wallet").forEach(
        element => {

            element.textContent =
                displayAddress;

        }
    );

    $$("#connect-wallet").forEach(
        button => {

            button.textContent =
                address
                    ? displayAddress
                    : "Connect Wallet";

        }
    );

}


/* =========================================================
   CONVERT USD TO BNB
   ========================================================= */

async function getBnbPrice() {

    const response =
        await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT"
        );

    if (!response.ok) {

        throw new Error(
            "Unable to retrieve the current BNB price."
        );

    }

    const data =
        await response.json();

    const price =
        Number(
            data.price
        );

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


async function usdToBnb(usdAmount) {

    const bnbUsd =
        await getBnbPrice();

    const bnbAmount =
        Number(usdAmount) /
        bnbUsd;

    if (
        !Number.isFinite(bnbAmount) ||
        bnbAmount <= 0
    ) {

        throw new Error(
            "Invalid BNB amount."
        );

    }

    return bnbAmount;

}


/* =========================================================
   SEND PAYMENT
   ========================================================= */

async function sendSubscriptionPayment() {

    if (
        !CompanyDashboardState.selectedPlan
    ) {

        showMessage(
            "Please select a subscription plan.",
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

    try {

        CompanyDashboardState.paymentPending =
            true;

        updateSubscribeButton();

        const address =
            CompanyDashboardState.walletAddress ||
            await connectWallet();

        if (!address) {

            throw new Error(
                "Wallet connection is required."
            );

        }

        await switchToBNBChain();

        if (
            !CompanyDashboardState.signer
        ) {

            CompanyDashboardState.provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );

            CompanyDashboardState.signer =
                await CompanyDashboardState.provider
                    .getSigner();

        }

        const plan =
            CompanyDashboardState.selectedPlan;

        const usdAmount =
            Number(
                plan.price
            );

        showPaymentStatus(
            "Calculating BNB amount..."
        );

        const bnbAmount =
            await usdToBnb(
                usdAmount
            );

        const value =
            ethers.parseEther(
                bnbAmount.toFixed(8)
            );

        showPaymentStatus(
            `Preparing payment of approximately ${bnbAmount.toFixed(6)} BNB...`
        );

        const transaction =
            await CompanyDashboardState.signer.sendTransaction({
                to:
                    COMPANY_DASHBOARD_CONFIG
                        .receiverWallet,

                value:
                    value
            });

        showPaymentStatus(
            "Transaction submitted. Waiting for confirmation..."
        );

        const receipt =
            await transaction.wait();

        if (
            !receipt ||
            receipt.status !== 1
        ) {

            throw new Error(
                "The blockchain transaction was not confirmed."
            );

        }

        await savePayment(
            transaction.hash,
            bnbAmount,
            usdAmount,
            plan
        );

        showPaymentStatus(
            "Payment submitted successfully and is awaiting verification."
        );

        showMessage(
            "Payment submitted successfully. Your subscription will be activated after verification.",
            "success"
        );

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
   SAVE PAYMENT
   ========================================================= */

async function savePayment(
    transactionHash,
    bnbAmount,
    usdAmount,
    plan
) {

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
            "pending",

        provider_payment_id:
            transactionHash,

        transaction_hash:
            transactionHash,

        blockchain_network:
            "BNB Smart Chain"

    };

    const result =
        await client
            .from("payments")
            .insert(
                paymentData
            );

    if (result.error) {

        throw result.error;

    }

    return result;

}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindDashboardEvents() {

    /* Wallet */

    $$("#connect-wallet").forEach(
        button => {

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

        }
    );


    /* Payment */

    const paymentButtons = [
        "#send-payment",
        "#subscribe-button",
        "#pay-button",
        "#confirm-subscription"
    ];

    paymentButtons.forEach(selector => {

        $$(selector).forEach(
            button => {

                if (
                    button.dataset
                        .dashboardBound ===
                    "true"
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

            }
        );

    });


    /* Logout */

    $$("#logout-button").forEach(
        button => {

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

        }
    );


    /* Existing plan buttons */

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

    window.ethereum.on(
        "accountsChanged",
        accounts => {

            if (
                !accounts ||
                !accounts.length
            ) {

                CompanyDashboardState.walletAddress =
                    null;

                CompanyDashboardState.provider =
                    null;

                CompanyDashboardState.signer =
                    null;

            } else {

                CompanyDashboardState.walletAddress =
                    accounts[0];

            }

            updateWalletUI();

            updateSubscribeButton();

        }
    );


    window.ethereum.on(
        "chainChanged",
        () => {

            CompanyDashboardState.provider =
                null;

            CompanyDashboardState.signer =
                null;

            updateSubscribeButton();

        }
    );

}


/* =========================================================
   DETECT CONNECTED WALLET
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

            CompanyDashboardState.walletAddress =
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
   INIT
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

        await loadCompanyProfile();

        await Promise.allSettled([
            loadJobStatistics(),
            loadSubscriptionPlans()
        ]);

        bindDashboardEvents();

        bindWalletEvents();

        await detectExistingWallet();

        updateWalletUI();

        updateSubscribeButton();

        hideLoading();

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
   LOADING ERROR
   ========================================================= */

function showLoadingError(message) {

    const loading =
        $("#loading-spinner");

    if (!loading) {

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
   GLOBAL FUNCTIONS
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

        selectPlan(
            plan
        );

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
