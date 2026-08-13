/* =========================================================
   Web3Jobs v3
   File: js/auth.js

   Unified Authentication System
   Admin + Company + Individual

   IMPORTANT FIX:
   - Never redirect from public pages.
   - Never sign out a user because a public page is opened.
   - Jobs browsing is public and session-safe.
   - Dashboard protection is ONLY applied when explicitly called.
   - Uses the SAME Supabase client/session.
========================================================= */

"use strict";

(function () {

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const AUTH_CONFIG = {

        LOGIN_PAGE:
            "login.html",

        ADMIN_DASHBOARD:
            "admin-dashboard.html",

        COMPANY_DASHBOARD:
            "company-dashboard.html",

        INDIVIDUAL_DASHBOARD:
            "dashboard.html",

        HOME_PAGE:
            "index.html"

    };


    /* =====================================================
       SUPABASE CLIENT
    ===================================================== */

    function getClient() {

        /* -----------------------------------------------
           1. Unified Web3Jobs client
        ----------------------------------------------- */

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient ===
                "function"
        ) {

            const client =
                window.Web3JobsSupabase.getClient();

            if (client) {
                return client;
            }
        }


        /* -----------------------------------------------
           2. Existing global client
        ----------------------------------------------- */

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from ===
                "function"
        ) {

            return window.supabaseClient;
        }


        /* -----------------------------------------------
           3. Direct Supabase client
        ----------------------------------------------- */

        if (
            window.supabase &&
            typeof window.supabase.createClient ===
                "function" &&
            window.SUPABASE_URL &&
            window.SUPABASE_ANON_KEY
        ) {

            try {

                if (!window.__Web3JobsAuthClient) {

                    window.__Web3JobsAuthClient =
                        window.supabase.createClient(
                            window.SUPABASE_URL,
                            window.SUPABASE_ANON_KEY,
                            {
                                auth: {
                                    persistSession: true,
                                    autoRefreshToken: true,
                                    detectSessionInUrl: true
                                }
                            }
                        );
                }

                return window.__Web3JobsAuthClient;

            } catch (error) {

                console.error(
                    "Web3Jobs Auth: Supabase initialization failed:",
                    error
                );

                return null;
            }
        }


        console.error(
            "Web3Jobs Auth: Supabase client not available."
        );

        return null;
    }


    /* =====================================================
       CURRENT USER
       ===================================================== */

    async function getCurrentUser() {

        const client =
            getClient();

        if (!client) {
            return null;
        }


        try {

            /*
             * IMPORTANT:
             * getUser() reads the current authenticated user.
             *
             * It DOES NOT redirect.
             * It DOES NOT sign out.
             */

            const {
                data,
                error
            } =
                await client.auth.getUser();


            if (error) {

                /*
                 * Do NOT automatically sign out.
                 *
                 * This was one of the causes of the
                 * session problems on public pages.
                 */

                console.warn(
                    "Web3Jobs Auth: getUser:",
                    error.message
                );

                return null;
            }


            return (
                data &&
                data.user
                    ? data.user
                    : null
            );

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: getCurrentUser:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       CURRENT SESSION
    ===================================================== */

    async function getCurrentSession() {

        const client =
            getClient();

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

                console.warn(
                    "Web3Jobs Auth: getSession:",
                    error.message
                );

                return null;
            }


            return (
                data &&
                data.session
                    ? data.session
                    : null
            );

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: session exception:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       EMAIL CONFIRMATION
    ===================================================== */

    function isEmailConfirmed(user) {

        if (!user) {
            return false;
        }


        return Boolean(
            user.email_confirmed_at ||
            user.confirmed_at
        );
    }


    /* =====================================================
       NORMALIZE ACCOUNT TYPE
    ===================================================== */

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


        /* ADMIN */

        if (
            [
                "admin",
                "administrator",
                "superadmin",
                "super_admin",
                "admin_account"
            ].includes(type)
        ) {

            return "admin";
        }


        /* COMPANY */

        if (
            [
                "company",
                "companies",
                "business",
                "employer",
                "organization",
                "company_account",
                "company-account"
            ].includes(type)
        ) {

            return "company";
        }


        /* INDIVIDUAL */

        if (
            [
                "individual",
                "individuals",
                "person",
                "user",
                "candidate",
                "freelancer",
                "individual_account",
                "individual-account"
            ].includes(type)
        ) {

            return "individual";
        }


        return null;
    }


    /* =====================================================
       FIND ACCOUNT TYPE
    ===================================================== */

    function findAccountType(object) {

        if (!object) {
            return null;
        }


        const values = [

            object.account_type,
            object.accountType,
            object.role,
            object.user_type,
            object.userType,
            object.type

        ];


        for (
            const value of values
        ) {

            const type =
                normalizeAccountType(
                    value
                );


            if (type) {
                return type;
            }
        }


        return null;
    }


    /* =====================================================
       ADMIN CHECK
    ===================================================== */

    async function isAdmin(
        userId = null
    ) {

        const client =
            getClient();


        if (!client) {
            return false;
        }


        /*
         * IMPORTANT:
         * If userId is supplied, use it directly.
         * Otherwise read current user.
         */

        let id =
            userId;


        if (!id) {

            const user =
                await getCurrentUser();

            id =
                user?.id || null;
        }


        if (!id) {
            return false;
        }


        /* -----------------------------------------------
           profiles.id
        ----------------------------------------------- */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("profiles")
                    .select("id,role")
                    .eq("id", id)
                    .maybeSingle();


            if (
                !error &&
                data &&
                normalizeAccountType(
                    data.role
                ) === "admin"
            ) {

                return true;
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: profiles admin check:",
                error
            );
        }


        /* -----------------------------------------------
           profiles.user_id
        ----------------------------------------------- */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("profiles")
                    .select("id,user_id,role")
                    .eq("user_id", id)
                    .maybeSingle();


            if (
                !error &&
                data &&
                normalizeAccountType(
                    data.role
                ) === "admin"
            ) {

                return true;
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: profiles user_id admin check:",
                error
            );
        }


        return false;
    }


    /* =====================================================
       ACCOUNT TYPE
    ===================================================== */

    async function getAccountType(
        userId = null
    ) {

        const client =
            getClient();


        if (!client) {
            return null;
        }


        let user =
            null;


        /*
         * Get current user only when necessary.
         */

        if (!userId) {

            user =
                await getCurrentUser();

        } else {

            /*
             * If userId was supplied, still try to get
             * current user for metadata.
             */

            user =
                await getCurrentUser();
        }


        const id =
            userId ||
            user?.id;


        if (!id) {
            return null;
        }


        /* =================================================
           1. ADMIN
        ================================================= */

        if (
            await isAdmin(id)
        ) {

            return "admin";
        }


        /* =================================================
           2. COMPANY PROFILE
        ================================================= */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("company_profiles")
                    .select(
                        "id,user_id,company_name"
                    )
                    .eq(
                        "user_id",
                        id
                    )
                    .maybeSingle();


            if (
                !error &&
                data
            ) {

                return "company";
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: company profile check:",
                error
            );
        }


        /* =================================================
           3. COMPANY PROFILE BY ID
        ================================================= */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("company_profiles")
                    .select(
                        "id,user_id,company_name"
                    )
                    .eq(
                        "id",
                        id
                    )
                    .maybeSingle();


            if (
                !error &&
                data
            ) {

                return "company";
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: company id check:",
                error
            );
        }


        /* =================================================
           4. USER METADATA
        ================================================= */

        const metadata =
            user?.user_metadata || {};


        const metadataType =
            findAccountType(
                metadata
            );


        if (metadataType) {

            return metadataType;
        }


        /* =================================================
           5. PROFILES BY ID
        ================================================= */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("profiles")
                    .select("*")
                    .eq(
                        "id",
                        id
                    )
                    .maybeSingle();


            if (
                !error &&
                data
            ) {

                const type =
                    findAccountType(
                        data
                    );


                if (type) {
                    return type;
                }
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: profiles id check:",
                error
            );
        }


        /* =================================================
           6. PROFILES BY USER ID
        ================================================= */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("profiles")
                    .select("*")
                    .eq(
                        "user_id",
                        id
                    )
                    .maybeSingle();


            if (
                !error &&
                data
            ) {

                const type =
                    findAccountType(
                        data
                    );


                if (type) {
                    return type;
                }
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: profiles user_id check:",
                error
            );
        }


        /* =================================================
           7. JOBS FALLBACK
        ================================================= */

        try {

            const {
                data,
                error
            } =
                await client
                    .from("jobs")
                    .select("id")
                    .eq(
                        "user_id",
                        id
                    )
                    .limit(1);


            if (
                !error &&
                Array.isArray(data) &&
                data.length > 0
            ) {

                return "company";
            }

        } catch (error) {

            /*
             * This error MUST NOT log the user out.
             */

            console.warn(
                "Web3Jobs Auth: jobs account detection:",
                error
            );
        }


        return null;
    }


    /* =====================================================
       BASE URL
    ===================================================== */

    function getBaseUrl() {

        const path =
            window.location.pathname;


        /*
         * GitHub Pages /Web3Jobs_v3/
         *
         * We preserve the current project directory.
         */

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


    /* =====================================================
       LOGIN URL
    ===================================================== */

    function getLoginUrl() {

        return (
            getBaseUrl() +
            AUTH_CONFIG.LOGIN_PAGE
        );
    }


    /* =====================================================
       DASHBOARD URL
    ===================================================== */

    function getDashboardUrl(
        accountType
    ) {

        const type =
            normalizeAccountType(
                accountType
            );


        if (type === "admin") {

            return (
                getBaseUrl() +
                AUTH_CONFIG.ADMIN_DASHBOARD
            );
        }


        if (type === "company") {

            return (
                getBaseUrl() +
                AUTH_CONFIG.COMPANY_DASHBOARD
            );
        }


        if (type === "individual") {

            return (
                getBaseUrl() +
                AUTH_CONFIG.INDIVIDUAL_DASHBOARD
            );
        }


        return (
            getBaseUrl() +
            AUTH_CONFIG.HOME_PAGE
        );
    }


    /* =====================================================
       SAVE USER DATA
    ===================================================== */

    function saveLocalUserData(
        user,
        accountType
    ) {

        try {

            if (accountType) {

                localStorage.setItem(
                    "web3jobs_account_type",
                    accountType
                );
            }


            if (user?.id) {

                localStorage.setItem(
                    "web3jobs_user_id",
                    user.id
                );
            }

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: localStorage:",
                error
            );
        }
    }


    /* =====================================================
       LOGIN
    ===================================================== */

    async function loginUser(
        email,
        password
    ) {

        const client =
            getClient();


        if (!client) {

            showAuthMessage(
                "تعذر الاتصال بقاعدة البيانات.",
                "Supabase connection is unavailable.",
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

                showAuthError(
                    error
                );


                return {
                    success: false,
                    error
                };
            }


            const loggedUser =
                data?.user;


            const session =
                data?.session;


            if (
                !loggedUser ||
                !session
            ) {

                showAuthMessage(
                    "تعذر إنشاء جلسة تسجيل الدخول.",
                    "Could not create a login session.",
                    "error"
                );


                return {
                    success: false
                };
            }


            /* ---------------------------------------------
               EMAIL CONFIRMATION
            --------------------------------------------- */

            if (
                !isEmailConfirmed(
                    loggedUser
                )
            ) {

                /*
                 * Only sign out here because this is an
                 * explicit login attempt with an
                 * unconfirmed account.
                 */

                try {

                    await client.auth.signOut();

                } catch (signOutError) {

                    console.warn(
                        "Web3Jobs Auth: signout after unconfirmed email:",
                        signOutError
                    );
                }


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


            /* ---------------------------------------------
               ACCOUNT TYPE
            --------------------------------------------- */

            const accountType =
                await getAccountType(
                    loggedUser.id
                );


            console.log(
                "Web3Jobs LOGIN:",
                {
                    userId:
                        loggedUser.id,

                    email:
                        loggedUser.email,

                    accountType
                }
            );


            if (!accountType) {

                /*
                 * IMPORTANT:
                 * Do NOT sign out here.
                 *
                 * The session is valid.
                 */

                showAuthMessage(
                    "تم تسجيل الدخول ولكن لم يتم تحديد نوع الحساب.",
                    "Login succeeded but the account type could not be determined.",
                    "error"
                );


                return {
                    success: false,
                    accountTypeMissing: true,
                    user: loggedUser,
                    session
                };
            }


            /* ---------------------------------------------
               LOCAL STORAGE
            --------------------------------------------- */

            saveLocalUserData(
                loggedUser,
                accountType
            );


            /* ---------------------------------------------
               DASHBOARD
            --------------------------------------------- */

            const dashboardUrl =
                getDashboardUrl(
                    accountType
                );


            return {

                success:
                    true,

                user:
                    loggedUser,

                session:
                    session,

                accountType:
                    accountType,

                dashboardUrl:
                    dashboardUrl
            };

        } catch (error) {

            console.error(
                "Web3Jobs Auth: login:",
                error
            );


            showAuthError(
                error
            );


            return {
                success: false,
                error
            };
        }
    }


    /* =====================================================
       PROTECT DASHBOARD
       IMPORTANT:
       This function MUST NOT be automatically called by
       auth.js on every page.
    ===================================================== */

    async function protectDashboard(
        requiredAccountType = null
    ) {

        const client =
            getClient();


        /*
         * This function is ONLY for protected pages.
         *
         * Public pages such as:
         * - index.html
         * - jobs.html
         * - companies.html
         * - company profiles
         * - individual profiles
         *
         * must NOT call this function.
         */

        if (!client) {

            redirectToLogin();

            return false;
        }


        try {

            const session =
                await getCurrentSession();


            if (
                !session ||
                !session.user
            ) {

                redirectToLogin();

                return false;
            }


            const currentUser =
                session.user;


            /* ---------------------------------------------
               EMAIL
            --------------------------------------------- */

            if (
                !isEmailConfirmed(
                    currentUser
                )
            ) {

                /*
                 * Only protected Dashboard pages
                 * are allowed to sign out here.
                 */

                try {

                    await client.auth.signOut();

                } catch (signOutError) {

                    console.warn(
                        "Web3Jobs Auth: dashboard signout:",
                        signOutError
                    );
                }


                redirectToLogin();

                return false;
            }


            /* ---------------------------------------------
               ACCOUNT TYPE
            --------------------------------------------- */

            const accountType =
                await getAccountType(
                    currentUser.id
                );


            if (!accountType) {

                showDashboardAccessError();

                /*
                 * IMPORTANT:
                 * Do NOT sign out.
                 */

                return false;
            }


            /* ---------------------------------------------
               REQUIRED ACCOUNT TYPE
            --------------------------------------------- */

            if (
                requiredAccountType
            ) {

                const normalizedRequired =
                    normalizeAccountType(
                        requiredAccountType
                    );


                if (
                    normalizedRequired &&
                    accountType !==
                        normalizedRequired
                ) {

                    /*
                     * User is authenticated but trying to
                     * open the wrong dashboard.
                     *
                     * Redirect to the correct dashboard.
                     */

                    window.location.replace(
                        getDashboardUrl(
                            accountType
                        )
                    );


                    return false;
                }
            }


            /*
             * Save valid account information.
             */

            saveLocalUserData(
                currentUser,
                accountType
            );


            return {

                authenticated:
                    true,

                emailConfirmed:
                    true,

                user:
                    currentUser,

                accountType:
                    accountType
            };

        } catch (error) {

            console.error(
                "Web3Jobs Auth: dashboard protection:",
                error
            );


            /*
             * IMPORTANT:
             * Never sign out because of a temporary
             * database/network error.
             */

            showDashboardAccessError();

            return false;
        }
    }


    /* =====================================================
       REDIRECT TO LOGIN
       ===================================================== */

    function redirectToLogin() {

        /*
         * Prevent duplicate redirects.
         */

        if (
            window.__Web3JobsAuthRedirecting
        ) {

            return;
        }


        window.__Web3JobsAuthRedirecting =
            true;


        const loginUrl =
            getLoginUrl();


        /*
         * Do not append current page automatically.
         *
         * This prevents a broken return URL from causing
         * the jobs/profile session problem.
         */

        window.location.replace(
            loginUrl
        );
    }


    /* =====================================================
       ADMIN DASHBOARD
    ===================================================== */

    async function protectAdminDashboard() {

        return await protectDashboard(
            "admin"
        );
    }


    /* =====================================================
       COMPANY DASHBOARD
    ===================================================== */

    async function protectCompanyDashboard() {

        return await protectDashboard(
            "company"
        );
    }


    /* =====================================================
       INDIVIDUAL DASHBOARD
    ===================================================== */

    async function protectIndividualDashboard() {

        return await protectDashboard(
            "individual"
        );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logoutUser() {

        const client =
            getClient();


        if (client) {

            try {

                await client.auth.signOut();

            } catch (error) {

                console.error(
                    "Web3Jobs Auth: logout:",
                    error
                );
            }
        }


        try {

            localStorage.removeItem(
                "web3jobs_account_type"
            );


            localStorage.removeItem(
                "web3jobs_user_id"
            );

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: localStorage:",
                error
            );
        }


        window.location.replace(
            getLoginUrl()
        );


        return true;
    }


    /* =====================================================
       RESEND CONFIRMATION
    ===================================================== */

    async function resendConfirmationEmail(
        email
    ) {

        const client =
            getClient();


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

                    type:
                        "signup",

                    email:
                        email,

                    options: {

                        emailRedirectTo:
                            getLoginUrl()

                    }

                });


            if (error) {

                showAuthError(
                    error
                );

                return false;
            }


            showAuthMessage(
                "تم إرسال رسالة تأكيد جديدة.",
                "A new confirmation email has been sent.",
                "success"
            );


            return true;

        } catch (error) {

            showAuthError(
                error
            );

            return false;
        }
    }


    /* =====================================================
       RESET PASSWORD
    ===================================================== */

    async function resetPassword(
        email
    ) {

        const client =
            getClient();


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

                showAuthError(
                    error
                );

                return false;
            }


            showAuthMessage(
                "تم إرسال رابط إعادة تعيين كلمة المرور.",
                "Password reset link has been sent.",
                "success"
            );


            return true;

        } catch (error) {

            showAuthError(
                error
            );

            return false;
        }
    }


    /* =====================================================
       AUTH ERROR
    ===================================================== */

    function showAuthError(
        error
    ) {

        const raw =
            String(
                error?.message ||
                error?.error_description ||
                error ||
                "Authentication failed."
            );


        const text =
            raw.toLowerCase();


        console.error(
            "Web3Jobs AUTH ERROR:",
            error
        );


        if (
            text.includes(
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
            text.includes(
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
            text.includes("too many") ||
            text.includes("rate limit")
        ) {

            showAuthMessage(
                "تم تجاوز عدد المحاولات. انتظر قليلاً ثم حاول مرة أخرى.",
                "Too many attempts. Please wait and try again.",
                "error"
            );

            return;
        }


        if (
            text.includes("failed to fetch") ||
            text.includes("network") ||
            text.includes("fetch")
        ) {

            showAuthMessage(
                "تعذر الاتصال بخادم Supabase.",
                "Could not connect to Supabase.",
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


    /* =====================================================
       AUTH MESSAGE
    ===================================================== */

    function showAuthMessage(
        arabic,
        english,
        type = "info"
    ) {

        const element =
            document.getElementById(
                "auth-message"
            );


        if (!element) {

            console.log(
                arabic,
                english
            );

            return;
        }


        element.innerHTML =
            "";


        const box =
            document.createElement(
                "div"
            );


        box.className =
            "auth-message-box auth-message-" +
            type;


        const ar =
            document.createElement(
                "div"
            );


        ar.textContent =
            arabic;


        const en =
            document.createElement(
                "div"
            );


        en.textContent =
            english;


        box.appendChild(
            ar
        );


        box.appendChild(
            en
        );


        element.appendChild(
            box
        );


        element.style.display =
            "block";
    }


    /* =====================================================
       DASHBOARD ACCESS ERROR
    ===================================================== */

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

                    <h2>
                        Dashboard Access Error
                    </h2>

                    <p>
                        We could not verify your account type.
                        Your session has NOT been deleted.
                    </p>

                    <a
                        href="${AUTH_CONFIG.LOGIN_PAGE}"
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


    /* =====================================================
       PUBLIC PAGE CHECK
       ===================================================== */

    function isPublicPage() {

        const pathname =
            String(
                window.location.pathname
            )
                .toLowerCase();


        const publicPages = [

            "index.html",
            "jobs.html",
            "companies.html",
            "company-profile.html",
            "profile.html",
            "individual-profile.html",
            "login.html",
            "register.html",
            "signup.html",
            "roadmap.html"

        ];


        const filename =
            pathname
                .split("/")
                .pop();


        return (
            publicPages.includes(
                filename
            ) ||
            filename === ""
        );
    }


    /* =====================================================
       IMPORTANT:
       DO NOT PROTECT PUBLIC PAGES
    ===================================================== */

    function initializeAuth() {

        /*
         * This function intentionally DOES NOT:
         *
         * - redirect
         * - sign out
         * - call protectDashboard
         *
         * It only makes sure the Supabase client exists.
         */

        const client =
            getClient();


        if (!client) {

            console.warn(
                "Web3Jobs Auth: client unavailable."
            );

            return null;
        }


        console.log(
            "Web3Jobs Auth: Authentication system ready."
        );


        return client;
    }


    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */

    function listenAuthState(
        callback
    ) {

        const client =
            getClient();


        if (
            !client ||
            typeof callback !==
                "function"
        ) {

            return null;
        }


        try {

            return client.auth.onAuthStateChange(
                callback
            );

        } catch (error) {

            console.warn(
                "Web3Jobs Auth: auth state listener:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       GLOBAL API
    ===================================================== */

    window.Web3JobsAuth = {

        initialize:
            initializeAuth,

        getClient:
            getClient,

        getCurrentUser:
            getCurrentUser,

        getCurrentSession:
            getCurrentSession,

        getAccountType:
            getAccountType,

        isAdmin:
            isAdmin,

        login:
            loginUser,

        loginUser:
            loginUser,

        logout:
            logoutUser,

        logoutUser:
            logoutUser,

        resendConfirmation:
            resendConfirmationEmail,

        resetPassword:
            resetPassword,

        protectDashboard:
            protectDashboard,

        protectAdminDashboard:
            protectAdminDashboard,

        protectCompanyDashboard:
            protectCompanyDashboard,

        protectIndividualDashboard:
            protectIndividualDashboard,

        getDashboardUrl:
            getDashboardUrl,

        getLoginUrl:
            getLoginUrl,

        isEmailConfirmed:
            isEmailConfirmed,

        normalizeAccountType:
            normalizeAccountType,

        showMessage:
            showAuthMessage,

        showError:
            showAuthError,

        isPublicPage:
            isPublicPage,

        listenAuthState:
            listenAuthState

    };


    /* =====================================================
       GLOBAL COMPATIBILITY
    ===================================================== */

    window.getCurrentUser =
        getCurrentUser;


    window.getCurrentSession =
        getCurrentSession;


    window.getAccountType =
        getAccountType;


    window.isAdmin =
        isAdmin;


    window.protectDashboard =
        protectDashboard;


    window.protectAdminDashboard =
        protectAdminDashboard;


    window.protectCompanyDashboard =
        protectCompanyDashboard;


    window.protectIndividualDashboard =
        protectIndividualDashboard;


    /* =====================================================
       START
    ===================================================== */

    initializeAuth();


    console.log(
        "Web3Jobs Auth System loaded successfully."
    );

})();
