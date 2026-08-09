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
   INITIALIZE AUTH
   ========================================================= */

function initializeAuthSupabase() {

    if (
        !window.Web3JobsSupabase ||
        typeof window.Web3JobsSupabase.getSupabaseClient !==
            "function"
    ) {

        console.error(
            "js/supabase.js is not loaded."
        );

        return false;
    }


    authSupabase =
        window.Web3JobsSupabase.getSupabaseClient();


    if (!authSupabase) {

        console.error(
            "Unable to initialize Supabase."
        );

        return false;
    }


    return true;
}


/* =========================================================
   MESSAGE
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
                maxWidth: "360px",
                padding: "14px 18px",
                borderRadius: "10px",
                fontSize: "14px",
                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)",
                textAlign: "center"
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
            () => {

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
                "Unable to get current user:",
                error
            );

            return null;
        }


        return data?.user || null;

    } catch (error) {

        console.error(
            "getCurrentUser error:",
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
                            accountType || "individual"
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
                "Profile error:",
                error
            );

            return null;
        }


        return data || null;

    } catch (error) {

        console.error(
            "createUserProfile error:",
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
        !authSupabase ||
        !userId
    ) {

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
                "Profile loading error:",
                error
            );

            return null;
        }


        return data || null;

    } catch (error) {

        console.error(
            "getUserProfile error:",
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


    const profile =
        await getUserProfile(
            user.id
        );


    if (
        profile &&
        profile.account_type
    ) {

        return String(
            profile.account_type
        ).trim().toLowerCase();
    }


    const metadata =
        user.user_metadata || {};


    return String(
        metadata.account_type ||
        metadata.user_type ||
        "individual"
    )
        .trim()
        .toLowerCase();
}


/* =========================================================
   REDIRECT USER
   ========================================================= */

async function redirectUser(
    user
) {

    if (!user) {

        return;
    }


    const accountType =
        await getAccountType(
            user
        );


    console.log(
        "Web3Jobs account type:",
        accountType
    );


    if (
        accountType ===
        "company"
    ) {

        window.location.href =
            "company-dashboard.html";

        return;
    }


    window.location.href =
        "dashboard.html";
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
            ? accountTypeInput.value
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


    if (
        password.length < 6
    ) {

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
            data.user &&
            !data.session
        ) {

            authMessage(
                "Account created. Please confirm your email, then login.",
                "success"
            );

            return;
        }


        if (
            data &&
            data.user
        ) {

            await createUserProfile(
                data.user,
                fullName,
                accountType
            );
        }


        authMessage(
            "Account created successfully.",
            "success"
        );


        /*
         * Redirect after 2 seconds.
         */

        setTimeout(
            () => {

                redirectUser(
                    data.user
                );

            },
            2000
        );


    } catch (error) {

        console.error(
            "signUpUser error:",
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


        authMessage(
            "Login successful. Redirecting...",
            "success"
        );


        /*
         * IMPORTANT:
         * Wait exactly 2 seconds before redirect.
         */

        setTimeout(
            () => {

                redirectUser(
                    data.user
                );

            },
            2000
        );

    } catch (error) {

        console.error(
            "loginUser error:",
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


        authMessage(
            "You have been logged out.",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "index.html";

            },
            500
        );


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
        accountType !==
        "company"
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
        accountType !==
        "individual"
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
                    user
                        ? "none"
                        : "";

            }
        );


    document
        .querySelectorAll(
            "[data-auth-logout]"
        )
        .forEach(
            element => {

                element.style.display =
                    user
                        ? ""
                        : "none";

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
   EVENT LISTENERS
   ========================================================= */

function initializeAuthEvents() {

    const signupForm =
        document.getElementById(
            "signup-form"
        );


    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                signUpUser();

            }
        );
    }


    const loginForm =
        document.getElementById(
            "login-form"
        );


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            event => {

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

                button.addEventListener(
                    "click",
                    event => {

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
   INITIALIZE
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
     * Supabase authentication listener.
     */

    authSupabase.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            console.log(
                "Auth event:",
                event
            );


            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {

                const user =
                    session.user;


                const metadata =
                    user.user_metadata || {};


                await createUserProfile(
                    user,
                    metadata.full_name || "",
                    metadata.account_type ||
                    "individual"
                );
            }


            await updateAuthUI();

        }
    );
}


/* =========================================================
   DOCUMENT READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuth
    );

} else {

    initializeAuth();
               }
