/* =========================================================
   Web3Jobs v3
   File: js/jobs.js
   Jobs Management System
========================================================= */

"use strict";

/* =========================================================
   SUPABASE CLIENT
========================================================= */

let jobsSupabase = null;

/* =========================================================
   STATE
========================================================= */

const JobsSystem = {

    jobs: [],

    filteredJobs: [],

    currentJob: null,

    currentUser: null,

    initialized: false

};

/* =========================================================
   INITIALIZE
========================================================= */

function initializeJobsSupabase() {

    if (
        window.Web3Jobs &&
        window.Web3Jobs.supabase
    ) {

        jobsSupabase =
            window.Web3Jobs.supabase;

        return true;
    }

    if (
        window.supabaseClient
    ) {

        jobsSupabase =
            window.supabaseClient;

        return true;
    }

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {

        console.error(
            "Web3Jobs: Supabase client is not initialized."
        );

        return false;
    }

    console.error(
        "Web3Jobs: Supabase is unavailable."
    );

    return false;
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
   DATE FORMAT
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
   CURRENT USER
========================================================= */

async function jobsGetCurrentUser() {

    if (!jobsSupabase) {

        if (
            !initializeJobsSupabase()
        ) {

            return null;
        }
    }

    try {

        const {
            data,
            error
        } =
            await jobsSupabase
                .auth
                .getUser();

        if (error) {

            JobsSystem.currentUser =
                null;

            return null;
        }

        JobsSystem.currentUser =
            data?.user || null;

        return JobsSystem.currentUser;

    } catch (error) {

        console.error(
            "Web3Jobs: Unable to get current user.",
            error
        );

        JobsSystem.currentUser =
            null;

        return null;
    }
}

/* =========================================================
   LOAD ALL JOBS
========================================================= */

async function loadAllJobs() {

    if (!jobsSupabase) {

        if (
            !initializeJobsSupabase()
        ) {

            showJobsError(
                "Supabase connection is unavailable."
            );

            return [];
        }
    }

    try {

        const {
            data,
            error
        } =
            await jobsSupabase
                .from("jobs")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "Web3Jobs: Failed to load jobs.",
                error
            );

            showJobsError(
                "Unable to load jobs."
            );

            return [];
        }

        JobsSystem.jobs =
            Array.isArray(data)
                ? data
                : [];

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:jobs-updated"
            )
        );

        return JobsSystem.jobs;

    } catch (error) {

        console.error(
            "Web3Jobs: loadAllJobs error.",
            error
        );

        showJobsError(
            "Unable to load jobs."
        );

        return [];
    }
}

/* =========================================================
   CREATE JOB CARD
========================================================= */

function createJobCard(job) {

    const id =
        jobsEscapeHTML(
            job.id
        );

    const title =
        jobsEscapeHTML(
            job.title ||
            "Untitled Job"
        );

    const company =
        jobsEscapeHTML(
            job.company ||
            "Web3 Company"
        );

    const location =
        jobsEscapeHTML(
            job.location ||
            "Remote"
        );

    const type =
        jobsEscapeHTML(
            job.type ||
            "Full Time"
        );

    const description =
        jobsEscapeHTML(
            job.description ||
            "No description available."
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
                    date
                    ? `
                        <span class="job-date">
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

    const selectors = [

        "#jobs-list",

        "#jobs-container",

        ".jobs-list",

        ".jobs-container",

        "[data-jobs-container]"

    ];

    let container = null;

    for (
        const selector
        of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );

        if (element) {

            container =
                element;

            break;
        }
    }

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
                    There are currently no
                    available opportunities.
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
   SEARCH JOBS
========================================================= */

function searchJobs(
    query = ""
) {

    const keyword =
        String(query)
            .trim()
            .toLowerCase();

    if (!keyword) {

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        renderAllJobs();

        return JobsSystem.filteredJobs;
    }

    JobsSystem.filteredJobs =
        JobsSystem.jobs.filter(
            job => {

                const searchableText = [

                    job.title,

                    job.company,

                    job.location,

                    job.type,

                    job.description,

                    job.skills

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText
                    .includes(keyword);
            }
        );

    renderAllJobs();

    return JobsSystem.filteredJobs;
}

/* =========================================================
   ADVANCED SEARCH
========================================================= */

function searchJobsAdvanced({
    keyword = "",
    location = "",
    type = ""
} = {}) {

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

    JobsSystem.filteredJobs =
        JobsSystem.jobs.filter(
            job => {

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

    renderAllJobs();

    return JobsSystem.filteredJobs;
}

/* =========================================================
   FILTER BY TYPE
========================================================= */

function filterJobsByType(
    type
) {

    if (!type) {

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        renderAllJobs();

        return JobsSystem.filteredJobs;
    }

    const selectedType =
        String(type)
            .trim()
            .toLowerCase();

    JobsSystem.filteredJobs =
        JobsSystem.jobs.filter(
            job =>
                String(
                    job.type ||
                    ""
                )
                .toLowerCase()
                .includes(
                    selectedType
                )
        );

    renderAllJobs();

    return JobsSystem.filteredJobs;
}

/* =========================================================
   FILTER BY LOCATION
========================================================= */

function filterJobsByLocation(
    location
) {

    if (!location) {

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        renderAllJobs();

        return JobsSystem.filteredJobs;
    }

    const selectedLocation =
        String(location)
            .trim()
            .toLowerCase();

    JobsSystem.filteredJobs =
        JobsSystem.jobs.filter(
            job =>
                String(
                    job.location ||
                    ""
                )
                .toLowerCase()
                .includes(
                    selectedLocation
                )
        );

    renderAllJobs();

    return JobsSystem.filteredJobs;
}

/* =========================================================
   GET JOB BY ID
========================================================= */

function getJobById(
    jobId
) {

    return JobsSystem.jobs.find(
        job =>
            String(job.id) ===
            String(jobId)
    ) || null;
}

/* =========================================================
   LOAD SINGLE JOB
========================================================= */

async function loadJobById(
    jobId
) {

    if (!jobId) {

        return null;
    }

    if (!jobsSupabase) {

        if (
            !initializeJobsSupabase()
        ) {

            return null;
        }
    }

    try {

        const {
            data,
            error
        } =
            await jobsSupabase
                .from("jobs")
                .select("*")
                .eq(
                    "id",
                    jobId
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Web3Jobs: Unable to load job.",
                error
            );

            return null;
        }

        JobsSystem.currentJob =
            data || null;

        return JobsSystem.currentJob;

    } catch (error) {

        console.error(
            "Web3Jobs: loadJobById error.",
            error
        );

        return null;
    }
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

        modal.innerHTML = `

            <div class="jobs-modal-overlay"></div>

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

        Object.assign(
            modal.style,
            {

                position: "fixed",

                inset: "0",

                zIndex: "99999",

                display: "flex",

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

        modal
            .querySelector(
                ".jobs-modal-close"
            )
            .addEventListener(
                "click",
                closeJobDetails
            );

        modal
            .querySelector(
                ".jobs-modal-overlay"
            )
            .addEventListener(
                "click",
                closeJobDetails
            );
    }

    const body =
        modal.querySelector(
            ".jobs-modal-body"
        );

    body.innerHTML = `

        <h2>
            ${jobsEscapeHTML(
                job.title ||
                "Untitled Job"
            )}
        </h2>

        <p>
            <strong>
                Company:
            </strong>

            ${jobsEscapeHTML(
                job.company ||
                "Not specified"
            )}
        </p>

        <p>
            <strong>
                Location:
            </strong>

            ${jobsEscapeHTML(
                job.location ||
                "Remote"
            )}
        </p>

        <p>
            <strong>
                Job Type:
            </strong>

            ${jobsEscapeHTML(
                job.type ||
                "Not specified"
            )}
        </p>

        <hr>

        <h3>
            Job Description
        </h3>

        <p class="job-full-description">
            ${jobsEscapeHTML(
                job.description ||
                "No description available."
            )}
        </p>

        <div class="job-application-area">

            <button
                type="button"
                id="job-apply-button"
                data-job-id="${jobsEscapeHTML(
                    job.id
                )}"
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
            function () {

                applyForJob(
                    job.id
                );

            }
        );
    }

    modal.style.display =
        "flex";
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
}

/* =========================================================
   APPLY FOR JOB
========================================================= */

async function applyForJob(
    jobId
) {

    if (!jobsSupabase) {

        if (
            !initializeJobsSupabase()
        ) {

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
            function () {

                window.location.href =
                    "login.html";

            },
            900
        );

        return false;
    }

    try {

        const {
            data: existing,
            error: checkError
        } =
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
                .maybeSingle();

        if (
            checkError &&
            checkError.code !== "PGRST116"
        ) {

            console.error(
                "Application check error:",
                checkError
            );

            showJobsMessage(
                "Unable to check application status.",
                "error"
            );

            return false;
        }

        if (existing) {

            showJobsMessage(
                "You have already applied for this job.",
                "warning"
            );

            return false;
        }

        const {
            error
        } =
            await jobsSupabase
                .from("applications")
                .insert({
                    job_id: jobId,
                    user_id: user.id
                });

        if (error) {

            console.error(
                "Application insert error:",
                error
            );

            showJobsMessage(
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
            "Web3Jobs: applyForJob error.",
            error
        );

        showJobsMessage(
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

        if (
            !initializeJobsSupabase()
        ) {

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
        String(
            jobData.title ||
            ""
        ).trim();

    if (!title) {

        showJobsMessage(
            "Job title is required.",
            "warning"
        );

        return null;
    }

    try {

        const insertData = {

            title: title,

            company:
                jobData.company ||
                "",

            location:
                jobData.location ||
                "Remote",

            type:
                jobData.type ||
                "Full Time",

            description:
                jobData.description ||
                ""

        };

        if (
            jobData.skills !== undefined
        ) {

            insertData.skills =
                jobData.skills;
        }

        if (
            jobData.created_by !== undefined
        ) {

            insertData.created_by =
                jobData.created_by;

        } else {

            insertData.created_by =
                user.id;
        }

        const {
            data,
            error
        } =
            await jobsSupabase
                .from("jobs")
                .insert(
                    insertData
                )
                .select()
                .single();

        if (error) {

            console.error(
                "Create job error:",
                error
            );

            showJobsMessage(
                "Unable to publish job.",
                "error"
            );

            return null;
        }

        JobsSystem.jobs.unshift(
            data
        );

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        renderAllJobs();

        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:jobs-updated"
            )
        );

        showJobsMessage(
            "Job published successfully.",
            "success"
        );

        return data;

    } catch (error) {

        console.error(
            "Web3Jobs: createJob error.",
            error
        );

        showJobsMessage(
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

    if (!jobsSupabase) {

        if (
            !initializeJobsSupabase()
        ) {

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

        const {
            error
        } =
            await jobsSupabase
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    jobId
                );

        if (error) {

            console.error(
                "Delete job error:",
                error
            );

            showJobsMessage(
                "Unable to delete job.",
                "error"
            );

            return false;
        }

        JobsSystem.jobs =
            JobsSystem.jobs.filter(
                job =>
                    String(job.id) !==
                    String(jobId)
            );

        JobsSystem.filteredJobs =
            JobsSystem.filteredJobs.filter(
                job =>
                    String(job.id) !==
                    String(jobId)
            );

        renderAllJobs();

        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:jobs-updated"
            )
        );

        showJobsMessage(
            "Job deleted successfully.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: deleteJob error.",
            error
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
                form.dataset.jobsInitialized === "true"
            ) {

                return;
            }

            form.dataset.jobsInitialized =
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
                input.dataset.jobsInitialized === "true"
            ) {

                return;
            }

            input.dataset.jobsInitialized =
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
        document.body.dataset.jobsClickInitialized === "true"
    ) {

        return;
    }

    document.body.dataset.jobsClickInitialized =
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

            if (!jobId) {

                return;
            }

            let job =
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
                    "0 8px 25px rgba(0,0,0,.25)",

                fontSize: "14px",

                fontWeight: "600"
            }
        );

        document.body.appendChild(
            box
        );
    }

    box.textContent =
        message;

    if (
        type === "success"
    ) {

        box.style.background =
            "#198754";

        box.style.color =
            "#fff";

    } else if (
        type === "error"
    ) {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#fff";

    } else if (
        type === "warning"
    ) {

        box.style.background =
            "#ffc107";

        box.style.color =
            "#111";

    } else {

        box.style.background =
            "#212529";

        box.style.color =
            "#fff";
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
            4000
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

    if (
        !initializeJobsSupabase()
    ) {

        showJobsError(
            "Supabase is not available."
        );

        return;
    }

    await jobsGetCurrentUser();

    const jobsContainer =
        document.querySelector(
            "#jobs-list, #jobs-container, .jobs-list, .jobs-container, [data-jobs-container]"
        );

    if (jobsContainer) {

        await loadAllJobs();

        renderAllJobs();
    }

    initializeJobsSearch();

    initializeJobEvents();

    console.log(
        "Web3Jobs Jobs System initialized."
    );
}

/* =========================================================
   AUTH STATE LISTENER
========================================================= */

function initializeJobsAuthListener() {

    if (!jobsSupabase) {

        return;
    }

    jobsSupabase
        .auth
        .onAuthStateChange(
            (
                event,
                session
            ) => {

                JobsSystem.currentUser =
                    session?.user ||
                    null;

            }
        );
}

/* =========================================================
   GLOBAL API
========================================================= */

window.JobsSystem =
    JobsSystem;

window.Web3JobsJobs = {

    initializeJobs,

    loadAllJobs,

    renderAllJobs,

    searchJobs,

    searchJobsAdvanced,

    filterJobsByType,

    filterJobsByLocation,

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

function startJobsSystem() {

    initializeJobs()
        .then(
            function () {

                initializeJobsAuthListener();

            }
        );
}

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startJobsSystem
    );

} else {

    startJobsSystem();
}
