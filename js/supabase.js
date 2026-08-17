/* =========================================================
   Web3Jobs v3
   File: js/supabase.js

   Unified Supabase Client + Web3 Wallet Auth
   ========================================================= */

"use strict";

const SUPABASE_URL = "https://jqhemwskrnlycximjpag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";
const SUPABASE_STORAGE_KEY = "web3jobs-auth";
const SUPABASE_JS_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0";

let web3jobsSupabaseClient = null;
let supabaseLibraryReady = null;

function loadSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === "function") return Promise.resolve(true);
    if (supabaseLibraryReady) return supabaseLibraryReady;

    supabaseLibraryReady = new Promise(function (resolve) {
        const existing = document.querySelector('script[data-web3jobs-supabase="true"]');
        if (existing) {
            existing.addEventListener("load", () => resolve(Boolean(window.supabase?.createClient)), { once: true });
            existing.addEventListener("error", () => resolve(false), { once: true });
            return;
        }
        const script = document.createElement("script");
        script.src = SUPABASE_JS_CDN;
        script.async = true;
        script.dataset.web3jobsSupabase = "true";
        script.onload = () => resolve(Boolean(window.supabase?.createClient));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
    return supabaseLibraryReady;
}

function initializeSupabase() {
    if (web3jobsSupabaseClient?.from) return web3jobsSupabaseClient;
    if (!window.supabase?.createClient) {
        loadSupabaseLibrary().then(ready => { if (ready) initializeSupabase(); });
        return null;
    }
    try {
        web3jobsSupabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: SUPABASE_STORAGE_KEY } }
        );
        window.supabaseClient = web3jobsSupabaseClient;
        return web3jobsSupabaseClient;
    } catch (error) {
        console.error("Web3Jobs: Supabase initialization failed:", error);
        web3jobsSupabaseClient = null;
        window.supabaseClient = null;
        return null;
    }
}

function getSupabaseClient() {
    if (web3jobsSupabaseClient?.from) return web3jobsSupabaseClient;
    if (window.supabaseClient?.from) {
        web3jobsSupabaseClient = window.supabaseClient;
        return web3jobsSupabaseClient;
    }
    return initializeSupabase();
}
function getClient() { return getSupabaseClient(); }

async function getSupabaseSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
        const { data, error } = await client.auth.getSession();
        if (error) return null;
        return data?.session || null;
    } catch (_) { return null; }
}

async function getSupabaseUser() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
        const { data, error } = await client.auth.getUser();
        if (error) return null;
        return data?.user || null;
    } catch (_) { return null; }
}

function onAuthStateChange(callback) {
    const client = getSupabaseClient();
    if (!client?.auth || typeof callback !== "function") return null;
    return client.auth.onAuthStateChange(callback);
}

async function signOutSupabase() {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
        const { error } = await client.auth.signOut();
        if (error) return false;
        try {
            localStorage.removeItem("web3jobs_account_type");
            localStorage.removeItem("web3jobs_user_id");
            localStorage.removeItem("web3jobs_wallet_auth");
        } catch (_) {}
        return true;
    } catch (_) { return false; }
}

async function hasActiveSession() { return Boolean((await getSupabaseSession())?.user); }
async function getAuthenticatedUserId() { return (await getSupabaseSession())?.user?.id || null; }

/* =========================================================
   WEB3 WALLET AUTH
   ========================================================= */

function selectedSignupAccountType() {
    const selected = document.querySelector('input[name="account-type"]:checked');
    return selected?.value === "company" ? "company" : "individual";
}

async function signInWithWeb3Wallet() {
    const client = getSupabaseClient();
    if (!client?.auth?.signInWithWeb3) {
        throw new Error("Supabase Web3 Wallet authentication is not available. Enable Ethereum Web3 authentication in Supabase Auth Providers.");
    }
    const provider = window.ethereum;
    if (!provider) {
        throw new Error("لم يتم العثور على محفظة Ethereum. افتح الموقع من MetaMask أو محفظة تدعم Ethereum.");
    }
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error("لم يتم اختيار حساب من المحفظة.");

    const { data, error } = await client.auth.signInWithWeb3({
        chain: "ethereum",
        statement: "I accept the Web3Jobs Terms of Service and Privacy Policy.",
        wallet: provider
    });
    if (error) throw error;
    if (!data?.user || !data?.session) throw new Error("تم توقيع الرسالة ولكن لم يتم إنشاء جلسة Web3.");
    return data;
}

async function saveWalletProfile(client, user, accountType) {
    if (!client || !user?.id) return;
    const { error } = await client.from("profiles").upsert({
        id: user.id,
        account_type: accountType,
        role: accountType
    }, { onConflict: "id" });
    if (error) console.warn("Web3Jobs wallet profile warning:", error.message || error);
}

function showWalletMessage(isSignup, text, type) {
    const element = document.getElementById(isSignup ? "register-message" : "loginStatus");
    if (!element) return;
    element.textContent = text;
    element.style.display = "block";
    element.className = isSignup ? "register-message" : `status-message ${type || "info"}`;
}

async function handleWalletButton() {
    const isSignup = Boolean(document.getElementById("wallet-register-button"));
    const button = document.getElementById(isSignup ? "wallet-register-button" : "walletLoginButton");
    if (!button) return;

    const original = button.textContent;
    button.disabled = true;

    try {
        showWalletMessage(isSignup, "جاري الاتصال بالمحفظة...", "info");
        const data = await signInWithWeb3Wallet();
        const accountType = isSignup ? selectedSignupAccountType() : "individual";
        await saveWalletProfile(getSupabaseClient(), data.user, accountType);

        try {
            localStorage.setItem("web3jobs_user_id", data.user.id);
            localStorage.setItem("web3jobs_account_type", accountType);
            localStorage.setItem("web3jobs_wallet_auth", "true");
        } catch (_) {}

        showWalletMessage(isSignup, isSignup ? "تم إنشاء الحساب بالمحفظة بنجاح. جاري فتح لوحة التحكم..." : "تم تسجيل الدخول بالمحفظة بنجاح. جاري فتح لوحة التحكم...", "success");
        const target = accountType === "company" ? "company-dashboard.html" : "dashboard.html";
        setTimeout(() => window.location.replace(target), 300);
    } catch (error) {
        const raw = String(error?.message || error || "Web3 wallet authentication failed.");
        const message = /user rejected|rejected the request/i.test(raw) ? "تم إلغاء طلب التوقيع من المحفظة." : raw;
        showWalletMessage(isSignup, message, "error");
        console.error("Web3Jobs wallet authentication failed:", raw);
    } finally {
        button.disabled = false;
        button.textContent = original;
    }
}

/* Intercept the old inline wallet handlers so both pages use one flow. */
document.addEventListener("click", function (event) {
    const target = event.target instanceof Element ? event.target.closest("#walletLoginButton, #wallet-register-button") : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleWalletButton();
}, true);

window.Web3JobsSupabase = {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
    storageKey: SUPABASE_STORAGE_KEY,
    initialize: initializeSupabase,
    getClient: getSupabaseClient,
    getSupabaseClient: getSupabaseClient,
    getSession: getSupabaseSession,
    getSupabaseSession: getSupabaseSession,
    hasActiveSession,
    getAuthenticatedUserId,
    getUser: getSupabaseUser,
    getSupabaseUser,
    onAuthStateChange,
    signOut: signOutSupabase,
    signInWithWeb3Wallet
};

/* Current signup.html expects this name. */
window.Web3JobsAuth = {
    getClient: getSupabaseClient,
    signInWithWeb3Wallet
};

window.getSupabaseClient = getSupabaseClient;
window.getSupabaseSession = getSupabaseSession;
window.getSupabaseUser = getSupabaseUser;
window.hasActiveSupabaseSession = hasActiveSession;

loadSupabaseLibrary().then(ready => { if (ready) initializeSupabase(); });

console.log("Web3Jobs Supabase + Web3 Wallet authentication loaded.");
