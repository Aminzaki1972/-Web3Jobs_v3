/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   ---------------------------------------------------------
   Features:
   - Sign Up
   - Email Confirmation
   - Login
   - Logout
   - Current User
   - Individual / Company detection
   - Correct dashboard redirect
   - GitHub Pages compatible URLs
   - Profile creation
   - Dashboard protection
   - Detailed authentication errors
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE
   ========================================================= */

let authSupabase = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeAuthSupabase() {

    if (authSupabase) {
        return authSupabase;
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth !== "undefined"
    ) {

        authSupabase =
            window.supabaseClient;

        console.log(
            "Web3Jobs Auth: Supabase client connected."
        );

        return authSupabase;
    }

    console.error(
        "Web3Jobs Auth: Supabase client is not available."
    );

    return null;
}


/* =========================================================
   GET SUPABASE CLIENT
   ========================================================= */

function getAuthSupabase() {

    const client =
        initializeAuthSupabase();

    if (!client) {

        showAuthMessage(
            "تعذر الاتصال بخدمة المصادقة.",
            "Authentication service is not available.",
            "error"
        );

        return null;
    }

    return client;
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
            "Web3Jobs unexpected getUser error:",
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

function normalizeAccountType(
    accountType
) {

    if (!accountType) {
        return null;
    }

    const value =
        String(accountType)
            .trim()
            .toLowerCase();

    if (
        value === "individual" ||
        value === "individuals" ||
        value === "person" ||
        value === "user" ||
        value === "candidate"
    ) {

        return "individual";
    }

    if (
        value === "company" ||
        value === "companies" ||
        value === "business" ||
        value === "employer"
    ) {

        return "company";
    }

    return null;
}


/* =========================================================
   GET ACCOUNT TYPE
   ========================================================= */

async function getAccountType(
    userId = null
) {

    const client =
        getAuthSupabase();

    if (!client) {
        return null;
    }

    try {

        const user =
            await getCurrentUser();

        const id =
            userId ||
            user?.id;

        if (!id) {
            return null;
        }


        /* -------------------------------------------------
           PROFILE
           ------------------------------------------------- */

        const {
            data: profile,
            error: profileError
        } =
            await client
                .from("profiles")
                .select("account_type")
                .eq("id", id)
                .maybeSingle();


        if (
            !profileError &&
            profile
        ) {

            const accountType =
                normalizeAccountType(
                    profile.account_type
                );

            if (accountType) {

                console.log(
                    "Web3Jobs account type from profiles:",
                    accountType
                );

                return accountType;
            }
        }


        if (profileError) {

            console.warn(
                "Web3Jobs profiles lookup:",
                profileError
            );
        }


        /* -------------------------------------------------
           COMPANY PROFILE
           ------------------------------------------------- */

        const {
            data: companyProfile,
            error: companyError
        } =
            await client
                .from("company_profiles")
                .select("id")
                .eq("id", id)
                .maybeSingle();


        if (
            !companyError &&
            companyProfile
        ) {

            console.log(
                "Web3Jobs account type from company_profiles: company"
            );

            return "company";
        }


        /* -------------------------------------------------
           USER METADATA
           ------------------------------------------------- */

        if (user) {

            const metadata =
                user.user_metadata || {};

            const metadataType =
                normalizeAccountType(
                    metadata.account_type ||
                    metadata.accountType ||
                    metadata.role ||
                    metadata.account_role
                );

            if (metadataType) {

                console.log(
                    "Web3Jobs account type from metadata:",
                    metadataType
                );

                return metadataType;
            }
        }


        return null;

    } catch (error) {

        console.error(
            "Web3Jobs getAccountType error:",
            error
        );

        return null;
    }
}


/* =========================================================
   SAVE USER PROFILE
   ========================================================= */

async function saveUserProfile(
    user,
    accountType,
    fullName = ""
) {

    const client =
        getAuthSupabase();

    if (!client || !user) {
        return false;
    }

    const normalizedType =
        normalizeAccountType(
            accountType
        );

    if (!normalizedType) {
        return false;
    }

    try {

        const profileData = {

            id:
                user.id,

            email:
                user.email || null,

            full_name:
                fullName ||
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                "",

            account_type:
                normalizedType,

            updated_at:
                new Date().toISOString()
        };


        const {
            error
        } =
            await client
                .from("profiles")
                .upsert(
                    profileData,
                    {
                        onConflict: "id"
                    }
                );


        if (error) {

            console.error(
                "Web3Jobs save profile error:",
                error
            );

            return false;
        }


        return true;

    } catch (error) {

        console.error(
            "Web3Jobs unexpected save profile error:",
            error
        );

        return false;
    }
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

function getDashboardUrl(
    accountType
) {

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
   SIGN UP
   ========================================================= */

async function signUpUser({
    email,
    password,
    fullName = "",
    accountType
}) {

    const client =
        getAuthSupabase();

    if (!client) {

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

    fullName =
        String(fullName || "")
            .trim();

    accountType =
        normalizeAccountType(
            accountType
        );


    if (!email) {

        showAuthMessage(
            "يرجى إدخال البريد الإلكتروني.",
            "Please enter your email address.",
            "error"
        );

        return {
            success: false
        };
    }


    if (!password) {

        showAuthMessage(
            "يرجى إدخال كلمة المرور.",
            "Please enter your password.",
            "error"
        );

        return {
            success: false
        };
    }


    if (password.length < 6) {

        showAuthMessage(
            "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل.",
            "Password must contain at least 6 characters.",
            "error"
        );

        return {
            success: false
        };
    }


    if (!accountType) {

        showAuthMessage(
            "يرجى اختيار نوع الحساب.",
            "Please select an account type.",
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
            await client.auth.signUp({

                email,

                password,

                options: {

                    emailRedirectTo:
                        getLoginUrl(),

                    data: {

                        full_name:
                            fullName,

                        account_type:
                            accountType
                    }
                }
            });


        if (error) {

            console.error(
                "Web3Jobs signup error:",
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


        const user =
            data?.user;


        if (!user) {

            showAuthMessage(
                "تعذر إنشاء الحساب.",
                "Unable to create the account.",
                "error"
            );

            return {
                success: false
            };
        }


        /*
         * Save profile.
         */

        const profileSaved =
            await saveUserProfile(
                user,
                accountType,
                fullName
            );


        if (!isEmailConfirmed(user)) {

            showAuthMessage(
                "تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني أولاً.",
                "Account created. Please confirm your email address first.",
                "success"
            );

            return {

                success: true,

                requiresEmailConfirmation: true,

                profileSaved,

                user,

                accountType
            };
        }


        showAuthMessage(
            "تم إنشاء الحساب بنجاح.",
            "Account created successfully.",
            "success"
        );


        return {

            success: true,

            requiresEmailConfirmation: false,

            profileSaved,

            user,

            accountType
        };

    } catch (error) {

        console.error(
            "Web3Jobs unexpected signup error:",
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


    if (!email) {

        showAuthMessage(
            "يرجى إدخال البريد الإلكتروني.",
            "Please enter your email address.",
            "error"
        );

        return {
            success: false
        };
    }


    if (!password) {

        showAuthMessage(
            "يرجى إدخال كلمة المرور.",
            "Please enter your password.",
            "error"
        );

        return {
            success: false
        };
    }


    console.log(
        "Web3Jobs login started for:",
        email
    );


    try {

        const {
            data,
            error
        } =
            await client.auth.signInWithPassword({

                email,

                password
            });


        /*
         * IMPORTANT:
         * Show the real Supabase error in console.
         */

        console.log(
            "Web3Jobs login response:",
            data
        );

        console.log(
            "Web3Jobs login error:",
            error
        );


        /* -------------------------------------------------
           LOGIN ERROR
           ------------------------------------------------- */

        if (error) {

            console.error(
                "Web3Jobs Supabase login error:",
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


        const user =
            data?.user;


        if (!user) {

            showAuthMessage(
                "لم يتم العثور على المستخدم بعد تسجيل الدخول.",
                "No user was returned after login.",
                "error"
            );

            return {
                success: false
            };
        }


        console.log(
            "Web3Jobs authenticated user:",
            user
        );


        /* -------------------------------------------------
           EMAIL CONFIRMATION
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();


            showAuthMessage(
                "البريد الإلكتروني غير مؤكد. افتح رسالة التأكيد أولاً.",
                "Your email is not confirmed. Please open the confirmation email first.",
                "error"
            );


            return {

                success: false,

                emailNotConfirmed: true,

                user
            };
        }


        /* -------------------------------------------------
           ACCOUNT TYPE
           ------------------------------------------------- */

        let accountType =
            await getAccountType(
                user.id
            );


        if (!accountType) {

            accountType =
                normalizeAccountType(
                    user.user_metadata?.account_type ||
                    user.user_metadata?.accountType ||
                    user.user_metadata?.role ||
                    user.user_metadata?.account_role
                );
        }


        console.log(
            "Web3Jobs detected account type:",
            accountType
        );


        if (!accountType) {

            showAuthMessage(
                "تم تسجيل الدخول، لكن لم يتم تحديد نوع الحساب.",
                "Login succeeded, but the account type could not be determined.",
                "error"
            );


            await client.auth.signOut();


            return {

                success: false,

                accountTypeMissing: true,

                user
            };
        }


        /* -------------------------------------------------
           LOGIN SUCCESS
           ------------------------------------------------- */

        showAuthMessage(
            "تم تسجيل الدخول بنجاح.",
            "Login successful.",
            "success"
        );


        return {

            success: true,

            user,

            accountType
        };


    } catch (error) {

        console.error(
            "Web3Jobs unexpected login exception:",
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

        const {
            error
        } =
            await client.auth.signOut();


        if (error) {

            console.error(
                "Web3Jobs logout error:",
                error
            );

            showAuthError(
                error
            );

            return false;
        }


        window.location.href =
            getWeb3JobsBaseUrl() +
            "index.html";


        return true;

    } catch (error) {

        console.error(
            "Web3Jobs unexpected logout error:",
            error
        );

        return false;
    }
}


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToDashboard(
    accountType
) {

    const url =
        getDashboardUrl(
            accountType
        );

    console.log(
        "Web3Jobs redirecting to:",
        url
    );

    window.location.href =
        url;
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

        const user =
            await getCurrentUser();


        if (!user) {

            window.location.href =
                getLoginUrl();

            return false;
        }


        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();

            window.location.href =
                getLoginUrl();

            return false;
        }


        const accountType =
            await getAccountType(
                user.id
            );


        if (!accountType) {

            await client.auth.signOut();

            window.location.href =
                getLoginUrl();

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

                redirectToDashboard(
                    accountType
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
            "Web3Jobs dashboard protection error:",
            error
        );

        window.location.href =
            getLoginUrl();

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
   AUTH STATE LISTENER
   ========================================================= */

function initializeAuthStateListener() {

    const client =
        initializeAuthSupabase();

    if (!client) {
        return;
    }


    client.auth.onAuthStateChange(
        (
            event,
            session
        ) => {

            console.log(
                "Web3Jobs Auth event:",
                event,
                session
            );
        }
    );
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
            await client.auth.resend({

                type: "signup",

                email,

                options: {

                    emailRedirectTo:
                        getLoginUrl()
                }
            });


        if (error) {

            console.error(
                "Web3Jobs resend error:",
                error
            );

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

        console.error(
            "Web3Jobs unexpected resend error:",
            error
        );

        showAuthError(
            error
        );

        return false;
    }
}


/* =========================================================
   DETAILED AUTH ERROR
   ========================================================= */

function showAuthError(
    error
) {

    const rawMessage =
        String(
            error?.message ||
            error?.error_description ||
            error ||
            ""
        );

    const message =
        rawMessage.toLowerCase();


    console.error(
        "Web3Jobs AUTH ERROR DETAILS:",
        {
            message:
                rawMessage,

            status:
                error?.status,

            code:
                error?.code,

            name:
                error?.name
        }
    );


    /* -----------------------------------------------------
       INVALID LOGIN
       ----------------------------------------------------- */

    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        showAuthMessage(
            "بيانات تسجيل الدخول غير صحيحة. تأكد من البريد وكلمة المرور.",
            "Invalid login credentials. Please verify your email and password.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       EMAIL NOT CONFIRMED
       ----------------------------------------------------- */

    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        showAuthMessage(
            "البريد الإلكتروني غير مؤكد. يرجى تأكيده أولاً.",
            "Email is not confirmed. Please confirm it first.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       USER ALREADY REGISTERED
       ----------------------------------------------------- */

    if (
        message.includes(
            "user already registered"
        ) ||
        message.includes(
            "already registered"
        )
    ) {

        showAuthMessage(
            "هذا البريد الإلكتروني مسجل بالفعل.",
            "This email address is already registered.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       INVALID EMAIL
       ----------------------------------------------------- */

    if (
        message.includes("invalid email") ||
        (
            message.includes("email") &&
            message.includes("invalid")
        )
    ) {

        showAuthMessage(
            "صيغة البريد الإلكتروني غير صحيحة.",
            "Invalid email address.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       PASSWORD
       ----------------------------------------------------- */

    if (
        message.includes("password") &&
        (
            message.includes("weak") ||
            message.includes("short") ||
            message.includes("6")
        )
    ) {

        showAuthMessage(
            "كلمة المرور ضعيفة أو قصيرة.",
            "Password is too weak or too short.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       RATE LIMIT
       ----------------------------------------------------- */

    if (
        message.includes("rate limit") ||
        message.includes("too many requests")
    ) {

        showAuthMessage(
            "تم تجاوز عدد المحاولات. انتظر قليلاً ثم حاول مرة أخرى.",
            "Too many attempts. Please wait and try again.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       NETWORK
       ----------------------------------------------------- */

    if (
        message.includes("failed to fetch") ||
        message.includes("network") ||
        message.includes("fetch")
    ) {

        showAuthMessage(
            "تعذر الاتصال بخادم المصادقة. تحقق من الإنترنت وإعدادات Supabase.",
            "Unable to connect to the authentication server. Check your internet connection and Supabase settings.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       FALLBACK
       ----------------------------------------------------- */

    showAuthMessage(
        "حدث خطأ أثناء تسجيل الدخول: " +
        rawMessage,

        "Authentication error: " +
        rawMessage,

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


        try {

            element.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "center"
            });

        } catch (error) {}

        return;
    }


    if (type === "error") {

        console.error(
            messageAr,
            messageEn
        );

    } else {

        console.log(
            messageAr,
            messageEn
        );
    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeAuthHtml(
    value
) {

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

    initializeAuthStateListener();


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
   AUTO INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeAuthPage();

    }
);


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3JobsAuth = {

    initialize:
        initializeAuthSupabase,

    getCurrentUser,

    getAccountType,

    signUp:
        signUpUser,

    login:
        loginUser,

    logout:
        logoutUser,

    resendConfirmation:
        resendConfirmationEmail,

    protectDashboard,

    protectCompanyDashboard,

    protectIndividualDashboard,

    redirectToDashboard,

    getDashboardUrl,

    isEmailConfirmed,

    showMessage:
        showAuthMessage,

    showError:
        showAuthError
};


/* =========================================================
   END OF FILE
   ========================================================= */
