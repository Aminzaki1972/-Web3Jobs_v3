"use strict";

(() => {

    let client = null;

    const $ = id => document.getElementById(id);

    /* =========================================================
       GET SUPABASE CLIENT
       ========================================================= */

    function getSupabase() {

        if (client) {
            return client;
        }

        /*
         * Uses the existing Web3Jobs Supabase client.
         * This prevents creating a second connection.
         */
        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.auth === "object"
        ) {
            client = window.Web3JobsSupabase;
            return client;
        }

        /*
         * Fallback for projects exposing the client as
         * window.supabaseClient.
         */
        if (
            window.supabaseClient &&
            typeof window.supabaseClient.auth === "object"
        ) {
            client = window.supabaseClient;
            return client;
        }

        throw new Error(
            "Supabase client was not found."
        );
    }


    /* =========================================================
       MESSAGE
       ========================================================= */

    function showMessage(message, success = false) {

        const messageBox = $("message");

        if (!messageBox) {
            return;
        }

        messageBox.textContent = message;

        messageBox.style.color =
            success
                ? "#4ade80"
                : "#ff7b7b";
    }


    /* =========================================================
       CHECK ADMIN
       ========================================================= */

    async function checkAdmin() {

        const supabase = getSupabase();

        const {
            data: {
                session
            },
            error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!session) {
            return false;
        }

        /*
         * The database decides whether the account
         * is an administrator.
         */
        const {
            data,
            error
        } = await supabase.rpc("is_admin");

        if (error) {
            console.error(
                "Admin verification error:",
                error
            );

            return false;
        }

        return data === true;
    }


    /* =========================================================
       LOGIN
       ========================================================= */

    async function login(event) {

        event.preventDefault();

        const email =
            $("email")?.value.trim();

        const password =
            $("password")?.value;

        const button =
            $("loginButton");

        if (!email || !password) {

            showMessage(
                "Please enter your email and password."
            );

            return;
        }

        button.disabled = true;

        button.textContent =
            "Checking...";

        try {

            const supabase =
                getSupabase();

            /*
             * Login through Supabase Auth.
             */
            const {
                error
            } = await supabase.auth.signInWithPassword({

                email: email,

                password: password

            });

            if (error) {
                throw error;
            }

            /*
             * IMPORTANT:
             * Login alone does NOT grant admin access.
             */
            const isAdmin =
                await checkAdmin();

            if (!isAdmin) {

                await supabase.auth.signOut();

                showMessage(
                    "Access denied. Administrator account required."
                );

                button.disabled = false;

                button.textContent =
                    "Secure Login";

                return;
            }

            showMessage(
                "Access granted.",
                true
            );

            /*
             * Small delay so the success message
             * can be displayed.
             */
            setTimeout(() => {

                window.location.replace(
                    "admin-dashboard.html"
                );

            }, 400);

        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );

            showMessage(
                error?.message ||
                "Unable to sign in."
            );

            button.disabled = false;

            button.textContent =
                "Secure Login";
        }
    }


    /* =========================================================
       EXISTING SESSION
       ========================================================= */

    async function checkExistingSession() {

        try {

            const isAdmin =
                await checkAdmin();

            if (isAdmin) {

                window.location.replace(
                    "admin-dashboard.html"
                );

            }

        } catch (error) {

            console.error(
                "Session check error:",
                error
            );

        }
    }


    /* =========================================================
       INITIALIZE
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            const form =
                $("adminLoginForm");

            if (form) {

                form.addEventListener(
                    "submit",
                    login
                );

            }

            checkExistingSession();

        }
    );

})();
