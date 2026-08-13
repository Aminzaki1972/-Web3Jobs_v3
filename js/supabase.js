/* =========================================================
   Web3Jobs v3
   File: js/supabase.js

   Unified Supabase Client
   Session-Safe Version

   IMPORTANT:
   - One Supabase client only.
   - One authentication session only.
   - No automatic logout.
   - No redirects.
   - Compatible with auth.js and jobs.js.
========================================================= */

"use strict";


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";


/*
 * IMPORTANT:
 * This storage key must remain identical on every page.
 *
 * This allows:
 *
 * jobs.html
 * profile pages
 * company pages
 * dashboards
 * login.html
 *
 * to use the SAME authentication session.
 */

const SUPABASE_STORAGE_KEY =
    "web3jobs-auth";


/* =========================================================
   SINGLE CLIENT
========================================================= */

let web3jobsSupabase =
    null;


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

function initializeSupabase() {

    /*
     * If the client already exists,
     * NEVER create another one.
     */

    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


    /*
     * Check Supabase JavaScript library.
     */

    if (
        typeof window === "undefined" ||
        !window.supabase ||
        typeof window.supabase.createClient !==
            "function"
    ) {

        console.error(
            "Web3Jobs: Supabase JavaScript library is not loaded."
        );

        return null;
    }


    try {

        /*
         * Create ONE client.
         */

        web3jobsSupabase =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {

                        /*
                         * Keep the login session.
                         */

                        persistSession:
                            true,

                        /*
                         * Automatically refresh
                         * access tokens.
                         */

                        autoRefreshToken:
                            true,

                        /*
                         * Allow Supabase auth callback
                         * processing.
                         */

                        detectSessionInUrl:
                            true,

                        /*
                         * SAME storage key everywhere.
                         */

                        storageKey:
                            SUPABASE_STORAGE_KEY
                    }
                }
            );


        /*
         * Make the SAME client available globally.
         */

        window.supabaseClient =
            web3jobsSupabase;


        /*
         * Also expose it through the
         * Web3JobsSupabase API below.
         */

        return web3jobsSupabase;

    } catch (error) {

        console.error(
            "Web3Jobs: Supabase initialization failed:",
            error
        );


        web3jobsSupabase =
            null;


        window.supabaseClient =
            null;


        return null;
    }
}


/* =========================================================
   GET CLIENT
========================================================= */

function getSupabaseClient() {

    /*
     * First use our existing client.
     */

    if (
        web3jobsSupabase &&
        typeof web3jobsSupabase.from ===
            "function"
    ) {

        return web3jobsSupabase;
    }


    /*
     * Second use an already-created global client.
     */

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from ===
            "function"
    ) {

        web3jobsSupabase =
            window.supabaseClient;


        return web3jobsSupabase;
    }


    /*
     * Last option:
     * initialize exactly ONE client.
     */

    return initializeSupabase();
}


/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

function getClient() {

    return getSupabaseClient();
}


/* =========================================================
   SESSION
========================================================= */

async function getSupabaseSession() {

    const client =
        getSupabaseClient();


    if (!client) {

        return null;
    }


    try {

        const {
            data,
            error
        } =
            await client.auth.getSession();


        if (error) {

            /*
             * IMPORTANT:
             * Do NOT sign out.
             * Do NOT redirect.
             */

            console.warn(
                "Web3Jobs: getSession warning:",
                error.message
            );


            return null;
        }


        return (
            data &&
            data.session
                ? data.session
                : null
        );

    } catch (error) {

        console.warn(
            "Web3Jobs: getSession exception:",
            error
        );


        return null;
    }
}


/* =========================================================
   CURRENT USER
========================================================= */

async function getSupabaseUser() {

    const client =
        getSupabaseClient();


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

            /*
             * IMPORTANT:
             * Never call signOut() here.
             */

            console.warn(
                "Web3Jobs: getUser warning:",
                error.message
            );


            return null;
        }


        return (
            data &&
            data.user
                ? data.user
                : null
        );

    } catch (error) {

        console.warn(
            "Web3Jobs: getUser exception:",
            error
        );


        return null;
    }
}


/* =========================================================
   AUTH STATE CHANGE
========================================================= */

function onAuthStateChange(
    callback
) {

    const client =
        getSupabaseClient();


    if (
        !client ||
        typeof callback !==
            "function"
    ) {

        return null;
    }


    try {

        return client.auth.onAuthStateChange(
            callback
        );

    } catch (error) {

        console.warn(
            "Web3Jobs: Auth state listener error:",
            error
        );


        return null;
    }
}


/* =========================================================
   SIGN OUT
========================================================= */

async function signOutSupabase() {

    const client =
        getSupabaseClient();


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
                "Web3Jobs: signOut error:",
                error
            );


            return false;
        }


        /*
         * Only an explicit logout operation
         * should reach this function.
         */

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: signOut exception:",
            error
        );


        return false;
    }
}


/* =========================================================
   AUTH SESSION HELPER
========================================================= */

async function hasActiveSession() {

    const session =
        await getSupabaseSession();


    return Boolean(
        session &&
        session.user
    );
}


/* =========================================================
   WAIT FOR SESSION
========================================================= */

/*
 * Some browsers / GitHub Pages can take a moment
 * to restore the stored Supabase session.
 *
 * This helper gives the client a short amount of time
 * to restore it without logging the user out.
 */

async function waitForSession(
    timeout = 3000
) {

    const start =
        Date.now();


    while (
        Date.now() - start <
        timeout
    ) {

        const session =
            await getSupabaseSession();


        if (
            session &&
            session.user
        ) {

            return session;
        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    150
                )
        );
    }


    return null;
}


/* =========================================================
   GLOBAL API
========================================================= */

window.Web3JobsSupabase = {

    /*
     * Configuration
     */

    url:
        SUPABASE_URL,

    publishableKey:
        SUPABASE_PUBLISHABLE_KEY,

    storageKey:
        SUPABASE_STORAGE_KEY,


    /*
     * Client
     */

    initialize:
        initializeSupabase,

    getClient:
        getSupabaseClient,

    getSupabaseClient:
        getSupabaseClient,


    /*
     * Authentication
     */

    getSession:
        getSupabaseSession,

    getUser:
        getSupabaseUser,

    hasActiveSession:
        hasActiveSession,

    waitForSession:
        waitForSession,


    /*
     * Auth events
     */

    onAuthStateChange:
        onAuthStateChange,


    /*
     * Logout
     */

    signOut:
        signOutSupabase
};


/* =========================================================
   GLOBAL COMPATIBILITY
========================================================= */

window.getSupabaseClient =
    getSupabaseClient;


window.getClient =
    getClient;


window.getSupabaseSession =
    getSupabaseSession;


window.getSupabaseUser =
    getSupabaseUser;


/* =========================================================
   INITIALIZE
========================================================= */

initializeSupabase();


/* =========================================================
   DEBUG
========================================================= */

console.log(
    "Web3Jobs: Unified Supabase Client loaded."
);

console.log(
    "Web3Jobs: Shared storage key:",
    SUPABASE_STORAGE_KEY
);
