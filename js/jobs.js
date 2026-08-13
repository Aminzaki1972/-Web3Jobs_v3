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


    function showError(message) {

        showMessage(
            message,
            "error"
        );
    }


    /* =====================================================
       LOAD JOBS
       ===================================================== */

    async function loadAllJobs() {

        const client =
            getClient();


        if (!client) {

            showError(
                "Supabase connection is unavailable."
            );

            return [];
        }


        state.loading =
            true;


        showLoading();


        try {

            const response =
                await client
                    .from("jobs")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (response.error) {

                console.error(
                    "Web3Jobs jobs error:",
                    response.error
                );


                state.jobs =
                    [];

                state.filteredJobs =
                    [];


                renderAllJobs([]);


                showError(
                    response.error.message ||
                    "Unable to load jobs."
                );


                return [];
            }


            state.jobs =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : [];


            applyFilters();


            console.log(
                "Web3Jobs: Jobs loaded:",
                state.jobs.length
            );


            return state.jobs;

        } catch (error) {

            console.error(
                "Web3Jobs load error:",
                error
            );


            state.jobs =
                [];

            state.filteredJobs =
                [];


            renderAllJobs([]);


            showError(
                error.message ||
                "Unable to load jobs."
            );


            return [];

        } finally {

            state.loading =
                false;
        }
    }


    /* =====================================================
       JOB CARD
       ===================================================== */

    function createJobCard(job) {

        if (!job) {
            return "";
        }


        const id =
            escapeAttribute(
                valueOf(
                    job.id
                )
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


        const description =
            escapeHTML(
                valueOf(
                    job.description,
                    "No description available."
                )
            );


        const skills =
            escapeHTML(
                valueOf(
                    job.skills,
                    ""
                )
            );


        const salary =
            escapeHTML(
                valueOf(
                    job.salary,
                    ""
                )
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
                        date
                            ? `
                                <span>
                                    📅 ${escapeHTML(date)}
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
                        data-job-id="${id}"
                    >
                        View Job
                    </button>

                </div>

            </article>

        `;
    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderAllJobs(
        jobs = state.filteredJobs
    ) {

        const container =
            findJobsContainer();


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
                        There are currently no available opportunities.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            jobs
                .map(
                    createJobCard
                )
                .join("");
    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function applyFilters() {

        let result =
            [
                ...state.jobs
            ];


        const keyword =
            state.searchQuery
                .trim()
                .toLowerCase();


        const type =
            state.typeFilter
                .trim()
                .toLowerCase();


        const location =
            state.locationFilter
                .trim()
                .toLowerCase();


        if (keyword) {

            result =
                result.filter(
                    function (job) {

                        const text = [

                            job.id,

                            job.title,

                            job.company,

                            job.company_name,

                            job.location,

                            job.type,

                            job.description,

                            job.skills,

                            job.salary

                        ]
                            .filter(
                                value =>
                                    value !== null &&
                                    value !== undefined
                            )
                            .join(" ")
                            .toLowerCase();


                        return text.includes(
                            keyword
                        );
                    }
                );
        }


        if (type) {

            result =
                result.filter(
                    function (job) {

                        return String(
                            job.type || ""
                        )
                            .toLowerCase()
                            .includes(
                                type
                            );
                    }
                );
        }


        if (location) {

            result =
                result.filter(
                    function (job) {

                        return String(
                            job.location || ""
                        )
                            .toLowerCase()
                            .includes(
                                location
                            );
                    }
                );
        }


        state.filteredJobs =
            result;


        /* Sync with global application state */

        if (
            window.Web3JobsState
        ) {

            window.Web3JobsState.jobs =
                state.jobs;

            window.Web3JobsState.filteredJobs =
                result;
        }


        renderAllJobs(
            result
        );


        return result;
    }


    function searchJobs(
        query = ""
    ) {

        state.searchQuery =
            String(
                query || ""
            );


        return applyFilters();
    }


    function filterJobsByType(
        type = ""
    ) {

        state.typeFilter =
            String(
                type || ""
            );


        return applyFilters();
    }


    function filterJobsByLocation(
        location = ""
    ) {

        state.locationFilter =
            String(
                location || ""
            );


        return applyFilters();
    }


    function clearJobFilters() {

        state.searchQuery =
            "";

        state.typeFilter =
            "";

        state.locationFilter =
            "";


        return applyFilters();
    }


    /* =====================================================
       FIND JOB
       ===================================================== */

    function getJobById(
        jobId
    ) {

        if (
            jobId === null ||
            jobId === undefined ||
            jobId === ""
        ) {
            return null;
        }


        return (
            state.jobs.find(
                function (job) {

                    return (
                        job &&
                        String(job.id) ===
                        String(jobId)
                    );
                }
            ) ||
            null
        );
    }


    /* =====================================================
       LOAD SINGLE JOB
       ===================================================== */

    async function loadJobById(
        jobId
    ) {

        if (!jobId) {
            return null;
        }


        const client =
            getClient();


        if (!client) {
            return null;
        }


        try {

            const response =
                await client
                    .from("jobs")
                    .select("*")
                    .eq(
                        "id",
                        jobId
                    )
                    .maybeSingle();


            if (response.error) {

                console.error(
                    "Web3Jobs job error:",
                    response.error
                );


                showError(
                    response.error.message ||
                    "Unable to load job."
                );


                return null;
            }


            state.currentJob =
                response.data ||
                null;


            return state.currentJob;

        } catch (error) {

            console.error(
                "Web3Jobs single job error:",
                error
            );


            showError(
                error.message ||
                "Unable to load job."
            );


            return null;
        }
    }


    /* =====================================================
       MODAL
       ===================================================== */

    function createJobsModal() {

        let modal =
            document.getElementById(
                "jobs-detail-modal"
            );


        if (modal) {
            return modal;
        }


        modal =
            document.createElement(
                "div"
            );


        modal.id =
            "jobs-detail-modal";


        modal.innerHTML = `

            <div
                class="jobs-modal-overlay"
            ></div>

            <div
                class="jobs-modal"
                role="dialog"
                aria-modal="true"
            >

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


        Object.assign(
            modal.style,
            {

                position: "fixed",

                inset: "0",

                zIndex: "99999",

                display: "none",

                alignItems: "center",

                justifyContent: "center",

                padding: "20px",

                background:
                    "rgba(0,0,0,.65)"

            }
        );


        document.body.appendChild(
            modal
        );


        const close =
            modal.querySelector(
                ".jobs-modal-close"
            );


        const overlay =
            modal.querySelector(
                ".jobs-modal-overlay"
            );


        if (close) {

            close.addEventListener(
                "click",
                closeJobDetails
            );
        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeJobDetails
            );
        }


        return modal;
    }


    /* =====================================================
       SHOW JOB
       ===================================================== */

    function showJobDetails(
        job
    ) {

        if (!job) {

            showError(
                "Job not found."
            );

            return;
        }


        state.currentJob =
            job;


        const modal =
            createJobsModal();


        const body =
            modal.querySelector(
                ".jobs-modal-body"
            );


        if (!body) {
            return;
        }


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
                    "Not specified"
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
                    "Not specified"
                )
            );


        const description =
            escapeHTML(
                valueOf(
                    job.description,
                    "No description available."
                )
            );


        const skills =
            escapeHTML(
                valueOf(
                    job.skills,
                    ""
                )
            );


        const salary =
            escapeHTML(
                valueOf(
                    job.salary,
                    ""
                )
            );


        const applicationURL =
            valueOf(
                job.application_url ||
                job.apply_link,
                ""
            );


        const date =
            formatDate(
                job.created_at
            );


        body.innerHTML = `

            <h2>
                ${title}
            </h2>

            <div class="job-details-meta">

                <p>
                    <strong>
                        Company:
                    </strong>
                    ${company}
                </p>

                <p>
                    <strong>
                        Location:
                    </strong>
                    ${location}
                </p>

                <p>
                    <strong>
                        Job Type:
                    </strong>
                    ${type}
                </p>

                ${
                    salary
                        ? `
                            <p>
                                <strong>
                                    Salary:
                                </strong>
                                ${salary}
                            </p>
                        `
                        : ""
                }

                ${
                    skills
                        ? `
                            <p>
                                <strong>
                                    Skills:
                                </strong>
                                ${skills}
                            </p>
                        `
                        : ""
                }

                ${
                    date
                        ? `
                            <p>
                                <strong>
                                    Posted:
                                </strong>
                                ${escapeHTML(date)}
                            </p>
                        `
                        : ""
                }

            </div>

            <hr>

            <h3>
                Job Description
            </h3>

            <p class="job-full-description">
                ${description}
            </p>

            <div class="job-application-area">

                <button
                    type="button"
                    id="job-apply-button"
                    class="job-apply-button"
                >
                    Apply Now
                </button>

            </div>

        `;


        const applyButton =
            body.querySelector(
                "#job-apply-button"
            );


        if (applyButton) {

            applyButton.addEventListener(
                "click",
                async function () {

                    if (applicationURL) {

                        try {

                            const safeURL =
                                new URL(
                                    applicationURL,
                                    window.location.href
                                );


                            if (
                                safeURL.protocol ===
                                    "http:" ||
                                safeURL.protocol ===
                                    "https:"
                            ) {

                                window.open(
                                    safeURL.href,
                                    "_blank",
                                    "noopener,noreferrer"
                                );

                                return;
                            }

                        } catch (error) {

                            console.warn(
                                "Invalid application URL:",
                                error
                            );
                        }
                    }


                    applyButton.disabled =
                        true;


                    applyButton.textContent =
                        "Submitting...";


                    const success =
                        await applyForJob(
                            job.id
                        );


                    if (!success) {

                        applyButton.disabled =
                            false;

                        applyButton.textContent =
                            "Apply Now";
                    }

                }
            );
        }


        modal.style.display =
            "flex";


        document.body.style.overflow =
            "hidden";
    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function closeJobDetails() {

        const modal =
            document.getElementById(
                "jobs-detail-modal"
            );


        if (modal) {

            modal.style.display =
                "none";
        }


        document.body.style.overflow =
            "";
    }


    /* =====================================================
       APPLY
       IMPORTANT:
       LOGIN IS NEVER FORCED.
       ===================================================== */

    async function applyForJob(
        jobId
    ) {

        const client =
            getClient();


        if (!client) {

            showError(
                "Database connection is unavailable."
            );

            return false;
        }


        syncUserFromApp();


        const user =
            state.currentUser ||
            await getCurrentUser();


        if (!user) {

            showMessage(
                "Please sign in before applying.",
                "warning"
            );


            /*
             * VERY IMPORTANT:
             * NO window.location
             * NO login.html
             * NO redirect
             */

            return false;
        }


        try {

            const existing =
                await client
                    .from("applications")
                    .select("id")
                    .eq(
                        "job_id",
                        jobId
                    )
                    .eq(
                        "user_id",
                        user.id
                    )
                    .limit(1);


            if (existing.error) {

                showError(
                    existing.error.message ||
                    "Unable to check application."
                );

                return false;
            }


            if (
                Array.isArray(
                    existing.data
                ) &&
                existing.data.length > 0
            ) {

                showMessage(
                    "You have already applied for this job.",
                    "warning"
                );

                return false;
            }


            const response =
                await client
                    .from("applications")
                    .insert({

                        job_id:
                            jobId,

                        user_id:
                            user.id,

                        status:
                            "pending"

                    });


            if (response.error) {

                console.error(
                    "Application error:",
                    response.error
                );


                if (
                    String(
                        response.error.code ||
                        ""
                    ) === "23505"
                ) {

                    showMessage(
                        "You have already applied for this job.",
                        "warning"
                    );

                    return false;
                }


                showError(
                    response.error.message ||
                    "Unable to submit application."
                );

                return false;
            }


            showMessage(
                "Application submitted successfully.",
                "success"
            );


            closeJobDetails();


            return true;

        } catch (error) {

            console.error(
                "Apply error:",
                error
            );


            showError(
                error.message ||
                "Unable to submit application."
            );


            return false;
        }
    }


    /* =====================================================
       SEARCH EVENTS
       ===================================================== */

    function initializeSearch() {

        const form =
            document.getElementById(
                "job-search-form"
            );


        if (form) {

            if (
                form.dataset.jobsSearchInitialized !==
                "true"
            ) {

                form.dataset.jobsSearchInitialized =
                    "true";


                form.addEventListener(
                    "submit",
                    function (event) {

                        event.preventDefault();


                        const input =
                            document.getElementById(
                                "job-search"
                            );


                        searchJobs(
                            input
                                ? input.value
                                : ""
                        );

                    }
                );
            }
        }
    }


    /* =====================================================
       JOB BUTTON EVENTS
       ===================================================== */

    function initializeJobEvents() {

        if (
            document.body.dataset.jobsEventsInitialized ===
            "true"
        ) {
            return;
        }


        document.body.dataset.jobsEventsInitialized =
            "true";


        document.addEventListener(
            "click",
            async function (event) {

                const button =
                    event.target.closest(
                        ".job-view-button"
                    );


                if (!button) {
                    return;
                }


                event.preventDefault();


                const jobId =
                    button.dataset.jobId;


                if (!jobId) {
                    return;
                }


                let job =
                    getJobById(
                        jobId
                    );


                if (!job) {

                    job =
                        await loadJobById(
                            jobId
                        );
                }


                if (job) {

                    showJobDetails(
                        job
                    );

                } else {

                    showError(
                        "Job not found."
                    );
                }

            }
        );
    }


    /* =====================================================
       KEYBOARD
       ===================================================== */

    function initializeKeyboard() {

        if (
            document.body.dataset.jobsKeyboardInitialized ===
            "true"
        ) {
            return;
        }


        document.body.dataset.jobsKeyboardInitialized =
            "true";


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeJobDetails();
                }

            }
        );
    }


    /* =====================================================
       CREATE JOB
       ===================================================== */

    async function createJob(
        jobData = {}
    ) {

        const client =
            getClient();


        if (!client) {

            showError(
                "Supabase connection is unavailable."
            );

            return null;
        }


        syncUserFromApp();


        const user =
            state.currentUser ||
            await getCurrentUser();


        if (!user) {

            showMessage(
                "Please sign in first.",
                "warning"
            );

            return null;
        }


        const title =
            valueOf(
                jobData.title
            );


        if (!title) {

            showMessage(
                "Job title is required.",
                "warning"
            );

            return null;
        }


        const insertData = {

            title:

                title,

            company:

                valueOf(
                    jobData.company,
                    ""
                ),

            location:

                valueOf(
                    jobData.location,
                    "Remote"
                ),

            type:

                valueOf(
                    jobData.type,
                    "Full Time"
                ),

            description:

                valueOf(
                    jobData.description,
                    ""
                ),

            skills:

                valueOf(
                    jobData.skills,
                    ""
                ),

            salary:

                valueOf(
                    jobData.salary,
                    ""
                ),

            application_url:

                valueOf(
                    jobData.application_url ||
                    jobData.apply_link,
                    ""
                )

        };


        try {

            const response =
                await client
                    .from("jobs")
                    .insert(
                        insertData
                    )
                    .select("*")
                    .maybeSingle();


            if (response.error) {

                showError(
                    response.error.message ||
                    "Unable to publish job."
                );

                return null;
            }


            await loadAllJobs();


            showMessage(
                "Job published successfully.",
                "success"
            );


            return (
                response.data ||
                true
            );

        } catch (error) {

            showError(
                error.message ||
                "Unable to publish job."
            );

            return null;
        }
    }


    /* =====================================================
       DELETE JOB
       ===================================================== */

    async function deleteJob(
        jobId
    ) {

        if (!jobId) {
            return false;
        }


        const client =
            getClient();


        if (!client) {
            return false;
        }


        syncUserFromApp();


        const user =
            state.currentUser ||
            await getCurrentUser();


        if (!user) {

            showMessage(
                "Please sign in first.",
                "warning"
            );

            return false;
        }


        if (
            !window.confirm(
                "Are you sure you want to delete this job?"
            )
        ) {

            return false;
        }


        try {

            const response =
                await client
                    .from("jobs")
                    .delete()
                    .eq(
                        "id",
                        jobId
                    );


            if (response.error) {

                showError(
                    response.error.message ||
                    "Unable to delete job."
                );

                return false;
            }


            await loadAllJobs();


            showMessage(
                "Job deleted successfully.",
                "success"
            );


            return true;

        } catch (error) {

            showError(
                error.message ||
                "Unable to delete job."
            );

            return false;
        }
    }


    /* =====================================================
       REFRESH
       ===================================================== */

    async function refreshJobs() {

        return await loadAllJobs();
    }


    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.Web3JobsJobs = {

        initializeJobs,

        loadAllJobs,

        refreshJobs,

        renderAllJobs,

        searchJobs,

        filterJobsByType,

        filterJobsByLocation,

        clearJobFilters,

        getJobById,

        loadJobById,

        showJobDetails,

        closeJobDetails,

        applyForJob,

        createJob,

        deleteJob

    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function initializeJobs() {

        if (
            state.initialized
        ) {
            return;
        }


        state.initialized =
            true;


        console.log(
            "Web3Jobs: Initializing Jobs System..."
        );


        syncUserFromApp();


        const client =
            getClient();


        if (!client) {

            state.initialized =
                false;

            showError(
                "Supabase is not available."
            );

            return;
        }


        await getCurrentUser();


        initializeAuthListener();

        initializeSearch();

        initializeJobEvents();

        initializeKeyboard();


        const container =
            findJobsContainer();


        if (!container) {

            console.log(
                "Web3Jobs: No jobs container on this page."
            );

            return;
        }


        await loadAllJobs();


        console.log(
            "Web3Jobs: Jobs System initialized."
        );
    }


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeJobs,
            {
                once: true
            }
        );

    } else {

        initializeJobs();

    }

})();
