/* =========================================================
Web3Jobs v3
File: js/auth.js

Unified Authentication
Company + Individual Accounts

IMPORTANT:
company_profiles has priority for company detection.
========================================================= */

"use strict";

(function () {

/* =========================================================
   SUPABASE
   ========================================================= */

function getClient() {

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

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function" &&
        window.SUPABASE_URL &&
        window.SUPABASE_ANON_KEY
    ) {
        return window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );
    }

    return null;
}


/* =========================================================
   CURRENT USER
   ========================================================= */

async function getCurrentUser() {

    const client = getClient();

    if (!client) return null;

    try {

        const {
            data,
            error
        } = await client.auth.getUser();

        if (error) {
            console.error(
                "Web3Jobs getUser:",
                error.message
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {

        console.error(
            "Web3Jobs current user:",
            error
        );

        return null;
    }
}


/* =========================================================
   CURRENT SESSION
   ========================================================= */

async function getCurrentSession() {

    const client = getClient();

    if (!client) return null;

    try {

        const {
            data,
            error
        } = await client.auth.getSession();

        if (error) {

            console.error(
                "Web3Jobs getSession:",
                error.message
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "Web3Jobs session:",
            error
        );

        return null;
    }
}


/* =========================================================
   EMAIL CONFIRMATION
   ========================================================= */

function isEmailConfirmed(user) {

    if (!user) return false;

    return Boolean(
        user.email_confirmed_at ||
        user.confirmed_at
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
        [
            "company",
            "companies",
            "business",
            "employer",
            "organization",
            "company_account",
            "company-account",
            "شركة"
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
            "individual-account",
            "فرد",
            "فردي",
            "فردى"
        ].includes(type)
    ) {
        return "individual";
    }


    return null;
}


/* =========================================================
   FIND TYPE IN OBJECT
   ========================================================= */

function findAccountType(object) {

    if (!object) return null;

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


/* =========================================================
   ACCOUNT TYPE
   ========================================================= */

async function getAccountType(userId = null) {

    const client = getClient();

    if (!client) return null;


    const user =
        await getCurrentUser();


    const id =
        userId ||
        user?.id;


    if (!id) {
        return null;
    }


    /* =====================================================
       1. COMPANY PROFILE
       -----------------------------------------------------
       THIS IS THE MOST IMPORTANT CHECK.

       If a company_profiles record exists for this user,
       the account is ALWAYS treated as company.
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("company_profiles")
                .select("id,user_id,company_name")
                .eq("user_id", id)
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            console.log(
                "Web3Jobs account type: COMPANY",
                "source: company_profiles"
            );

            return "company";
        }

    } catch (error) {

        console.warn(
            "company_profiles user_id check:",
            error.message
        );
    }


    /* =====================================================
       2. COMPANY PROFILE BY ID
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("company_profiles")
                .select("id,user_id,company_name")
                .eq("id", id)
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            console.log(
                "Web3Jobs account type: COMPANY",
                "source: company_profiles.id"
            );

            return "company";
        }

    } catch (error) {

        console.warn(
            "company_profiles id check:",
            error.message
        );
    }


    /* =====================================================
       3. AUTH METADATA
       ===================================================== */

    const metadata =
        user?.user_metadata || {};


    const metadataType =
        findAccountType(metadata);


    if (metadataType) {

        console.log(
            "Web3Jobs account type:",
            metadataType,
            "source: auth metadata"
        );

        return metadataType;
    }


    /* =====================================================
       4. PROFILES BY id
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select("*")
                .eq("id", id)
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            const type =
                findAccountType(data);


            if (type) {

                console.log(
                    "Web3Jobs account type:",
                    type,
                    "source: profiles.id"
                );

                return type;
            }
        }

    } catch (error) {

        console.warn(
            "profiles.id check:",
            error.message
        );
    }


    /* =====================================================
       5. PROFILES BY user_id
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select("*")
                .eq("user_id", id)
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            const type =
                findAccountType(data);


            if (type) {

                console.log(
                    "Web3Jobs account type:",
                    type,
                    "source: profiles.user_id"
                );

                return type;
            }
        }

    } catch (error) {

        console.warn(
            "profiles.user_id check:",
            error.message
        );
    }


    /* =====================================================
       6. JOBS FALLBACK
       ===================================================== */

    try {

        const {
            data,
            error
        } =
            await client
                .from("jobs")
                .select("id")
                .eq("user_id", id)
                .limit(1);


        if (
            !error &&
            Array.isArray(data) &&
            data.length > 0
        ) {

            console.log(
                "Web3Jobs account type: COMPANY",
                "source: jobs"
            );

            return "company";
        }

    } catch (error) {

        console.warn(
            "jobs account detection:",
            error.message
        );
    }


    /* =====================================================
       NO TYPE FOUND
       ===================================================== */

    console.warn(
        "Web3Jobs: account type could not be determined.",
        id
    );

    return null;
}


/* =========================================================
   BASE URL
   ========================================================= */

function getBaseUrl() {

    const path =
        window.location.pathname;

    const index =
        path.lastIndexOf("/");


    const directory =
        index >= 0
            ? path.substring(0, index + 1)
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
        getBaseUrl() +
        "login.html"
    );
}


/* =========================================================
   DASHBOARD URL
   ========================================================= */

function getDashboardUrl(accountType) {

    const type =
        normalizeAccountType(accountType);


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


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

    const client = getClient();


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

        const {
            data,
            error
        } =
            await client.auth.signInWithPassword({
                email,
                password
            });


        if (error) {

            showAuthError(error);

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


        /* =================================================
           EMAIL
           ================================================= */

        if (
            !isEmailConfirmed(
                loggedUser
            )
        ) {

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
                loggedUser.id
            );


        console.log(
            "Web3Jobs LOGIN:",
            {
                userId: loggedUser.id,
                email: loggedUser.email,
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
           DASHBOARD
           ================================================= */

        const dashboardUrl =
            getDashboardUrl(
                accountType
            );


        return {
            success: true,
            user: loggedUser,
            session,
            accountType,
            dashboardUrl
        };


    } catch (error) {

        console.error(
            "Web3Jobs login:",
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
        getClient();


    if (!client) {

        window.location.replace(
            getLoginUrl()
        );

        return false;
    }


    try {

        const session =
            await getCurrentSession();


        if (!session?.user) {

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }


        const currentUser =
            session.user;


        /* =================================================
           EMAIL
           ================================================= */

        if (
            !isEmailConfirmed(
                currentUser
            )
        ) {

            await client.auth.signOut();


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
            user: currentUser,
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


/* =========================================================
   RESEND CONFIRMATION
   ========================================================= */

async function resendConfirmationEmail(email) {

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
            "تم إرسال رسالة تأكيد جديدة.",
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
   RESET PASSWORD
   ========================================================= */

async function resetPassword(email) {

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


/* =========================================================
   AUTH MESSAGE
   ========================================================= */

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


    element.appendChild(box);


    element.style.display =
        "block";
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


/* =========================================================
   GLOBAL API
   ========================================================= */

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


console.log(
    "Web3Jobs Auth System loaded successfully."
);

})();
