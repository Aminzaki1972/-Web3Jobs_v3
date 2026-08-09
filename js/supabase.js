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
   INITIALIZE
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
   GET CLIENT
   ========================================================= */

function getSupabaseClient() {

    if (web3jobsSupabase) {
        return web3jobsSupabase;
    }

    return initializeSupabase();
}

/* =========================================================
   TEST CONNECTION
   ========================================================= */

async function testSupabaseConnection() {

    const client =
        getSupabaseClient();

    if (!client) {
        return false;
    }

    try {

        const {
            data,
            error
        } = await client
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
   GLOBAL API
   ========================================================= */

window.Web3JobsSupabase = {

    url:
        SUPABASE_URL,

    publishableKey:
        SUPABASE_PUBLISHABLE_KEY,

    initialize:
        initializeSupabase,

    getClient:
        getSupabaseClient,

    testConnection:
        testSupabaseConnection

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
