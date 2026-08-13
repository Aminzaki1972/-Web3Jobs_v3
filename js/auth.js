/* =========================================================
   Web3Jobs v3
   File: js/auth.js

   Unified Authentication
   Session-Safe Version
   ---------------------------------------------------------
   IMPORTANT:
   - Uses ONLY js/supabase.js client.
   - Never creates another Supabase client.
   - Never redirects from getCurrentUser().
   - Never redirects from getCurrentSession().
   - Dashboard protection redirects ONLY when a protected
     dashboard actually requires authentication.
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       SUPABASE CLIENT
    ===================================================== */

    function getClient() {

        /*
         * PRIMARY:
         * Use the single client created by supabase.js.
         */

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {

            const client =
                window.Web3JobsSupabase.getClient();

            if (
                client &&
                typeof client.from === "function"
            ) {

                return client;
            }
        }


        /*
         * COMPATIBILITY:
         * Reuse the existing global client.
         *
         * NEVER create another client here.
         */

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

            const result =
                await client.auth.getSession();


            if (
                result &&
                result.data &&
                result.data.session
            ) {

                return result.data.session;
            }


            return null;

        } catch (error) {

            /*
             * IMPORTANT:
             * Never redirect here.
             */

            console.warn(
                "Web3Jobs: Unable to read current session:",
                error
            );

            return null;
        }
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


        /*
         * First use the existing session.
         *
         * This avoids unnecessary auth requests.
         */

        try {

            const session =
                await getCurrentSession();


            if (
                session &&
                session.user
            ) {

                return session.user;
            }

        } catch (error) {

            console.warn(
                "Web3Jobs: Session read failed:",
                error
            );
        }


        /*
         * Fallback to getUser().
         */

        try {

            const result =
                await client.auth.getUser();


            if (
                result &&
                result.data &&
                result.data.user
            ) {

                return result.data.user;
            }


        } catch (error) {

            /*
             * IMPORTANT:
             * No redirect.
             */

            console.warn(
                "Web3Jobs: getUser failed:",
                error
            );
        }


        return null;
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


        for (const value of values) {

            const type =
                normalizeAccountType(value);


            if (type) {
                return type;
            }
        }


        return null;
    }


    /* =====================================================
       ADMIN CHECK
       ===================================================== */

    async function isAdmin(userId = null) {

        const client =
            getClient();


        if (!client) {
            return false;
        }


        let user =
            null;


        if (!userId) {

            user =
                await getCurrentUser();

        }


        const id =
            userId ||
            user?.id;


        if (!id) {
            return false;
        }


        /* =================================================
           CHECK PROFILES BY ID
        ================================================= */

        try {

            const result =
                await client
                    .from("profiles")
                    .select("id,role")
                    .eq("id", id)
                    .maybeSingle();


            if (
                !result.error &&
                result.data
            ) {

                if (
                    normalizeAccountType(
                        result.data.role
                    ) === "admin"
                ) {

                    return true;
                }
            }

        } catch (error) {

            console.warn(
                "Web3Jobs admin profiles check:",
                error
            );
        }


        /* =================================================
           CHECK PROFILES BY USER ID
        ================================================= */

        try {

            const result =
                await client
                    .from("profiles")
                    .select("id,user_id,role")
                    .eq("user_id", id)
                    .maybeSingle();


            if (
                !result.error &&
                result.data
            ) {

                if (
                    normalizeAccountType(
                        result.data.role
                    ) === "admin"
                ) {

                    return true;
                }
            }

        } catch (error) {

            console.warn(
                "Web3Jobs admin user_id check:",
                error
            );
        }


        return false;
    }


    /* =====================================================
       ACCOUNT TYPE
       ===================================================== */

    async function getAccountType(userId = null) {

        const client =
            getClient();


        if (!client) {
            return null;
        }


        const user =
            await getCurrentUser();


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
           2. COMPANY PROFILE BY USER ID
        ================================================= */

        try {

            const result =
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
                !result.error &&
                result.data
            ) {

                return "company";
            }

        } catch (error) {

            console.warn(
                "Web3Jobs company_profiles user_id:",
                error
            );
        }


        /* =================================================
           3. COMPANY PROFILE BY ID
        ================================================= */

        try {

            const result =
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
                !result.error &&
                result.data
            ) {

                return "company";
            }

        } catch (error) {

            console.warn(
                "Web3Jobs company_profiles id:",
                error
            );
        }


        /* =================================================
           4. USER METADATA
        ================================================= */

        const metadata =
            user?.user_metadata ||
            {};


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

            const result =
                await client
                    .from("profiles")
                    .select("*")
                    .eq(
                        "id",
                        id
                    )
                    .maybeSingle();


            if (
                !result.error &&
                result.data
            ) {

                const type =
                    findAccountType(
                        result.data
                    );


                if (type) {
                    return type;
                }
            }

        } catch (error) {

            console.warn(
                "Web3Jobs profiles id:",
                error
            );
        }


        /* =================================================
           6. PROFILES BY USER ID
        ================================================= */

        try {

            const result =
                await client
                    .from("profiles")
                    .select("*")
                    .eq(
                        "user_id",
                        id
                    )
                    .maybeSingle();


            if (
                !result.error &&
                result.data
            ) {

                const type =
                    findAccountType(
                        result.data
                    );


                if (type) {
                    return type;
                }
            }

        } catch (error) {

            console.warn(
                "Web3Jobs profiles user_id:",
                error
            );
        }


        /* =================================================
           7. JOBS FALLBACK
        ================================================= */

        try {

            const result =
                await client
                    .from("jobs")
                    .select("id")
                    .eq(
                        "user_id",
                        id
                    )
                    .limit(1);


            if (
                !result.error &&
                Array.isArray(result.data) &&
                result.data.length > 0
            ) {

                return "company";
            }

        } catch (error) {

            console.warn(
                "Web3Jobs jobs account detection:",
                error
            );
        }


        /*
         * IMPORTANT:
         *
         * Do NOT automatically assume individual here
         * because an unknown account should not accidentally
         * receive the wrong permissions.
         */

        return null;
    }


    /* =====================================================
       BASE URL
       ===================================================== */

    function getBaseUrl() {

        const path =
            window.location.pathname;


        const index =
            path.lastIndexOf("/");


        const directory =
            index >= 0
                ? path.substring(
                    0,
                    index + 1
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
            "login.html"
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
                "admin-dashboard.html"
            );
        }


        if (type === "company") {

            return (
                getBaseUrl() +
                "company-dashboard.html"
            );
        }


        if (type === "individual") {

            return (
                getBaseUrl() +
                "dashboard.html"
            );
        }


        return (
            getBaseUrl() +
            "index.html"
        );
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
            String(
                email || ""
            )
                .trim()
                .toLowerCase();


        password =
            String(
                password || ""
            );


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

            const result =
                await client.auth.signInWithPassword({
                    email,
                    password
                });


            if (result.error) {

                showAuthError(
                    result.error
                );

                return {
                    success: false,
                    error: result.error
                };
            }


            const loggedUser =
                result.data?.user;


            const session =
                result.data?.session;


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


            /* =================================================
               EMAIL CONFIRMATION
            ================================================= */

            if (
                !isEmailConfirmed(
                    loggedUser
                )
            ) {

                /*
                 * Sign out only because the account is not
                 * allowed to continue until email confirmation.
                 */

                try {
                    await client.auth.signOut();
                } catch (signOutError) {
                    console.warn(
                        "Web3Jobs signout after unconfirmed email:",
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


            /* =================================================
               ACCOUNT TYPE
            ================================================= */

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


            /* =================================================
               SAVE LOCAL DATA
            ================================================= */

            try {

                localStorage.setItem(
                    "web3jobs_account_type",
                    accountType
                );


                localStorage.setItem(
                    "web3jobs_user_id",
                    loggedUser.id
                );

            } catch (error) {

                console.warn(
                    "Web3Jobs localStorage:",
                    error
                );
            }


            /* =================================================
               DASHBOARD URL
            ================================================= */

            const dashboardUrl =
                getDashboardUrl(
                    accountType
                );


            return {

                success: true,

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
                "Web3Jobs login exception:",
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
       ===================================================== */

    async function protectDashboard(
        requiredAccountType = null
    ) {

        const client =
            getClient();


        if (!client) {

            /*
             * This function is only for protected pages.
             * Therefore redirect is allowed here.
             */

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }


        try {

            const session =
                await getCurrentSession();


            /*
             * NO SESSION
             *
             * Redirect only because this is a protected
             * dashboard.
             */

            if (
                !session ||
                !session.user
            ) {

                window.location.replace(
                    getLoginUrl()
                );

                return false;
            }


            const currentUser =
                session.user;


            /* =================================================
               EMAIL CONFIRMATION
            ================================================= */

            if (
                !isEmailConfirmed(
                    currentUser
                )
            ) {

                try {

                    await client.auth.signOut();

                } catch (signOutError) {

                    console.warn(
                        "Web3Jobs dashboard signout:",
                        signOutError
                    );
                }


                window.location.replace(
                    getLoginUrl()
                );


                return false;
            }


            /* =================================================
               ACCOUNT TYPE
            ================================================= */

            const accountType =
                await getAccountType(
                    currentUser.id
                );


            if (!accountType) {

                showDashboardAccessError();

                return false;
            }


            /* =================================================
               REQUIRED ACCOUNT TYPE
            ================================================= */

            if (requiredAccountType) {

                const required =
                    normalizeAccountType(
                        requiredAccountType
                    );


                if (
                    required &&
                    accountType !== required
                ) {

                    /*
                     * Redirect only when the authenticated
                     * user is opening the wrong dashboard.
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
             * Dashboard successfully authenticated.
             */

            try {

                localStorage.setItem(
                    "web3jobs_account_type",
                    accountType
                );


                localStorage.setItem(
                    "web3jobs_user_id",
                    currentUser.id
                );

            } catch (error) {

                console.warn(
                    "Web3Jobs dashboard localStorage:",
                    error
                );
            }


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
                "Web3Jobs dashboard protection:",
                error
            );


            showDashboardAccessError();

            return false;
        }
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
                    "Web3Jobs logout:",
                    error
                );
            }
        }


        /*
         * Remove only Web3Jobs helper data.
         */

        try {

            localStorage.removeItem(
                "web3jobs_account_type"
            );

            localStorage.removeItem(
                "web3jobs_user_id"
            );

        } catch (error) {

            console.warn(
                "Web3Jobs localStorage:",
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
            String(
                email || ""
            )
                .trim()
                .toLowerCase();


        if (!email) {
            return false;
        }


        try {

            const result =
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


            if (result.error) {

                showAuthError(
                    result.error
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
            String(
                email || ""
            )
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

            const result =
                await client.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            getLoginUrl()
                    }
                );


            if (result.error) {

                showAuthError(
                    result.error
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

    function showAuthError(error) {

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


        element.innerHTML = "";


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


        box.appendChild(ar);
        box.appendChild(en);


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


    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.Web3JobsAuth = {

        initialize:
            getClient,

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
            showAuthError

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
       AUTH STATE LISTENER
       ===================================================== */

    function initializeAuthStateListener() {

        const client =
            getClient();


        if (
            !client ||
            !client.auth
        ) {

            return;
        }


        /*
         * IMPORTANT:
         *
         * This listener ONLY observes authentication.
         *
         * It does NOT redirect when the user visits jobs.
         *
         * It does NOT sign the user out.
         */

        try {

            client.auth.onAuthStateChange(
                function (event, session) {

                    console.log(
                        "Web3Jobs Auth State:",
                        event
                    );


                    if (
                        session &&
                        session.user
                    ) {

                        try {

                            localStorage.setItem(
                                "web3jobs_user_id",
                                session.user.id
                            );

                        } catch (error) {

                            console.warn(
                                "Web3Jobs auth storage:",
                                error
                            );
                        }
                    }

                }
            );

        } catch (error) {

            console.warn(
                "Web3Jobs auth listener:",
                error
            );
        }
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initializeAuth() {

        /*
         * Do not create a new Supabase client.
         *
         * Just connect to the existing unified client.
         */

        const client =
            getClient();


        if (!client) {

            console.error(
                "Web3Jobs Auth: Supabase client unavailable."
            );

            return;
        }


        initializeAuthStateListener();


        console.log(
            "Web3Jobs Auth System loaded successfully."
        );
    }


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeAuth,
            {
                once: true
            }
        );

    } else {

        initializeAuth();

    }

})();
