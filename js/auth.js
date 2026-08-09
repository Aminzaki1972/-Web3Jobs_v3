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
   - Profile creation after signup
   - Prevent unconfirmed users from dashboards
   - Arabic / English error messages
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


    /*
     * Preferred:
     * Global client from js/supabase.js
     */

    if (window.supabaseClient) {

        authSupabase = window.supabaseClient;

        return authSupabase;
    }


    /*
     * Fallback:
     * Global "supabase" client
     */

    if (
        typeof window.supabase !== "undefined" &&
        window.supabase &&
        typeof window.supabase.auth === "object"
    ) {

        authSupabase = window.supabase;

        return authSupabase;
    }


    console.error(
        "Web3Jobs Auth: Supabase client is not initialized."
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
        } = await client.auth.getUser();


        if (error) {

            console.error(
                "Get current user error:",
                error
            );

            return null;
        }


        return data?.user || null;

    } catch (error) {

        console.error(
            "Unexpected get user error:",
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


function getEmailConfirmationStatus(user) {

    if (!user) {

        return {

            confirmed: false,

            messageAr:
                "لم يتم العثور على حساب.",

            messageEn:
                "Account was not found."
        };
    }


    if (isEmailConfirmed(user)) {

        return {

            confirmed: true,

            messageAr:
                "تم تأكيد البريد الإلكتروني.",

            messageEn:
                "Email address is confirmed."
        };
    }


    return {

        confirmed: false,

        messageAr:
            "البريد الإلكتروني لم يتم تأكيده بعد.",

        messageEn:
            "Your email address has not been confirmed yet."
    };
}


/* =========================================================
   ACCOUNT TYPE
   ========================================================= */

function normalizeAccountType(accountType) {

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

async function getAccountType(userId = null) {

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
           1. PROFILES
           ------------------------------------------------- */

        const {
            data: profile,
            error: profileError
        } = await client
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
                return accountType;
            }
        }


        /* -------------------------------------------------
           2. COMPANY PROFILES
           ------------------------------------------------- */

        const {
            data: companyProfile,
            error: companyError
        } = await client
            .from("company_profiles")
            .select("id")
            .eq("id", id)
            .maybeSingle();


        if (
            !companyError &&
            companyProfile
        ) {

            return "company";
        }


        /* -------------------------------------------------
           3. USER METADATA
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

                return metadataType;
            }
        }


        return null;

    } catch (error) {

        console.error(
            "Get account type error:",
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
        } = await client
            .from("profiles")
            .upsert(
                profileData,
                {
                    onConflict: "id"
                }
            );


        if (error) {

            console.error(
                "Save profile error:",
                error
            );

            return false;
        }


        return true;

    } catch (error) {

        console.error(
            "Unexpected save profile error:",
            error
        );

        return false;
    }
}


/* =========================================================
   GET BASE URL
   ---------------------------------------------------------
   Important for GitHub Pages project repositories
   ========================================================= */

function getWeb3JobsBaseUrl() {

    const path =
        window.location.pathname;


    /*
     * Remove current filename
     */

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
   GET LOGIN URL
   ========================================================= */

function getLoginUrl() {

    return (
        getWeb3JobsBaseUrl() +
        "login.html"
    );
}


/* =========================================================
   GET DASHBOARD URL
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


    /* -------------------------------------------------
       NORMALIZE
       ------------------------------------------------- */

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


    /* -------------------------------------------------
       VALIDATION
       ------------------------------------------------- */

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
            "يرجى اختيار نوع الحساب: فرد أو شركة.",
            "Please select an account type: Individual or Company.",
            "error"
        );

        return {
            success: false
        };
    }


    /* -------------------------------------------------
       SIGN UP
       ------------------------------------------------- */

    try {

        const redirectUrl =
            getLoginUrl();


        const {
            data,
            error
        } = await client.auth.signUp({

            email,

            password,

            options: {

                emailRedirectTo:
                    redirectUrl,

                data: {

                    full_name:
                        fullName,

                    account_type:
                        accountType
                }
            }
        });


        /* -------------------------------------------------
           SUPABASE ERROR
           ------------------------------------------------- */

        if (error) {

            console.error(
                "Supabase sign up error:",
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


        /* -------------------------------------------------
           IMPORTANT FIX
           -------------------------------------------------
           Save profile immediately.

           Previously this was skipped when email
           confirmation was required.
           ------------------------------------------------- */

        const profileSaved =
            await saveUserProfile(
                user,
                accountType,
                fullName
            );


        if (!profileSaved) {

            console.warn(
                "Web3Jobs: User created but profile could not be saved."
            );

            /*
             * Do not destroy the Auth account.
             * Metadata still contains account_type.
             */
        }


        /* -------------------------------------------------
           EMAIL CONFIRMATION REQUIRED
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            showAuthMessage(
                "تم إنشاء حساب الشركة بنجاح. يرجى فتح رسالة التأكيد التي أرسلناها إلى بريدك الإلكتروني.",
                "Company account created successfully. Please open the confirmation email sent to your inbox.",
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


        /* -------------------------------------------------
           EMAIL ALREADY CONFIRMED
           ------------------------------------------------- */

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
            "Unexpected signup error:",
            error
        );


        showAuthMessage(
            "حدث خطأ غير متوقع أثناء إنشاء الحساب.",
            "An unexpected error occurred while creating your account.",
            "error"
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


    try {

        const {
            data,
            error
        } = await client.auth.signInWithPassword({

            email,

            password
        });


        if (error) {

            console.error(
                "Login error:",
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
                "تعذر تسجيل الدخول.",
                "Unable to sign in.",
                "error"
            );

            return {
                success: false
            };
        }


        /* -------------------------------------------------
           EMAIL CONFIRMATION
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();


            showAuthMessage(
                "البريد الإلكتروني لم يتم تأكيده. يرجى تأكيد البريد أولاً ثم تسجيل الدخول.",
                "Your email has not been confirmed. Please confirm your email before signing in.",
                "error"
            );


            return {

                success: false,

                emailNotConfirmed: true,

                user
            };
        }


        /* -------------------------------------------------
           GET ACCOUNT TYPE
           ------------------------------------------------- */

        let accountType =
            await getAccountType(
                user.id
            );


        /*
         * Metadata fallback
         */

        if (!accountType) {

            accountType =
                normalizeAccountType(
                    user.user_metadata?.account_type ||
                    user.user_metadata?.accountType ||
                    user.user_metadata?.role
                );
        }


        if (!accountType) {

            await client.auth.signOut();


            showAuthMessage(
                "لم يتم تحديد نوع الحساب. يرجى التواصل مع الدعم.",
                "Account type could not be determined. Please contact support.",
                "error"
            );


            return {

                success: false,

                accountTypeMissing: true
            };
        }


        /* -------------------------------------------------
           SUCCESS
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
            "Unexpected login error:",
            error
        );


        showAuthMessage(
            "حدث خطأ غير متوقع أثناء تسجيل الدخول.",
            "An unexpected error occurred during login.",
            "error"
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
        } = await client.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
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
            "Unexpected logout error:",
            error
        );


        showAuthMessage(
            "حدث خطأ أثناء تسجيل الخروج.",
            "An error occurred while signing out.",
            "error"
        );


        return false;
    }
}


/* =========================================================
   REDIRECT TO DASHBOARD
   ========================================================= */

function redirectToDashboard(
    accountType
) {

    window.location.href =
        getDashboardUrl(
            accountType
        );
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


        /* -------------------------------------------------
           NO USER
           ------------------------------------------------- */

        if (!user) {

            window.location.href =
                getLoginUrl();

            return false;
        }


        /* -------------------------------------------------
           EMAIL CONFIRMATION
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();


            window.location.href =
                getLoginUrl();

            return false;
        }


        /* -------------------------------------------------
           ACCOUNT TYPE
           ------------------------------------------------- */

        const accountType =
            await getAccountType(
                user.id
            );


        if (!accountType) {

            await client.auth.signOut();


            showAuthMessage(
                "تعذر تحديد نوع الحساب.",
                "Unable to determine account type.",
                "error"
            );


            window.location.href =
                getLoginUrl();

            return false;
        }


        /* -------------------------------------------------
           REQUIRED ACCOUNT TYPE
           ------------------------------------------------- */

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
            "Dashboard protection error:",
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
        async (
            event,
            session
        ) => {

            console.log(
                "Auth event:",
                event
            );


            if (
                event ===
                "USER_UPDATED"
            ) {

                const user =
                    session?.user;


                if (
                    user &&
                    isEmailConfirmed(user)
                ) {

                    console.log(
                        "Email confirmed successfully."
                    );
                }
            }
        }
    );
}


/* =========================================================
   RESEND CONFIRMATION EMAIL
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
        } = await client.auth.resend({

            type: "signup",

            email,

            options: {

                emailRedirectTo:
                    getLoginUrl()
            }
        });


        if (error) {

            console.error(
                "Resend confirmation error:",
                error
            );


            showAuthError(
                error
            );


            return false;
        }


        showAuthMessage(
            "تم إرسال رسالة تأكيد جديدة إلى بريدك الإلكتروني.",
            "A new confirmation email has been sent to your inbox.",
            "success"
        );


        return true;


    } catch (error) {

        console.error(
            "Unexpected resend error:",
            error
        );


        showAuthMessage(
            "تعذر إعادة إرسال رسالة التأكيد.",
            "Unable to resend the confirmation email.",
            "error"
        );


        return false;
    }
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function showAuthError(
    error
) {

    const message =
        String(
            error?.message ||
            error ||
            ""
        ).toLowerCase();


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
            "البريد الإلكتروني لم يتم تأكيده.",
            "Email address has not been confirmed.",
            "error"
        );

        return;
    }


    if (
        message.includes(
            "user already registered"
        )
    ) {

        showAuthMessage(
            "هذا البريد الإلكتروني مسجل بالفعل.",
            "This email address is already registered.",
            "error"
        );

        return;
    }


    if (
        message.includes(
            "password"
        ) &&
        (
            message.includes("6") ||
            message.includes("weak") ||
            message.includes("short")
        )
    ) {

        showAuthMessage(
            "كلمة المرور ضعيفة أو قصيرة.",
            "Password is too weak or too short.",
            "error"
        );

        return;
    }


    if (
        message.includes("email") &&
        message.includes("invalid")
    ) {

        showAuthMessage(
            "صيغة البريد الإلكتروني غير صحيحة.",
            "Invalid email address.",
            "error"
        );

        return;
    }


    if (
        message.includes("rate limit") ||
        message.includes("too many requests")
    ) {

        showAuthMessage(
            "تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.",
            "Too many attempts. Please wait a moment and try again.",
            "error"
        );

        return;
    }


    if (
        message.includes("failed to fetch") ||
        message.includes("network")
    ) {

        showAuthMessage(
            "تعذر الاتصال بالخادم. تحقق من الإنترنت وإعدادات Supabase.",
            "Unable to connect to the server. Check your internet connection and Supabase configuration.",
            "error"
        );

        return;
    }


    showAuthMessage(
        "حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.",
        "Authentication error. Please try again.",
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

        } catch (e) {}


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
