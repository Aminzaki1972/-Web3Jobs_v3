/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Unified Supabase Client
   ========================================================= */

"use strict";

const SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";

const SUPABASE_STORAGE_KEY =
    "web3jobs-auth";

let web3jobsSupabase = null;

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
                        storageKey: SUPABASE_STORAGE_KEY
                    }
                }
            );

        window.supabaseClient =
            web3jobsSupabase;

        return web3jobsSupabase;

    } catch (error) {
        console.error(
            "Web3Jobs: Supabase initialization error:",
            error
        );

        web3jobsSupabase = null;
        window.supabaseClient = null;

        return null;
    }
}

function getSupabaseClient() {
    if (web3jobsSupabase) {
        return web3jobsSupabase;
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth === "object"
    ) {
        web3jobsSupabase =
            window.supabaseClient;

        return web3jobsSupabase;
    }

    return initializeSupabase();
}

function getClient() {
    return getSupabaseClient();
}

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
        } = await client.auth.getSession();

        if (error) {
            console.error(
                "Web3Jobs: getSession error:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {
        console.error(
            "Web3Jobs: getSession exception:",
            error
        );

        return null;
    }
}

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
        } = await client.auth.getUser();

        if (error) {
            console.error(
                "Web3Jobs: getUser error:",
                error
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {
        console.error(
            "Web3Jobs: getUser exception:",
            error
        );

        return null;
    }
}

async function signOutSupabase() {
    const client =
        getSupabaseClient();

    if (!client) {
        return false;
    }

    try {
        const {
            error
        } = await client.auth.signOut();

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

function onAuthStateChange(callback) {
    const client =
        getSupabaseClient();

    if (!client || typeof callback !== "function") {
        return null;
    }

    return client.auth.onAuthStateChange(
        callback
    );
}

window.Web3JobsSupabase = {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,

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

    signOut:
        signOutSupabase,

    onAuthStateChange:
        onAuthStateChange
};

initializeSupabase();
