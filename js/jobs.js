/* =========================================================
   Web3Jobs v3
   File: js/jobs.js
   Jobs Management System
   FINAL SESSION-SAFE VERSION
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        jobs: [],
        filteredJobs: [],
        currentJob: null,
        currentUser: null,

        initialized: false,
        loading: false,

        searchQuery: "",
        typeFilter: "",
        locationFilter: ""

    };


    /* =====================================================
       SUPABASE CLIENT
       IMPORTANT:
       ALWAYS USE THE SAME CLIENT FROM app.js / supabase.js
       NEVER CREATE A SECOND CLIENT.
       ===================================================== */

    function getClient() {

        /* 1. Unified client */
        if (
            window.Web3Jobs &&
            window.Web3Jobs.supabase &&
            typeof window.Web3Jobs.supabase.from === "function"
        ) {
            return window.Web3Jobs.supabase;
        }


        /* 2. Global client created by app.js */
        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }


        /* 3. Client exposed by supabase.js */
        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {

            const client =
                window.Web3JobsSupabase.getClient();

            if (
                client &&
                typeof client.from === "function"
            ) {
                return client;
            }
        }


        /* 4. Generic db alias */
        if (
            window.db &&
            typeof window.db.from === "function"
        ) {
            return window.db;
        }


        console.error(
            "Web3Jobs: Unified Supabase client not available."
        );

        return null;
    }


    /* =====================================================
       ESCAPE
       ===================================================== */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        const div =
            document.createElement("div");

        div.textContent =
            String(value);

        return div.innerHTML;
    }


    function escapeAttribute(value) {

        return escapeHTML(value);
    }


    /* =====================================================
       VALUE
       ===================================================== */

    function valueOf(
        value,
        fallback = ""
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        const result =
            String(value).trim();

        return result || fallback;
    }


    /* =====================================================
       DATE
       ===================================================== */

    function formatDate(value) {

        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
        }

        return date.toLocaleDateString(
            "en-US",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }


    /* =====================================================
       CURRENT USER
       IMPORTANT:
       NEVER REDIRECT.
       ===================================================== */

    async function getCurrentUser() {

        /* First use the state from app.js */

        if (
            window.Web3JobsState &&
            window.Web3JobsState.currentUser
        ) {

            state.currentUser =
                window.Web3JobsState.currentUser;

            return state.currentUser;
        }


        const client =
            getClient();

        if (!client) {
            return null;
        }


        try {

            /*
             * Read existing session.
             * This does NOT send the user to login.
             */

            const sessionResult =
                await client.auth.getSession();


            const session =
                sessionResult &&
                sessionResult.data
                    ? sessionResult.data.session
                    : null;


            if (
                session &&
                session.user
            ) {

                state.currentUser =
                    session.user;

                return state.currentUser;
            }


            state.currentUser =
                null;

            return null;

        } catch (error) {

            console.warn(
                "Web3Jobs: Session read failed:",
                error
            );

            state.currentUser =
                null;

            return null;
        }
    }


    /* =====================================================
       SYNC USER WITH APP.JS
       ===================================================== */

    function syncUserFromApp() {

        if (
            window.Web3JobsState
        ) {

            state.currentUser =
                window.Web3JobsState.currentUser ||
                null;
        }
    }


    /* =====================================================
       AUTH STATE LISTENER
       IMPORTANT:
       ONLY UPDATE STATE.
       NEVER REDIRECT.
       ===================================================== */

    function initializeAuthListener() {

        const client =
            getClient();

        if (!client) {
            return;
        }


        if (
            document.body.dataset.jobsAuthListener ===
            "true"
        ) {
            return;
        }


        document.body.dataset.jobsAuthListener =
            "true";


        client.auth.onAuthStateChange(
            function (
                event,
                session
            ) {

                state.currentUser =
                    session?.user ||
                    null;


                if (
                    window.Web3JobsState
                ) {

                    window.Web3JobsState.currentUser =
                        state.currentUser;

                    window.Web3JobsState.session =
                        session || null;
                }


                console.log(
                    "Web3Jobs auth state:",
                    event
                );

            }
        );
    }


    /* =====================================================
       CONTAINER
       ===================================================== */

    function findJobsContainer() {

        const selectors = [

            "#jobs-list",

            "#jobs-container",

            ".jobs-list",

            ".jobs-container",

            "[data-jobs-container]"

        ];


        for (
            const selector of selectors
        ) {

            const element =
                document.querySelector(
                    selector
                );

            if (element) {
                return element;
            }
        }


        return null;
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading() {

        const container =
            findJobsContainer();

        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="jobs-loading">

                <p>
                    Loading jobs...
                </p>

            </div>

        `;
    }


    /* =====================================================
       MESSAGE
       ===================================================== */

    function showMessage(
        message,
        type = "info"
    ) {

        let box =
            document.getElementById(
                "jobs-message"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );

            box.id =
                "jobs-message";


            Object.assign(
                box.style,
                {

                    position: "fixed",

                    top: "20px",

                    right: "20px",

                    zIndex: "100000",

                    maxWidth: "360px",

                    padding: "14px 18px",

                    borderRadius: "10px",

                    boxShadow:
                        "0 8px 25px rgba(0,0,0,.2)",

                    fontSize: "14px",

                    lineHeight: "1.5",

                    fontFamily:
                        "inherit"

                }
            );


            document.body.appendChild(
                box
            );
        }


        box.textContent =
            String(
                message || ""
            );


        if (
            type === "success"
        ) {

            box.style.background =
                "#198754";

            box.style.color =
                "#ffffff";

        } else if (
            type === "error"
        ) {

            box.style.background =
                "#dc3545";

            box.style.color =
                "#ffffff";

        } else if (
            type === "warning"
        ) {

            box.style.background =
                "#ffc107";

            box.style.color =
                "#111111";

        } else {

            box.style.background =
                "#212529";

            box.style.color =
                "#ffffff";
        }


        box.style.display =
            "block";


        clearTimeout(
            box._timer
        );


        box._timer =
            setTimeout(
                function () {

                    box.style.display =
                        "none";

                },
                5000
            );
    }


    function
