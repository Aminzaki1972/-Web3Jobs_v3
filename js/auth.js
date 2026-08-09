/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   Sign Up / Login / Logout / Current User
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE
   ========================================================= */

let authSupabase = null;


/* =========================================================
   INITIALIZE AUTH SUPABASE
   ========================================================= */

function initializeAuthSupabase() {

    if (
        !window.Web3JobsSupabase ||
        typeof window.Web3JobsSupabase.getSupabaseClient !== "function"
    ) {

        console.error(
            "Web3JobsSupabase is not available."
        );

        return false;
    }

    authSupabase =
        window.Web3JobsSupabase.getSupabaseClient();

    if (!authSupabase) {

        console.error(
            "Unable to initialize Supabase client."
        );

        return false;
    }

    return true;
}


/* =========================================================
   MESSAGE SYSTEM
   ========================================================= */

function authMessage(
    message,
    type = "info"
) {

    let box =
        document.getElementById(
            "auth-message"
        );

    if (!box) {

        box =
            document.createElement(
                "div"
            );

        box.id =
            "auth-message";

        Object.assign(
            box.style,
            {
                position: "fixed",
                top: "20px",
                right: "20px",
                left: "20px",
                margin: "auto",
                zIndex: "999999",
                maxWidth: "400px",
                padding: "14px 18px",
                borderRadius: "10px",
                fontSize: "14px",
                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)"
            }
        );

        document.body.appendChild(
            box
        );
    }

    box.textContent =
        message;

    if (type === "success") {

        box.style.background =
            "#198754";

        box.style.color =
            "#ffffff";

    } else if (type === "error") {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#ffffff";

    } else if (type === "warning") {

        box.style.background =
            "#ffc107";

        box.style.color =
            "#111111";

    } else {

        box.style.background =
            "#212529";

        box.style.color =
            "#ffffff";
    }

    box.style.display =
        "block";

    clearTimeout(
        box._timer
    );

    box._timer =
        setTimeout(
            function () {

                box.style.display =
                    "none";

            },
            4000
        );
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getCurrentUser() {

    if (
        !authSupabase &&
        !initializeAuthSupabase()
    ) {

        return null;
    }

    try {

        const {
            data,
            error
        } =
            await authSupabase.auth.getUser();

        if (error) {

            console.error(
                "getCurrentUser error:",
                error
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {

        console.error(
            "getCurrentUser exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   CREATE / UPDATE PROFILE
   ========================================================= */

async function createUserProfile(
    user,
    fullName = "",
    accountType = "individual"
) {

    if (
        !authSupabase ||
        !user
    ) {

        return null;
    }

    const normalizedAccountType =
        String(
            accountType || "individual"
        )
        .trim()
        .toLowerCase();

    try {

        const {
            data,
            error
        } =
            await authSupabase
                .from("profiles")
                .upsert(
                    {
                        id:
                            user.id,

                        email:
                            user.email || "",

                        full_name:
                            fullName || "",

                        account_type:
                            normalizedAccountType,

                        updated_at:
                            new Date().toISOString()
                    },
                    {
                        onConflict:
                            "id"
                    }
                )
                .select()
                .maybeSingle();

        if (error) {

            console.error(
                "createUserProfile error:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "createUserProfile exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET USER PROFILE
   ========================================================= */

async function getUserProfile(
    userId
) {

    if (
        !authSupabase &&
        !initializeAuthSupabase()
    ) {

        return null;
    }

    if (!userId) {

        return null;
    }

    try {

        const {
            data,
            error
        } =
            await authSupabase
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    userId
                )
                .maybeSingle();

        if (error) {

            console.error(
                "getUserProfile error:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "getUserProfile exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET ACCOUNT TYPE
   ========================================================= */

async function getAccountType(
    user
) {

    if (!user) {

        return "individual";
    }

    /*
     * First source:
     * profiles table
     */

    const profile =
        await getUserProfile(
            user.id
        );

    if (
        profile &&
        profile.account_type
    ) {

        const profileType =
            String(
                profile.account_type
            )
            .trim()
            .toLowerCase();

        if (
            profileType === "company"
        ) {

            return "company";
        }

        if (
            profileType === "individual"
        ) {

            return "individual";
        }
    }


    /*
     * Second source:
     * Supabase user metadata
     */

    const metadata =
        user.user_metadata || {};

    const metadataType =
        String(
            metadata.account_type ||
            metadata.user_type ||
            ""
        )
        .trim()
        .toLowerCase();

    if (
        metadataType === "company"
    ) {

        return "company";
    }

    return "individual";
}


/* =========================================================
   REDIRECT USER
   ========================================================= */

async function redirectUser(
    user
) {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }

    try {

        const accountType =
            await getAccountType(
                user
            );

        console.log(
            "Web3Jobs account type:",
            accountType
        );

        /*
         * COMPANY
         */

        if (
            accountType === "company"
        ) {

            console.log(
                "Redirecting company to company-dashboard.html"
            );

            window.location.replace(
                "company-dashboard.html"
            );

            return;
        }


        /*
         * INDIVIDUAL
         */

        console.log(
            "Redirecting individual to dashboard.html"
        );

        window.location.replace(
            "dashboard.html"
        );

    } catch (error) {

        console.error(
            "redirectUser error:",
            error
        );

        window.location.replace(
            "dashboard.html"
        );
    }
}


/* =========================================================
   SIGN UP
   ========================================================= */

async function signUpUser() {

    if (
        !authSupabase &&
        !initializeAuthSupabase()
    ) {

        authMessage(
            "Supabase is not available.",
            "error"
        );

        return;
    }

    const fullNameInput =
        document.getElementById(
            "signup-full-name"
        );

    const emailInput =
        document.getElementById(
            "signup-email"
        );

    const passwordInput =
        document.getElementById(
            "signup-password"
        );

    const accountTypeInput =
        document.getElementById(
            "signup-account-type"
        );

    if (
        !emailInput ||
        !passwordInput
    ) {

        authMessage(
            "Registration form was not found.",
            "error"
        );

        return;
    }

    const fullName =
        fullNameInput
            ? fullNameInput.value.trim()
            : "";

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    const accountType =
        accountTypeInput
            ? String(
                accountTypeInput.value
              )
              .trim()
              .toLowerCase()
            : "individual";


    if (!email) {

        authMessage(
            "Please enter your email.",
            "warning"
        );

        return;
    }


    if (!password) {

        authMessage(
            "Please enter your password.",
            "warning"
        );

        return;
    }


    if (password.length < 6) {

        authMessage(
            "Password must be at least 6 characters.",
            "warning"
        );

        return;
    }


    if (
        accountType !== "individual" &&
        accountType !== "company"
    ) {

        authMessage(
            "Invalid account type.",
            "error"
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await authSupabase.auth.signUp(
                {
                    email:
                        email,

                    password:
                        password,

                    options:
                        {
                            data:
                                {
                                    full_name:
                                        fullName,

                                    account_type:
                                        accountType
                                }
                        }
                }
            );


        if (error) {

            console.error(
                "Sign up error:",
                error
            );

            authMessage(
                error.message ||
                "Unable to create account.",
                "error"
            );

            return;
        }


        if (
            data &&
            data.user
        ) {

            /*
             * If session exists,
             * create profile immediately.
             */

            if (data.session) {

                await createUserProfile(
                    data.user,
                    fullName,
                    accountType
                );

                authMessage(
                    "Account created successfully.",
                    "success"
                );

                setTimeout(
                    function () {

                        redirectUser(
                            data.user
                        );

                    },
                    500
                );

                return;
            }


            /*
             * Email confirmation required.
             */

            authMessage(
                "Account created. Please confirm your email, then login.",
                "success"
            );

            return;
        }


        authMessage(
            "Unable to create account.",
            "error"
        );

    } catch (error) {

        console.error(
            "signUpUser exception:",
            error
        );

        authMessage(
            "An unexpected error occurred.",
            "error"
        );
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser() {

    if (
        !authSupabase &&
        !initializeAuthSupabase()
    ) {

        authMessage(
            "Supabase is not available.",
            "error"
        );

        return;
    }


    const emailInput =
        document.getElementById(
            "login-email"
        );

    const passwordInput =
        document.getElementById(
            "login-password"
        );

    if (
        !emailInput ||
        !passwordInput
    ) {

        authMessage(
            "Login form was not found.",
            "error"
        );

        return;
    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email) {

        authMessage(
            "Please enter your email.",
            "warning"
        );

        return;
    }


    if (!password) {

        authMessage(
            "Please enter your password.",
            "warning"
        );

        return;
    }


    try {

        /*
         * LOGIN
         */

        const {
            data,
            error
        } =
            await authSupabase.auth.signInWithPassword(
                {
                    email:
                        email,

                    password:
                        password
                }
            );


        if (error) {

            console.error(
                "Login error:",
                error
            );

            authMessage(
                error.message ||
                "Invalid email or password.",
                "error"
            );

            return;
        }


        if (
            !data ||
            !data.user
        ) {

            authMessage(
                "Login failed.",
                "error"
            );

            return;
        }


        /*
         * IMPORTANT:
         * Read profile after successful login.
         */

        const user =
            data.user;


        const profile =
            await getUserProfile(
                user.id
            );


        /*
         * If profile exists,
         * make sure metadata/profile
         * are consistent.
         */

        let accountType =
            "individual";


        if (
            profile &&
            profile.account_type
        ) {

            accountType =
                String(
                    profile.account_type
                )
                .trim()
                .toLowerCase();

        } else {

            const metadata =
                user.user_metadata || {};

            accountType =
                String(
                    metadata.account_type ||
                    metadata.user_type ||
                    "individual"
                )
                .trim()
                .toLowerCase();


            /*
             * Create missing profile.
             */

            await createUserProfile(
                user,
                metadata.full_name || "",
                accountType
            );
        }


        console.log(
            "LOGIN SUCCESS"
        );

        console.log(
            "USER ID:",
            user.id
        );

        console.log(
            "PROFILE:",
            profile
        );

        console.log(
            "ACCOUNT TYPE:",
            accountType
        );


        authMessage(
            "Login successful.",
            "success"
        );


        /*
         * DIRECT REDIRECT
         *
         * No unnecessary delay.
         */

        if (
            accountType === "company"
        ) {

            window.location.replace(
                "company-dashboard.html"
            );

            return;
        }


        window.location.replace(
            "dashboard.html"
        );

    } catch (error) {

        console.error(
            "loginUser exception:",
            error
        );

        authMessage(
            "An unexpected error occurred.",
            "error"
        );
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {

    if (
        !authSupabase &&
        !initializeAuthSupabase()
    ) {

        return;
    }

    try {

        const {
            error
        } =
            await authSupabase.auth.signOut();

        if (error) {

            console.error(
                "Logout error:",
                error
            );

            authMessage(
                "Unable to logout.",
                "error"
            );

            return;
        }

        window.location.href =
            "index.html";

    } catch (error) {

        console.error(
            "logoutUser error:",
            error
        );
    }
}


/* =========================================================
   REQUIRE LOGIN
   ========================================================= */

async function requireLogin() {

    const user =
        await getCurrentUser();

    if (!user) {

        window.location.href =
            "login.html";

        return null;
    }

    return user;
}


/* =========================================================
   REQUIRE COMPANY
   ========================================================= */

async function requireCompany() {

    const user =
        await requireLogin();

    if (!user) {

        return null;
    }

    const accountType =
        await getAccountType(
            user
        );

    if (
        accountType !== "company"
    ) {

        window.location.href =
            "dashboard.html";

        return null;
    }

    return user;
}


/* =========================================================
   REQUIRE INDIVIDUAL
   ========================================================= */

async function requireIndividual() {

    const user =
        await requireLogin();

    if (!user) {

        return null;
    }

    const accountType =
        await getAccountType(
            user
        );

    if (
        accountType !== "individual"
    ) {

        window.location.href =
            "company-dashboard.html";

        return null;
    }

    return user;
}


/* =========================================================
   UPDATE AUTH UI
   ========================================================= */

async function updateAuthUI() {

    const user =
        await getCurrentUser();

    document
        .querySelectorAll(
            "[data-auth-login]"
        )
        .forEach(
            element => {

                element.style.display =
                    user ? "none" : "";

            }
        );


    document
        .querySelectorAll(
            "[data-auth-logout]"
        )
        .forEach(
            element => {

                element.style.display =
                    user ? "" : "none";

            }
        );


    document
        .querySelectorAll(
            "[data-auth-user]"
        )
        .forEach(
            element => {

                element.textContent =
                    user
                        ? user.email || ""
                        : "";

            }
        );


    return user;
}


/* =========================================================
   AUTH EVENTS
   ========================================================= */

function initializeAuthEvents() {

    const signupForm =
        document.getElementById(
            "signup-form"
        );

    if (
        signupForm &&
        !signupForm.dataset.authInitialized
    ) {

        signupForm.dataset.authInitialized =
            "true";

        signupForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                signUpUser();

            }
        );
    }


    const loginForm =
        document.getElementById(
            "login-form"
        );

    if (
        loginForm &&
        !loginForm.dataset.authInitialized
    ) {

        loginForm.dataset.authInitialized =
            "true";

        loginForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                loginUser();

            }
        );
    }


    document
        .querySelectorAll(
            "[data-auth-logout]"
        )
        .forEach(
            button => {

                if (
                    button.dataset.authInitialized
                ) {

                    return;
                }

                button.dataset.authInitialized =
                    "true";

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        logoutUser();

                    }
                );
            }
        );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3JobsAuth = {

    initializeAuthSupabase,

    signUpUser,

    loginUser,

    logoutUser,

    getCurrentUser,

    getUserProfile,

    getAccountType,

    redirectUser,

    requireLogin,

    requireCompany,

    requireIndividual,

    updateAuthUI

};


/* =========================================================
   INITIALIZE AUTH
   ========================================================= */

async function initializeAuth() {

    if (
        !initializeAuthSupabase()
    ) {

        return;
    }

    initializeAuthEvents();

    await updateAuthUI();


    /*
     * Auth state listener
     */

    authSupabase.auth.onAuthStateChange(
        async function (
            event,
            session
        ) {

            console.log(
                "Auth event:",
                event
            );

            /*
             * Do not redirect here.
             *
             * loginUser() handles the redirect.
             */

            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {

                const user =
                    session.user;

                const metadata =
                    user.user_metadata || {};

                /*
                 * Make sure profile exists.
                 */

                const existingProfile =
                    await getUserProfile(
                        user.id
                    );

                if (!existingProfile) {

                    await createUserProfile(
                        user,
                        metadata.full_name || "",
                        metadata.account_type || "individual"
                    );
                }
            }

            await updateAuthUI();
        }
    );
}


/* =========================================================
   DOCUMENT READY
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuth
    );

} else {

    initializeAuth();
               }
