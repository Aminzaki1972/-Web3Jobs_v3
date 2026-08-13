/* =========================================================
   Web3Jobs v3
   File: js/supabase.js

   Unified Supabase Client
   Session-Safe Version
   ---------------------------------------------------------
   IMPORTANT:
   - This is the ONLY Supabase client used by Web3Jobs.
   - Do NOT create another Supabase client in auth.js
     or jobs.js.
   - Uses the same persistent authentication session.
   - Never redirects the user.
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
 * One fixed storage key for the whole application.
 *
 * IMPORTANT:
 * auth.js
 * jobs.js
 * dashboard files
 *
 * must all use this same Supabase client.
 */

const SUPABASE_STORAGE_KEY =
    "web3jobs-auth";


/* =========================================================
   SINGLE CLIENT
   ========================================================= */

let web3jobsSupabaseClient = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeSupabase() {

    /*
     * IMPORTANT:
     * If the client already exists, return it.
     *
     * This prevents jobs.js / auth.js / dashboard
     * from creating additional authentication sessions.
     */

    if (
        web3jobsSupabaseClient &&
        typeof web3jobsSupabaseClient.from === "function"
    ) {

        return web3jobsSupabaseClient;
    }


    /*
     * Check Supabase library.
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
         * Create ONE client only.
         */

        web3jobsSupabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {

                    auth: {

                        /*
                         * Keep login session.
                         */
                        persistSession: true,

                        /*
                         * Refresh access token automatically.
                         */
                        autoRefreshToken: true,

                        /*
                         * IMPORTANT:
                         *
                         * Supabase may process authentication
                         * tokens from the URL after email confirmation.
                         *
                         * This does NOT redirect the user.
                         */
                        detectSessionInUrl: true,

                        /*
                         * Same storage key everywhere.
                         */
                        storageKey:
                            SUPABASE_STORAGE_KEY

                    }

                }
            );


        /*
         * Expose the actual client globally.
         *
         * This is important because some older files in
         * Web3Jobs use window.supabaseClient.
         */

        window.supabaseClient =
            web3jobsSupabaseClient;


        /*
         * Also expose the actual client through
         * Web3JobsSupabase.getClient().
         */

        console.log(
            "Web3Jobs: Supabase client initialized successfully."
        );


        return web3jobsSupabaseClient;

    } catch (error) {

        console.error(
            "Web3Jobs: Supabase initialization failed:",
            error
        );

        web3jobsSupabaseClient =
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
     * First use our single client.
     */

    if (
        web3jobsSupabaseClient &&
        typeof web3jobsSupabaseClient.from === "function"
    ) {

        return web3jobsSupabaseClient;
    }


    /*
     * Compatibility:
     * If another file already initialized the same client,
     * reuse it instead of creating another client.
     */

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        web3jobsSupabaseClient =
            window.supabaseClient;

        return web3jobsSupabaseClient;
    }


    /*
     * Initialize only when necessary.
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
   CURRENT SESSION
   ========================================================= */

async function getSupabaseSession() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Web3Jobs: Supabase client unavailable."
        );

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
   CURRENT USER
   ========================================================= */

async function getSupabaseUser() {

    const client =
        getSupabaseClient();


    if (!client) {

        console.error(
            "Web3Jobs: Supabase client unavailable."
        );

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


        return (
            data &&
            data.user
                ? data.user
                : null
        );

    } catch (error) {

        console.error(
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
        !client.auth ||
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


        /*
         * Clear only Web3Jobs local account information.
         *
         * Do NOT manually destroy the Supabase storage here.
         * Supabase handles the authentication session itself.
         */

        try {

            localStorage.removeItem(
                "web3jobs_account_type"
            );

            localStorage.removeItem(
                "web3jobs_user_id"
            );

        } catch (storageError) {

            console.warn(
                "Web3Jobs: localStorage cleanup failed:",
                storageError
            );
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

async function hasActiveSession() {

    const session =
        await getSupabaseSession();


    return Boolean(
        session &&
        session.user
    );
}


/* =========================================================
   AUTH USER ID HELPER
   ========================================================= */

async function getAuthenticatedUserId() {

    const session =
        await getSupabaseSession();


    if (
        !session ||
        !session.user
    ) {

        return null;
    }


    return session.user.id || null;
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
     * Main client
     */

    initialize:
        initializeSupabase,

    getClient:
        getSupabaseClient,

    getSupabaseClient:
        getSupabaseClient,


    /*
     * Session
     */

    getSession:
        getSupabaseSession,

    getSupabaseSession:
        getSupabaseSession,

    hasActiveSession:
        hasActiveSession,

    getAuthenticatedUserId:
        getAuthenticatedUserId,


    /*
     * User
     */

    getUser:
        getSupabaseUser,

    getSupabaseUser:
        getSupabaseUser,


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

/*
 * Older Web3Jobs files may use:
 *
 * window.supabaseClient
 *
 * Make sure it points to the SAME client.
 */

const initialSupabaseClient =
    initializeSupabase();


if (
    initialSupabaseClient &&
    typeof initialSupabaseClient.from === "function"
) {

    window.supabaseClient =
        initialSupabaseClient;
}


/* =========================================================
   GLOBAL HELPER FUNCTIONS
   ========================================================= */

window.getSupabaseClient =
    getSupabaseClient;

window.getSupabaseSession =
    getSupabaseSession;

window.getSupabaseUser =
    getSupabaseUser;

window.hasActiveSupabaseSession =
    hasActiveSession;


/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

console.log(
    "================================================="
);

console.log(
    "Web3Jobs Supabase System Loaded"
);

console.log(
    "Supabase URL:",
    SUPABASE_URL
);

console.log(
    "Storage Key:",
    SUPABASE_STORAGE_KEY
);

console.log(
    "Single Client:",
    Boolean(
        web3jobsSupabaseClient
    )
);

console.log(
    "================================================="
);
