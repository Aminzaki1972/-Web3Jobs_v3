/* =========================================================
   Web3Jobs v3
   File: js/jobs.js
   FIXED JOBS PAGE VERSION
   ========================================================= */

"use strict";

(function () {

    const JobsSystem = {
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


    /* =========================================================
       SUPABASE CLIENT
       ========================================================= */

    function getJobsSupabase() {

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            try {
                const client =
                    window.Web3JobsSupabase.getClient();

                if (
                    client &&
                    typeof client.from === "function"
                ) {
                    return client;
                }
            } catch (error) {
                console.error(
                    "Web3Jobs: Supabase client error:",
                    error
                );
            }
        }

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        console.error(
            "Web3Jobs: Supabase client not found."
        );

        return null;
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function valueOf(value, fallback) {

        if (
            value === null ||
            value === undefined
        ) {
            return fallback || "";
        }

        const result =
            String(value).trim();

        return result || (fallback || "");
    }


    function escapeHTML(value) {

        return String(
            value === null || value === undefined
                ? ""
                : value
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatDate(value) {

        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
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


    /* =========================================================
       JOBS CONTAINER
       ========================================================= */

    function getJobsContainer() {

        const selectors = [
            "#jobs-list",
            "#jobs-container",
            ".jobs-list",
            ".jobs-container",
            "[data-jobs-list]",
            "[data-jobs-container]"
        ];

        for (const selector of selectors) {

            const element =
                document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }


    /* =========================================================
       LOADING / ERROR
       ========================================================= */

    function showLoading() {

        const container =
            getJobsContainer();

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="jobs-loading">
                <h3>Loading jobs...</h3>
                <p>
                    Please wait while we load the latest opportunities.
                </p>
            </div>
        `;
    }


    function showMessage(title, message) {

        const container =
            getJobsContainer();

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="no-jobs">

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(message)}
                </p>

                <button
                    type="button"
                    id="jobs-retry-button"
                    style="
                        margin-top:20px;
                        min-height:45px;
                        padding:0 25px;
                        border:0;
                        border-radius:10px;
                        cursor:pointer;
                        background:#6366f1;
                        color:#fff;
                        font-weight:700;
                    "
                >
                    Retry
                </button>

            </div>
        `;

        const retry =
            document.getElementById(
                "jobs-retry-button"
            );

        if (retry) {

            retry.addEventListener(
                "click",
                loadAllJobs
            );
        }
    }


    /* =========================================================
       APPLICATION URL
       ========================================================= */

    function getApplicationURL(job) {

        if (!job) {
            return "";
        }

        const rawURL =
            valueOf(
                job.application_url ||
                job.apply_link ||
                job.application_link ||
                job.apply_url,
                ""
            );

        if (!rawURL) {
            return "";
        }

        try {

            const url =
                new URL(
                    rawURL,
                    window.location.href
                );

            if (
                url.protocol !== "http:" &&
                url.protocol !== "https:"
            ) {
                return "";
            }

            return url.href;

        } catch (error) {

            return "";
        }
    }


    /* =========================================================
       JOB CARD
       ========================================================= */

    function createJobCard(job) {

        if (!job) {
            return "";
        }

        const id =
            escapeHTML(
                valueOf(job.id, "")
            );

        const title =
            escapeHTML(
                valueOf(
                    job.title,
                    "Untitled Job"
                )
            );

        const company =
            escapeHTML(
                valueOf(
                    job.company ||
                    job.company_name,
                    "Web3 Company"
                )
            );

        const location =
            escapeHTML(
                valueOf(
                    job.location,
                    "Remote"
                )
            );

        const type =
            escapeHTML(
                valueOf(
                    job.type,
                    "Full Time"
                )
            );

        const salary =
            escapeHTML(
                valueOf(
                    job.salary,
                    ""
                )
            );

        const skills =
            escapeHTML(
                valueOf(
                    job.skills,
                    ""
                )
            );

        const description =
            escapeHTML(
                valueOf(
                    job.description,
                    "No description available."
                )
            );

        const created =
            escapeHTML(
                formatDate(
                    job.created_at
                )
            );

        const applicationURL =
            getApplicationURL(job);

        const encodedId =
            encodeURIComponent(
                String(
                    job.id === null ||
                    job.id === undefined
                        ? ""
                        : job.id
                )
            );


        return `

            <article
                class="job-card"
                data-job-id="${id}"
            >

                <div class="job-card-header">

                    <div class="job-card-title">

                        <h3>
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
                        salary
                            ? `
                                <span>
                                    💰 ${salary}
                                </span>
                            `
                            : ""
                    }

                    ${
                        created
                            ? `
                                <span>
                                    📅 ${created}
                                </span>
                            `
                            : ""
                    }

                </div>


                ${
                    skills
                        ? `
                            <div class="job-skills">
                                ${skills}
                            </div>
                        `
                        : ""
                }


                <p class="job-description">
                    ${description}
                </p>


                <div class="job-card-actions">

                    <button
                        type="button"
                        class="job-view-button"
                        data-view-job="${encodedId}"
                    >
                        View Details
                    </button>

                    ${
                        applicationURL
                            ? `
                                <a
                                    class="job-apply-button"
                                    href="${escapeHTML(applicationURL)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Apply
                                </a>
                            `
                            : ""
                    }

                </div>

            </article>

        `;
    }


    /* =========================================================
       RENDER JOBS
       ========================================================= */

    function renderAllJobs(jobs) {

        const container =
            getJobsContainer();

        if (!container) {

            console.error(
                "Web3Jobs: jobs container not found."
            );

            return;
        }


        const list =
            Array.isArray(jobs)
                ? jobs
                : [];


        if (!list.length) {

            container.innerHTML = `

                <div class="no-jobs">

                    <h3>
                        No jobs found
                    </h3>

                    <p>
                        There are currently no jobs
                        matching your search.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            list
                .map(createJobCard)
                .join("");


        container
            .querySelectorAll(
                "[data-view-job]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const id =
                                decodeURIComponent(
                                    button.getAttribute(
                                        "data-view-job"
                                    ) || ""
                                );

                            const job =
                                JobsSystem.jobs.find(
                                    function (item) {

                                        return (
                                            String(item.id) ===
                                            String(id)
                                        );
                                    }
                                );

                            if (job) {
                                showJobDetails(job);
                            }

                        }
                    );

                }
            );
    }


    /* =========================================================
       FILTERING
       ========================================================= */

    function jobMatchesFilters(job) {

        const query =
            JobsSystem.searchQuery
                .toLowerCase()
                .trim();

        const type =
            valueOf(
                job.type,
                ""
            )
                .toLowerCase()
                .trim();

        const location =
            valueOf(
                job.location,
                ""
            )
                .toLowerCase()
                .trim();


        if (
            JobsSystem.typeFilter &&
            type !==
                JobsSystem.typeFilter
                    .toLowerCase()
                    .trim()
        ) {
            return false;
        }


        if (
            JobsSystem.locationFilter &&
            !location.includes(
                JobsSystem.locationFilter
                    .toLowerCase()
                    .trim()
            )
        ) {
            return false;
        }


        if (!query) {
            return true;
        }


        const searchableText = [

            job.title,
            job.company,
            job.company_name,
            job.location,
            job.type,
            job.description,
            job.skills,
            job.salary

        ]
            .map(
                function (value) {

                    return valueOf(
                        value,
                        ""
                    ).toLowerCase();

                }
            )
            .join(" ");


        return searchableText.includes(
            query
        );
    }


    function applyFilters() {

        JobsSystem.filteredJobs =
            JobsSystem.jobs.filter(
                jobMatchesFilters
            );

        renderAllJobs(
            JobsSystem.filteredJobs
        );

        syncState();
    }


    function searchJobs(value) {

        JobsSystem.searchQuery =
            value || "";

        applyFilters();
    }


    function filterJobsByType(value) {

        JobsSystem.typeFilter =
            value || "";

        applyFilters();
    }


    function filterJobsByLocation(value) {

        JobsSystem.locationFilter =
            value || "";

        applyFilters();
    }


    function clearJobFilters() {

        JobsSystem.searchQuery = "";
        JobsSystem.typeFilter = "";
        JobsSystem.locationFilter = "";


        const searchInput =
            document.getElementById(
                "job-search"
            );

        const typeFilter =
            document.getElementById(
                "job-type-filter"
            );

        const locationFilter =
            document.getElementById(
                "job-location-filter"
            ) ||
            document.getElementById(
                "location-filter"
            );


        if (searchInput) {
            searchInput.value = "";
        }

        if (typeFilter) {
            typeFilter.value = "";
        }

        if (locationFilter) {
            locationFilter.value = "";
        }


        applyFilters();
    }


    /* =========================================================
       LOAD JOBS
       ========================================================= */

    async function loadAllJobs() {

        const client =
            getJobsSupabase();


        if (!client) {

            showMessage(
                "Unable to load jobs",
                "Supabase client is unavailable. Please refresh the page."
            );

            return [];
        }


        JobsSystem.loading =
            true;


        showLoading();


        try {

            console.log(
                "Web3Jobs: loading jobs from Supabase..."
            );


            /*
             * IMPORTANT:
             *
             * No authentication check here.
             *
             * Jobs must be publicly readable.
             */

            const response =
                await client
                    .from("jobs")
                    .select("*");


            console.log(
                "Web3Jobs: Supabase jobs response:",
                response
            );


            if (response.error) {

                console.error(
                    "Web3Jobs: jobs query failed:",
                    response.error
                );


                JobsSystem.jobs = [];
                JobsSystem.filteredJobs = [];


                showMessage(
                    "Unable to load jobs",
                    response.error.message ||
                    "The jobs database could not be loaded."
                );


                return [];
            }


            const data =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : [];


            /*
             * Newest jobs first.
             */

            data.sort(
                function (a, b) {

                    const dateA =
                        a &&
                        a.created_at
                            ? new Date(
                                a.created_at
                            ).getTime()
                            : 0;

                    const dateB =
                        b &&
                        b.created_at
                            ? new Date(
                                b.created_at
                            ).getTime()
                            : 0;


                    return dateB - dateA;
                }
            );


            JobsSystem.jobs =
                data;


            applyFilters();


            console.log(
                "Web3Jobs: successfully loaded",
                data.length,
                "jobs."
            );


            try {

                window.dispatchEvent(
                    new CustomEvent(
                        "web3jobs:jobs-loaded",
                        {
                            detail: {
                                jobs: data,
                                count: data.length
                            }
                        }
                    )
                );

            } catch (eventError) {

                console.warn(
                    "Web3Jobs: event error:",
                    eventError
                );
            }


            return data;


        } catch (error) {

            console.error(
                "Web3Jobs: loadAllJobs exception:",
                error
            );


            JobsSystem.jobs = [];
            JobsSystem.filteredJobs = [];


            showMessage(
                "Unable to load jobs",
                error && error.message
                    ? error.message
                    : "Unexpected database error."
            );


            return [];


        } finally {

            JobsSystem.loading =
                false;

        }
    }


    /* =========================================================
       JOB DETAILS
       ========================================================= */

    function showJobDetails(job) {

        if (!job) {
            return;
        }


        JobsSystem.currentJob =
            job;


        let modal =
            document.getElementById(
                "jobs-detail-modal"
            );


        if (!modal) {

            modal =
                document.createElement(
                    "div"
                );


            modal.id =
                "jobs-detail-modal";


            modal.style.cssText = `
                position:fixed;
                inset:0;
                z-index:99999;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                background:rgba(0,0,0,.72);
            `;


            modal.innerHTML = `

                <div class="jobs-modal">

                    <button
                        type="button"
                        class="jobs-modal-close"
                        aria-label="Close"
                    >
                        ×
                    </button>

                    <div
                        class="jobs-modal-body"
                    ></div>

                </div>

            `;


            document.body.appendChild(
                modal
            );


            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        modal
                    ) {
                        closeJobDetails();
                    }

                }
            );


            const closeButton =
                modal.querySelector(
                    ".jobs-modal-close"
                );


            if (closeButton) {

                closeButton.addEventListener(
                    "click",
                    closeJobDetails
                );
            }
        }


        const body =
            modal.querySelector(
                ".jobs-modal-body"
            );


        if (!body) {
            return;
        }


        const applicationURL =
            getApplicationURL(job);


        body.innerHTML = `

            <h2>
                ${escapeHTML(
                    valueOf(
                        job.title,
                        "Untitled Job"
                    )
                )}
            </h2>


            <div class="job-details-meta">

                <p>
                    <strong>Company:</strong>
                    ${escapeHTML(
                        valueOf(
                            job.company ||
                            job.company_name,
                            "Web3 Company"
                        )
                    )}
                </p>


                <p>
                    <strong>Location:</strong>
                    ${escapeHTML(
                        valueOf(
                            job.location,
                            "Remote"
                        )
                    )}
                </p>


                <p>
                    <strong>Type:</strong>
                    ${escapeHTML(
                        valueOf(
                            job.type,
                            "Full Time"
                        )
                    )}
                </p>


                ${
                    job.salary
                        ? `
                            <p>
                                <strong>Salary:</strong>
                                ${escapeHTML(
                                    job.salary
                                )}
                            </p>
                        `
                        : ""
                }


                ${
                    job.skills
                        ? `
                            <p>
                                <strong>Skills:</strong>
                                ${escapeHTML(
                                    job.skills
                                )}
                            </p>
                        `
                        : ""
                }

            </div>


            <div class="job-full-description">

                ${escapeHTML(
                    valueOf(
                        job.description,
                        "No description available."
                    )
                )}

            </div>


            <div class="job-application-area">

                ${
                    applicationURL
                        ? `
                            <a
                                class="job-apply-button"
                                href="${escapeHTML(
                                    applicationURL
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Apply for this job
                            </a>
                        `
                        : `
                            <p>
                                No application link
                                is available for this job.
                            </p>
                        `
                }

            </div>

        `;


        modal.style.display =
            "flex";
    }


    function closeJobDetails() {

        const modal =
            document.getElementById(
                "jobs-detail-modal"
            );

        if (modal) {

            modal.style.display =
                "none";
        }
    }


    /* =========================================================
       STATE
       ========================================================= */

    function syncState() {

        try {

            if (
                window.Web3JobsState &&
                typeof window.Web3JobsState ===
                    "object"
            ) {

                window.Web3JobsState.jobs =
                    JobsSystem.jobs;

                window.Web3JobsState.filteredJobs =
                    JobsSystem.filteredJobs;

                window.Web3JobsState.currentJob =
                    JobsSystem.currentJob;

                window.Web3JobsState.currentUser =
                    JobsSystem.currentUser;
            }

        } catch (error) {

            console.warn(
                "Web3Jobs: state sync error:",
                error
            );
        }
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initializeJobs() {

        JobsSystem.initialized =
            true;


        const searchForm =
            document.getElementById(
                "job-search-form"
            );


        const searchInput =
            document.getElementById(
                "job-search"
            );


        const typeFilter =
            document.getElementById(
                "job-type-filter"
            );


        const locationFilter =
            document.getElementById(
                "job-location-filter"
            ) ||
            document.getElementById(
                "location-filter"
            );


        if (
            searchForm &&
            !searchForm.dataset.jobsBound
        ) {

            searchForm.dataset.jobsBound =
                "true";


            searchForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    searchJobs(
                        searchInput
                            ? searchInput.value
                            : ""
                    );
                }
            );
        }


        if (
            searchInput &&
            !searchInput.dataset.jobsBound
        ) {

            searchInput.dataset.jobsBound =
                "true";


            searchInput.addEventListener(
                "input",
                function () {

                    searchJobs(
                        searchInput.value
                    );
                }
            );
        }


        if (
            typeFilter &&
            !typeFilter.dataset.jobsBound
        ) {

            typeFilter.dataset.jobsBound =
                "true";


            typeFilter.addEventListener(
                "change",
                function () {

                    filterJobsByType(
                        typeFilter.value
                    );
                }
            );
        }


        if (
            locationFilter &&
            !locationFilter.dataset.jobsBound
        ) {

            locationFilter.dataset.jobsBound =
                "true";


            locationFilter.addEventListener(
                "input",
                function () {

                    filterJobsByLocation(
                        locationFilter.value
                    );
                }
            );


            locationFilter.addEventListener(
                "change",
                function () {

                    filterJobsByLocation(
                        locationFilter.value
                    );
                }
            );
        }


        return loadAllJobs();
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.Web3JobsJobs = {

        initializeJobs:
            initializeJobs,

        initialize:
            initializeJobs,

        loadAllJobs:
            loadAllJobs,

        loadJobs:
            loadAllJobs,

        searchJobs:
            searchJobs,

        filterJobsByType:
            filterJobsByType,

        filterJobsByLocation:
            filterJobsByLocation,

        clearJobFilters:
            clearJobFilters,

        applyFilters:
            applyFilters,

        getJobsContainer:
            getJobsContainer,

        getJobs:
            function () {
                return JobsSystem.jobs;
            },

        getFilteredJobs:
            function () {
                return JobsSystem.filteredJobs;
            },

        getJobById:
            function (id) {

                return (
                    JobsSystem.jobs.find(
                        function (job) {

                            return (
                                String(job.id) ===
                                String(id)
                            );
                        }
                    ) || null
                );
            },

        showJobDetails:
            showJobDetails,

        closeJobDetails:
            closeJobDetails,

        state:
            JobsSystem
    };


    /*
     * Compatibility with older scripts.
     */

    window.loadJobs =
        loadAllJobs;

    window.loadAllJobs =
        loadAllJobs;


    /* =========================================================
       START
       ========================================================= */

    function startJobsPage() {

        setTimeout(
            function () {

                initializeJobs();

            },
            0
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startJobsPage,
            {
                once: true
            }
        );

    } else {

        startJobsPage();
    }

})();
