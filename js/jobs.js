/* =========================================================
   Web3Jobs v3
   js/jobs.js

   Jobs loading / searching / filtering / rendering
   Connected to Supabase through js/app.js
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       WAIT FOR APPLICATION
    ===================================================== */

    function getSupabase() {

        if (
            window.Web3Jobs &&
            window.Web3Jobs.supabase
        ) {

            return window.Web3Jobs.supabase;

        }

        return null;

    }


    /* =====================================================
       DOM HELPERS
    ===================================================== */

    function findElement(selectors) {

        for (
            let i = 0;
            i < selectors.length;
            i++
        ) {

            const element =
                document.querySelector(
                    selectors[i]
                );

            if (element) {

                return element;

            }

        }

        return null;

    }


    function getJobsContainer() {

        return findElement([

            "[data-jobs-container]",

            "#jobs-list",

            "#jobsContainer",

            ".jobs-list",

            ".jobs-grid"

        ]);

    }


    function getSearchInput() {

        return findElement([

            "#jobSearch",

            "#search",

            "#searchInput",

            "[name='search']"

        ]);

    }


    function getLocationInput() {

        return findElement([

            "#locationSearch",

            "#location",

            "#locationInput",

            "[name='location']"

        ]);

    }


    function getTypeInput() {

        return findElement([

            "#jobType",

            "#type",

            "#job-type",

            "[name='type']"

        ]);

    }


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        jobs: [],

        filteredJobs: [],

        loading: false,

        initialized: false

    };


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            String(value);


        return div.innerHTML;

    }


    /* =====================================================
       DATE FORMAT
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
                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric"
            }
        );

    }


    /* =====================================================
       LOADING MESSAGE
    ===================================================== */

    function showLoading() {

        const container =
            getJobsContainer();


        if (!container) {

            return;

        }


        container.innerHTML = `

            <div class="jobs-loading">

                <div class="jobs-loading-spinner">
                    ⟳
                </div>

                <p>
                    Loading Web3 opportunities...
                </p>

            </div>

        `;

    }


    /* =====================================================
       EMPTY MESSAGE
    ===================================================== */

    function showEmpty(message) {

        const container =
            getJobsContainer();


        if (!container) {

            return;

        }


        container.innerHTML = `

            <div class="jobs-empty">

                <div class="jobs-empty-icon">
                    🔎
                </div>

                <h3>
                    No Jobs Found
                </h3>

                <p>
                    ${escapeHTML(
                        message ||
                        "No matching opportunities are available right now."
                    )}
                </p>

            </div>

        `;

    }


    /* =====================================================
       ERROR MESSAGE
    ===================================================== */

    function showError(message) {

        const container =
            getJobsContainer();


        if (!container) {

            return;

        }


        container.innerHTML = `

            <div class="jobs-error">

                <div class="jobs-error-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to Load Jobs
                </h3>

                <p>
                    ${escapeHTML(
                        message ||
                        "Please try again later."
                    )}
                </p>

                <button
                    type="button"
                    class="btn btn-primary"
                    data-jobs-retry
                >
                    Try Again
                </button>

            </div>

        `;


        const retryButton =
            container.querySelector(
                "[data-jobs-retry]"
            );


        if (retryButton) {

            retryButton.addEventListener(
                "click",
                loadJobs
            );

        }

    }


    /* =====================================================
       JOB CARD
    ===================================================== */

    function createJobCard(job) {

        const id =
            escapeHTML(
                job.id
            );


        const title =
            escapeHTML(
                job.title ||
                "Untitled Position"
            );


        const company =
            escapeHTML(
                job.company ||
                "Web3 Company"
            );


        const location =
            escapeHTML(
                job.location ||
                "Remote"
            );


        const type =
            escapeHTML(
                job.type ||
                "Web3"
            );


        const description =
            escapeHTML(
                job.description ||
                "No description available."
            );


        const date =
            formatDate(
                job.created_at
            );


        return `

            <article
                class="job-card"
                data-job-id="${id}"
            >

                <div class="job-card-header">

                    <div>

                        <h3 class="job-title">
                            ${title}
                        </h3>

                        <div class="job-company">
                            ${company}
                        </div>

                    </div>

                </div>


                <div class="job-meta">

                    <span>
                        📍 ${location}
                    </span>

                    <span>
                        💼 ${type}
                    </span>

                    ${
                        date
                        ? `
                            <span>
                                📅 ${date}
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
                        class="btn btn-primary"
                    >
                        View Job
                    </a>

                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-save-job="${id}"
                    >
                        🔖 Save
                    </button>

                </div>

            </article>

        `;

    }


    /* =====================================================
       RENDER JOBS
    ===================================================== */

    function renderJobs(jobs) {

        const container =
            getJobsContainer();


        if (!container) {

            return;

        }


        if (
            !Array.isArray(jobs) ||
            jobs.length === 0
        ) {

            showEmpty(
                "Try changing your search or check back later."
            );

            return;

        }


        container.innerHTML =
            jobs
                .map(createJobCard)
                .join("");


        attachJobActions();

    }


    /* =====================================================
       LOAD JOBS FROM SUPABASE
    ===================================================== */

    async function loadJobs() {

        const supabase =
            getSupabase();


        if (!supabase) {

            console.warn(
                "Web3Jobs: Supabase is not ready yet."
            );

            return;

        }


        state.loading =
            true;


        showLoading();


        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("jobs")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    );


            if (error) {

                console.error(
                    "Web3Jobs jobs error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load jobs from Supabase."
                );


                return;

            }


            state.jobs =
                Array.isArray(data)
                    ? data
                    : [];


            state.filteredJobs =
                [
                    ...state.jobs
                ];


            /*
               Keep global application state
               synchronized.
            */

            if (
                window.Web3JobsState
            ) {

                window.Web3JobsState.jobs =
                    state.jobs;

                window.Web3JobsState.filteredJobs =
                    state.filteredJobs;

            }


            renderJobs(
                state.filteredJobs
            );


            state.initialized =
                true;


        } catch (error) {

            console.error(
                "Web3Jobs unexpected jobs error:",
                error
            );


            showError(
                "An unexpected error occurred while loading jobs."
            );

        } finally {

            state.loading =
                false;

        }

    }


    /* =====================================================
       SEARCH / FILTER
    ===================================================== */

    function filterJobs() {

        const searchInput =
            getSearchInput();


        const locationInput =
            getLocationInput();


        const typeInput =
            getTypeInput();


        const keyword =
            (
                searchInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const location =
            (
                locationInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const type =
            (
                typeInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        state.filteredJobs =
            state.jobs.filter(
                function (job) {

                    const searchableText = [

                        job.title,

                        job.company,

                        job.description,

                        job.skills,

                        job.category

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    const jobLocation =
                        String(
                            job.location ||
                            ""
                        )
                            .toLowerCase();


                    const jobType =
                        String(
                            job.type ||
                            ""
                        )
                            .toLowerCase();


                    const matchesKeyword =

                        !keyword ||

                        searchableText.includes(
                            keyword
                        );


                    const matchesLocation =

                        !location ||

                        jobLocation.includes(
                            location
                        );


                    const matchesType =

                        !type ||

                        jobType.includes(
                            type
                        );


                    return (

                        matchesKeyword &&

                        matchesLocation &&

                        matchesType

                    );

                }
            );


        if (
            window.Web3JobsState
        ) {

            window.Web3JobsState.filteredJobs =
                state.filteredJobs;

        }


        renderJobs(
            state.filteredJobs
        );


        /*
           Update URL without reloading.
        */

        try {

            const params =
                new URLSearchParams();


            if (keyword) {

                params.set(
                    "q",
                    keyword
                );

            }


            if (location) {

                params.set(
                    "location",
                    location
                );

            }


            if (type) {

                params.set(
                    "type",
                    type
                );

            }


            const query =
                params.toString();


            const newUrl =
                window.location.pathname +
                (
                    query
                    ? "?" + query
                    : ""
                );


            window.history.replaceState(
                {},
                "",
                newUrl
            );

        } catch (error) {

            console.warn(
                "Web3Jobs: Could not update URL.",
                error
            );

        }

    }


    /* =====================================================
       SEARCH BUTTON
    ===================================================== */

    function setupSearch() {

        const searchInput =
            getSearchInput();


        const locationInput =
            getLocationInput();


        const typeInput =
            getTypeInput();


        const searchButton =
            findElement([

                "[data-jobs-search]",

                "#searchJobs",

                "#searchButton"

            ]);


        if (searchButton) {

            searchButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    filterJobs();

                }
            );

        }


        if (searchInput) {

            searchInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        filterJobs();

                    }

                }
            );

        }


        if (locationInput) {

            locationInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        filterJobs();

                    }

                }
            );

        }


        if (typeInput) {

            typeInput.addEventListener(
                "change",
                filterJobs
            );

        }

    }


    /* =====================================================
       URL SEARCH PARAMETERS
    ===================================================== */

    function applyUrlSearch() {

        try {

            const params =
                new URLSearchParams(
                    window.location.search
                );


            const keyword =
                params.get("q");


            const location =
                params.get("location");


            const type =
                params.get("type");


            const searchInput =
                getSearchInput();


            const locationInput =
                getLocationInput();


            const typeInput =
                getTypeInput();


            if (
                searchInput &&
                keyword
            ) {

                searchInput.value =
                    keyword;

            }


            if (
                locationInput &&
                location
            ) {

                locationInput.value =
                    location;

            }


            if (
                typeInput &&
                type
            ) {

                typeInput.value =
                    type;

            }


            if (
                keyword ||
                location ||
                type
            ) {

                filterJobs();

            }

        } catch (error) {

            console.warn(
                "Web3Jobs: Could not read search parameters.",
                error
            );

        }

    }


    /* =====================================================
       SAVE JOB
    ===================================================== */

    async function saveJob(jobId) {

        const supabase =
            getSupabase();


        if (!supabase) {

            return;

        }


        const {
            data: {
                user
            }
        } =
            await supabase
                .auth
                .getUser();


        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        /*
           The saved_jobs table may be added
           later. We don't break the jobs page
           if it doesn't exist yet.
        */

        try {

            const {
                error
            } =
                await supabase
                    .from("saved_jobs")
                    .insert({

                        user_id:
                            user.id,

                        job_id:
                            jobId

                    });


            if (error) {

                console.warn(
                    "Web3Jobs: Save job failed.",
                    error
                );


                alert(
                    "This save feature will be enabled with the saved jobs system."
                );


                return;

            }


            alert(
                "Job saved successfully."
            );

        } catch (error) {

            console.error(
                "Web3Jobs save job error:",
                error
            );

        }

    }


    /* =====================================================
       JOB ACTIONS
    ===================================================== */

    function attachJobActions() {

        const buttons =
            document.querySelectorAll(
                "[data-save-job]"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const jobId =
                            button.getAttribute(
                                "data-save-job"
                            );


                        if (jobId) {

                            saveJob(
                                jobId
                            );

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.Web3JobsJobs = {

        load:
            loadJobs,

        search:
            filterJobs,

        filter:
            filterJobs,

        render:
            renderJobs,

        getAll:
            function () {

                return [
                    ...state.jobs
                ];

            },

        getFiltered:
            function () {

                return [
                    ...state.filteredJobs
                ];

            },

        getState:
            function () {

                return {
                    jobs:
                        [
                            ...state.jobs
                        ],

                    filteredJobs:
                        [
                            ...state.filteredJobs
                        ],

                    loading:
                        state.loading,

                    initialized:
                        state.initialized
                };

            }

    };


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function initialize() {

        setupSearch();


        /*
           If app.js is already ready,
           load jobs immediately.
        */

        if (
            window.Web3Jobs &&
            window.Web3Jobs.supabase
        ) {

            loadJobs();

            return;

        }


        /*
           Otherwise wait for app.js.
        */

        window.addEventListener(
            "web3jobs:ready",
            function () {

                loadJobs();

            },
            {
                once:
                    true
            }
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
            initialize
        );

    } else {

        initialize();

    }


})();
