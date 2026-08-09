/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Authentication System
   Sign Up / Login / Logout / Current User
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const AUTH_SUPABASE_URL =
    "https://uewocyaspztybnvnkbmo.supabase.co";

const AUTH_SUPABASE_KEY =
    "sb_publishable_ap9UMOBhdHdIkW0WFD25nA_NurNviS0";

let authSupabase = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeAuthSupabase() {

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Supabase library is not loaded."
        );

        return false;
    }

    try {

        authSupabase =
            window.supabase.createClient(
                AUTH_SUPABASE_URL,
                AUTH_SUPABASE_KEY
            );

        return true;

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

        return false;
    }
}


/* =========================================================
   MESSAGE
   ========================================================= */

function authMessage(message, type = "info") {

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

                zIndex: "999999",

                maxWidth: "360px",

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
            () => {

                box.style.display =
                    "none";

            },
            4000
        );
}


/* =========================================================
   SIGN UP
   ========================================================= */

async function signUpUser() {

    if (!authSupabase) {

        const initialized =
            initializeAuthSupabase();

        if (!initialized) {

            authMessage(
                "Supabase is not available.",
                "error"
            );

            return;
        }
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
        emailInput.value
            .trim();


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


    if (password.length < 6) {

        authMessage(
            "Password must be at least 6 characters.",
            "warning"
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await authSupabase.auth.signUp({

                email: email,

                password: password,

                options: {

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


        /*
         * Create profile row if user was
         * immediately authenticated.
         */

        if (
            data &&
            data.user &&
            data.session
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
         * Redirect after registration.
         */

        setTimeout(
            () => {

                window.location.href =
                    "dashboard.html";

            },
            1000
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
   CREATE USER PROFILE
   ========================================================= */

async function createUserProfile(
    user,
    fullName = "",
    accountType = "individual"
) {

    if (!authSupabase || !user) {
        return null;
    }


    try {

        const {
            data,
            error
        } =
            await authSupabase
                .from("profiles")
                .upsert({

                    id:
                        user.id,

                    email:
                        user.email || "",

                    full_name:
                        fullName || "",

                    account_type:
                        accountType || "individual"

                })
                .select()
                .maybeSingle();


        if (error) {

            console.warn(
                "Profile creation warning:",
                error
            );

            return null;
        }


        return data || null;

    } catch (error) {

        console.warn(
            "createUserProfile error:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser() {

    if (!authSupabase) {

        const initialized =
            initializeAuthSupabase();

        if (!initialized) {

            authMessage(
                "Supabase is not available.",
                "error"
            );

            return;
        }
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
        emailInput.value
            .trim();


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
            await authSupabase.auth.signInWithPassword({

                email: email,

                password: password

            });


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


        if (!data || !data.user) {

            authMessage(
                "Login failed.",
                "error"
            );

            return;
        }


        authMessage(
            "Login successful.",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "dashboard.html";

            },
            700
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

    if (!authSupabase) {

        initializeAuthSupabase();
    }


    if (!authSupabase) {
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
            700
        );


    } catch (error) {

        console.error(
            "logoutUser error:",
            error
        );
    }
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getCurrentUser() {

    if (!authSupabase) {

        const initialized =
            initializeAuthSupabase();

        if (!initialized) {
            return null;
        }
    }


    try {

        const {
            data,
            error
        } =
            await authSupabase.auth.getUser();


        if (error) {

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
   PROTECT PAGE
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
   AUTO UPDATE AUTH UI
   ========================================================= */

async function updateAuthUI() {

    const user =
        await getCurrentUser();


    const loginButtons =
        document.querySelectorAll(
            "[data-auth-login]"
        );


    const logoutButtons =
        document.querySelectorAll(
            "[data-auth-logout]"
        );


    const userElements =
        document.querySelectorAll(
            "[data-auth-user]"
        );


    loginButtons.forEach(
        element => {

            element.style.display =
                user ? "none" : "";

        }
    );


    logoutButtons.forEach(
        element => {

            element.style.display =
                user ? "" : "none";

        }
    );


    userElements.forEach(
        element => {

            if (user) {

                element.textContent =
                    user.email || "";

            } else {

                element.textContent =
                    "";

            }

        }
    );


    return user;
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function initializeAuthEvents() {

    /*
     * Signup form
     */

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


    /*
     * Login form
     */

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


    /*
     * Logout buttons
     */

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

    requireLogin,

    updateAuthUI

};


/* =========================================================
   START
   ========================================================= */

async function initializeAuth() {

    const initialized =
        initializeAuthSupabase();


    if (!initialized) {
        return;
    }


    initializeAuthEvents();

    await updateAuthUI();


    /*
     * Listen for Supabase authentication changes.
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
                event ===
                "SIGNED_IN"
            ) {

                const user =
                    session?.user;


                if (user) {

                    const metadata =
                        user.user_metadata ||
                        {};


                    await createUserProfile(

                        user,

                        metadata.full_name ||
                        "",

                        metadata.account_type ||
                        "individual"

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
