/* =========================================================
   Web3Jobs v3
   File: js/app.js
   Main Application
   Unified Supabase Integration
   ---------------------------------------------------------
   IMPORTANT:
   - Uses ONLY the unified Supabase client.
   - NEVER creates another Supabase client.
   - NEVER logs users out while browsing jobs.
   - NEVER redirects users from the jobs system.
   - Compatible with js/jobs.js.
   - NEVER overwrites window.Web3JobsJobs if jobs.js exists.
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    function getClient() {

        /*
         * Preferred:
         * Unified client from js/supabase.js
         */

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
                    "Web3Jobs: Unable to get unified Supabase client:",
                    error
                );
            }
        }


        /*
         * Compatibility fallback.
         */

        if (
            window.supabaseClient &&
            window.supabaseClient.auth &&
            typeof window.supabaseClient.from === "function"
        ) {

            return window.supabaseClient;
        }


        console.error(
            "Web3Jobs: Supabase client is not available."
        );


        return null;
    }


    const supabaseClient =
        getClient();


    /* =====================================================
       APPLICATION OBJECT
       ===================================================== */

    window.Web3Jobs = {

        supabase:
            supabaseClient,

        supabaseUrl:
            window.Web3JobsSupabase
                ? (
                    window.Web3JobsSupabase.url ||
                    ""
                )
                : "",

        connected:
            !!supabaseClient,

        version:
            "3.0.4"

    };


    /* =====================================================
       GLOBAL STATE
       ===================================================== */

    if (
        !window.Web3JobsState ||
        typeof window.Web3JobsState !== "object"
    ) {

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

            currentJob:
                null,

            loading:
                false,

            initialized:
                false

        };

    } else {

        /*
         * Preserve existing state created by another module.
         */

        if (!Array.isArray(
            window.Web3JobsState.jobs
        )) {

            window.Web3JobsState.jobs =
                [];
        }


        if (!Array.isArray(
            window.Web3JobsState.filteredJobs
        )) {

            window.Web3JobsState.filteredJobs =
                [];
        }


        if (
            !Object.prototype.hasOwnProperty.call(
                window.Web3JobsState,
                "currentJob"
            )
        ) {

            window.Web3JobsState.currentJob =
                null;
        }

    }


    /* =====================================================
       NO SUPABASE
       ===================================================== */

    if (!supabaseClient) {

        window.Web3JobsState.initialized =
            false;


        console.error(
            "Web3Jobs: Supabase is not connected."
        );


        return;
    }


    /* =====================================================
       GLOBAL ALIASES
       ===================================================== */

    /*
     * Compatibility only.
     *
     * These references point to the SAME client.
     * No new client is created.
     */

    window.supabaseClient =
        supabaseClient;


    window.db =
        supabaseClient;


    /* =====================================================
       UTILITY FUNCTIONS
       ===================================================== */

    window.Web3JobsUtils = {

        /* ---------------------------------------------
           Escape HTML
           --------------------------------------------- */

        escapeHTML:
            function (value) {

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
            },


        /* ---------------------------------------------
           Escape Attribute
           --------------------------------------------- */

        escapeAttribute:
            function (value) {

                return this.escapeHTML(
                    value
                );
            },


        /* ---------------------------------------------
           String
           --------------------------------------------- */

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


        /* ---------------------------------------------
           Format Date
           --------------------------------------------- */

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

                        year:
                            "numeric",

                        month:
                            "short",

                        day:
                            "numeric"

                    }
                );
            },


        /* ---------------------------------------------
           Time Ago
           --------------------------------------------- */

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


        /* ---------------------------------------------
           Show Message
           --------------------------------------------- */

        showMessage:
            function (
                message,
                type = "info"
            ) {

                console.log(
                    `[Web3Jobs:${type}]`,
                    message
                );


                /*
                 * jobs.js has a visual message system.
                 *
                 * Use it if available.
                 */

                if (
                    typeof window.showMessage ===
                    "function"
                ) {

                    try {

                        window.showMessage(
                            message,
                            type
                        );

                    } catch (error) {

                        console.warn(
                            "Web3Jobs: showMessage compatibility error:",
                            error
                        );
                    }
                }

            }

    };


    /* =====================================================
       AUTHENTICATION API
       ===================================================== */

    window.Web3JobsAuth = {

        /* ---------------------------------------------
           Get Session
           --------------------------------------------- */

        getSession:
            async function () {

                try {

                    /*
                     * Prefer unified Supabase helper.
                     */

                    if (
                        window.Web3JobsSupabase &&
                        typeof window.Web3JobsSupabase.getSession ===
                        "function"
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


        /* ---------------------------------------------
           Get User
           --------------------------------------------- */

        getUser:
            async function () {

                try {

                    if (
                        window.Web3JobsSupabase &&
                        typeof window.Web3JobsSupabase.getUser ===
                        "function"
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


        /* ---------------------------------------------
           Sign Out
           --------------------------------------------- */

        signOut:
            async function () {

                try {

                    let success =
                        false;


                    if (
                        window.Web3JobsSupabase &&
                        typeof window.Web3JobsSupabase.signOut ===
                        "function"
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

                            success:
                                false,

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

                        success:
                            true,

                        error:
                            null

                    };

                } catch (error) {

                    console.error(
                        "Web3Jobs sign out error:",
                        error
                    );


                    return {

                        success:
                            false,

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

        /* ---------------------------------------------
           Get Profile
           --------------------------------------------- */

        get:
            async function (userId) {

                if (!userId) {

                    return {

                        data:
                            null,

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

                        data:
                            null,

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Update Profile
           --------------------------------------------- */

        update:
            async function (
                userId,
                updates
            ) {

                if (!userId) {

                    return {

                        data:
                            null,

                        error:
                            new Error(
                                "User ID is required."
                            )

                    };
                }


                try {

                    const payload = {

                        ...(updates || {}),

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

                        data:
                            null,

                        error:
                            error

                    };
                }
            }

    };


    /* =====================================================
       JOBS API
       ===================================================== */

    /*
     * This API remains available for compatibility.
     *
     * IMPORTANT:
     * The actual Jobs UI is controlled by jobs.js.
     *
     * We do NOT redefine window.Web3JobsJobs here.
     */

    window.Web3JobsAPI = {

        /* ---------------------------------------------
           Get Jobs
           --------------------------------------------- */

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

                            data:
                                [],

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


                    /*
                     * Synchronize jobs.js state if available.
                     */

                    if (
                        window.Web3JobsJobs &&
                        typeof window.Web3JobsJobs.syncJobsState ===
                        "function"
                    ) {

                        window.Web3JobsJobs.syncJobsState();
                    }


                    window.dispatchEvent(
                        new CustomEvent(
                            "web3jobs:jobs-updated",
                            {

                                detail: {

                                    jobs:
                                        jobs,

                                    count:
                                        jobs.length

                                }

                            }
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

                        data:
                            [],

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Get Single Job
           --------------------------------------------- */

        getJob:
            async function (jobId) {

                if (!jobId) {

                    return {

                        data:
                            null,

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

                        data:
                            null,

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Create Job
           --------------------------------------------- */

        createJob:
            async function (jobData) {

                if (!jobData) {

                    return {

                        data:
                            null,

                        error:
                            new Error(
                                "Job data is required."
                            )

                    };
                }


                try {

                    const {
                        data:
                            userData,
                        error:
                            userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data:
                                null,

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


                    /*
                     * Refresh jobs.js after successful creation.
                     */

                    if (
                        !error &&
                        window.Web3JobsJobs &&
                        typeof window.Web3JobsJobs.refreshJobs ===
                        "function"
                    ) {

                        await window.Web3JobsJobs
                            .refreshJobs();
                    }


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

                        data:
                            null,

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Search Jobs
           --------------------------------------------- */

        searchJobs:
            async function ({
                keyword = "",
                location = "",
                type = ""
            } = {}) {

                /*
                 * If jobs.js is available,
                 * use its local filtering system.
                 *
                 * This avoids a second database request.
                 */

                if (
                    window.Web3JobsJobs
                ) {

                    if (
                        typeof window.Web3JobsJobs.searchJobs ===
                        "function"
                    ) {

                        const filtered =
                            window.Web3JobsJobs
                                .searchJobs(
                                    keyword
                                );


                        if (
                            typeof window.Web3JobsJobs
                                .filterJobsByLocation ===
                            "function" &&
                            location
                        ) {

                            window.Web3JobsJobs
                                .filterJobsByLocation(
                                    location
                                );
                        }


                        if (
                            typeof window.Web3JobsJobs
                                .filterJobsByType ===
                            "function" &&
                            type
                        ) {

                            window.Web3JobsJobs
                                .filterJobsByType(
                                    type
                                );
                        }


                        return {

                            data:
                                Array.isArray(
                                    window.Web3JobsState
                                        .filteredJobs
                                )
                                    ? window.Web3JobsState
                                        .filteredJobs
                                    : (
                                        Array.isArray(
                                            filtered
                                        )
                                            ? filtered
                                            : []
                                    ),

                            error:
                                null

                        };
                    }
                }


                /*
                 * Fallback for pages where jobs.js
                 * has not loaded yet.
                 */

                const result =
                    await this.getJobs({
                        limit:
                            200
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

                                job.id,
                                job.title,
                                job.company,
                                job.company_name,
                                job.description,
                                job.skills,
                                job.salary

                            ]
                                .filter(
                                    value =>
                                        value !==
                                            null &&
                                        value !==
                                            undefined
                                )
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

        /* ---------------------------------------------
           Apply
           --------------------------------------------- */

        apply:
            async function ({
                jobId,
                coverLetter = ""
            } = {}) {

                if (!jobId) {

                    return {

                        data:
                            null,

                        error:
                            new Error(
                                "Job ID is required."
                            )

                    };
                }


                try {

                    const {
                        data:
                            userData,
                        error:
                            userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data:
                                null,

                            error:
                                userError ||
                                new Error(
                                    "Authentication required."
                                )

                        };
                    }


                    const user =
                        userData.user;


                    /*
                     * IMPORTANT:
                     *
                     * jobs.js uses user_id.
                     * Keep this API compatible with
                     * the current jobs.js schema.
                     */

                    const payload = {

                        job_id:
                            jobId,

                        user_id:
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

                        data:
                            null,

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Get My Applications
           --------------------------------------------- */

        getMyApplications:
            async function () {

                try {

                    const {
                        data:
                            userData,
                        error:
                            userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data:
                                [],

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
                                "user_id",
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

                        data:
                            [],

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

        /* ---------------------------------------------
           Save
           --------------------------------------------- */

        save:
            async function (jobId) {

                if (!jobId) {

                    return {

                        data:
                            null,

                        error:
                            new Error(
                                "Job ID is required."
                            )

                    };
                }


                try {

                    const {
                        data:
                            userData,
                        error:
                            userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data:
                                null,

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

                        data:
                            null,

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Remove
           --------------------------------------------- */

        remove:
            async function (jobId) {

                if (!jobId) {

                    return {

                        data:
                            null,

                        error:
                            new Error(
                                "Job ID is required."
                            )

                    };
                }


                try {

                    const {
                        data:
                            userData,
                        error:
                            userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data:
                                [],

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

                        data:
                            [],

                        error:
                            error

                    };
                }
            },


        /* ---------------------------------------------
           Get Mine
           --------------------------------------------- */

        getMine:
            async function () {

                try {

                    const {
                        data:
                            userData,
                        error:
                            userError
                    } =
                        await supabaseClient
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !userData?.user
                    ) {

                        return {

                            data:
                                [],

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

                        data:
                            [],

                        error:
                            error

                    };
                }
            }

    };


    /* =====================================================
       JOBS CONTAINER COMPATIBILITY
       ===================================================== */

    function getJobsContainer() {

        /*
         * Prefer jobs.js implementation if available.
         */

        if (
            window.Web3JobsJobs &&
            typeof window.Web3JobsJobs.getJobsContainer ===
            "function"
        ) {

            try {

                const container =
                    window.Web3JobsJobs
                        .getJobsContainer();

                if (container) {
                    return container;
                }

            } catch (error) {

                console.warn(
                    "Web3Jobs: jobs.js container lookup failed:",
                    error
                );
            }
        }


        return (

            document.querySelector(
                "[data-jobs-container]"
            )

            ||

            document.querySelector(
                "[data-jobs-list]"
            )

            ||

            document.getElementById(
                "jobs-list"
            )

            ||

            document.getElementById(
                "jobs-container"
            )

            ||

            document.querySelector(
                ".jobs-list"
            )

            ||

            document.querySelector(
                ".jobs-container"
            )

        );
    }


    /*
     * Public compatibility function.
     */

    window.Web3JobsGetJobsContainer =
        getJobsContainer;


    /* =====================================================
       DO NOT OVERWRITE JOBS.JS
       ===================================================== */

    /*
     * VERY IMPORTANT:
     *
     * jobs.js owns window.Web3JobsJobs.
     *
     * app.js must NEVER do:
     *
     * window.Web3JobsJobs = {...}
     *
     * because that would destroy:
     *
     * - initializeJobs
     * - loadAllJobs
     * - loadJobs
     * - searchJobs
     * - filterJobsByType
     * - filterJobsByLocation
     * - showJobDetails
     * - applyForJob
     * - createJob
     * - deleteJob
     * - etc.
     *
     * If jobs.js is loaded, we use it.
     */


    function getJobsModule() {

        if (
            window.Web3JobsJobs &&
            typeof window.Web3JobsJobs === "object"
        ) {

            return window.Web3JobsJobs;
        }


        return null;
    }


    /* =====================================================
       JOBS STATE SYNC
       ===================================================== */

    function syncJobsState() {

        const jobsModule =
            getJobsModule();


        if (
            jobsModule &&
            typeof jobsModule.syncJobsState ===
            "function"
        ) {

            try {

                const result =
                    jobsModule.syncJobsState();


                if (
                    result &&
                    Array.isArray(result.jobs)
                ) {

                    window.Web3JobsState.jobs =
                        result.jobs;
                }


                if (
                    result &&
                    Array.isArray(result.filteredJobs)
                ) {

                    window.Web3JobsState.filteredJobs =
                        result.filteredJobs;
                }


                if (
                    result &&
                    Object.prototype.hasOwnProperty.call(
                        result,
                        "currentJob"
                    )
                ) {

                    window.Web3JobsState.currentJob =
                        result.currentJob;
                }


                if (
                    result &&
                    Object.prototype.hasOwnProperty.call(
                        result,
                        "currentUser"
                    )
                ) {

                    window.Web3JobsState.currentUser =
                        result.currentUser;
                }


                return result;

            } catch (error) {

                console.warn(
                    "Web3Jobs: Jobs state synchronization failed:",
                    error
                );
            }
        }


        /*
         * Fallback synchronization.
         */

        const jobs =
            Array.isArray(
                window.Web3JobsState.jobs
            )
                ? window.Web3JobsState.jobs
                : [];


        const filteredJobs =
            Array.isArray(
                window.Web3JobsState.filteredJobs
            )
                ? window.Web3JobsState.filteredJobs
                : jobs;


        return {

            jobs:
                jobs,

            filteredJobs:
                filteredJobs,

            currentJob:
                window.Web3JobsState.currentJob ||
                null,

            currentUser:
                window.Web3JobsState.currentUser ||
                null

        };
    }


    window.Web3JobsSyncJobsState =
        syncJobsState;


    /* =====================================================
       LEGACY JOBS SYSTEM COMPATIBILITY
       ===================================================== */

    /*
     * If jobs.js is already loaded,
     * keep its JobsSystem.
     *
     * If it is not loaded yet,
     * create only a lightweight compatibility object.
     */

    if (
        !window.JobsSystem ||
        typeof window.JobsSystem !== "object"
    ) {

        window.JobsSystem = {

            jobs:
                window.Web3JobsState.jobs,

            filteredJobs:
                window.Web3JobsState.filteredJobs,

            currentJob:
                window.Web3JobsState.currentJob ||
                null,

            currentUser:
                window.Web3JobsState.currentUser ||
                null

        };

    }


    function syncLegacyJobsSystem() {

        if (
            !window.JobsSystem
        ) {
            return;
        }


        /*
         * Do not replace arrays unnecessarily.
         */

        window.JobsSystem.jobs =
            window.Web3JobsState.jobs;


        window.JobsSystem.filteredJobs =
            window.Web3JobsState.filteredJobs;


        window.JobsSystem.currentJob =
            window.Web3JobsState.currentJob ||
            null;


        window.JobsSystem.currentUser =
            window.Web3JobsState.currentUser ||
            null;
    }


    window.addEventListener(
        "web3jobs:jobs-updated",
        function () {

            syncJobsState();

            syncLegacyJobsSystem();

        }
    );


    window.addEventListener(
        "web3jobs:jobs-loaded",
        function () {

            syncJobsState();

            syncLegacyJobsSystem();

        }
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


                syncLegacyJobsSystem();


                return null;
            }


            const user =
                session.user;


            window.Web3JobsState.currentUser =
                user;


            /*
             * Keep jobs.js user state synchronized.
             */

            if (
                window.JobsSystem
            ) {

                window.JobsSystem.currentUser =
                    user;
            }


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

    /*
     * One listener only.
     *
     * It updates application state.
     *
     * It does NOT redirect.
     * It does NOT sign the user out.
     */

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
                 * Synchronize jobs.js state.
                 */

                if (
                    window.JobsSystem
                ) {

                    window.JobsSystem.currentUser =
                        user;
                }


                /*
                 * Only clear profile when the user
                 * actually signs out.
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
       LOAD JOBS THROUGH JOBS.JS
       ===================================================== */

    async function loadJobsThroughJobsSystem() {

        const jobsModule =
            getJobsModule();


        /*
         * Preferred path:
         * jobs.js owns the complete jobs system.
         */

        if (
            jobsModule &&
            typeof jobsModule.loadAllJobs ===
            "function"
        ) {

            try {

                const result =
                    await jobsModule
                        .loadAllJobs();


                syncJobsState();

                syncLegacyJobsSystem();


                return result;

            } catch (error) {

                console.error(
                    "Web3Jobs: jobs.js loadAllJobs failed:",
                    error
                );


                return [];
            }
        }


        /*
         * Compatibility fallback.
         */

        if (
            jobsModule &&
            typeof jobsModule.loadJobs ===
            "function"
        ) {

            try {

                const result =
                    await jobsModule
                        .loadJobs();


                syncJobsState();

                syncLegacyJobsSystem();


                return result;

            } catch (error) {

                console.error(
                    "Web3Jobs: jobs.js loadJobs failed:",
                    error
                );


                return [];
            }
        }


        /*
         * If jobs.js has not loaded yet,
         * use the API temporarily.
         */

        const result =
            await window.Web3JobsAPI
                .getJobs();


        if (
            result &&
            Array.isArray(result.data)
        ) {

            window.Web3JobsState.jobs =
                result.data;


            window.Web3JobsState.filteredJobs =
                result.data;
        }


        syncLegacyJobsSystem();


        return result?.data || [];
    }


    /* =====================================================
       APPLICATION INITIALIZATION
       ===================================================== */

    async function initializeApp() {

        console.log(
            "===================================="
        );


        console.log(
            "Web3Jobs v3.0.4"
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
         * Test database connection.
         */

        const connection =
            await testSupabaseConnection();


        if (!connection) {

            console.error(
                "Web3Jobs: Database connection unavailable."
            );


            return;
        }


        /*
         * Initialize current user.
         *
         * No redirect.
         */

        await initializeUser();


        /*
         * IMPORTANT:
         *
         * Do NOT create or replace
         * window.Web3JobsJobs here.
         *
         * jobs.js owns that object.
         */


        const jobsContainer =
            getJobsContainer();


        if (jobsContainer) {

            await loadJobsThroughJobsSystem();

        } else {

            console.log(
                "Web3Jobs: No jobs container on this page."
            );
        }


        syncJobsState();

        syncLegacyJobsSystem();


        window.Web3JobsState.initialized =
            true;


        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:app-ready",
                {

                    detail: {

                        version:
                            "3.0.4",

                        supabase:
                            supabaseClient,

                        connected:
                            true,

                        jobsModule:
                            !!getJobsModule()

                    }

                }
            )
        );


        /*
         * Keep the historical ready event.
         */

        window.dispatchEvent(
            new CustomEvent(
                "web3jobs:ready",
                {

                    detail: {

                        version:
                            "3.0.4",

                        supabase:
                            supabaseClient,

                        connected:
                            true,

                        jobsModule:
                            !!getJobsModule()

                    }

                }
            )
        );


        console.log(
            "Web3Jobs initialized successfully."
        );


        console.log(
            "Jobs module:",
            getJobsModule()
                ? "Available"
                : "Not loaded"
        );


        console.log(
            "===================================="
        );
    }


    /* =====================================================
       EVENTS FROM JOBS.JS
       ===================================================== */

    window.addEventListener(
        "web3jobs:ready",
        function (event) {

            /*
             * If jobs.js announces readiness,
             * synchronize its state.
             */

            syncJobsState();

            syncLegacyJobsSystem();


            console.log(
                "Web3Jobs: Jobs module ready.",
                event?.detail || {}
            );
        }
    );


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
                once:
                    true
            }
        );

    } else {

        initializeApp();

    }


})();
