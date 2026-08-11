/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Unified Authentication System
   ========================================================= */

"use strict";

(function () {

    /* =========================================================
       SUPABASE CLIENT
       ========================================================= */

    function getAuthSupabase() {

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            return window.Web3JobsSupabase.getClient();
        }

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        console.error(
            "Web3Jobs Auth: Unified Supabase client is unavailable."
        );

        return null;
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
            } = await client.auth.getUser();

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
       CURRENT SESSION
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
            } = await client.auth.getSession();

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
                "Web3Jobs getCurrentSession error:",
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
                    .select(
                        "id,email,account_type,role"
                    )
                    .eq("id", id)
                    .maybeSingle();

            if (!error && data) {

                const profileType =
                    normalizeAccountType(
                        data.account_type
                    );

                if (profileType) {
                    return profileType;
                }

                const roleType =
                    normalizeAccountType(
                        data.role
                    );

                if (roleType) {
                    return roleType;
                }
            }

            if (error) {

                console.warn(
                    "Web3Jobs profiles lookup:",
                    error.message
                );
            }

        } catch (error) {

            console.warn(
                "Web3Jobs profiles exception:",
                error
            );
        }


        /* =====================================================
           2. AUTH METADATA
           ===================================================== */

        if (user) {

            const metadata =
                user.user_metadata || {};

            const metadataType =
                normalizeAccountType(
                    metadata.account_type ||
                    metadata.accountType ||
                    metadata.role ||
                    metadata.user_type
                );

            if (metadataType) {
                return metadataType;
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
                "Web3Jobs company profile lookup failed:",
                error
            );
        }


        return null;
    }


    /* =========================================================
       BASE URL
       ========================================================= */

    function getWeb3JobsBaseUrl() {

        const path =
            window.location.pathname;

        const lastSlash =
            path.lastIndexOf("/");

        const directory =
            lastSlash >= 0
                ? path.substring(
                    0,
                    lastSlash + 1
                )
                : "/";

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

        if (
            !email ||
            !password
        ) {

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


            const dashboardUrl =
                getDashboardUrl(
                    accountType
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
                    "Web3Jobs: Account type could not be determined."
                );

                showDashboardAccessError();

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

            showDashboardAccessError();

            return false;
        }
    }


    /* =========================================================
       COMPANY DASHBOARD PROTECTION
       ========================================================= */

    async function protectCompanyDashboard() {

        return await protectDashboard(
            "company"
        );
    }


    /* =========================================================
       INDIVIDUAL DASHBOARD PROTECTION
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

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }


        try {

            await client.auth.signOut();

        } catch (error) {

            console.error(
                "Web3Jobs logout error:",
                error
            );
        }


        window.location.replace(
            getLoginUrl()
        );

        return true;
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
       PASSWORD RESET
       ========================================================= */

    async function resetPassword(
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

            showAuthMessage(
                "يرجى إدخال البريد الإلكتروني.",
                "Please enter your email address.",
                "error"
            );

            return false;
        }


        try {

            const {
                error
            } =
                await client.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            getLoginUrl()
                    }
                );


            if (error) {

                showAuthError(error);

                return false;
            }


            showAuthMessage(
                "تم إرسال رابط إعادة تعيين كلمة المرور.",
                "Password reset link has been sent.",
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
                "Authentication failed."
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
       AUTH MESSAGE
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
       DASHBOARD ACCESS ERROR
       ========================================================= */

    function showDashboardAccessError() {

        const loading =
            document.getElementById(
                "loading-spinner"
            );

        const dashboard =
            document.getElementById(
                "dashboard-content"
            );


        if (loading) {

            loading.innerHTML = `
                <div class="loading-card">
                    <h2>Dashboard Access Error</h2>
                    <p>
                        We could not verify your account.
                        Please return to login and try again.
                    </p>
                    <a
                        href="login.html"
                        style="
                            display:inline-block;
                            margin-top:18px;
                            padding:10px 16px;
                            border-radius:9px;
                            text-decoration:none;
                            background:#6ee7b7;
                            color:#06101d;
                            font-weight:800;
                        "
                    >
                        Return to Login
                    </a>
                </div>
            `;

            loading.style.display =
                "flex";
        }


        if (dashboard) {
            dashboard.style.display =
                "none";
        }
    }


    /* =========================================================
       HTML ESCAPE
       ========================================================= */

    function escapeAuthHtml(value) {

        return String(
            value || ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    /* =========================================================
       PAGE INITIALIZATION
       ========================================================= */

    async function initializeAuthPage() {

        const page =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        /*
         * The Company Dashboard has its own initialization.
         * Authentication is checked here only when the page
         * is not already being handled by the dashboard script.
         */

        if (
            page ===
            "company-dashboard.html"
        ) {

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
            function () {
                return getAuthSupabase();
            },

        getClient:
            getAuthSupabase,

        getCurrentUser,

        getCurrentSession,

        getAccountType,

        login:
            loginUser,

        loginUser,

        logout:
            logoutUser,

        logoutUser,

        resendConfirmation:
            resendConfirmationEmail,

        resetPassword,

        protectDashboard,

        protectCompanyDashboard,

        protectIndividualDashboard,

        getDashboardUrl,

        getLoginUrl,

        isEmailConfirmed,

        normalizeAccountType,

        showMessage:
            showAuthMessage,

        showError:
            showAuthError
    };


    /* =========================================================
       GLOBAL COMPATIBILITY
       ========================================================= */

    window.getCurrentUser =
        getCurrentUser;

    window.getCurrentSession =
        getCurrentSession;

    window.getAccountType =
        getAccountType;

    window.protectDashboard =
        protectDashboard;

    window.protectCompanyDashboard =
        protectCompanyDashboard;

    window.protectIndividualDashboard =
        protectIndividualDashboard;


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeAuthPage,
            {
                once: true
            }
        );

    } else {

        initializeAuthPage();
    }

})();
