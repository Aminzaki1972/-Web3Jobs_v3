/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Company Supabase Configuration
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
            "Web3Jobs: Supabase library is not loaded."
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
                        detectSessionInUrl: true,
                        storageKey: "web3jobs-company-auth"
                    }
                }
            );


        window.supabaseClient =
            web3jobsSupabase;


        console.log(
            "Web3Jobs: Company Supabase initialized."
        );


        console.log(
            "Web3Jobs: Supabase URL:",
            SUPABASE_URL
        );


        return web3jobsSupabase;


    } catch (error) {

        console.error(
            "Web3Jobs: Supabase initialization error:",
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
   GET SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (web3jobsSupabase) {
        return web3jobsSupabase;
    }


    if (
        window.supabaseClient
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
   GET SESSION
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
                "Web3Jobs: getSession error:",
                error
            );

            return null;
        }


        console.log(
            "Web3Jobs: Current session:",
            data?.session
        );


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
                "Web3Jobs: getUser error:",
                error
            );

            return null;
        }


        console.log(
            "Web3Jobs: Current user:",
            data?.user
        );


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
   TEST AUTH
   ========================================================= */

async function testSupabaseAuth() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Web3Jobs: Supabase client unavailable."
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
                "Web3Jobs: Auth test failed:",
                error
            );

            return false;
        }


        console.log(
            "Web3Jobs: Auth test successful."
        );


        console.log(
            "Web3Jobs: Session:",
            data?.session
        );


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs: Auth test exception:",
            error
        );

        return false;
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


        console.log(
            "Web3Jobs: Signed out successfully."
        );


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs: Sign out exception:",
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

    getSession:
        getSupabaseSession,

    getUser:
        getSupabaseUser,

    testAuth:
        testSupabaseAuth,

    signOut:
        signOutSupabase
};


/* =========================================================
   AUTO INITIALIZATION
   ========================================================= */

initializeSupabase();


/* =========================================================
   END OF FILE
   ========================================================= */
