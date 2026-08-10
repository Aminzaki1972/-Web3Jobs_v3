/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Central Supabase Configuration
   ---------------------------------------------------------
   COMPANY SUPABASE PROJECT
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

let web3jobsSupabase = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeSupabase() {

    if (web3jobsSupabase) {
        return web3jobsSupabase;
    }


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


    try {

        web3jobsSupabase =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );


        window.supabaseClient =
            web3jobsSupabase;


        console.log(
            "Web3Jobs: NEW Supabase project initialized."
        );

        console.log(
            "Web3Jobs: Supabase URL:",
            SUPABASE_URL
        );


        return web3jobsSupabase;


    } catch (error) {

        console.error(
            "Web3Jobs: Supabase initialization failed:",
            error
        );


        web3jobsSupabase = null;

        window.supabaseClient = null;

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


    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth !== "undefined"
    ) {

        web3jobsSupabase =
            window.supabaseClient;

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
   TEST DATABASE CONNECTION
   ========================================================= */

async function testSupabaseConnection() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Web3Jobs: Supabase client is not available."
        );

        return false;
    }


    try {

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select("id")
                .limit(1);


        if (error) {

            console.error(
                "Web3Jobs: Supabase database test failed:",
                error
            );

            return false;
        }


        console.log(
            "Web3Jobs: Supabase database connection is working."
        );


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs: Supabase database connection error:",
            error
        );

        return false;
    }
}


/* =========================================================
   TEST AUTHENTICATION
   ========================================================= */

async function testSupabaseAuth() {

    const client =
        getSupabaseClient();


    if (!client) {
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
                "Web3Jobs: Supabase Auth test failed:",
                error
            );

            return false;
        }


        console.log(
            "Web3Jobs: Supabase Auth is available."
        );

        console.log(
            "Web3Jobs: Current session:",
            data?.session || null
        );


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs: Supabase Auth connection error:",
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
                "Web3Jobs: Get session error:",
                error
            );

            return null;
        }


        return data?.session || null;


    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected session error:",
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
                "Web3Jobs: Get user error:",
                error
            );

            return null;
        }


        return data?.user || null;


    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected user error:",
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
                "Web3Jobs: Sign out error:",
                error
            );

            return false;
        }


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected sign out error:",
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

    getSupabaseClient:
        getSupabaseClient,

    getClient:
        getClient,

    testConnection:
        testSupabaseConnection,

    testAuth:
        testSupabaseAuth,

    getSession:
        getSupabaseSession,

    getUser:
        getSupabaseUser,

    signOut:
        signOutSupabase
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


/* =========================================================
   END OF FILE
   ========================================================= */
