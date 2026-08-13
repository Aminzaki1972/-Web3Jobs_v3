/* =========================================================
   Web3Jobs v3
   File: js/app.js
   Main Application
   Uses the unified Supabase client from js/supabase.js
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    function getClient() {

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            return window.Web3JobsSupabase.getClient();
        }

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        console.error(
            "Web3Jobs: Supabase client is not available."
        );

        return null;
    }


    const supabaseClient = getClient();


    /* =====================================================
       APPLICATION OBJECT
       ===================================================== */

    window.Web3Jobs = {

        supabase:
            supabaseClient,

        supabaseUrl:
            window.Web3JobsSupabase
                ? window.Web3JobsSupabase.url
                : "",

        connected:
            !!supabaseClient,

        version:
            "3.0.1"

    };


    if (!supabaseClient) {

        window.Web3JobsState = {

            currentUser: null,
            session: null,
            profile: null,
            accountType: null,
            jobs: [],
            filteredJobs: [],
            loading: false,
            initialized: false

        };

        return;
    }


    /* =====================================================
       GLOBAL ALIASES
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

        session:
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
            false,

        initialized:
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


        escapeAttribute:
            function (value) {

                return this.escapeHTML(value);
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
       AUTHENTICATION API
       ===================================================== */

    window.Web3JobsAuth = {

        getSession:
            async function () {

                try {

                    if (
                        window.Web3JobsSupabase &&
                        typeof window.Web3JobsSupabase.getSession === "function"
                    ) {

                        return await window.Web3JobsSupabase
                            .getSession();
                    }


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .auth
                            .getSession();


                    if (error) {

                        console.error(
                            "Web3Jobs session error:",
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

                    if (
                        window.Web3JobsSupabase &&
                        typeof window.Web3JobsSupabase.getUser === "function"
                    ) {

                        return await window.Web3JobsSupabase
                            .getUser();
                    }


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (error) {

                        console.error(
                            "Web3Jobs getUser error:",
                            error
                        );

                        return null;
                    }


                    return (
                        data?.user ||
                        null
                    );

                } catch (error) {

                    console.error(
                        "Web3Jobs getUser exception:",
                        error
                    );

                    return null;
                }
            },


        signOut:
            async function () {

                try {

                    let success = false;


                    if (
                        window.Web3JobsSupabase &&
                        typeof window.Web3JobsSupabase.signOut === "function"
                    ) {

                        success =
                            await window.Web3JobsSupabase
                                .signOut();

                    } else {

                        const {
                            error
                        } =
                            await supabaseClient
                                .auth
                                .signOut();

                        success =
                            !error;
                    }


                    if (!success) {

                        return {
                            success: false,
                            error:
                                new Error(
                                    "Sign out failed."
                                )
                        };
                    }


                    window.Web3JobsState.currentUser =
                        null;

                    window.Web3JobsState.session =
                        null;

                    window.Web3JobsState.profile =
                        null;

                    window.Web3JobsState.accountType =
                        null;


                    return {

                        success: true,

                        error: null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs sign out error:",
                        error
                    );

                    return {

                        success: false,

                        error:
                            error

                    };
                }
            }

    };


    /* =====================================================
       PROFILE API
       ===================================================== */

    window.Web3JobsProfile = {

        get:
            async function (userId) {

                if (!userId) {

                    return {

                        data: null,

                        error:
                            new Error(
                                "User ID is required."
                            )

                    };
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

                        console.error(
                            "Web3Jobs profile error:",
                            error
                        );
                    }


                    if (data) {

                        window.Web3JobsState.profile =
                            data;


                        window.Web3JobsState.accountType =
                            data.account_type ||
                            data.role ||
                            null;
                    }


                    return {

                        data:
                            data || null,

                        error:
                            error || null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs profile exception:",
                        error
                    );

                    return {

                        data: null,

                        error:
                            error

                    };
                }
            },


        update:
            async function (
                userId,
                updates
            ) {

                if (!userId) {

                    return {

                        data: null,

                        error:
                            new Error(
                                "User ID is required."
                            )

                    };
                }


                try {

                    const payload = {

                        ...updates,

                        updated_at:
                            new Date().toISOString()

                    };


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("profiles")
                            .update(payload)
                            .eq(
                                "id",
                                userId
                            )
                            .select()
                            .maybeSingle();


                    if (error) {

                        console.error(
                            "Web3Jobs profile update error:",
                            error
                        );
                    }


                    if (data) {

                        window.Web3JobsState.profile =
                            data;


                        window.Web3JobsState.accountType =
                            data.account_type ||
                            data.role ||
                            null;
                    }


                    return {

                        data:
                            data || null,

                        error:
                            error || null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs profile update exception:",
                        error
                    );

                    return {

                        data: null,

                        error:
                            error

                    };
                }
            }

    };


    /* =====================================================
       JOBS API
       ===================================================== */

    window.Web3JobsAPI = {

        getJobs:
            async function (options = {}) {

                const limit =
                    Number(options.limit) > 0
                        ? Number(options.limit)
                        : 100;


                const order =
                    options.order ||
                    "created_at";


                const ascending =
                    options.ascending === true;


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
                            "Web3Jobs jobs error:",
                            error
                        );

                        return {

                            data: [],

                            error:
                                error

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
                            "web3jobs:jobs-updated"
                        )
                    );


                    return {

                        data:
                            jobs,

                        error:
                            null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs getJobs exception:",
                        error
                    );

                    return {

                        data: [],

                        error:
                            error

                    };
                }
            },


        getJob:
            async function (jobId) {

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

                        data:
                            data || null,

                        error:
                            error || null

                    };

                } catch (error) {

                    return {

                        data: null,

                        error:
                            error

                    };
                }
            },


        createJob:
            async function (jobData) {

                if (!jobData) {

                    return {

                        data: null,

                        error:
                            new Error(
                                "Job data is required."
                            )

                    };
                }


                try {

                    const {
                        data: userData,
                        error: userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data: null,

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const user =
                        userData.user;


                    const payload = {

                        ...jobData,

                        company_id:
                            jobData.company_id ||
                            user.id

                    };


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("jobs")
                            .insert(payload)
                            .select()
                            .single();


                    return {

                        data:
                            data || null,

                        error:
                            error || null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs createJob error:",
                        error
                    );

                    return {

                        data: null,

                        error:
                            error

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


                window.Web3JobsState.filteredJobs =
                    filtered;


                window.dispatchEvent(
                    new CustomEvent(
                        "web3jobs:jobs-updated"
                    )
                );


                return {

                    data:
                        filtered,

                    error:
                        null

                };

            }

    };


    /* =====================================================
       APPLICATIONS API
       ===================================================== */

    window.Web3JobsApplications = {

        apply:
            async function ({
                jobId,
                coverLetter = ""
            } = {}) {


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
                        data: userData,
                        error: userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data: null,

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const user =
                        userData.user;


                    const payload = {

                        job_id:
                            jobId,

                        applicant_id:
                            user.id,

                        cover_letter:
                            coverLetter,

                        status:
                            "pending"

                    };


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("applications")
                            .insert(payload)
                            .select()
                            .single();


                    return {

                        data:
                            data || null,

                        error:
                            error || null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs application error:",
                        error
                    );

                    return {

                        data: null,

                        error:
                            error

                    };
                }
            },


        getMyApplications:
            async function () {

                try {

                    const {
                        data: userData,
                        error: userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data: [],

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const user =
                        userData.user;


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("applications")
                            .select("*")
                            .eq(
                                "applicant_id",
                                user.id
                            )
                            .order(
                                "created_at",
                                {
                                    ascending:
                                        false
                                }
                            );


                    return {

                        data:
                            Array.isArray(data)
                                ? data
                                : [],

                        error:
                            error || null

                    };

                } catch (error) {

                    return {

                        data: [],

                        error:
                            error

                    };
                }
            }

    };


    /* =====================================================
       SAVED JOBS API
       ===================================================== */

    window.Web3JobsSavedJobs = {

        save:
            async function (jobId) {

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
                        data: userData,
                        error: userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data: null,

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("saved_jobs")
                            .insert({

                                job_id:
                                    jobId,

                                user_id:
                                    userData.user.id

                            })
                            .select()
                            .single();


                    return {

                        data:
                            data || null,

                        error:
                            error || null

                    };

                } catch (error) {

                    return {

                        data: null,

                        error:
                            error

                    };
                }
            },


        remove:
            async function (jobId) {

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
                        data: userData,
                        error: userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data: [],

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("saved_jobs")
                            .delete()
                            .eq(
                                "job_id",
                                jobId
                            )
                            .eq(
                                "user_id",
                                userData.user.id
                            )
                            .select();


                    return {

                        data:
                            data || [],

                        error:
                            error || null

                    };

                } catch (error) {

                    return {

                        data: [],

                        error:
                            error

                    };
                }
            },


        getMine:
            async function () {

                try {

                    const {
                        data: userData,
                        error: userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data: [],

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .from("saved_jobs")
                            .select("*")
                            .eq(
                                "user_id",
                                userData.user.id
                            )
                            .order(
                                "created_at",
                                {
                                    ascending:
                                        false
                                }
                            );


                    return {

                        data:
                            Array.isArray(data)
                                ? data
                                : [],

                        error:
                            error || null

                    };

                } catch (error) {

                    return {

                        data: [],

                        error:
                            error

                    };
                }
            }

    };


    /* =====================================================
       JOBS CONTAINER
       ===================================================== */

    function getJobsContainer() {

        return (

            document.querySelector(
                "[data-jobs-container]"
            )

            ||

            document.getElementById(
                "jobs-list"
            )

        );

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
                        String(
                            job.id
                        );


                    return `

                        <article
                            class="job-card"
                            data-job-id="${window.Web3JobsUtils.escapeAttribute(id)}"
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
                                    href="job.html?id=${encodeURIComponent(id)}"
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
       JOBS GLOBAL OBJECT
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
       COMPATIBILITY
       ===================================================== */

    window.JobsSystem = {

        jobs:
            window.Web3JobsState.jobs,

        filteredJobs:
            window.Web3JobsState.filteredJobs

    };


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
       INITIALIZE CURRENT USER
       ===================================================== */

    async function initializeUser() {

        try {

            const session =
                await window.Web3JobsAuth
                    .getSession();


            window.Web3JobsState.session =
                session;


            if (!session?.user) {

                window.Web3JobsState.currentUser =
                    null;

                window.Web3JobsState.profile =
                    null;

                window.Web3JobsState.accountType =
                    null;

                return null;
            }


            const user =
                session.user;


            window.Web3JobsState.currentUser =
                user;


            const profileResult =
                await window.Web3JobsProfile
                    .get(
                        user.id
                    );


            return {

                user:
                    user,

                profile:
                    profileResult.data

            };

        } catch (error) {

            console.error(
                "Web3Jobs user initialization error:",
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


                window.Web3JobsState.session =
                    session ||
                    null;


                window.Web3JobsState.currentUser =
                    user;


                /*
                 * لا نمسح profile أثناء انتقال
                 * الجلسة إلا عند تسجيل الخروج فعليًا.
                 */

                if (
                    !user &&
                    event === "SIGNED_OUT"
                ) {

                    window.Web3JobsState.profile =
                        null;

                    window.Web3JobsState.accountType =
                        null;
                }


                window.dispatchEvent(
                    new CustomEvent(
                        "web3jobs:auth",
                        {

                            detail: {

                                event:
                                    event,

                                session:
                                    session,

                                user:
                                    user

                            }

                        }
                    )
                );

            }
        );


    /* =====================================================
       CONNECTION TEST
       ===================================================== */

    async function testSupabaseConnection() {

        try {

            const {
                error
            } =
                await supabaseClient
                    .from("jobs")
                    .select("id")
                    .limit(1);


            if (error) {

                console.error(
                    "Web3Jobs: Supabase connection test failed:",
                    error
                );

                return false;
            }


            console.log(
                "Web3Jobs: Supabase connection successful."
            );


            return true;

        } catch (error) {

            console.error(
                "Web3Jobs: Supabase connection test error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       APPLICATION INITIALIZATION
       ===================================================== */

    async function initializeApp() {

        console.log(
            "===================================="
        );

        console.log(
            "Web3Jobs v3.0.1"
        );

        console.log(
            "Initializing application..."
        );


        if (!supabaseClient) {

            console.error(
                "Web3Jobs: Supabase is not connected."
            );

            return;
        }


        /*
         * مهم:
         * لا نعيد إنشاء Supabase Client هنا.
         * نستخدم العميل الموحد من supabase.js.
         */


        const connection =
            await testSupabaseConnection();


        if (!connection) {

            console.error(
                "Web3Jobs: Database connection unavailable."
            );

            return;
        }


        await initializeUser();


        if (
            getJobsContainer()
        ) {

            await window.Web3JobsJobs
                .loadJobs();

            syncJobsState();
        }


        window.Web3JobsState.initialized =
            true;


        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:ready",
                {

                    detail: {

                        version:
                            "3.0.1",

                        supabase:
                            supabaseClient,

                        connected:
                            true

                    }

                }
            )
        );


        console.log(
            "Web3Jobs initialized successfully."
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
            initializeApp,
            {
                once: true
            }
        );

    } else {

        initializeApp();

    }


})();
