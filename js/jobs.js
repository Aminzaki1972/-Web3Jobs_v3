/* =========================================================
   Web3Jobs v3
   File: js/jobs.js
   Jobs Management System
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const JOBS_SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const JOBS_SUPABASE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";

let jobsSupabase = null;


/* =========================================================
   JOBS SYSTEM STATE
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
   INITIALIZE SUPABASE
   ========================================================= */

function initializeJobsSupabase() {

    if (jobsSupabase) {
        return true;
    }

    if (
        typeof window === "undefined" ||
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs: Supabase library is not available."
        );

        return false;
    }

    try {

        jobsSupabase =
            window.supabase.createClient(
                JOBS_SUPABASE_URL,
                JOBS_SUPABASE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

        console.log(
            "Web3Jobs: Supabase initialized successfully."
        );

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: Supabase initialization error:",
            error
        );

        jobsSupabase = null;

        return false;
    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function jobsEscapeHTML(value) {

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


/* =========================================================
   ATTRIBUTE ESCAPE
   ========================================================= */

function jobsEscapeAttribute(value) {

    return jobsEscapeHTML(value);
}


/* =========================================================
   NORMALIZE VALUE
   ========================================================= */

function jobsValue(
    value,
    fallback = ""
) {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    const text =
        String(value).trim();

    return text || fallback;
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function jobsFormatDate(value) {

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
   GET CURRENT USER
   ========================================================= */

async function jobsGetCurrentUser() {

    if (!jobsSupabase) {

        if (!initializeJobsSupabase()) {
            return null;
        }
    }

    try {

        const result =
            await jobsSupabase.auth.getUser();

        if (
            result.error
        ) {

            console.warn(
                "Web3Jobs: Unable to get current user:",
                result.error
            );

            JobsSystem.currentUser =
                null;

            return null;
        }

        JobsSystem.currentUser =
            result.data &&
            result.data.user
                ? result.data.user
                : null;

        return JobsSystem.currentUser;

    } catch (error) {

        console.error(
            "Web3Jobs: Current user error:",
            error
        );

        JobsSystem.currentUser =
            null;

        return null;
    }
}


/* =========================================================
   FIND JOBS CONTAINER
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
   SHOW LOADING
   ========================================================= */

function showJobsLoading() {

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
   LOAD ALL JOBS
   ========================================================= */

async function loadAllJobs() {

    console.log(
        "Web3Jobs: Loading jobs..."
    );

    if (!jobsSupabase) {

        if (!initializeJobsSupabase()) {

            showJobsError(
                "Database connection is unavailable."
            );

            return [];
        }
    }

    JobsSystem.loading =
        true;

    showJobsLoading();

    try {

        const response =
            await jobsSupabase
                .from("jobs")
                .select("*");

        const data =
            response.data;

        const error =
            response.error;

        if (error) {

            console.error(
                "Web3Jobs: Supabase jobs error:",
                error
            );

            console.error(
                "Code:",
                error.code
            );

            console.error(
                "Message:",
                error.message
            );

            console.error(
                "Details:",
                error.details
            );

            console.error(
                "Hint:",
                error.hint
            );

            JobsSystem.jobs =
                [];

            JobsSystem.filteredJobs =
                [];

            renderAllJobs([]);

            showJobsError(
                jobsBuildSupabaseErrorMessage(
                    error
                )
            );

            return [];
        }

        if (!Array.isArray(data)) {

            JobsSystem.jobs =
                [];

            JobsSystem.filteredJobs =
                [];

            renderAllJobs([]);

            return [];
        }

        data.sort(
            (a, b) => {

                const timeA =
                    a &&
                    a.created_at
                        ? new Date(
                            a.created_at
                        ).getTime()
                        : 0;

                const timeB =
                    b &&
                    b.created_at
                        ? new Date(
                            b.created_at
                        ).getTime()
                        : 0;

                return timeB - timeA;
            }
        );

        JobsSystem.jobs =
            data;

        console.log(
            "Web3Jobs: Jobs loaded:",
            data.length
        );

        applyJobsFilters();

        return data;

    } catch (error) {

        console.error(
            "Web3Jobs: Unexpected jobs loading error:",
            error
        );

        JobsSystem.jobs =
            [];

        JobsSystem.filteredJobs =
            [];

        renderAllJobs([]);

        showJobsError(
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
   SUPABASE ERROR MESSAGE
   ========================================================= */

function jobsBuildSupabaseErrorMessage(
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

    const lowerMessage =
        message.toLowerCase();

    if (
        code === "42501" ||
        lowerMessage.includes(
            "row-level security"
        ) ||
        lowerMessage.includes(
            "permission denied"
        ) ||
        lowerMessage.includes(
            "not allowed"
        )
    ) {

        return "Unable to load jobs because database access is restricted.";
    }

    if (
        lowerMessage.includes(
            "failed to fetch"
        ) ||
        lowerMessage.includes(
            "network"
        )
    ) {

        return "Unable to connect to the database.";
    }

    if (
        lowerMessage.includes(
            "relation"
        ) &&
        lowerMessage.includes(
            "does not exist"
        )
    ) {

        return "The jobs table was not found.";
    }

    return message ||
        "Unable to load jobs.";
}


/* =========================================================
   CREATE JOB CARD
   ========================================================= */

function createJobCard(job) {

    if (!job) {
        return "";
    }

    const id =
        jobsEscapeAttribute(
            jobsValue(
                job.id,
                ""
            )
        );

    const title =
        jobsEscapeHTML(
            jobsValue(
                job.title,
                "Untitled Job"
            )
        );

    const company =
        jobsEscapeHTML(
            jobsValue(
                job.company ||
                job.company_name,
                "Web3 Company"
            )
        );

    const location =
        jobsEscapeHTML(
            jobsValue(
                job.location,
                "Remote"
            )
        );

    const type =
        jobsEscapeHTML(
            jobsValue(
                job.type,
                "Full Time"
            )
        );

    const description =
        jobsEscapeHTML(
            jobsValue(
                job.description,
                "No description available."
            )
        );

    const skills =
        jobsEscapeHTML(
            jobsValue(
                job.skills,
                ""
            )
        );

    const salary =
        jobsEscapeHTML(
            jobsValue(
                job.salary,
                ""
            )
        );

    const date =
        jobsFormatDate(
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

                <span class="job-location">
                    📍 ${location}
                </span>

                <span class="job-type">
                    💼 ${type}
                </span>

                ${
                    salary
                        ? `
                            <span class="job-salary">
                                💰 ${salary}
                            </span>
                        `
                        : ""
                }

                ${
                    date
                        ? `
                            <span class="job-date">
                                📅 ${jobsEscapeHTML(date)}
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
            "Web3Jobs: Jobs container was not found."
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
            .map(
                createJobCard
            )
            .join("");
}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyJobsFilters() {

    let result =
        Array.isArray(
            JobsSystem.jobs
        )
            ? [
                ...JobsSystem.jobs
            ]
            : [];

    const keyword =
        String(
            JobsSystem.searchQuery ||
            ""
        )
            .trim()
            .toLowerCase();

    const type =
        String(
            JobsSystem.typeFilter ||
            ""
        )
            .trim()
            .toLowerCase();

    const location =
        String(
            JobsSystem.locationFilter ||
            ""
        )
            .trim()
            .toLowerCase();

    if (keyword) {

        result =
            result.filter(
                job => {

                    if (!job) {
                        return false;
                    }

                    const searchableText = [

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

                    return searchableText
                        .includes(keyword);
                }
            );
    }

    if (type) {

        result =
            result.filter(
                job =>
                    String(
                        job &&
                        job.type
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
                        job &&
                        job.location
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


/* =========================================================
   SEARCH JOBS
   ========================================================= */

function searchJobs(
    query = ""
) {

    JobsSystem.searchQuery =
        String(
            query || ""
        );

    return applyJobsFilters();
}


/* =========================================================
   FILTER BY TYPE
   ========================================================= */

function filterJobsByType(
    type = ""
) {

    JobsSystem.typeFilter =
        String(
            type || ""
        );

    return applyJobsFilters();
}


/* =========================================================
   FILTER BY LOCATION
   ========================================================= */

function filterJobsByLocation(
    location = ""
) {

    JobsSystem.locationFilter =
        String(
            location || ""
        );

    return applyJobsFilters();
}


/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function clearJobFilters() {

    JobsSystem.searchQuery =
        "";

    JobsSystem.typeFilter =
        "";

    JobsSystem.locationFilter =
        "";

    return applyJobsFilters();
}


/* =========================================================
   GET JOB BY ID
   ========================================================= */

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
        JobsSystem.jobs.find(
            job =>
                job &&
                String(
                    job.id
                ) ===
                String(
                    jobId
                )
        ) ||
        null
    );
}


/* =========================================================
   LOAD SINGLE JOB
   ========================================================= */

async function loadJobById(
    jobId
) {

    if (
        jobId === null ||
        jobId === undefined ||
        jobId === ""
    ) {
        return null;
    }

    if (!jobsSupabase) {

        if (!initializeJobsSupabase()) {
            return null;
        }
    }

    try {

        const response =
            await jobsSupabase
                .from("jobs")
                .select("*")
                .eq(
                    "id",
                    jobId
                )
                .maybeSingle();

        if (response.error) {

            console.error(
                "Web3Jobs: Unable to load job:",
                response.error
            );

            showJobsError(
                jobsBuildSupabaseErrorMessage(
                    response.error
                )
            );

            return null;
        }

        JobsSystem.currentJob =
            response.data ||
            null;

        return JobsSystem.currentJob;

    } catch (error) {

        console.error(
            "Web3Jobs: loadJobById error:",
            error
        );

        showJobsError(
            error.message ||
            "Unable to load job."
        );

        return null;
    }
}


/* =========================================================
   CREATE JOB DETAILS MODAL
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

            background:
                "rgba(0,0,0,.65)"

        }
    );

    document.body.appendChild(
        modal
    );

    const closeButton =
        modal.querySelector(
            ".jobs-modal-close"
        );

    const overlay =
        modal.querySelector(
            ".jobs-modal-overlay"
        );

    if (closeButton) {

        closeButton.addEventListener(
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

function showJobDetails(
    job
) {

    if (!job) {

        showJobsError(
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
        jobsEscapeHTML(
            jobsValue(
                job.title,
                "Untitled Job"
            )
        );

    const company =
        jobsEscapeHTML(
            jobsValue(
                job.company ||
                job.company_name,
                "Not specified"
            )
        );

    const location =
        jobsEscapeHTML(
            jobsValue(
                job.location,
                "Remote"
            )
        );

    const type =
        jobsEscapeHTML(
            jobsValue(
                job.type,
                "Not specified"
            )
        );

    const description =
        jobsEscapeHTML(
            jobsValue(
                job.description,
                "No description available."
            )
        );

    const skills =
        jobsEscapeHTML(
            jobsValue(
                job.skills,
                ""
            )
        );

    const salary =
        jobsEscapeHTML(
            jobsValue(
                job.salary,
                ""
            )
        );

    const applicationURL =
        jobsValue(
            job.application_url ||
            job.apply_link,
            ""
        );

    const date =
        jobsFormatDate(
            job.created_at
        );

    body.innerHTML = `

        <h2 id="jobs-modal-title">
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
                            ${jobsEscapeHTML(date)}
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
            async () => {

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

                            const opened =
                                window.open(
                                    safeURL.href,
                                    "_blank",
                                    "noopener,noreferrer"
                                );

                            if (opened) {
                                return;
                            }
                        }

                    } catch (error) {

                        console.error(
                            "Web3Jobs: Invalid application URL:",
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


/* =========================================================
   CLOSE JOB DETAILS
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
   APPLY FOR JOB
   ========================================================= */

async function applyForJob(
    jobId
) {

    if (
        jobId === null ||
        jobId === undefined ||
        jobId === ""
    ) {

        showJobsError(
            "Invalid job."
        );

        return false;
    }

    if (!jobsSupabase) {

        if (!initializeJobsSupabase()) {

            showJobsError(
                "Database connection is unavailable."
            );

            return false;
        }
    }

    const user =
        JobsSystem.currentUser ||
        await jobsGetCurrentUser();

    if (!user) {

        showJobsMessage(
            "Please sign in before applying.",
            "warning"
        );

        setTimeout(
            () => {

                window.location.href =
                    "login.html";

            },
            900
        );

        return false;
    }

    try {

        const checkResponse =
            await jobsSupabase
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

        if (checkResponse.error) {

            console.error(
                "Web3Jobs: Application check error:",
                checkResponse.error
            );

            showJobsMessage(
                checkResponse.error.message ||
                "Unable to verify your application.",
                "error"
            );

            return false;
        }

        if (
            Array.isArray(
                checkResponse.data
            ) &&
            checkResponse.data.length > 0
        ) {

            showJobsMessage(
                "You have already applied for this job.",
                "warning"
            );

            return false;
        }

        /*
         * Do not use select() after insert here.
         * This avoids failures caused by restrictive
         * SELECT policies on the applications table.
         */

        const insertResponse =
            await jobsSupabase
                .from("applications")
                .insert({
                    job_id:
                        jobId,

                    user_id:
                        user.id
                });

        if (insertResponse.error) {

            console.error(
                "Web3Jobs: Application insert error:",
                insertResponse.error
            );

            if (
                String(
                    insertResponse.error.code ||
                    ""
                ) === "23505"
            ) {

                showJobsMessage(
                    "You have already applied for this job.",
                    "warning"
                );

                return false;
            }

            showJobsMessage(
                insertResponse.error.message ||
                "Unable to submit application.",
                "error"
            );

            return false;
        }

        showJobsMessage(
            "Application submitted successfully.",
            "success"
        );

        closeJobDetails();

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: applyForJob error:",
            error
        );

        showJobsMessage(
            error.message ||
            "An unexpected error occurred.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   CREATE JOB
   ========================================================= */

async function createJob(
    jobData = {}
) {

    if (!jobsSupabase) {

        if (!initializeJobsSupabase()) {
            return null;
        }
    }

    const user =
        JobsSystem.currentUser ||
        await jobsGetCurrentUser();

    if (!user) {

        showJobsMessage(
            "Please sign in first.",
            "warning"
        );

        return null;
    }

    const title =
        jobsValue(
            jobData.title
        );

    if (!title) {

        showJobsMessage(
            "Job title is required.",
            "warning"
        );

        return null;
    }

    const insertData = {

        title:
            title,

        company:
            jobsValue(
                jobData.company,
                ""
            ),

        location:
            jobsValue(
                jobData.location,
                "Remote"
            ),

        type:
            jobsValue(
                jobData.type,
                "Full Time"
            ),

        description:
            jobsValue(
                jobData.description,
                ""
            ),

        skills:
            jobsValue(
                jobData.skills,
                ""
            ),

        salary:
            jobsValue(
                jobData.salary,
                ""
            ),

        application_url:
            jobsValue(
                jobData.application_url ||
                jobData.apply_link,
                ""
            )

    };

    try {

        console.log(
            "Web3Jobs: Creating job:",
            insertData
        );

        /*
         * Insert only columns known to exist in the
         * current jobs table.
         */

        const response =
            await jobsSupabase
                .from("jobs")
                .insert(
                    insertData
                )
                .select("*")
                .maybeSingle();

        if (response.error) {

            console.error(
                "Web3Jobs: Create job error:",
                response.error
            );

            /*
             * If the database accepts INSERT but
             * SELECT is blocked by RLS, retry without
             * requesting the inserted row.
             */

            const errorMessage =
                String(
                    response.error.message ||
                    ""
                ).toLowerCase();

            if (
                errorMessage.includes(
                    "row-level security"
                ) ||
                errorMessage.includes(
                    "permission denied"
                ) ||
                String(
                    response.error.code ||
                    ""
                ) === "42501"
            ) {

                const retry =
                    await jobsSupabase
                        .from("jobs")
                        .insert(
                            insertData
                        );

                if (retry.error) {

                    console.error(
                        "Web3Jobs: Create job retry error:",
                        retry.error
                    );

                    showJobsMessage(
                        retry.error.message ||
                        "Unable to publish job.",
                        "error"
                    );

                    return null;
                }

                showJobsMessage(
                    "Job published successfully.",
                    "success"
                );

                await loadAllJobs();

                return true;
            }

            showJobsMessage(
                response.error.message ||
                "Unable to publish job.",
                "error"
            );

            return null;
        }

        if (response.data) {

            JobsSystem.jobs.unshift(
                response.data
            );

            applyJobsFilters();

            showJobsMessage(
                "Job published successfully.",
                "success"
            );

            return response.data;
        }

        await loadAllJobs();

        showJobsMessage(
            "Job published successfully.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: createJob error:",
            error
        );

        showJobsMessage(
            error.message ||
            "Unable to publish job.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteJob(
    jobId
) {

    if (
        jobId === null ||
        jobId === undefined ||
        jobId === ""
    ) {
        return false;
    }

    if (!jobsSupabase) {

        if (!initializeJobsSupabase()) {
            return false;
        }
    }

    const user =
        JobsSystem.currentUser ||
        await jobsGetCurrentUser();

    if (!user) {

        showJobsMessage(
            "Please sign in first.",
            "warning"
        );

        return false;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this job?"
        );

    if (!confirmed) {
        return false;
    }

    try {

        /*
         * The database RLS policy should control
         * whether the current user can delete the job.
         */

        const response =
            await jobsSupabase
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    jobId
                );

        if (response.error) {

            console.error(
                "Web3Jobs: Delete job error:",
                response.error
            );

            showJobsMessage(
                response.error.message ||
                "Unable to delete job.",
                "error"
            );

            return false;
        }

        JobsSystem.jobs =
            JobsSystem.jobs.filter(
                job =>
                    String(
                        job.id
                    ) !==
                    String(
                        jobId
                    )
            );

        applyJobsFilters();

        showJobsMessage(
            "Job deleted successfully.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: deleteJob error:",
            error
        );

        showJobsMessage(
            error.message ||
            "Unable to delete job.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   SEARCH FORM
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
   JOB CLICK EVENTS
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
        event => {

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

            if (
                jobId === null ||
                jobId === undefined ||
                jobId === ""
            ) {
                return;
            }

            const job =
                getJobById(
                    jobId
                );

            if (!job) {

                loadJobById(
                    jobId
                )
                    .then(
                        loadedJob => {

                            if (loadedJob) {

                                showJobDetails(
                                    loadedJob
                                );

                            } else {

                                showJobsError(
                                    "Job not found."
                                );
                            }
                        }
                    );

                return;
            }

            showJobDetails(
                job
            );
        }
    );
}


/* =========================================================
   ESCAPE KEY
   ========================================================= */

function initializeJobsKeyboard() {

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
                event.key ===
                "Escape"
            ) {

                closeJobDetails();
            }
        }
    );
}


/* =========================================================
   MESSAGES
   ========================================================= */

function showJobsMessage(
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
                    "0 8px 25px rgba(0,0,0,.20)",

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

    switch (type) {

        case "success":

            box.style.background =
                "#198754";

            box.style.color =
                "#ffffff";

            break;

        case "error":

            box.style.background =
                "#dc3545";

            box.style.color =
                "#ffffff";

            break;

        case "warning":

            box.style.background =
                "#ffc107";

            box.style.color =
                "#111111";

            break;

        default:

            box.style.background =
                "#212529";

            box.style.color =
                "#ffffff";

            break;
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


/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function showJobsError(
    message
) {

    showJobsMessage(
        message,
        "error"
    );
}


/* =========================================================
   INITIALIZE JOBS
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
        "Web3Jobs: Starting Jobs System..."
    );

    const initialized =
        initializeJobsSupabase();

    if (!initialized) {

        JobsSystem.initialized =
            false;

        showJobsError(
            "Supabase is not available."
        );

        return;
    }

    await jobsGetCurrentUser();

    initializeJobsSearch();

    initializeJobEvents();

    initializeJobsKeyboard();

    const jobsContainer =
        findJobsContainer();

    if (!jobsContainer) {

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
   REFRESH JOBS
   ========================================================= */

async function refreshJobs() {

    return await loadAllJobs();
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.JobsSystem =
    JobsSystem;

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


/* =========================================================
   START
   ========================================================= */

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
