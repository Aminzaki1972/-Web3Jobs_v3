/* =========================================================
   Web3Jobs v3
   js/app.js

   Main application and Supabase configuration
========================================================= */

(function () {

    "use strict";

    /* =====================================================
       SUPABASE CONFIGURATION
    ===================================================== */

    const SUPABASE_URL =
        "https://jqhemwskrnlycximjpag.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";


    /* =====================================================
       APPLICATION CONFIGURATION
    ===================================================== */

    const APP_VERSION = "3.0.1";


    /* =====================================================
       CHECK SUPABASE LIBRARY
    ===================================================== */

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs: Supabase library was not loaded."
        );

        window.Web3Jobs = {

            supabase: null,

            connected: false,

            version: APP_VERSION,

            error:
                "Supabase library was not loaded."

        };

        return;
    }


    /* =====================================================
       CREATE SUPABASE CLIENT
    ===================================================== */

    let supabaseClient = null;


    try {

        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
            );

    } catch (error) {

        console.error(
            "Web3Jobs: Failed to initialize Supabase.",
            error
        );

        window.Web3Jobs = {

            supabase: null,

            connected: false,

            version: APP_VERSION,

            error: error

        };

        return;
    }


    /* =====================================================
       GLOBAL APPLICATION OBJECT
    ===================================================== */

    window.Web3Jobs = {

        supabase:
            supabaseClient,

        supabaseUrl:
            SUPABASE_URL,

        connected:
            true,

        version:
            APP_VERSION

    };


    /* =====================================================
       COMPATIBILITY ALIASES
    ===================================================== */

    window.supabaseClient =
        supabaseClient;

    window.db =
        supabaseClient;


    /* =====================================================
       APPLICATION STATE
    ===================================================== */

    window.Web3JobsState = {

        currentUser:
            null,

        profile:
            null,

        accountType:
            null,

        jobs:
            [],

        filteredJobs:
            [],

        loading:
            false

    };


    /* =====================================================
       UTILITY FUNCTIONS
    ===================================================== */

    window.Web3JobsUtils = {

        escapeHTML:
            function (value) {

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

            },


        string:
            function (value) {

                if (
                    value === null ||
                    value === undefined
                ) {

                    return "";

                }

                return String(value).trim();

            },


        formatDate:
            function (dateValue) {

                if (!dateValue) {

                    return "";

                }

                const date =
                    new Date(dateValue);

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

            },


        timeAgo:
            function (dateValue) {

                if (!dateValue) {

                    return "";

                }

                const date =
                    new Date(dateValue);

                if (
                    Number.isNaN(
                        date.getTime()
                    )
                ) {

                    return "";

                }

                const now =
                    new Date();

                const seconds =
                    Math.floor(
                        (
                            now.getTime() -
                            date.getTime()
                        ) / 1000
                    );


                if (seconds < 60) {

                    return "Just now";

                }


                const minutes =
                    Math.floor(
                        seconds / 60
                    );


                if (minutes < 60) {

                    return (
                        minutes +
                        (
                            minutes === 1
                                ? " minute ago"
                                : " minutes ago"
                        )
                    );

                }


                const hours =
                    Math.floor(
                        minutes / 60
                    );


                if (hours < 24) {

                    return (
                        hours +
                        (
                            hours === 1
                                ? " hour ago"
                                : " hours ago"
                        )
                    );

                }


                const days =
                    Math.floor(
                        hours / 24
                    );


                if (days < 30) {

                    return (
                        days +
                        (
                            days === 1
                                ? " day ago"
                                : " days ago"
                        )
                    );

                }


                return this.formatDate(
                    dateValue
                );

            },


        showMessage:
            function (
                message,
                type = "info"
            ) {

                console.log(
                    `[Web3Jobs:${type}]`,
                    message
                );

            }

    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    window.Web3JobsAuth = {

        getSession:
            async function () {

                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .auth
                            .getSession();


                    if (error) {

                        console.error(
                            "Web3Jobs auth session error:",
                            error
                        );

                        return null;

                    }


                    return (
                        data?.session ||
                        null
                    );

                } catch (error) {

                    console.error(
                        "Web3Jobs getSession error:",
                        error
                    );

                    return null;

                }

            },


        getUser:
            async function () {

                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (error) {

                        return null;

                    }


                    return (
                        data?.user ||
                        null
                    );

                } catch (error) {

                    console.error(
                        "Web3Jobs getUser error:",
                        error
                    );

                    return null;

                }

            },


        signOut:
            async function () {

                try {

                    const {
                        error
                    } =
                        await supabaseClient
                            .auth
                            .signOut();


                    if (error) {

                        throw error;

                    }


                    window.Web3JobsState.currentUser =
                        null;

                    window.Web3JobsState.profile =
                        null;

                    window.Web3JobsState.accountType =
                        null;


                    return {
                        success: true
                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs sign out error:",
                        error
                    );

                    return {
                        success: false,
                        error: error
                    };

                }

            }

    };


    /* =====================================================
       LOAD CURRENT USER
    ===================================================== */

    async function loadCurrentUser() {

        try {

            const session =
                await window.Web3JobsAuth
                    .getSession();


            if (!session) {

                window.Web3JobsState.currentUser =
                    null;

                return null;

            }


            const user =
                session.user;


            window.Web3JobsState.currentUser =
                user;


            return user;

        } catch (error) {

            console.error(
                "Web3Jobs: Unable to load current user.",
                error
            );

            return null;

        }

    }


    /* =====================================================
       AUTH STATE LISTENER
    ===================================================== */

    supabaseClient
        .auth
        .onAuthStateChange(
            function (
                event,
                session
            ) {

                const user =
                    session?.user ||
                    null;


                window.Web3JobsState.currentUser =
                    user;


                window.dispatchEvent(
                    new CustomEvent(
                        "web3jobs:auth",
                        {
                            detail: {
                                event: event,
                                session: session,
                                user: user
                            }
                        }
                    )
                );

            }
        );


    /* =====================================================
       LOAD PROFILE
    ===================================================== */

    async function loadProfile(
        userId
    ) {

        if (!userId) {

            return null;

        }


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("profiles")
                    .select("*")
                    .eq(
                        "id",
                        userId
                    )
                    .maybeSingle();


            if (error) {

                console.warn(
                    "Web3Jobs: Profile could not be loaded.",
                    error.message
                );

                return null;

            }


            if (data) {

                window.Web3JobsState.profile =
                    data;

                window.Web3JobsState.accountType =
                    data.account_type || null;

            }


            return data || null;

        } catch (error) {

            console.warn(
                "Web3Jobs profile error:",
                error
            );

            return null;

        }

    }


    /* =====================================================
       INITIALIZE USER
    ===================================================== */

    async function initializeUser() {

        const user =
            await loadCurrentUser();


        if (!user) {

            return null;

        }


        const profile =
            await loadProfile(
                user.id
            );


        return {
            user: user,
            profile: profile
        };

    }


    /* =====================================================
       JOBS API
    ===================================================== */

    window.Web3JobsAPI = {

        getJobs:
            async function (
                options = {}
            ) {

                const {

                    limit = 100,

                    order = "created_at",

                    ascending = false

                } = options;


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("jobs")
                            .select("*")
                            .order(
                                order,
                                {
                                    ascending:
                                        ascending
                                }
                            )
                            .limit(
                                limit
                            );


                    if (error) {

                        console.error(
                            "Web3Jobs: Failed to load jobs.",
                            error
                        );

                        return {
                            data: [],
                            error: error
                        };

                    }


                    const jobs =
                        Array.isArray(data)
                            ? data
                            : [];


                    window.Web3JobsState.jobs =
                        jobs;

                    window.Web3JobsState.filteredJobs =
                        jobs;


                    window.dispatchEvent(
                        new CustomEvent(
                            "web3jobs:jobs-updated",
                            {
                                detail: {
                                    jobs: jobs
                                }
                            }
                        )
                    );


                    return {
                        data: jobs,
                        error: null
                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs getJobs error:",
                        error
                    );

                    return {
                        data: [],
                        error: error
                    };

                }

            },


        getJob:
            async function (
                jobId
            ) {

                if (!jobId) {

                    return {
                        data: null,
                        error:
                            new Error(
                                "Job ID is required."
                            )
                    };

                }


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("jobs")
                            .select("*")
                            .eq(
                                "id",
                                jobId
                            )
                            .maybeSingle();


                    return {
                        data: data || null,
                        error: error || null
                    };

                } catch (error) {

                    return {
                        data: null,
                        error: error
                    };

                }

            },


        searchJobs:
            async function ({
                keyword = "",
                location = "",
                type = ""
            } = {}) {

                const result =
                    await this.getJobs({
                        limit: 200
                    });


                if (result.error) {

                    return result;

                }


                const keywordValue =
                    String(keyword)
                        .trim()
                        .toLowerCase();


                const locationValue =
                    String(location)
                        .trim()
                        .toLowerCase();


                const typeValue =
                    String(type)
                        .trim()
                        .toLowerCase();


                const filtered =
                    result.data.filter(
                        function (job) {

                            const text = [

                                job.title,

                                job.company,

                                job.description,

                                job.skills

                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();


                            const jobLocation =
                                String(
                                    job.location || ""
                                ).toLowerCase();


                            const jobType =
                                String(
                                    job.type || ""
                                ).toLowerCase();


                            return (

                                (
                                    !keywordValue ||
                                    text.includes(
                                        keywordValue
                                    )
                                )

                                &&

                                (
                                    !locationValue ||
                                    jobLocation.includes(
                                        locationValue
                                    )
                                )

                                &&

                                (
                                    !typeValue ||
                                    jobType.includes(
                                        typeValue
                                    )
                                )

                            );

                        }
                    );


                window.Web3JobsState.filteredJobs =
                    filtered;


                return {
                    data: filtered,
                    error: null
                };

            }

    };


    /* =====================================================
       JOB CONTAINER
    ===================================================== */

    function getJobsContainer() {

        return (
            document.querySelector(
                "[data-jobs-container]"
            ) ||
            document.getElementById(
                "jobs-list"
            )
        );

    }


    /* =====================================================
       RENDER JOBS
    ===================================================== */

    function renderJobs(
        jobs
    ) {

        const container =
            getJobsContainer();


        if (!container) {

            return;

        }


        if (
            !Array.isArray(jobs) ||
            jobs.length === 0
        ) {

            container.innerHTML = `

                <div class="no-jobs">

                    <h3>
                        No jobs found
                    </h3>

                    <p>
                        No matching opportunities
                        are available right now.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML =
            jobs.map(
                function (job) {

                    const title =
                        window.Web3JobsUtils
                            .escapeHTML(
                                job.title ||
                                "Untitled Position"
                            );


                    const company =
                        window.Web3JobsUtils
                            .escapeHTML(
                                job.company ||
                                "Web3 Company"
                            );


                    const location =
                        window.Web3JobsUtils
                            .escapeHTML(
                                job.location ||
                                "Remote"
                            );


                    const type =
                        window.Web3JobsUtils
                            .escapeHTML(
                                job.type ||
                                "Web3"
                            );


                    const description =
                        window.Web3JobsUtils
                            .escapeHTML(
                                job.description ||
                                "No description available."
                            );


                    const date =
                        window.Web3JobsUtils
                            .timeAgo(
                                job.created_at
                            );


                    const id =
                        window.Web3JobsUtils
                            .escapeHTML(
                                job.id
                            );


                    return `

                        <article
                            class="job-card"
                            data-job-id="${id}"
                        >

                            <h3>
                                ${title}
                            </h3>

                            <div class="job-company">
                                ${company}
                            </div>

                            <div class="job-meta">

                                <span>
                                    ${location}
                                </span>

                                <span>
                                    ${type}
                                </span>

                                ${
                                    date
                                    ? `
                                        <span>
                                            ${date}
                                        </span>
                                    `
                                    : ""
                                }

                            </div>

                            <p class="job-description">
                                ${description}
                            </p>

                            <div class="job-card-actions">

                                <a
                                    href="job.html?id=${encodeURIComponent(
                                        job.id
                                    )}"
                                    class="job-view-button"
                                >
                                    View Job
                                </a>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       JOB DISPLAY API
    ===================================================== */

    window.Web3JobsJobs = {

        renderAllJobs:
            renderJobs,


        loadJobs:
            async function () {

                const result =
                    await window.Web3JobsAPI
                        .getJobs();


                renderJobs(
                    result.data
                );


                return result;

            }

    };


    /* =====================================================
       COMPATIBILITY OBJECT
    ===================================================== */

    window.JobsSystem = {

        jobs:
            window.Web3JobsState.jobs,

        filteredJobs:
            window.Web3JobsState.filteredJobs

    };


    /* =====================================================
       SYNC JOB STATE
    ===================================================== */

    function syncJobsState() {

        window.JobsSystem.jobs =
            window.Web3JobsState.jobs;

        window.JobsSystem.filteredJobs =
            window.Web3JobsState.filteredJobs;

    }


    window.addEventListener(
        "web3jobs:jobs-updated",
        syncJobsState
    );


    /* =====================================================
       APPLICATION INITIALIZATION
    ===================================================== */

    async function initializeApp() {

        console.log(
            "===================================="
        );

        console.log(
            "Web3Jobs v3"
        );

        console.log(
            "Initializing application..."
        );


        if (
            !window.Web3Jobs.connected
        ) {

            console.error(
                "Web3Jobs: Supabase is not connected."
            );

            return;

        }


        console.log(
            "Supabase initialized successfully."
        );


        await initializeUser();


        if (
            getJobsContainer()
        ) {

            await window.Web3JobsJobs
                .loadJobs();

            syncJobsState();

        }


        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:ready",
                {
                    detail: {
                        version:
                            APP_VERSION,

                        supabase:
                            supabaseClient
                    }
                }
            )
        );


        console.log(
            "Web3Jobs initialized."
        );

        console.log(
            "===================================="
        );

    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeApp
        );

    } else {

        initializeApp();

    }

})();
