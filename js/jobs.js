/* =========================================================
   Web3Jobs v3
   File: js/jobs.js

   Jobs Management System
   Diagnostic / Mobile-Safe Version
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
                    client.auth &&
                    typeof client.from === "function"
                ) {

                    return client;
                }

            } catch (error) {

                console.error(
                    "Web3Jobs: Unable to get Supabase client:",
                    error
                );
            }
        }


        if (
            window.supabaseClient &&
            window.supabaseClient.auth &&
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
       SESSION
       ========================================================= */

    async function getCurrentSession() {

        const client =
            getJobsSupabase();

        if (!client) {
            return null;
        }

        try {

            const result =
                await client.auth.getSession();

            if (
                result &&
                result.data &&
                result.data.session
            ) {

                return result.data.session;
            }

        } catch (error) {

            console.warn(
                "Web3Jobs: Session check failed:",
                error
            );
        }

        return null;
    }


    async function getCurrentUser() {

        const session =
            await getCurrentSession();

        if (
            session &&
            session.user
        ) {

            JobsSystem.currentUser =
                session.user;

            return session.user;
        }

        JobsSystem.currentUser =
            null;

        return null;
    }


    /* =========================================================
       HTML
       ========================================================= */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function escapeAttribute(value) {
        return escapeHTML(value);
    }


    function valueOf(value, fallback = "") {

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


    /* =========================================================
       CONTAINER
       ========================================================= */

    function findJobsContainer() {

        const selectors = [
            "#jobs-list",
            "#jobs-container",
            ".jobs-list",
            ".jobs-container",
            "[data-jobs-container]",
            "[data-jobs-list]"
        ];

        for (
            const selector of selectors
        ) {

            const element =
                document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }


    function getJobsContainer() {
        return findJobsContainer();
    }


    /* =========================================================
       LOADING
       ========================================================= */

    function showLoading() {

        const container =
            findJobsContainer();

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="jobs-loading">
                <h3>Loading jobs...</h3>
                <p>Please wait while we connect to the jobs database.</p>
            </div>
        `;
    }


    /* =========================================================
       ERROR MESSAGE
       ========================================================= */

    function showDatabaseError(error) {

        const container =
            findJobsContainer();

        if (!container) {
            return;
        }

        const code =
            error && error.code
                ? String(error.code)
                : "N/A";

        const message =
            error && error.message
                ? String(error.message)
                : "Unknown error";

        const details =
            error && error.details
                ? String(error.details)
                : "";

        const hint =
            error && error.hint
                ? String(error.hint)
                : "";

        console.error(
            "Web3Jobs DATABASE ERROR:",
            error
        );

        container.innerHTML = `

            <div class="no-jobs">

                <h3>
                    Unable to load jobs
                </h3>

                <p>
                    The jobs database could not be loaded.
                </p>

                <div
                    style="
                        margin-top:20px;
                        padding:15px;
                        text-align:left;
                        direction:ltr;
                        background:rgba(255,255,255,.06);
                        border-radius:10px;
                        overflow:auto;
                        font-size:13px;
                    "
                >

                    <strong>Error:</strong>
                    ${escapeHTML(message)}

                    <br><br>

                    <strong>Code:</strong>
                    ${escapeHTML(code)}

                    ${
                        details
                            ? `
                                <br><br>
                                <strong>Details:</strong>
                                ${escapeHTML(details)}
                            `
                            : ""
                    }

                    ${
                        hint
                            ? `
                                <br><br>
                                <strong>Hint:</strong>
                                ${escapeHTML(hint)}
                            `
                            : ""
                    }

                </div>

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
                function () {

                    loadAllJobs();

                }
            );
        }
    }


    function showError(message) {

        const container =
            findJobsContainer();

        if (!container) {
            return;
        }

        container.innerHTML = `

            <div class="no-jobs">

                <h3>
                    Unable to load jobs
                </h3>

                <p>
                    ${escapeHTML(
                        message ||
                        "Unable to load jobs."
                    )}
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
                function () {

                    loadAllJobs();

                }
            );
        }
    }


    /* =========================================================
       LOAD JOBS
       ========================================================= */

    async function loadAllJobs() {

        const client =
            getJobsSupabase();

        if (!client) {

            showError(
                "Supabase client is unavailable. Check supabase.js."
            );

            return [];
        }


        JobsSystem.loading =
            true;

        showLoading();


        try {

            console.log(
                "Web3Jobs: Starting jobs query..."
            );


            const response =
                await client
                    .from("jobs")
                    .select("*");


            console.log(
                "Web3Jobs: Supabase jobs response:",
                response
            );


            if (response.error) {

                JobsSystem.jobs = [];
                JobsSystem.filteredJobs = [];

                showDatabaseError(
                    response.error
                );

                return [];
            }


            const data =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            data.sort(
                (a, b) => {

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
                "Web3Jobs: Jobs loaded successfully:",
                data.length
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
                    "Web3Jobs: Event error:",
                    eventError
                );
            }


            return data;

        } catch (error) {

            console.error(
                "Web3Jobs loadAllJobs exception:",
                error
            );


            JobsSystem.jobs = [];
            JobsSystem.filteredJobs = [];


            showDatabaseError(
                error
            );


            return [];

        } finally {

            JobsSystem.loading =
                false;
        }
    }


    async function loadJobs() {
        return await loadAllJobs();
    }


    /* =========================================================
       STATE
       ========================================================= */

    function syncJobsState() {

        try {

            if (
                window.Web3JobsState &&
                typeof window.Web3JobsState === "object"
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
                "Web3Jobs: State sync failed:",
                error
            );
        }


        return {

            jobs:
                JobsSystem.jobs,

            filteredJobs:
                JobsSystem.filteredJobs,

            currentJob:
                JobsSystem.currentJob,

            currentUser:
                JobsSystem.currentUser

        };
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

            console.warn(
                "Web3Jobs: Invalid application URL:",
                rawURL
            );

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
            escapeAttribute(
                valueOf(job.id)
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

        const applicationURL =
            getApplicationURL(job);


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


                    ${
                        applicationURL
                            ? `
                                <a
                                    href="${escapeAttribute(applicationURL)}"
                                    class="job-apply-button"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Apply Now
                                </a>
                            `
                            : `
                                <button
                                    type="button"
                                    class="job-apply-button"
                                    data-job-id="${id}"
                                >
                                    Apply
                                </button>
                            `
                    }

                </div>

            </article>
        `;
    }


    /* =========================================================
       RENDER
       ========================================================= */

    function renderAllJobs(
        jobs = JobsSystem.filteredJobs
    ) {

        const container =
            findJobsContainer();

        if (!container) {

            console.warn(
                "Web3Jobs: Jobs container not found."
            );

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

            syncJobsState();

            return;
        }


        container.innerHTML =
            jobs
                .map(createJobCard)
                .join("");


        syncJobsState();
    }


    /* =========================================================
       FILTERS
       ========================================================= */

    function applyFilters() {

        let result =
            Array.isArray(JobsSystem.jobs)
                ? [...JobsSystem.jobs]
                : [];


        const keyword =
            String(
                JobsSystem.searchQuery || ""
            )
                .trim()
                .toLowerCase();


        const type =
            String(
                JobsSystem.typeFilter || ""
            )
                .trim()
                .toLowerCase();


        const location =
            String(
                JobsSystem.locationFilter || ""
            )
                .trim()
                .toLowerCase();


        if (keyword) {

            result =
                result.filter(
                    job => {

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
                                item =>
                                    item !== null &&
                                    item !== undefined
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
                    job =>
                        String(
                            job && job.type
                                ? job.type
                                : ""
                        )
                            .toLowerCase()
                            .includes(type)
                );
        }


        if (location) {

            result =
                result.filter(
                    job =>
                        String(
                            job && job.location
                                ? job.location
                                : ""
                        )
                            .toLowerCase()
                            .includes(location)
                );
        }


        JobsSystem.filteredJobs =
            result;


        renderAllJobs(
            result
        );


        return result;
    }


    function searchJobs(query = "") {

        JobsSystem.searchQuery =
            String(query || "");

        return applyFilters();
    }


    function filterJobsByType(type = "") {

        JobsSystem.typeFilter =
            String(type || "");

        return applyFilters();
    }


    function filterJobsByLocation(location = "") {

        JobsSystem.locationFilter =
            String(location || "");

        return applyFilters();
    }


    function clearJobFilters() {

        JobsSystem.searchQuery = "";
        JobsSystem.typeFilter = "";
        JobsSystem.locationFilter = "";

        return applyFilters();
    }


    /* =========================================================
       JOB BY ID
       ========================================================= */

    function getJobById(jobId) {

        if (
            jobId === null ||
            jobId === undefined ||
            jobId === ""
        ) {
            return null;
        }

        return (
            JobsSystem.jobs.find(
                job =>
                    job &&
                    String(job.id) ===
                    String(jobId)
            ) ||
            null
        );
    }


    async function loadJobById(jobId) {

        if (
            jobId === null ||
            jobId === undefined ||
            jobId === ""
        ) {
            return null;
        }


        const client =
            getJobsSupabase();

        if (!client) {
            return null;
        }


        try {

            const response =
                await client
                    .from("jobs")
                    .select("*")
                    .eq("id", jobId)
                    .maybeSingle();


            if (response.error) {

                console.error(
                    "Web3Jobs load job error:",
                    response.error
                );

                showDatabaseError(
                    response.error
                );

                return null;
            }


            JobsSystem.currentJob =
                response.data || null;


            syncJobsState();


            return JobsSystem.currentJob;

        } catch (error) {

            console.error(
                "Web3Jobs loadJobById:",
                error
            );

            showDatabaseError(
                error
            );

            return null;
        }
    }


    /* =========================================================
       MODAL
       ========================================================= */

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

            <div class="jobs-modal-overlay"></div>

            <div
                class="jobs-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="jobs-modal-title"
            >

                <button
                    type="button"
                    class="jobs-modal-close"
                    aria-label="Close"
                >
                    ×
                </button>

                <div class="jobs-modal-body"></div>

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
                background: "rgba(0,0,0,.65)"
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


    function showJobDetails(job) {

        if (!job) {

            showError(
                "Job not found."
            );

            return;
        }


        JobsSystem.currentJob =
            job;

        syncJobsState();


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


        const date =
            formatDate(
                job.created_at
            );


        const applicationURL =
            getApplicationURL(job);


        body.innerHTML = `

            <h2 id="jobs-modal-title">
                ${title}
            </h2>

            <div class="job-details-meta">

                <p>
                    <strong>Company:</strong>
                    ${company}
                </p>

                <p>
                    <strong>Location:</strong>
                    ${location}
                </p>

                <p>
                    <strong>Job Type:</strong>
                    ${type}
                </p>

                ${
                    salary
                        ? `
                            <p>
                                <strong>Salary:</strong>
                                ${salary}
                            </p>
                        `
                        : ""
                }

                ${
                    skills
                        ? `
                            <p>
                                <strong>Skills:</strong>
                                ${skills}
                            </p>
                        `
                        : ""
                }

                ${
                    date
                        ? `
                            <p>
                                <strong>Posted:</strong>
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

                ${
                    applicationURL
                        ? `
                            <a
                                href="${escapeAttribute(applicationURL)}"
                                class="job-apply-button"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Apply Now
                            </a>
                        `
                        : `
                            <button
                                type="button"
                                id="job-apply-button"
                                class="job-apply-button"
                            >
                                Submit Application
                            </button>
                        `
                }

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
                            "Submit Application";
                    }

                }
            );
        }


        modal.style.display =
            "flex";

        document.body.style.overflow =
            "hidden";
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

        document.body.style.overflow =
            "";
    }


    /* =========================================================
       APPLY
       ========================================================= */

    async function applyForJob(jobId) {

        if (!jobId) {

            showError(
                "Invalid job."
            );

            return false;
        }


        const client =
            getJobsSupabase();

        if (!client) {

            showError(
                "Database connection is unavailable."
            );

            return false;
        }


        const user =
            JobsSystem.currentUser ||
            await getCurrentUser();


        if (!user) {

            showMessage(
                "Please sign in before applying.",
                "warning"
            );

            return false;
        }


        try {

            const existing =
                await client
                    .from("applications")
                    .select("id")
                    .eq("job_id", jobId)
                    .eq("user_id", user.id)
                    .limit(1);


            if (existing.error) {

                showError(
                    existing.error.message ||
                    "Unable to verify application."
                );

                return false;
            }


            if (
                Array.isArray(existing.data) &&
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

                if (
                    String(
                        response.error.code || ""
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

            showError(
                error.message ||
                "Unable to submit application."
            );

            return false;
        }
    }


    /* =========================================================
       SEARCH
       ========================================================= */

    function initializeJobsSearch() {

        const forms =
            document.querySelectorAll(
                "#job-search-form, .job-search-form, [data-job-search-form]"
            );


        forms.forEach(
            form => {

                if (
                    form.dataset.jobsSearchInitialized ===
                    "true"
                ) {
                    return;
                }


                form.dataset.jobsSearchInitialized =
                    "
