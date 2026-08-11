/* =========================================================
   Web3Jobs
   File: js/company-dashboard.js

   Company Dashboard
   Supabase + Company Profiles + Jobs + Applications
   USDT BEP-20 Payments on BNB Smart Chain

   Subscription plans:
   Free         = 2 jobs / month
   Starter      = $19 USDT / month = 5 jobs
   Professional = $49 USDT / month = 20 jobs
   Enterprise   = $99 USDT / month = Unlimited jobs

   Payment activation occurs ONLY after:
   1. Wallet confirmation
   2. Blockchain confirmation
   3. Transaction verification
   4. Supabase payment confirmation
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPANY_DASHBOARD_CONFIG = {

    supabaseUrl:
        "https://uewocyaspztybnvnkbmo.supabase.co",

    /* =====================================================
       PAYMENT RECEIVING WALLET
       USDT BEP-20 / BNB Smart Chain
       ===================================================== */

    paymentWallet:
        "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

    bscChainId:
        "0x38",

    bscChainName:
        "BNB Smart Chain",

    usdtContract:
        "0x55d398326f99059fF775485246999027B3197955",

    usdtSymbol:
        "USDT",

    usdtDecimals:
        18,

    bscExplorer:
        "https://bscscan.com/tx/",

    rpcUrl:
        "https://bsc-dataseed.binance.org/",

    plans: {

        free: {
            code: "free",
            name: "Free",
            price: 0,
            limit: 2,
            durationDays: 30
        },

        starter: {
            code: "starter",
            name: "Starter",
            price: 19,
            limit: 5,
            durationDays: 30
        },

        professional: {
            code: "professional",
            name: "Professional",
            price: 49,
            limit: 20,
            durationDays: 30
        },

        enterprise: {
            code: "enterprise",
            name: "Enterprise",
            price: 99,
            limit: null,
            durationDays: 30
        }

    }

};


/* =========================================================
   STATE
   ========================================================= */

let supabaseClient = null;

let currentUser = null;

let currentProfile = null;

let currentCompanyProfile = null;

let currentPlan = null;

let currentPayment = null;

let selectedPlan = null;

let connectedWallet = null;

let dashboardInitialized = false;


/* =========================================================
   SUPABASE INITIALIZATION
   ========================================================= */

function getSupabaseClient() {

    if (supabaseClient) {
        return supabaseClient;
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        supabaseClient =
            window.supabaseClient;

        return supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {

        const existingUrl =
            window.SUPABASE_URL ||
            window.supabaseUrl ||
            COMPANY_DASHBOARD_CONFIG.supabaseUrl;

        const existingKey =
            window.SUPABASE_ANON_KEY ||
            window.SUPABASE_KEY ||
            window.supabaseKey ||
            window.SUPABASE_PUBLISHABLE_KEY;

        if (existingKey) {

            supabaseClient =
                window.supabase.createClient(
                    existingUrl,
                    existingKey
                );

            return supabaseClient;
        }
    }

    throw new Error(
        "Supabase client is not available. Check js/supabase.js."
    );
}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
}


function showElement(id) {

    const element = $(id);

    if (element) {
        element.style.display = "";
    }
}


function hideElement(id) {

    const element = $(id);

    if (element) {
        element.style.display = "none";
    }
}


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


function escapeAttribute(value) {
    return escapeHtml(value);
}


/* =========================================================
   ALERT SYSTEM
   ========================================================= */

function showAlert(
    message,
    type = "success"
) {

    const alert = $("dashboard-alert");

    if (!alert) {

        console.log(message);

        return;
    }

    alert.textContent =
        message;

    alert.className = "";

    alert.id =
        "dashboard-alert";

    alert.classList.add(type);

    alert.style.display =
        "block";

    window.clearTimeout(
        showAlert._timer
    );

    showAlert._timer =
        window.setTimeout(
            () => {

                alert.style.display =
                    "none";

            },
            5000
        );
}


/* =========================================================
   LOADING
   ========================================================= */

function showDashboardLoading(message) {

    const spinner =
        $("loading-spinner");

    if (!spinner) {
        return;
    }

    spinner.style.display =
        "flex";

    const title =
        spinner.querySelector("h2");

    const paragraph =
        spinner.querySelector("p");

    if (title) {
        title.textContent =
            "Loading Company Dashboard";
    }

    if (
        paragraph &&
        message
    ) {
        paragraph.textContent =
            message;
    }
}


function hideDashboardLoading() {

    const spinner =
        $("loading-spinner");

    const content =
        $("dashboard-content");

    if (spinner) {
        spinner.style.display =
            "none";
    }

    if (content) {
        content.style.display =
            "block";
    }
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function getCurrentUser() {

    const client =
        getSupabaseClient();

    const {
        data,
        error
    } =
        await client.auth.getSession();

    if (error) {
        throw error;
    }

    if (
        data &&
        data.session &&
        data.session.user
    ) {
        return data.session.user;
    }

    const {
        data: userData,
        error: userError
    } =
        await client.auth.getUser();

    if (userError) {
        return null;
    }

    return userData?.user || null;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

    const client =
        getSupabaseClient();

    if (!currentUser) {
        throw new Error(
            "No authenticated user."
        );
    }

    const {
        data,
        error
    } =
        await client
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();

    if (error) {
        throw error;
    }

    currentProfile =
        data || null;

    return currentProfile;
}


function normalizeRole(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}


function isCompanyProfile(profile) {

    if (!profile) {
        return false;
    }

    const role =
        normalizeRole(
            profile.role ||
            profile.account_type ||
            profile.user_type
        );

    return (
        role === "company" ||
        role === "employer" ||
        role ===
