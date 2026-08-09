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

    /* Already initialized */
    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


    /* Check Supabase library */
    if (
        typeof window === "undefined" ||
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Supabase JavaScript library is not loaded."
        );

        return null;
    }


    try {

        web3jobsSupabase =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );


        console.log(
            "Web3Jobs Supabase initialized successfully."
        );


        return web3jobsSupabase;

    } catch (error) {

        console.error(
            "Supabase initialization failed:",
            error
        );

        web3jobsSupabase = null;

        return null;
    }
}


/* =========================================================
   GET SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


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
   GLOBAL API
   ========================================================= */

window.Web3JobsSupabase = {

    url:
        SUPABASE_URL,

    publishableKey:
        SUPABASE_PUBLISHABLE_KEY,

    initialize:
        initializeSupabase,

    /*
     * Main function used by auth.js
     */
    getSupabaseClient:
        getSupabaseClient,

    /*
     * Compatibility alias
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
        testSupabaseAuth
};


/* =========================================================
   AUTO INITIALIZE
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSupabase
    );

} else {

    initializeSupabase();
}
