/* =========================================================
   Web3Jobs v3
   File: js/jobs.js

   Jobs Management System
   Unified Session-Safe Version
   ---------------------------------------------------------
   IMPORTANT:
   - Uses ONLY the unified Supabase client.
   - NEVER creates another Supabase client.
   - NEVER redirects users to login.
   - NEVER logs users out while browsing jobs.
   - External application links open in a new tab.
   - application_url is preferred over apply_link.
   - source_url is NOT used as an application URL.
   - jobs.js does NOT auto-start.
   - app.js is responsible for initializeJobs().
   ========================================================= */

"use strict";

(function () {

    /* =========================================================
       STATE
       ========================================================= */

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

        /*
         * Always use the unified Web3Jobs Supabase client.
         */

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {

            const client =
                window.Web3JobsSupabase.getClient();

            if (
                client &&
                client.auth &&
                typeof client.from === "function"
            ) {

                return client;
            }
        }


        /*
         * Compatibility with older Web3Jobs files.
         */

        if (
            window.supabaseClient &&
            window.supabaseClient.auth &&
            typeof window.supabaseClient.from === "function"
        ) {

            return window.supabaseClient;
        }


        console.error(
            "Web3Jobs: Unified Supabase client not found."
        );

        return null;
    }


    /* =========================================================
       CURRENT SESSION
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
                "Web3Jobs: Unable to read session:",
                error
            );
        }


        return null;
    }


    /* =========================================================
       CURRENT USER
       ========================================================= */

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
       HTML ESCAPE
       ========================================================= */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );
    }


    function escapeAttribute(value) {

        return escapeHTML(value);
    }


    /* =========================================================
       VALUE HELPER
       ========================================================= */

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


        return result ||
            fallback;
    }


    /* =========================================================
       DATE
       ========================================================= */

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
       JOB CONTAINER
       ========================================================= */

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

                <p>
                    Loading jobs...
                </p>

            </div>

        `;
    }


    /* =========================================================
       SUPABASE ERROR
       ========================================================= */

    function buildSupabaseError(
        error
    ) {

        if (!error) {

            return "Unable to load jobs.";
        }


        const code =
            String(
                error.code || ""
            );


        const message =
            String(
                error.message || ""
            );


        const lower =
            message.toLowerCase();


        if (
            code === "42501" ||
            lower.includes("row-level security") ||
            lower.includes("permission denied")
        ) {

            return "Database access is restricted.";
        }


        if (
            lower.includes("failed to fetch") ||
            lower.includes("network")
        ) {

            return "Unable to connect to the database.";
        }


        if (
            lower.includes("relation") &&
            lower.includes("does not exist")
        ) {

            return "The jobs table was not found.";
        }


        return (
            message ||
            "Unable to load jobs."
        );
    }


    /* =========================================================
       LOAD ALL JOBS
       ========================================================= */

    async function loadAllJobs() {

        const client =
            getJobsSupabase();


        if (!client) {

            showError(
                "Supabase connection is unavailable."
            );

            return [];
        }


        JobsSystem.loading =
            true;


        showLoading();


        try {

            const response =
                await client
                    .from("jobs")
                    .select("*");


            if (response.error) {

                console.error(
                    "Web3Jobs Jobs error:",
                    response.error
                );


                JobsSystem.jobs =
                    [];

                JobsSystem.filteredJobs =
                    [];


                renderAllJobs([]);


                showError(
                    buildSupabaseError(
                        response.error
                    )
                );


                return [];
            }


            const data =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            /*
             * Newest jobs first.
             */

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
                "Web3Jobs: Jobs loaded:",
                data.length
            );


            return data;

        } catch (error) {

            console.error(
                "Web3Jobs loadAllJobs:",
                error
            );


            JobsSystem.jobs =
                [];

            JobsSystem.filteredJobs =
                [];


            renderAllJobs([]);


            showError(
                error.message ||
                "Unable to load jobs."
            );


            return [];

        } finally {

            JobsSystem.loading =
                false;
        }
    }


    /* =========================================================
       SAFE APPLICATION URL
       ========================================================= */

    function getApplicationURL(job) {

        if (!job) {
            return "";
        }


        /*
         * IMPORTANT:
         *
         * Priority:
         *
         * 1. application_url
         * 2. apply_link
         * 3. application_link
         * 4. apply_url
         *
         * source_url is intentionally NOT included.
         */

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


            /*
             * Only HTTP and HTTPS URLs are allowed.
             */

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
                rawURL,
                error
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
       RENDER JOBS
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

            return;
        }


        container.innerHTML =
            jobs
                .map(createJobCard)
                .join("");
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
                    job => {

                        return String(
                            job &&
                            job.type
                                ? job.type
                                : ""
                        )
                            .toLowerCase()
                            .includes(type);
                    }
                );
        }


        if (location) {

            result =
                result.filter(
                    job => {

                        return String(
                            job &&
                            job.location
                                ? job.location
                                : ""
                        )
                            .toLowerCase()
                            .includes(location);
                    }
                );
        }


        JobsSystem.filteredJobs =
            result;


        renderAllJobs(result);


        return result;
    }


    function searchJobs(
        query = ""
    ) {

        JobsSystem.searchQuery =
            String(query || "");


        return applyFilters();
    }


    function filterJobsByType(
        type = ""
    ) {

        JobsSystem.typeFilter =
            String(type || "");


        return applyFilters();
    }


    function filterJobsByLocation(
        location = ""
    ) {

        JobsSystem.locationFilter =
            String(location || "");


        return applyFilters();
    }


    function clearJobFilters() {

        JobsSystem.searchQuery =
            "";

        JobsSystem.typeFilter =
            "";

        JobsSystem.locationFilter =
            "";


        return applyFilters();
    }


    /* =========================================================
       GET JOB BY ID
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


    /* =========================================================
       LOAD SINGLE JOB
       ========================================================= */

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


                showError(
                    buildSupabaseError(
                        response.error
                    )
                );


                return null;
            }


            JobsSystem.currentJob =
                response.data || null;


            return JobsSystem.currentJob;

        } catch (error) {

            console.error(
                "Web3Jobs loadJobById:",
                error
            );


            showError(
                error.message ||
                "Unable to load job."
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


    /* =========================================================
       SHOW JOB DETAILS
       ========================================================= */

    function showJobDetails(job) {

        if (!job) {

            showError(
                "Job not found."
            );

            return;
        }


        JobsSystem.currentJob =
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
                                id="job-apply-link"
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


    /* =========================================================
       CLOSE MODAL
       ========================================================= */

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
       INTERNAL APPLICATION
       ========================================================= */

    async function applyForJob(jobId) {

        if (
            jobId === null ||
            jobId === undefined ||
            jobId === ""
        ) {

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

                console.error(
                    "Application check error:",
                    existing.error
                );


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

                console.error(
                    "Application insert error:",
                    response.error
                );


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

            console.error(
                "Web3Jobs applyForJob:",
                error
            );


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
                    "true";


                form.addEventListener(
                    "submit",
                    event => {

                        event.preventDefault();


                        const input =
                            form.querySelector(
                                "input"
                            );


                        if (!input) {
                            return;
                        }


                        searchJobs(
                            input.value
                        );

                    }
                );

            }
        );


        const inputs =
            document.querySelectorAll(
                "#job-search, #search-jobs, [data-job-search]"
            );


        inputs.forEach(
            input => {

                if (
                    input.dataset.jobsSearchInitialized ===
                    "true"
                ) {

                    return;
                }


                input.dataset.jobsSearchInitialized =
                    "true";


                input.addEventListener(
                    "input",
                    () => {

                        searchJobs(
                            input.value
                        );

                    }
                );

            }
        );
    }


    /* =========================================================
       JOB EVENTS
       ========================================================= */

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
            async event => {

                const externalApplyLink =
                    event.target.closest(
                        ".job-apply-button[href]"
                    );


                if (externalApplyLink) {
                    return;
                }


                const button =
                    event.target.closest(
                        ".job-view-button, [data-view-job]"
                    );


                if (!button) {
                    return;
                }


                const jobId =
                    button.dataset.jobId ||
                    button.dataset.viewJob;


                if (!jobId) {
                    return;
                }


                const job =
                    getJobById(jobId);


                if (job) {

                    showJobDetails(job);

                    return;
                }


                const loaded =
                    await loadJobById(jobId);


                if (loaded) {

                    showJobDetails(loaded);

                } else {

                    showError(
                        "Job not found."
                    );
                }

            }
        );
    }


    /* =========================================================
       KEYBOARD
       ========================================================= */

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
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeJobDetails();
                }

            }
        );
    }


    /* =========================================================
       MESSAGE
       ========================================================= */

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
                    fontFamily: "inherit"

                }
            );


            document.body.appendChild(
                box
            );
        }


        box.textContent =
            String(message || "");


        if (type === "success") {

            box.style.background =
                "#198754";

            box.style.color =
                "#ffffff";

        } else if (type === "error") {

            box.style.background =
                "#dc3545";

            box.style.color =
                "#ffffff";

        } else if (type === "warning") {

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
                () => {

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


    /* =========================================================
       INITIALIZE
       ========================================================= */

    async function initializeJobs() {

        if (
            JobsSystem.initialized
        ) {

            return;
        }


        JobsSystem.initialized =
            true;


        console.log(
            "Web3Jobs: Initializing Jobs System..."
        );


        const client =
            getJobsSupabase();


        if (!client) {

            JobsSystem.initialized =
                false;


            showError(
                "Supabase is not available."
            );


            return;
        }


        /*
         * Read the current authentication session.
         *
         * There is NO redirect here.
         */

        await getCurrentUser();


        initializeJobsSearch();

        initializeJobEvents();

        initializeKeyboard();


        const container =
            findJobsContainer();


        if (!container) {

            console.warn(
                "Web3Jobs: Jobs container was not found."
            );


            return;
        }


        await loadAllJobs();


        console.log(
            "Web3Jobs: Jobs System initialized."
        );
    }


    /* =========================================================
       REFRESH
       ========================================================= */

    async function refreshJobs() {

        return await loadAllJobs();
    }


    /* =========================================================
       CREATE JOB
       ========================================================= */

    async function createJob(
        jobData = {}
    ) {

        const client =
            getJobsSupabase();


        if (!client) {

            showError(
                "Supabase connection is unavailable."
            );


            return null;
        }


        const user =
            JobsSystem.currentUser ||
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
                    .insert(insertData)
                    .select("*")
                    .maybeSingle();


            if (response.error) {

                console.error(
                    "Create job error:",
                    response.error
                );


                showError(
                    response.error.message ||
                    "Unable to publish job."
                );


                return null;
            }


            if (response.data) {

                JobsSystem.jobs.unshift(
                    response.data
                );


                applyFilters();


                showMessage(
                    "Job published successfully.",
                    "success"
                );


                return response.data;
            }


            await loadAllJobs();


            showMessage(
                "Job published successfully.",
                "success"
            );


            return true;

        } catch (error) {

            console.error(
                "Web3Jobs createJob:",
                error
            );


            showError(
                error.message ||
                "Unable to publish job."
            );


            return null;
        }
    }


    /* =========================================================
       DELETE JOB
       ========================================================= */

    async function deleteJob(jobId) {

        if (!jobId) {
            return false;
        }


        const client =
            getJobsSupabase();


        if (!client) {
            return false;
        }


        const user =
            JobsSystem.currentUser ||
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
                    .eq("id", jobId);


            if (response.error) {

                console.error(
                    "Delete job error:",
                    response.error
                );


                showError(
                    response.error.message ||
                    "Unable to delete job."
                );


                return false;
            }


            JobsSystem.jobs =
                JobsSystem.jobs.filter(
                    job =>
                        String(job.id) !==
                        String(jobId)
                );


            applyFilters();


            showMessage(
                "Job deleted successfully.",
                "success"
            );


            return true;

        } catch (error) {

            console.error(
                "Web3Jobs deleteJob:",
                error
            );


            showError(
                error.message ||
                "Unable to delete job."
            );


            return false;
        }
    }


    /* =========================================================
       GLOBAL API
       ========================================================= */

    window.JobsSystem =
        JobsSystem;


    window.Web3JobsJobs = {

        initializeJobs:
            initializeJobs,

        loadAllJobs:
            loadAllJobs,

        refreshJobs:
            refreshJobs,

        renderAllJobs:
            renderAllJobs,

        searchJobs:
            searchJobs,

        filterJobsByType:
            filterJobsByType,

        filterJobsByLocation:
            filterJobsByLocation,

        clearJobFilters:
            clearJobFilters,

        getJobById:
            getJobById,

        loadJobById:
            loadJobById,

        showJobDetails:
            showJobDetails,

        closeJobDetails:
            closeJobDetails,

        applyForJob:
            applyForJob,

        createJob:
            createJob,

        deleteJob:
            deleteJob,

        getCurrentUser:
            getCurrentUser,

        getCurrentSession:
            getCurrentSession

    };


    /* =========================================================
       START
       ---------------------------------------------------------
       IMPORTANT:
       jobs.js does NOT auto-start.

       app.js is responsible for calling:

           await window.Web3JobsJobs.initializeJobs();

       This prevents jobs from being loaded twice.
       ========================================================= */

})();
