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
   - Prevent unconfirmed users from entering dashboards
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
     * Use the global Supabase client created by js/supabase.js
     */

    if (window.supabaseClient) {

        authSupabase = window.supabaseClient;

        return authSupabase;
    }

    /*
     * Fallback:
     * If supabase.js exposes "supabase"
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
   AUTH HELPERS
   ========================================================= */

/**
 * Get Supabase client
 */
function getAuthSupabase() {

    const client = initializeAuthSupabase();

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


/**
 * Get current authenticated user
 */
async function getCurrentUser() {

    const client = getAuthSupabase();

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

/**
 * Check whether user confirmed email
 */
function isEmailConfirmed(user) {

    if (!user) {
        return false;
    }

    /*
     * Supabase normally provides:
     * email_confirmed_at
     */

    return Boolean(
        user.email_confirmed_at
    );
}


/**
 * Get confirmation status
 */
function getEmailConfirmationStatus(user) {

    if (!user) {

        return {
            confirmed: false,
            messageAr: "لم يتم العثور على حساب.",
            messageEn: "Account was not found."
        };
    }

    if (isEmailConfirmed(user)) {

        return {
            confirmed: true,
            messageAr: "تم تأكيد البريد الإلكتروني.",
            messageEn: "Email address is confirmed."
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

/**
 * Normalize account type
 */
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


/**
 * Get account type from profile
 */
async function getAccountType(userId = null) {

    const client = getAuthSupabase();

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
           Try profiles table
           ------------------------------------------------- */

        const {
            data: profile,
            error: profileError
        } = await client
            .from("profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();


        if (
            !profileError &&
            profile
        ) {

            const accountType =
                normalizeAccountType(
                    profile.account_type ||
                    profile.accountType ||
                    profile.role ||
                    profile.account_role
                );

            if (accountType) {

                return accountType;
            }
        }


        /* -------------------------------------------------
           Try company_profiles table
           ------------------------------------------------- */

        const {
            data: companyProfile,
            error: companyError
        } = await client
            .from("company_profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();


        if (
            !companyError &&
            companyProfile
        ) {

            return "company";
        }


        /* -------------------------------------------------
           Try user metadata
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
   SAVE PROFILE
   ========================================================= */

/**
 * Create / update user profile
 */
async function saveUserProfile(
    user,
    accountType,
    fullName = ""
) {

    const client = getAuthSupabase();

    if (!client || !user) {
        return false;
    }

    try {

        const profileData = {

            id: user.id,

            email:
                user.email || null,

            full_name:
                fullName ||
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                "",

            account_type:
                accountType,

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
   SIGN UP
   ========================================================= */

/**
 * Register new user
 *
 * Expected:
 *
 * {
 *   email: "...",
 *   password: "...",
 *   fullName: "...",
 *   accountType: "individual" | "company"
 * }
 */
async function signUpUser({
    email,
    password,
    fullName = "",
    accountType
}) {

    const client = getAuthSupabase();

    if (!client) {
        return {
            success: false
        };
    }


    /* -------------------------------------------------
       Validation
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
        normalizeAccountType(accountType);


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
       Supabase Sign Up
       ------------------------------------------------- */

    try {

        const redirectUrl =
            `${window.location.origin}/login.html`;


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
           If email confirmation is required
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            /*
             * Supabase may already have created the user.
             * We do not force dashboard access.
             */

            showAuthMessage(
                "تم إنشاء الحساب. يرجى فتح رسالة التأكيد التي أرسلناها إلى بريدك الإلكتروني.",
                "Account created. Please open the confirmation email sent to your inbox.",
                "success"
            );


            return {

                success: true,

                requiresEmailConfirmation: true,

                user
            };
        }


        /* -------------------------------------------------
           Email already confirmed
           ------------------------------------------------- */

        await saveUserProfile(
            user,
            accountType,
            fullName
        );


        return {

            success: true,

            requiresEmailConfirmation: false,

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

/**
 * Login user
 */
async function loginUser(
    email,
    password
) {

    const client = getAuthSupabase();

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
           BLOCK UNCONFIRMED EMAIL
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            /*
             * Immediately sign out.
             * This prevents access to dashboards.
             */

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
           Get account type
           ------------------------------------------------- */

        let accountType =
            await getAccountType(
                user.id
            );


        /*
         * If profile does not exist yet,
         * use metadata.
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

            /*
             * Logout because account type
             * is required for dashboard routing.
             */

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
           Success
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

    const client = getAuthSupabase();

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


        /*
         * Redirect to homepage
         */

        window.location.href =
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
   DASHBOARD ROUTING
   ========================================================= */

/**
 * Get dashboard URL
 */
function getDashboardUrl(
    accountType
) {

    const type =
        normalizeAccountType(
            accountType
        );


    if (type === "company") {

        return "company-dashboard.html";
    }


    if (type === "individual") {

        return "dashboard.html";
    }


    return "index.html";
}


/**
 * Redirect according to account type
 */
function redirectToDashboard(
    accountType
) {

    const dashboard =
        getDashboardUrl(
            accountType
        );


    window.location.href =
        dashboard;
}


/* =========================================================
   PROTECT DASHBOARD
   ========================================================= */

/**
 * Protect dashboard pages
 *
 * Usage:
 *
 * protectDashboard("individual");
 *
 * or
 *
 * protectDashboard("company");
 */
async function protectDashboard(
    requiredAccountType = null
) {

    const client = getAuthSupabase();

    if (!client) {
        return false;
    }


    try {

        const user =
            await getCurrentUser();


        /* -------------------------------------------------
           No authenticated user
           ------------------------------------------------- */

        if (!user) {

            window.location.href =
                "login.html";

            return false;
        }


        /* -------------------------------------------------
           Email confirmation
           ------------------------------------------------- */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();


            showAuthMessage(
                "البريد الإلكتروني لم يتم تأكيده. يرجى تأكيد البريد الإلكتروني أولاً.",
                "Your email has not been confirmed. Please confirm your email first.",
                "error"
            );


            window.location.href =
                "login.html";


            return false;
        }


        /* -------------------------------------------------
           Account type
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
                "login.html";


            return false;
        }


        /* -------------------------------------------------
           Required account type
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

                /*
                 * User is authenticated,
                 * but is on the wrong dashboard.
                 */

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
            "login.html";


        return false;
    }
}


/* =========================================================
   PROTECT COMPANY DASHBOARD
   ========================================================= */

async function protectCompanyDashboard() {

    return await protectDashboard(
        "company"
    );
}


/* =========================================================
   PROTECT INDIVIDUAL DASHBOARD
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


            /*
             * Email confirmed
             */

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

            email: email,

            options: {

                emailRedirectTo:
                    `${window.location.origin}/login.html`
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
   AUTH ERROR TRANSLATION
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


    /* -------------------------------------------------
       Invalid login
       ------------------------------------------------- */

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


    /* -------------------------------------------------
       Email not confirmed
       ------------------------------------------------- */

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


    /* -------------------------------------------------
       User already registered
       ------------------------------------------------- */

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


    /* -------------------------------------------------
       Password
       ------------------------------------------------- */

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


    /* -------------------------------------------------
       Email
       ------------------------------------------------- */

    if (
        message.includes(
            "email"
        ) &&
        message.includes(
            "invalid"
        )
    ) {

        showAuthMessage(
            "صيغة البريد الإلكتروني غير صحيحة.",
            "Invalid email address.",
            "error"
        );

        return;
    }


    /* -------------------------------------------------
       Rate limit
       ------------------------------------------------- */

    if (
        message.includes(
            "rate limit"
        ) ||
        message.includes(
            "too many requests"
        )
    ) {

        showAuthMessage(
            "تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.",
            "Too many attempts. Please wait a moment and try again.",
            "error"
        );

        return;
    }


    /* -------------------------------------------------
       Failed to fetch
       ------------------------------------------------- */

    if (
        message.includes(
            "failed to fetch"
        ) ||
        message.includes(
            "network"
        )
    ) {

        showAuthMessage(
            "تعذر الاتصال بالخادم. تحقق من الإنترنت وإعدادات Supabase.",
            "Unable to connect to the server. Check your internet connection and Supabase configuration.",
            "error"
        );

        return;
    }


    /* -------------------------------------------------
       Generic
       ------------------------------------------------- */

    showAuthMessage(
        "حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.",
        "Authentication error. Please try again.",
        "error"
    );
}


/* =========================================================
   AUTH MESSAGE UI
   ========================================================= */

function showAuthMessage(
    messageAr,
    messageEn,
    type = "info"
) {

    /*
     * Look for existing message containers
     */

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


        /*
         * Scroll to message
         */

        try {

            element.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        } catch (e) {}

        return;
    }


    /*
     * Fallback console
     */

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


    /* -------------------------------------------------
       Company dashboard
       ------------------------------------------------- */

    if (
        page ===
        "company-dashboard.html"
    ) {

        await protectCompanyDashboard();

        return;
    }


    /* -------------------------------------------------
       Individual dashboard
       ------------------------------------------------- */

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
