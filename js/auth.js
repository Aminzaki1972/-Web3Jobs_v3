/* =========================================================
   Web3Jobs v3
   File: js/jobs.js
   Jobs Management System
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE
   ========================================================= */

const JOBS_SUPABASE_URL =
    "https://uewocyaspztybnvnkbmo.supabase.co";

const JOBS_SUPABASE_KEY =
    "sb_publishable_ap9UMOBhdHdIkW0WFD25nA_NurNviS0";

let jobsSupabase = null;

/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeJobsSupabase() {

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error(
            "Supabase library is not available."
        );

        return false;
    }

    try {

        jobsSupabase =
            window.supabase.createClient(
                JOBS_SUPABASE_URL,
                JOBS_SUPABASE_KEY
            );

        return true;

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

        return false;
    }
}

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
   HELPERS
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
   GET CURRENT USER
   ========================================================= */

async function jobsGetCurrentUser() {

    if (!jobsSupabase) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await jobsSupabase.auth.getUser();

        if (error) {

            console.error(
                "Unable to get user:",
                error
            );

            return null;
        }

        JobsSystem.currentUser =
            data?.user || null;

        return JobsSystem.currentUser;

    } catch (error) {

        console.error(
            "jobsGetCurrentUser error:",
            error
        );

        return null;
    }
}

/* =========================================================
   LOAD ALL JOBS
   ========================================================= */

async function loadAllJobs() {

    if (!jobsSupabase) {

        const initialized =
            initializeJobsSupabase();

        if (!initialized) {
            return [];
        }
    }

    try {

        const {
            data,
            error
        } = await jobsSupabase
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
                "Failed to load jobs:",
                error
            );

            showJobsError(
                "Unable to load jobs."
            );

            return [];
        }

        JobsSystem.jobs =
            data || [];

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        return JobsSystem.jobs;

    } catch (error) {

        console.error(
            "loadAllJobs error:",
            error
        );

        return [];
    }
}

/* =========================================================
   CREATE JOB CARD
   ========================================================= */

function createJobCard(job) {

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
            data-job-id="${jobsEscapeHTML(job.id)}"
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
                    data-job-id="${jobsEscapeHTML(job.id)}"
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

    const possibleContainers = [

        "#jobs-list",

        "#jobs-container",

        ".jobs-list",

        ".jobs-container",

        "[data-jobs-container]"

    ];

    let container = null;

    for (
        const selector
        of possibleContainers
    ) {

        const element =
            document.querySelector(
                selector
            );

        if (element) {

            container = element;

            break;
        }
    }

    if (!container) {

        console.warn(
            "Jobs container was not found."
        );

        return;
    }


    if (
        !jobs ||
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
   SEARCH
   ========================================================= */

function searchJobs(query = "") {

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

                    job.description

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
   FILTER BY TYPE
   ========================================================= */

function filterJobsByType(type) {

    if (!type) {

        JobsSystem.filteredJobs =
            [...JobsSystem.jobs];

        renderAllJobs();

        return;
    }


    const selectedType =
        String(type)
            .trim()
            .toLowerCase();


    JobsSystem.filteredJobs =
        JobsSystem.jobs.filter(
            job =>
                String(
                    job.type || ""
                )
                    .toLowerCase()
                    .includes(selectedType)
        );


    renderAllJobs();
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

        return;
    }


    const selectedLocation =
        String(location)
            .trim()
            .toLowerCase();


    JobsSystem.filteredJobs =
        JobsSystem.jobs.filter(
            job =>
                String(
                    job.location || ""
                )
                    .toLowerCase()
                    .includes(
                        selectedLocation
                    )
        );


    renderAllJobs();
}

/* =========================================================
   GET JOB BY ID
   ========================================================= */

function getJobById(jobId) {

    return JobsSystem.jobs.find(
        job =>
            String(job.id) ===
            String(jobId)
    );
}

/* =========================================================
   LOAD SINGLE JOB
   ========================================================= */

async function loadJobById(jobId) {

    if (!jobsSupabase) {

        const initialized =
            initializeJobsSupabase();

        if (!initialized) {
            return null;
        }
    }


    try {

        const {
            data,
            error
        } = await jobsSupabase
            .from("jobs")
            .select("*")
            .eq(
                "id",
                jobId
            )
            .maybeSingle();


        if (error) {

            console.error(
                "Unable to load job:",
                error
            );

            return null;
        }


        JobsSystem.currentJob =
            data || null;


        return JobsSystem.currentJob;

    } catch (error) {

        console.error(
            "loadJobById error:",
            error
        );

        return null;
    }
}

/* =========================================================
   SHOW JOB DETAILS
   ========================================================= */

function showJobDetails(job) {

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
                data-job-id="${jobsEscapeHTML(job.id)}"
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
            () =>
                applyForJob(
                    job.id
                )
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

async function applyForJob(jobId) {

    if (!jobsSupabase) {

        showJobsError(
            "Database connection is unavailable."
        );

        return;
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


        return;
    }


    try {

        /*
         * Prevent duplicate applications.
         */

        const {
            data: existing,
            error: checkError
        } = await jobsSupabase
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


        if (checkError) {

            console.warn(
                "Application check:",
                checkError
            );
        }


        if (existing) {

            showJobsMessage(
                "You have already applied for this job.",
                "warning"
            );

            return;
        }


        /*
         * Create application.
         */

        const {
            error
        } = await jobsSupabase
            .from("applications")
            .insert({

                job_id:
                    jobId,

                user_id:
                    user.id

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


            return;
        }


        showJobsMessage(
            "Application submitted successfully.",
            "success"
        );


        closeJobDetails();


    } catch (error) {

        console.error(
            "applyForJob error:",
            error
        );


        showJobsMessage(
            "An unexpected error occurred.",
            "error"
        );
    }
}

/* =========================================================
   CREATE JOB
   ========================================================= */

async function createJob(jobData) {

    if (!jobsSupabase) {

        const initialized =
            initializeJobsSupabase();

        if (!initialized) {
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


    if (!jobData.title) {

        showJobsMessage(
            "Job title is required.",
            "warning"
        );

        return null;
    }


    try {

        const {
            data,
            error
        } = await jobsSupabase
            .from("jobs")
            .insert({

                title:
                    jobData.title,

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
                    "",

                created_by:
                    user.id

            })
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


        showJobsMessage(
            "Job published successfully.",
            "success"
        );


        return data;


    } catch (error) {

        console.error(
            "createJob error:",
            error
        );


        return null;
    }
}

/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteJob(jobId) {

    if (!jobsSupabase) {
        return false;
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
        } = await jobsSupabase
            .from("jobs")
            .delete()
            .eq(
                "id",
                jobId
            )
            .eq(
                "created_by",
                user.id
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


        showJobsMessage(
            "Job deleted successfully.",
            "success"
        );


        return true;


    } catch (error) {

        console.error(
            "deleteJob error:",
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


            const job =
                getJobById(
                    jobId
                );


            if (job) {

                showJobDetails(
                    job
                );
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
                    "0 8px 25px rgba(0,0,0,.2)",

                fontSize: "14px"

            }
        );


        document.body.appendChild(
            box
        );
    }


    box.textContent =
        message;


    if (type === "success") {

        box.style.background =
            "#198754";

        box.style.color =
            "#fff";

    } else if (type === "error") {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#fff";

    } else if (type === "warning") {

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


function showJobsError(
    message
) {

    showJobsMessage(
        message,
        "error"
    );
}

/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeJobs() {

    if (JobsSystem.initialized) {
        return;
    }


    JobsSystem.initialized =
        true;


    const initialized =
        initializeJobsSupabase();


    if (!initialized) {

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
   GLOBAL API
   ========================================================= */

window.JobsSystem =
    JobsSystem;


window.Web3JobsJobs = {

    initializeJobs,

    loadAllJobs,

    renderAllJobs,

    searchJobs,

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

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeJobs
    );

} else {

    initializeJobs();
}
