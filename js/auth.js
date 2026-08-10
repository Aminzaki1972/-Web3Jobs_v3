/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   ---------------------------------------------------------
   COMPANY SUPABASE PROJECT
   ---------------------------------------------------------
   Project:
   https://jqhemwskrnlycximjpag.supabase.co

   Features:
   - Login
   - Sign Up
   - Email confirmation
   - Company / Individual detection
   - Profile account_type detection
   - Dashboard protection
   - Logout
   - Password reset support
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE
   ========================================================= */

const AUTH_SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const AUTH_SUPABASE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";

let authSupabase = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeAuthSupabase() {

    if (authSupabase) {
        return authSupabase;
    }

    if (
        typeof window === "undefined" ||
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs Auth: Supabase JS library is not loaded."
        );

        return null;
    }

    try {

        authSupabase =
            window.supabase.createClient(
                AUTH_SUPABASE_URL,
                AUTH_SUPABASE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

        window.supabaseClient =
            authSupabase;

        console.log(
            "Web3Jobs Auth: Supabase initialized."
        );

        console.log(
            "Web3Jobs Auth: Project:",
            AUTH_SUPABASE_URL
        );

        return authSupabase;

    } catch (error) {

        console.error(
            "Web3Jobs Auth initialization error:",
            error
        );

        authSupabase = null;

        return null;
    }
}


/* =========================================================
   GET CLIENT
   ========================================================= */

function getAuthSupabase() {

    if (authSupabase) {
        return authSupabase;
    }

    return initializeAuthSupabase();
}


/* =========================================================
   CURRENT USER
   ========================================================= */

async function getCurrentUser() {

    const client =
        getAuthSupabase();

    if (!client) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await client.auth.getUser();

        if (error) {

            console.error(
                "Web3Jobs getUser error:",
                error
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {

        console.error(
            "Web3Jobs getCurrentUser error:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET SESSION
   ========================================================= */

async function getCurrentSession() {

    const client =
        getAuthSupabase();

    if (!client) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await client.auth.getSession();

        if (error) {

            console.error(
                "Web3Jobs getSession error:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "Web3Jobs getSession exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   EMAIL CONFIRMATION
   ========================================================= */

function isEmailConfirmed(user) {

    if (!user) {
        return false;
    }

    return Boolean(
        user.email_confirmed_at
    );
}


/* =========================================================
   NORMALIZE ACCOUNT TYPE
   ========================================================= */

function normalizeAccountType(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }

    const type =
        String(value)
            .trim()
            .toLowerCase();

    if (
        type === "company" ||
        type === "companies" ||
        type === "business" ||
        type === "employer" ||
        type === "organization" ||
        type === "شركة"
    ) {

        return "company";
    }

    if (
        type === "individual" ||
        type === "person" ||
        type === "user" ||
        type === "candidate" ||
        type === "freelancer" ||
        type === "individuals" ||
        type === "فرد" ||
        type === "فردي" ||
        type === "فردى"
    ) {

        return "individual";
    }

    return null;
}


/* =========================================================
   GET ACCOUNT TYPE
   ========================================================= */

async function getAccountType(userId = null) {

    const client =
        getAuthSupabase();

    if (!client) {
        return null;
    }

    const user =
        await getCurrentUser();

    const id =
        userId ||
        user?.id;

    if (!id) {

        console.error(
            "Web3Jobs: User ID not found."
        );

        return null;
    }


    /* =====================================================
       1. PROFILES
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select("id,email,account_type")
                .eq("id", id)
                .maybeSingle();

        console.log(
            "Web3Jobs profiles:",
            data
        );

        if (error) {

            console.error(
                "Web3Jobs profiles error:",
                error
            );

        } else if (data) {

            const type =
                normalizeAccountType(
                    data.account_type
                );

            if (type) {

                console.log(
                    "Web3Jobs account type:",
                    type
                );

                return type;
            }
        }

    } catch (error) {

        console.error(
            "Web3Jobs profiles exception:",
            error
        );
    }


    /* =====================================================
       2. USER METADATA
       ===================================================== */

    if (user) {

        const metadata =
            user.user_metadata || {};

        const type =
            normalizeAccountType(
                metadata.account_type ||
                metadata.accountType ||
                metadata.role ||
                metadata.user_type
            );

        if (type) {

            console.log(
                "Web3Jobs metadata account type:",
                type
            );

            return type;
        }
    }


    /* =====================================================
       3. COMPANY PROFILE FALLBACK
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("company_profiles")
                .select("id")
                .eq("id", id)
                .maybeSingle();

        if (
            !error &&
            data
        ) {

            return "company";
        }

    } catch (error) {

        console.warn(
            "company_profiles check failed:",
            error
        );
    }


    console.error(
        "Web3Jobs: account_type not found for:",
        id
    );

    return null;
}


/* =========================================================
   BASE URL
   ========================================================= */

function getWeb3JobsBaseUrl() {

    const path =
        window.location.pathname;

    const directory =
        path.substring(
            0,
            path.lastIndexOf("/") + 1
        );

    return (
        window.location.origin +
        directory
    );
}


/* =========================================================
   LOGIN URL
   ========================================================= */

function getLoginUrl() {

    return (
        getWeb3JobsBaseUrl() +
        "login.html"
    );
}


/* =========================================================
   DASHBOARD URL
   ========================================================= */

function getDashboardUrl(accountType) {

    const type =
        normalizeAccountType(
            accountType
        );

    if (type === "company") {

        return (
            getWeb3JobsBaseUrl() +
            "company-dashboard.html"
        );
    }

    if (type === "individual") {

        return (
            getWeb3JobsBaseUrl() +
            "dashboard.html"
        );
    }

    return (
        getWeb3JobsBaseUrl() +
        "index.html"
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(
    email,
    password
) {

    const client =
        getAuthSupabase();

    if (!client) {

        showAuthMessage(
            "تعذر الاتصال بخدمة تسجيل الدخول.",
            "Authentication service is unavailable.",
            "error"
        );

        return {
            success: false
        };
    }


    email =
        String(email || "")
            .trim()
            .toLowerCase();

    password =
        String(password || "");


    if (!email || !password) {

        showAuthMessage(
            "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
            "Please enter your email and password.",
            "error"
        );

        return {
            success: false
        };
    }


    try {

        console.log(
            "Web3Jobs: Login:",
            email
        );


        /* =================================================
           AUTH
           ================================================= */

        const {
            data,
            error
        } =
            await client.auth.signInWithPassword({

                email,

                password
            });


        if (error) {

            console.error(
                "Web3Jobs login error:",
                error
            );

            showAuthError(error);

            return {
                success: false,
                error
            };
        }


        const user =
            data?.user;

        if (!user) {

            showAuthMessage(
                "تعذر العثور على الحساب.",
                "User account was not found.",
                "error"
            );

            return {
                success: false
            };
        }


        /* =================================================
           EMAIL CONFIRMATION
           ================================================= */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();

            showAuthMessage(
                "البريد الإلكتروني غير مؤكد. يرجى تأكيد البريد أولاً.",
                "Your email is not confirmed. Please confirm it first.",
                "error"
            );

            return {
                success: false,
                emailNotConfirmed: true
            };
        }


        /* =================================================
           ACCOUNT TYPE
           ================================================= */

        const accountType =
            await getAccountType(
                user.id
            );


        console.log(
            "Web3Jobs FINAL ACCOUNT TYPE:",
            accountType
        );


        if (!accountType) {

            showAuthMessage(
                "تم تسجيل الدخول، ولكن لم يتم تحديد نوع الحساب.",
                "Login succeeded, but account type could not be determined.",
                "error"
            );

            return {
                success: false,
                accountTypeMissing: true,
                user
            };
        }


        /* =================================================
           SUCCESS
           ================================================= */

        const dashboardUrl =
            getDashboardUrl(
                accountType
            );


        console.log(
            "Web3Jobs Dashboard:",
            dashboardUrl
        );


        return {

            success: true,

            user,

            accountType,

            dashboardUrl
        };

    } catch (error) {

        console.error(
            "Web3Jobs login exception:",
            error
        );

        showAuthError(error);

        return {
            success: false,
            error
        };
    }
}


/* =========================================================
   PROTECT DASHBOARD
   ========================================================= */

async function protectDashboard(
    requiredAccountType = null
) {

    const client =
        getAuthSupabase();

    if (!client) {
        return false;
    }


    try {

        const session =
            await getCurrentSession();

        const user =
            session?.user ||
            await getCurrentUser();


        if (!user) {

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }


        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }


        const accountType =
            await getAccountType(
                user.id
            );


        if (!accountType) {

            console.error(
                "Web3Jobs: account type missing."
            );

            return false;
        }


        if (requiredAccountType) {

            const required =
                normalizeAccountType(
                    requiredAccountType
                );


            if (
                required &&
                accountType !== required
            ) {

                window.location.replace(
                    getDashboardUrl(
                        accountType
                    )
                );

                return false;
            }
        }


        return {

            authenticated: true,

            emailConfirmed: true,

            user,

            accountType
        };

    } catch (error) {

        console.error(
            "Web3Jobs protectDashboard error:",
            error
        );

        return false;
    }
}


/* =========================================================
   COMPANY DASHBOARD
   ========================================================= */

async function protectCompanyDashboard() {

    return await protectDashboard(
        "company"
    );
}


/* =========================================================
   INDIVIDUAL DASHBOARD
   ========================================================= */

async function protectIndividualDashboard() {

    return await protectDashboard(
        "individual"
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {

    const client =
        getAuthSupabase();

    if (!client) {
        return false;
    }

    try {

        await client.auth.signOut();

        window.location.replace(
            getLoginUrl()
        );

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs logout error:",
            error
        );

        return false;
    }
}


/* =========================================================
   RESEND CONFIRMATION
   ========================================================= */

async function resendConfirmationEmail(
    email
) {

    const client =
        getAuthSupabase();

    if (!client) {
        return false;
    }

    email =
        String(email || "")
            .trim()
            .toLowerCase();

    if (!email) {
        return false;
    }

    try {

        const {
            error
        } =
            await client.auth.resend({

                type: "signup",

                email,

                options: {

                    emailRedirectTo:
                        getLoginUrl()
                }
            });

        if (error) {

            showAuthError(error);

            return false;
        }

        showAuthMessage(
            "تم إرسال رسالة تأكيد جديدة إلى بريدك الإلكتروني.",
            "A new confirmation email has been sent.",
            "success"
        );

        return true;

    } catch (error) {

        showAuthError(error);

        return false;
    }
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function showAuthError(error) {

    const raw =
        String(
            error?.message ||
            error?.error_description ||
            error ||
            ""
        );

    const message =
        raw.toLowerCase();


    console.error(
        "Web3Jobs AUTH ERROR:",
        error
    );


    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        showAuthMessage(
            "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
            "Invalid email or password.",
            "error"
        );

        return;
    }


    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        showAuthMessage(
            "البريد الإلكتروني غير مؤكد.",
            "Email address is not confirmed.",
            "error"
        );

        return;
    }


    if (
        message.includes(
            "too many requests"
        ) ||
        message.includes(
            "rate limit"
        )
    ) {

        showAuthMessage(
            "تم تجاوز عدد المحاولات. انتظر قليلاً ثم حاول مرة أخرى.",
            "Too many attempts. Please wait and try again.",
            "error"
        );

        return;
    }


    showAuthMessage(
        "حدث خطأ: " + raw,
        "Authentication error: " + raw,
        "error"
    );
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showAuthMessage(
    messageAr,
    messageEn,
    type = "info"
) {

    const element =
        document.getElementById(
            "auth-message"
        );


    if (element) {

        element.innerHTML = `
            <div class="auth-message-${type}">
                <div>${escapeAuthHtml(messageAr)}</div>
                <div>${escapeAuthHtml(messageEn)}</div>
            </div>
        `;

        element.style.display =
            "block";

        return;
    }


    console.log(
        messageAr,
        messageEn
    );
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeAuthHtml(value) {

    return String(
        value || ""
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

async function initializeAuthPage() {

    initializeAuthSupabase();


    const page =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    if (
        page ===
        "company-dashboard.html"
    ) {

        await protectCompanyDashboard();

        return;
    }


    if (
        page ===
        "dashboard.html"
    ) {

        await protectIndividualDashboard();

        return;
    }
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3JobsAuth = {

    initialize:
        initializeAuthSupabase,

    getCurrentUser,

    getCurrentSession,

    getAccountType,

    login:
        loginUser,

    logout:
        logoutUser,

    resendConfirmation:
        resendConfirmationEmail,

    protectDashboard,

    protectCompanyDashboard,

    protectIndividualDashboard,

    getDashboardUrl,

    isEmailConfirmed,

    normalizeAccountType,

    showMessage:
        showAuthMessage,

    showError:
        showAuthError
};


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuthPage
    );

} else {

    initializeAuthPage();
}


/* =========================================================
   END
   ========================================================= */
