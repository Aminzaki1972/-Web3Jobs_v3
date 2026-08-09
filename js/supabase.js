/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Central Supabase Configuration
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "https://uewocyaspztybnvnkbmo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_ap9UMOBhdHdIkW0FCD25nA_NurNviS0";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

let web3jobsSupabase = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeSupabase() {

    /* -----------------------------------------------------
       Already initialized
       ----------------------------------------------------- */

    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


    /* -----------------------------------------------------
       Check Supabase JavaScript library
       ----------------------------------------------------- */

    if (
        typeof window === "undefined" ||
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs: Supabase JavaScript library is not loaded."
        );

        return null;
    }


    /* -----------------------------------------------------
       Create Supabase client
       ----------------------------------------------------- */

    try {

        web3jobsSupabase =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );


        /*
         * Global client
         *
         * auth.js uses this variable.
         */

        window.supabaseClient =
            web3jobsSupabase;


        console.log(
            "Web3Jobs Supabase initialized successfully."
        );


        return web3jobsSupabase;


    } catch (error) {

        console.error(
            "Web3Jobs Supabase initialization failed:",
            error
        );


        web3jobsSupabase = null;

        window.supabaseClient =
            null;


        return null;
    }
}


/* =========================================================
   GET SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    /*
     * Already initialized
     */

    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


    /*
     * If auth.js or another file initialized it
     */

    if (
        window.supabaseClient
    ) {

        web3jobsSupabase =
            window.supabaseClient;

        return web3jobsSupabase;
    }


    /*
     * Initialize
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
   TEST SUPABASE CONNECTION
   ========================================================= */

async function testSupabaseConnection() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Supabase client is not available."
        );

        return false;
    }


    try {

        const {
            data,
            error
        } =
            await client
                .from("jobs")
                .select("id")
                .limit(1);


        if (error) {

            console.error(
                "Supabase connection test failed:",
                error
            );

            return false;
        }


        console.log(
            "Supabase connection is working."
        );


        return true;


    } catch (error) {

        console.error(
            "Supabase connection error:",
            error
        );


        return false;
    }
}


/* =========================================================
   TEST AUTHENTICATION CONNECTION
   ========================================================= */

async function testSupabaseAuth() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Supabase client is not available."
        );

        return false;
    }


    try {

        const {
            data,
            error
        } =
            await client.auth.getSession();


        if (error) {

            console.error(
                "Supabase Auth test failed:",
                error
            );

            return false;
        }


        console.log(
            "Supabase Auth is available."
        );


        return true;


    } catch (error) {

        console.error(
            "Supabase Auth connection error:",
            error
        );


        return false;
    }
}


/* =========================================================
   GET CURRENT SESSION
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

            console.error(
                "Get Supabase session error:",
                error
            );

            return null;
        }


        return data?.session || null;


    } catch (error) {

        console.error(
            "Unexpected session error:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET CURRENT USER
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

            console.error(
                "Get Supabase user error:",
                error
            );

            return null;
        }


        return data?.user || null;


    } catch (error) {

        console.error(
            "Unexpected user error:",
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
                "Supabase sign out error:",
                error
            );

            return false;
        }


        return true;


    } catch (error) {

        console.error(
            "Unexpected sign out error:",
            error
        );

        return false;
    }
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3JobsSupabase = {

    /*
     * Project URL
     */
    url:
        SUPABASE_URL,


    /*
     * Publishable key
     */
    publishableKey:
        SUPABASE_PUBLISHABLE_KEY,


    /*
     * Initialize
     */
    initialize:
        initializeSupabase,


    /*
     * Main client
     */
    getSupabaseClient:
        getSupabaseClient,


    /*
     * Compatibility
     */
    getClient:
        getClient,


    /*
     * Connection test
     */
    testConnection:
        testSupabaseConnection,


    /*
     * Authentication test
     */
    testAuth:
        testSupabaseAuth,


    /*
     * Session
     */
    getSession:
        getSupabaseSession,


    /*
     * Current user
     */
    getUser:
        getSupabaseUser,


    /*
     * Logout
     */
    signOut:
        signOutSupabase
};


/* =========================================================
   AUTO INITIALIZE
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSupabase
    );

} else {

    initializeSupabase();
}


/* =========================================================
   END OF FILE
   ========================================================= */
