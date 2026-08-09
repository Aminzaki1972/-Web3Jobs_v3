/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   ---------------------------------------------------------
   Stable Authentication Version
   - Sign Up
   - Email Confirmation
   - Login
   - Logout
   - Current User
   - Individual / Company detection
   - Profile detection by ID
   - Profile detection by Email
   - Metadata fallback
   - Automatic profile repair
   - Dashboard protection
   - GitHub Pages compatible
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
     * Main client created by js/supabase.js
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


    /*
     * Backup:
     * Web3JobsSupabase API
     */

    if (
        window.Web3JobsSupabase &&
        typeof window.Web3JobsSupabase.getClient === "function"
    ) {

        const client =
            window.Web3JobsSupabase.getClient();

        if (client) {

            authSupabase =
                client;

            console.log(
                "Web3Jobs Auth: Supabase client loaded through Web3JobsSupabase."
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
        user.email_confirmed_at ||
        user.confirmed_at
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


    /*
     * INDIVIDUAL
     */

    if (
        value === "individual" ||
        value === "individuals" ||
        value === "person" ||
        value === "user" ||
        value === "candidate" ||
        value === "freelancer" ||
        value === "فرد" ||
        value === "شخص"
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
   GET ACCOUNT TYPE
   ---------------------------------------------------------
   IMPORTANT:
   This function uses multiple methods.
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


        const id =
            userId ||
            user?.id;


        if (!id) {

            console.warn(
                "Web3Jobs: No authenticated user ID."
            );

            return null;
        }


        console.log(
            "Web3Jobs: Detecting account type for:",
            id
        );


        /* =================================================
           METHOD 1
           PROFILE BY AUTH ID
           ================================================= */

        try {

            const {
                data: profileById,
                error: profileIdError
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


            if (
                !profileIdError &&
                profileById
            ) {

                const accountType =
                    normalizeAccountType(
                        profileById.account_type
                    );


                console.log(
                    "Web3Jobs: Profile by ID:",
                    profileById
                );


                if (accountType) {

                    console.log(
                        "Web3Jobs: Account type from profile ID:",
                        accountType
                    );

                    return accountType;
                }
            }


            if (profileIdError) {

                console.warn(
                    "Web3Jobs: Profile by ID error:",
                    profileIdError
                );
            }

        } catch (error) {

            console.warn(
                "Web3Jobs: Profile by ID exception:",
                error
            );
        }


        /* =================================================
           METHOD 2
           PROFILE BY EMAIL
           ================================================= */

        if (user?.email) {

            try {

                const email =
                    String(
                        user.email
                    )
                    .trim()
                    .toLowerCase();


                const {
                    data: profileByEmail,
                    error: profileEmailError
                } =
                    await client
                        .from("profiles")
                        .select(
                            "id, email, full_name, account_type"
                        )
                        .eq(
                            "email",
                            email
                        )
                        .maybeSingle();


                if (
                    !profileEmailError &&
                    profileByEmail
                ) {

                    const accountType =
                        normalizeAccountType(
                            profileByEmail.account_type
                        );


                    console.log(
                        "Web3Jobs: Profile by email:",
                        profileByEmail
                    );


                    if (accountType) {

                        console.log(
                            "Web3Jobs: Account type from profile email:",
                            accountType
                        );


                        /*
                         * Repair profile ID if needed.
                         */

                        if (
                            profileByEmail.id !== id
                        ) {

                            console.warn(
                                "Web3Jobs: Profile ID does not match Auth ID."
                            );
                        }


                        return accountType;
                    }
                }


                if (profileEmailError) {

                    console.warn(
                        "Web3Jobs: Profile by email error:",
                        profileEmailError
                    );
                }

            } catch (error) {

                console.warn(
                    "Web3Jobs: Profile by email exception:",
                    error
                );
            }
        }


        /* =================================================
           METHOD 3
           COMPANY PROFILE
           ================================================= */

        try {

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


            if (
                !companyError &&
                companyProfile
            ) {

                console.log(
                    "Web3Jobs: Account type from company_profiles: company"
                );

                return "company";
            }


            if (companyError) {

                console.warn(
                    "Web3Jobs: company_profiles lookup:",
                    companyError
                );
            }

        } catch (error) {

            console.warn(
                "Web3Jobs: company_profiles exception:",
                error
            );
        }


        /* =================================================
           METHOD 4
           AUTH USER METADATA
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

                    metadata.accountRole ||

                    metadata.role ||

                    metadata.type
                );


            if (metadataType) {

                console.log(
                    "Web3Jobs: Account type from metadata:",
                    metadataType
                );


                /*
                 * Repair / create profile.
                 */

                await saveUserProfile(
                    user,
                    metadataType,
                    metadata.full_name ||
                    metadata.name ||
                    ""
                );


                return metadataType;
            }
        }


        /* =================================================
           NOTHING FOUND
           ================================================= */

        console.error(
            "Web3Jobs: Account type could not be determined."
        );


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

        console.warn(
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
                user.email ||
                null,

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
                .select();


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
                "تم إنشاء الحساب. يرجى تأكيد البريد الإلكتروني أولاً.",
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
        "Web3Jobs login started:",
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
            "Web3Jobs login response:",
            data
        );


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
                "لم يتم العثور على المستخدم.",
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

        let accountType =
            await getAccountType(
                user.id
            );


        /*
         * Final metadata fallback.
         */

        if (!accountType) {

            const metadata =
                user.user_metadata || {};


            accountType =
                normalizeAccountType(
                    metadata.account_type ||
                    metadata.accountType ||
                    metadata.account_role ||
                    metadata.accountRole ||
                    metadata.role ||
                    metadata.type
                );
        }


        console.log(
            "Web3Jobs FINAL account type:",
            accountType
        );


        /* =================================================
           ACCOUNT TYPE STILL MISSING
           ================================================= */

        if (!accountType) {

            /*
             * DO NOT immediately destroy the session.
             *
             * This allows us to inspect the real problem.
             */

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


            showAuthMessage(
                "تم تسجيل الدخول، لكن لم يتم العثور على نوع الحساب في الملف الشخصي.",
                "Login succeeded, but the account type was not found in the profile.",
                "error"
            );


            return {

                success: false,

                accountTypeMissing: true,

                user
            };
        }


        /* =================================================
           REPAIR PROFILE
           ================================================= */

        await saveUserProfile(
            user,
            accountType,
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
        );


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

    const type =
        normalizeAccountType(
            accountType
        );


    const url =
        getDashboardUrl(
            type
        );


    console.log(
        "Web3Jobs redirect:",
        type,
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


        let accountType =
            await getAccountType(
                user.id
            );


        /*
         * Metadata fallback.
         */

        if (!accountType) {

            const metadata =
                user.user_metadata || {};


            accountType =
                normalizeAccountType(
                    metadata.account_type ||
                    metadata.accountType ||
                    metadata.account_role ||
                    metadata.accountRole ||
                    metadata.role
                );
        }


        if (!accountType) {

            console.error(
                "Web3Jobs dashboard: account type missing.",
                user
            );


            showAuthMessage(
                "لم يتم تحديد نوع الحساب.",
                "Account type could not be determined.",
                "error"
            );


            return false;
        }


        /*
         * Repair profile.
         */

        await saveUserProfile(
            user,
            accountType,
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
        );


        /*
         * Required account type.
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
                event
            );


            if (session?.user) {

                console.log(
                    "Web3Jobs Auth user:",
                    session.user.email
                );
            }
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

    /*
     * Give supabase.js a moment if script loading
     * happens asynchronously.
     */

    if (
        !window.supabaseClient
    ) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    100
                )
        );
    }


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
