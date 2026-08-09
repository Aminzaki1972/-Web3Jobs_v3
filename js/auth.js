/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   ---------------------------------------------------------
   - Sign Up
   - Email Confirmation
   - Login
   - Logout
   - Current User
   - Individual / Company detection
   - Profile detection
   - Dashboard redirect
   - GitHub Pages compatible
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

    /*
     * Try to obtain the client from Web3JobsSupabase
     */

    if (
        window.Web3JobsSupabase &&
        typeof window.Web3JobsSupabase.getClient === "function"
    ) {

        authSupabase =
            window.Web3JobsSupabase.getClient();

        if (authSupabase) {

            console.log(
                "Web3Jobs Auth: Connected through Web3JobsSupabase."
            );

            return authSupabase;
        }
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


    /*
     * INDIVIDUAL
     */

    if (
        value === "individual" ||
        value === "individuals" ||
        value === "person" ||
        value === "user" ||
        value === "candidate" ||
        value === "فرد" ||
        value === "فردى" ||
        value === "فردي"
    ) {

        return "individual";
    }


    /*
     * COMPANY
     */

    if (
        value === "company" ||
        value === "companies" ||
        value === "business" ||
        value === "employer" ||
        value === "شركة"
    ) {

        return "company";
    }


    return null;
}


/* =========================================================
   GET ACCOUNT TYPE FROM PROFILE
   ========================================================= */

async function getAccountType(userId = null) {

    const client =
        getAuthSupabase();

    if (!client) {
        return null;
    }


    try {

        /*
         * Get current authenticated user
         */

        const user =
            await getCurrentUser();


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
            "Web3Jobs: Searching profile for user ID:",
            id
        );


        /* =================================================
           1. PROFILES TABLE
           ================================================= */

        const {
            data: profiles,
            error: profileError
        } =
            await client
                .from("profiles")
                .select(
                    "id, email, full_name, account_type"
                )
                .eq("id", id)
                .limit(1);


        console.log(
            "Web3Jobs: profiles query result:",
            profiles
        );


        if (profileError) {

            console.error(
                "Web3Jobs: profiles query error:",
                profileError
            );

        } else if (
            Array.isArray(profiles) &&
            profiles.length > 0
        ) {

            const profile =
                profiles[0];


            console.log(
                "Web3Jobs: Profile found:",
                profile
            );


            const profileType =
                normalizeAccountType(
                    profile.account_type
                );


            console.log(
                "Web3Jobs: Profile account_type:",
                profile.account_type
            );


            console.log(
                "Web3Jobs: Normalized account type:",
                profileType
            );


            if (profileType) {

                return profileType;
            }
        }


        /* =================================================
           2. COMPANY PROFILES
           ================================================= */

        const {
            data: companyProfiles,
            error: companyError
        } =
            await client
                .from("company_profiles")
                .select("id")
                .eq("id", id)
                .limit(1);


        console.log(
            "Web3Jobs: company_profiles result:",
            companyProfiles
        );


        if (
            !companyError &&
            Array.isArray(companyProfiles) &&
            companyProfiles.length > 0
        ) {

            return "company";
        }


        /* =================================================
           3. USER METADATA
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
                    "Web3Jobs: Account type found in metadata:",
                    metadataType
                );

                return metadataType;
            }
        }


        /*
         * Nothing found
         */

        console.error(
            "Web3Jobs: Account type was not found."
        );

        return null;

    } catch (error) {

        console.error(
            "Web3Jobs: getAccountType exception:",
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
                "Web3Jobs: Save profile error:",
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

function getDashboardUrl(accountType) {

    const type =
        normalizeAccountType(
            accountType
        );


    console.log(
        "Web3Jobs: Creating dashboard URL for:",
        type
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

        showAuthError(error);

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

        /*
         * AUTH LOGIN
         */

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
                "Web3Jobs: Login error:",
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
                "تعذر العثور على المستخدم بعد تسجيل الدخول.",
                "User was not found after login.",
                "error"
            );

            return {
                success: false
            };
        }


        console.log(
            "Web3Jobs: Auth user ID:",
            user.id
        );


        /*
         * EMAIL CONFIRMATION
         */

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


        /*
         * IMPORTANT:
         * Read account_type directly from profiles.
         */

        let accountType =
            await getAccountType(
                user.id
            );


        console.log(
            "Web3Jobs: FINAL ACCOUNT TYPE:",
            accountType
        );


        /*
         * Metadata fallback
         */

        if (!accountType) {

            accountType =
                normalizeAccountType(
                    user.user_metadata?.account_type ||
                    user.user_metadata?.accountType ||
                    user.user_metadata?.account_role ||
                    user.user_metadata?.role
                );


            console.log(
                "Web3Jobs: Metadata fallback:",
                accountType
            );
        }


        /*
         * Still no account type
         */

        if (!accountType) {

            console.error(
                "Web3Jobs: Account type missing.",
                {
                    userId:
                        user.id,

                    email:
                        user.email,

                    metadata:
                        user.user_metadata
                }
            );


            await client.auth.signOut();


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


        /*
         * LOGIN SUCCESS
         */

        console.log(
            "Web3Jobs: Login successful."
        );


        console.log(
            "Web3Jobs: Account type:",
            accountType
        );


        const dashboardUrl =
            getDashboardUrl(
                accountType
            );


        console.log(
            "Web3Jobs: Dashboard URL:",
            dashboardUrl
        );


        showAuthMessage(
            "تم تسجيل الدخول بنجاح.",
            "Login successful.",
            "success"
        );


        /*
         * Return complete result
         */

        return {

            success: true,

            user,

            accountType,

            account_type:
                accountType,

            dashboardUrl,

            profile: {

                id:
                    user.id,

                account_type:
                    accountType
            }
        };


    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected login exception:",
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

            showAuthError(error);

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
   REDIRECT TO DASHBOARD
   ========================================================= */

function redirectToDashboard(
    accountType
) {

    const type =
        normalizeAccountType(
            accountType
        );


    console.log(
        "Web3Jobs redirect type:",
        type
    );


    const url =
        getDashboardUrl(type);


    console.log(
        "Web3Jobs redirect URL:",
        url
    );


    if (
        type !== "individual" &&
        type !== "company"
    ) {

        console.error(
            "Web3Jobs: Invalid account type for redirect."
        );

        return false;
    }


    window.location.replace(url);

    return true;
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


        /*
         * Email confirmation
         */

        if (!isEmailConfirmed(user)) {

            await client.auth.signOut();


            window.location.href =
                getLoginUrl();

            return false;
        }


        /*
         * Detect account
         */

        const accountType =
            await getAccountType(
                user.id
            );


        if (!accountType) {

            console.error(
                "Web3Jobs: Dashboard account type missing."
            );


            await client.auth.signOut();


            window.location.href =
                getLoginUrl();

            return false;
        }


        /*
         * Required account type
         */

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
        } =
            await client.auth.resend({

                type:
                    "signup",

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

        console.error(
            "Web3Jobs resend exception:",
            error
        );

        showAuthError(error);

        return false;
    }
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function showAuthError(error) {

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
            "تعذر الاتصال بخادم المصادقة. تحقق من الإنترنت وإعدادات Supabase.",
            "Unable to connect to the authentication server. Check your internet connection and Supabase settings.",
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

    /*
     * Give supabase.js a moment to initialize.
     */

    if (!authSupabase) {

        initializeAuthSupabase();
    }


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

    normalizeAccountType:
        normalizeAccountType,

    showMessage:
        showAuthMessage,

    showError:
        showAuthError

};


/* =========================================================
   END OF FILE
   ========================================================= */
