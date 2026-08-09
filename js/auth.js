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
   - Profile creation
   - Dashboard protection
   - GitHub Pages compatible URLs
   - Arabic / English messages
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

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth !== "undefined"
    ) {

        authSupabase = window.supabaseClient;

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

function normalizeAccountType(accountType) {

    if (
        accountType === null ||
        accountType === undefined
    ) {
        return null;
    }

    const value =
        String(accountType)
            .trim()
            .toLowerCase();

    switch (value) {

        case "individual":
        case "individuals":
        case "person":
        case "user":
        case "candidate":
        case "فرد":
        case "فردى":
        case "فردي":

            return "individual";


        case "company":
        case "companies":
        case "business":
        case "employer":
        case "شركة":
        case "شركه":

            return "company";


        default:

            return null;
    }
}


/* =========================================================
   GET ACCOUNT TYPE
   ---------------------------------------------------------
   IMPORTANT:
   profiles.account_type is the primary source.
   Metadata is only a fallback.
   ========================================================= */

async function getAccountType(userId = null) {

    const client =
        getAuthSupabase();

    if (!client) {
        return null;
    }


    try {

        let user = null;

        /*
         * If we already know the user ID, still try to
         * retrieve the current user for metadata fallback.
         */

        try {

            user =
                await getCurrentUser();

        } catch (error) {

            console.warn(
                "Web3Jobs: Could not retrieve current user for account type.",
                error
            );
        }


        const id =
            userId ||
            user?.id;


        if (!id) {

            console.error(
                "Web3Jobs: No user ID available."
            );

            return null;
        }


        console.log(
            "Web3Jobs: Searching profile for user ID:",
            id
        );


        /* =================================================
           1. PROFILES
           ================================================= */

        const {
            data: profile,
            error: profileError
        } = await client
            .from("profiles")
            .select("id, email, full_name, account_type")
            .eq("id", id)
            .maybeSingle();


        console.log(
            "Web3Jobs: Profile result:",
            profile
        );


        if (profileError) {

            console.error(
                "Web3Jobs: Profiles query error:",
                profileError
            );

        } else if (profile) {

            console.log(
                "Web3Jobs: Profile account_type:",
                profile.account_type
            );


            const profileType =
                normalizeAccountType(
                    profile.account_type
                );


            if (profileType) {

                console.log(
                    "Web3Jobs: ACCOUNT TYPE FOUND IN PROFILES:",
                    profileType
                );

                return profileType;
            }


            console.warn(
                "Web3Jobs: Profile exists but account_type is invalid:",
                profile.account_type
            );
        }


        /* =================================================
           2. COMPANY PROFILES
           ================================================= */

        const {
            data: companyProfile,
            error: companyError
        } = await client
            .from("company_profiles")
            .select("id")
            .eq("id", id)
            .maybeSingle();


        if (companyError) {

            console.warn(
                "Web3Jobs: company_profiles lookup error:",
                companyError
            );

        } else if (companyProfile) {

            console.log(
                "Web3Jobs: ACCOUNT TYPE FOUND IN COMPANY_PROFILES: company"
            );

            return "company";
        }


        /* =================================================
           3. AUTH USER METADATA
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
                    "Web3Jobs: ACCOUNT TYPE FOUND IN METADATA:",
                    metadataType
                );

                return metadataType;
            }
        }


        /* =================================================
           4. NO ACCOUNT TYPE
           ================================================= */

        console.error(
            "Web3Jobs: Account type could not be determined.",
            {
                userId: id,
                profile: profile,
                profileError: profileError,
                companyProfile: companyProfile,
                companyError: companyError,
                metadata: user?.user_metadata
            }
        );


        return null;


    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected getAccountType error:",
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
                "Web3Jobs: Save profile error:",
                error
            );

            return false;
        }


        console.log(
            "Web3Jobs: Profile saved successfully."
        );


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected save profile error:",
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


    /* =====================================================
       VALIDATION
       ===================================================== */

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


    /* =====================================================
       CREATE AUTH USER
       ===================================================== */

    try {

        const {
            data,
            error
        } = await client.auth.signUp({

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


        /* =================================================
           SAVE PROFILE
           ================================================= */

        const profileSaved =
            await saveUserProfile(
                user,
                accountType,
                fullName
            );


        /* =================================================
           EMAIL CONFIRMATION
           ================================================= */

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


    /* =====================================================
       VALIDATION
       ===================================================== */

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


    /* =====================================================
       SIGN IN
       ===================================================== */

    try {

        const {
            data,
            error
        } = await client.auth.signInWithPassword({

            email,

            password
        });


        console.log(
            "Web3Jobs: Login response:",
            data
        );


        if (error) {

            console.error(
                "Web3Jobs: Login error:",
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
            "Web3Jobs: Authenticated user ID:",
            user.id
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
           GET ACCOUNT TYPE
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
             * Do NOT sign out here.
             *
             * Login itself succeeded.
             * We keep the session so the real problem
             * can be diagnosed.
             */

            showAuthMessage(
                "تم تسجيل الدخول، ولكن تعذر تحديد نوع الحساب. يرجى المحاولة مرة أخرى.",
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
           LOGIN SUCCESS
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
        } = await client.auth.signOut();


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
   REDIRECT TO DASHBOARD
   ========================================================= */

function redirectToDashboard(
    accountType
) {

    const url =
        getDashboardUrl(
            accountType
        );


    console.log(
        "Web3Jobs: Redirecting to:",
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


        /* =================================================
           NO USER
           ================================================= */

        if (!user) {

            window.location.href =
                getLoginUrl();

            return false;
        }


        /* =================================================
           EMAIL
           ================================================= */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();

            window.location.href =
                getLoginUrl();

            return false;
        }


        /* =================================================
           ACCOUNT TYPE
           ================================================= */

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

                redirectToDashboard(
                    accountType
                );

                return false;
            }
        }


        console.log(
            "Web3Jobs: Dashboard protected successfully.",
            {
                user: user.id,
                accountType: accountType
            }
        );


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
                session?.user?.id || null
            );
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
                "Web3Jobs resend confirmation error:",
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


    /* -----------------------------------------------------
       INVALID LOGIN
       ----------------------------------------------------- */

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
       ALREADY REGISTERED
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
        message.includes("invalid email")
    ) {

        showAuthMessage(
            "صيغة البريد الإلكتروني غير صحيحة.",
            "Invalid email address.",
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
        "حدث خطأ أثناء المصادقة: " + rawMessage,
        "Authentication error: " + rawMessage,
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
   ESCAPE HTML
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
    function () {

        initializeAuthPage();

    }
);


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3JobsAuth = {

    initialize:
        initializeAuthSupabase,

    getCurrentUser:
        getCurrentUser,

    getAccountType:
        getAccountType,

    signUp:
        signUpUser,

    login:
        loginUser,

    logout:
        logoutUser,

    resendConfirmation:
        resendConfirmationEmail,

    protectDashboard:
        protectDashboard,

    protectCompanyDashboard:
        protectCompanyDashboard,

    protectIndividualDashboard:
        protectIndividualDashboard,

    redirectToDashboard:
        redirectToDashboard,

    getDashboardUrl:
        getDashboardUrl,

    isEmailConfirmed:
        isEmailConfirmed,

    showMessage:
        showAuthMessage,

    showError:
        showAuthError
};


/* =========================================================
   END OF FILE
   ========================================================= */
