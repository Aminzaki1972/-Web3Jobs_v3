/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   ---------------------------------------------------------
   FIXED VERSION
   - Login
   - Signup
   - Email confirmation
   - Individual / Company detection
   - Profile detection
   - Dashboard protection
   - GitHub Pages compatible
   - Reads account_type from profiles
   - Metadata fallback
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE CLIENT
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
     * Main client from js/supabase.js
     */

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


    /* -----------------------------------------------------
       INDIVIDUAL
       ----------------------------------------------------- */

    if (
        value === "individual" ||
        value === "individuals" ||
        value === "person" ||
        value === "user" ||
        value === "candidate" ||
        value === "فرد" ||
        value === "فردي" ||
        value === "حساب فردي"
    ) {

        return "individual";
    }


    /* -----------------------------------------------------
       COMPANY
       ----------------------------------------------------- */

    if (
        value === "company" ||
        value === "companies" ||
        value === "business" ||
        value === "employer" ||
        value === "شركة" ||
        value === "حساب شركة"
    ) {

        return "company";
    }


    return null;
}


/* =========================================================
   GET ACCOUNT TYPE
   ---------------------------------------------------------
   IMPORTANT FIX
   ---------------------------------------------------------
   Priority:

   1. profiles.account_type
   2. user_metadata.account_type
   3. company_profiles
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

        /*
         * Get authenticated user
         */

        const user =
            await getCurrentUser();


        /*
         * Determine user ID
         */

        const id =
            userId ||
            user?.id;


        if (!id) {

            console.error(
                "Web3Jobs: No authenticated user ID."
            );

            return null;
        }


        console.log(
            "Web3Jobs: Checking account type for:",
            id
        );


        /* =================================================
           1. PROFILES TABLE
           ================================================= */

        const {
            data: profile,
            error: profileError
        } =
            await client
                .from("profiles")
                .select(
                    "id, email, full_name, account_type"
                )
                .eq(
                    "id",
                    id
                )
                .maybeSingle();


        console.log(
            "Web3Jobs: Profile result:",
            profile
        );


        if (profileError) {

            console.error(
                "Web3Jobs: Profile lookup error:",
                profileError
            );

        } else if (profile) {

            const profileType =
                normalizeAccountType(
                    profile.account_type
                );


            console.log(
                "Web3Jobs: Profile account_type:",
                profile.account_type
            );


            if (profileType) {

                console.log(
                    "Web3Jobs: Account type detected from profiles:",
                    profileType
                );

                return profileType;
            }
        }


        /* =================================================
           2. USER METADATA
           ================================================= */

        if (user) {

            const metadata =
                user.user_metadata || {};


            console.log(
                "Web3Jobs: User metadata:",
                metadata
            );


            const metadataType =
                normalizeAccountType(
                    metadata.account_type ||
                    metadata.accountType ||
                    metadata.account_role ||
                    metadata.role
                );


            if (metadataType) {

                console.log(
                    "Web3Jobs: Account type detected from metadata:",
                    metadataType
                );

                return metadataType;
            }
        }


        /* =================================================
           3. COMPANY PROFILE
           ================================================= */

        const {
            data: companyProfile,
            error: companyError
        } =
            await client
                .from("company_profiles")
                .select("id")
                .eq(
                    "id",
                    id
                )
                .maybeSingle();


        if (companyError) {

            console.warn(
                "Web3Jobs: Company profile lookup:",
                companyError
            );

        } else if (companyProfile) {

            console.log(
                "Web3Jobs: Company detected from company_profiles."
            );

            return "company";
        }


        /* =================================================
           NOT FOUND
           ================================================= */

        console.error(
            "Web3Jobs: Account type was not found.",
            {
                userId: id,
                profile: profile,
                metadata: user?.user_metadata
            }
        );


        return null;


    } catch (error) {

        console.error(
            "Web3Jobs getAccountType exception:",
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

        console.error(
            "Web3Jobs: Invalid account type:",
            accountType
        );

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


        console.log(
            "Web3Jobs: Saving profile:",
            profileData
        );


        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .upsert(
                    profileData,
                    {
                        onConflict: "id"
                    }
                )
                .select()
                .single();


        if (error) {

            console.error(
                "Web3Jobs save profile error:",
                error
            );

            return false;
        }


        console.log(
            "Web3Jobs: Profile saved:",
            data
        );


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


    /* -----------------------------------------------------
       VALIDATION
       ----------------------------------------------------- */

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
         * Save profile
         */

        const profileSaved =
            await saveUserProfile(
                user,
                accountType,
                fullName
            );


        /*
         * Email confirmation
         */

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
            "Web3Jobs signup exception:",
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
        "Web3Jobs: Login started:",
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


        console.log(
            "Web3Jobs: Login response:",
            data
        );


        if (error) {

            console.error(
                "Web3Jobs login error:",
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
                "تعذر العثور على المستخدم.",
                "User was not found after login.",
                "error"
            );

            return {
                success: false
            };
        }


        console.log(
            "Web3Jobs: Authenticated user:",
            user.id,
            user.email
        );


        /* =================================================
           EMAIL CONFIRMATION
           ================================================= */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();


            showAuthMessage(
                "البريد الإلكتروني غير مؤكد. يرجى تأكيده أولاً.",
                "Your email is not confirmed. Please confirm it first.",
                "error"
            );


            return {

                success: false,

                emailNotConfirmed: true,

                user
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
            "Web3Jobs: FINAL ACCOUNT TYPE:",
            accountType
        );


        if (!accountType) {

            /*
             * IMPORTANT:
             * Do NOT immediately sign out.
             * This allows us to inspect the problem.
             */

            showAuthMessage(
                "تم تسجيل الدخول، ولكن تعذر تحديد نوع الحساب.",
                "Login succeeded, but the account type could not be determined.",
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
            "Web3Jobs logout exception:",
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


        /* -------------------------------------------------
           EMAIL
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

            console.error(
                "Web3Jobs: Dashboard account type missing."
            );

            window.location.href =
                getLoginUrl();

            return false;
        }


        /* -------------------------------------------------
           REQUIRED TYPE
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
                session?.user?.email || null
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
            "Web3Jobs resend exception:",
            error
        );

        showAuthError(
            error
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
        "Web3Jobs AUTH ERROR:",
        {
            message: rawMessage,
            status: error?.status,
            code: error?.code,
            name: error?.name
        }
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


    if (
        message.includes(
            "invalid email"
        )
    ) {

        showAuthMessage(
            "صيغة البريد الإلكتروني غير صحيحة.",
            "Invalid email address.",
            "error"
        );

        return;
    }


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


    if (
        message.includes("failed to fetch") ||
        message.includes("network") ||
        message.includes("fetch")
    ) {

        showAuthMessage(
            "تعذر الاتصال بخادم المصادقة.",
            "Unable to connect to the authentication server.",
            "error"
        );

        return;
    }


    showAuthMessage(
        "حدث خطأ أثناء المصادقة: " +
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
