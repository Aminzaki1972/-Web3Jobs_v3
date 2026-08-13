/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Unified Supabase Client
   Single Session / Single Client
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
 * IMPORTANT
 *
 * This storage key must remain identical on every page.
 * It prevents different pages from creating different
 * authentication sessions.
 */

const SUPABASE_STORAGE_KEY =
    "web3jobs-auth";


/* =========================================================
   INTERNAL CLIENT
   ========================================================= */

let web3jobsSupabase = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeSupabase() {

    /*
     * If the central client already exists,
     * always return the same client.
     */

    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


    /*
     * Make sure Supabase library exists.
     */

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

        /*
         * Create ONE Supabase client only.
         */

        web3jobsSupabase =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {

                        /*
                         * Keep authentication session.
                         */

                        persistSession:
                            true,


                        /*
                         * Automatically refresh
                         * expired access tokens.
                         */

                        autoRefreshToken:
                            true,


                        /*
                         * IMPORTANT:
                         *
                         * Do not allow pages to interpret
                         * URL parameters as a new session.
                         */

                        detectSessionInUrl:
                            false,


                        /*
                         * Same storage key everywhere.
                         */

                        storageKey:
                            SUPABASE_STORAGE_KEY

                    }
                }
            );


        /*
         * Global compatibility.
         */

        window.supabaseClient =
            web3jobsSupabase;


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
   GET CENTRAL CLIENT
   ========================================================= */

function getSupabaseClient() {

    /*
     * Always return the existing central client.
     */

    if (web3jobsSupabase) {

        return web3jobsSupabase;
    }


    /*
     * Backward compatibility.
     */

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        web3jobsSupabase =
            window.supabaseClient;

        return web3jobsSupabase;
    }


    /*
     * Initialize only once.
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


        return (
            data &&
            data.session
                ? data.session
                : null
        );


    } catch (error) {

        console.error(
            "Web3Jobs: getSession exception:",
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

            /*
             * No automatic redirect here.
             */

            console.warn(
                "Web3Jobs: getUser error:",
                error
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

function onAuthStateChange(callback) {

    const client =
        getSupabaseClient();


    if (
        !client ||
        typeof callback !== "function"
    ) {

        return null;
    }


    try {

        return client.auth.onAuthStateChange(
            callback
        );

    } catch (error) {

        console.error(
            "Web3Jobs: auth state listener error:",
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

async function hasSupabaseSession() {

    const session =
        await getSupabaseSession();


    return Boolean(
        session &&
        session.user
    );
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

    hasSession:
        hasSupabaseSession,

    onAuthStateChange:
        onAuthStateChange,

    signOut:
        signOutSupabase

};


/* =========================================================
   GLOBAL COMPATIBILITY
   ========================================================= */

window.getSupabaseClient =
    getSupabaseClient;

window.getSupabaseSession =
    getSupabaseSession;

window.getSupabaseUser =
    getSupabaseUser;


/* =========================================================
   INITIAL START
   ========================================================= */

initializeSupabase();


console.log(
    "Web3Jobs: Unified Supabase Client loaded."
);
