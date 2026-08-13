/* =========================================================
   Web3Jobs v3
   File: js/greenhouse-sync.js

   Greenhouse Jobs Synchronization
   Current company: Coinbase

   Flow:
   Greenhouse API
        ↓
   Fetch Coinbase jobs
        ↓
   Supabase jobs table
        ↓
   Insert new / Update existing
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const CONFIG = {

        greenhouseBoardToken: "coinbase",

        greenhouseUrl:
            "https://boards-api.greenhouse.io/v1/boards/coinbase/jobs?content=true",

        source: "greenhouse",

        companyName: "Coinbase"

    };


    /* =====================================================
       HELPERS
       ===================================================== */

    function cleanText(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    }


    function stripHtml(html) {

        if (!html) {
            return "";
        }

        const temporary = document.createElement("div");

        temporary.innerHTML = html;

        return temporary.textContent ||
               temporary.innerText ||
               "";
    }


    function getJobType(job) {

        const title = cleanText(job.title).toLowerCase();

        const description =
            stripHtml(job.content || "").toLowerCase();

        const text =
            title + " " + description;


        if (
            text.includes("intern") ||
            text.includes("internship")
        ) {
            return "Internship";
        }


        if (
            text.includes("contract")
        ) {
            return "Contract";
        }


        if (
            text.includes("part-time") ||
            text.includes("part time")
        ) {
            return "Part Time";
        }


        if (
            text.includes("freelance")
        ) {
            return "Freelance";
        }


        if (
            text.includes("remote")
        ) {
            return "Remote";
        }


        return "Full Time";
    }


    function getPublishedDate(job) {

        return (
            job.first_published ||
            job.updated_at ||
            new Date().toISOString()
        );
    }


    function getLocation(job) {

        if (
            job.location &&
            job.location.name
        ) {
            return cleanText(
                job.location.name
            );
        }

        return "Remote";
    }


    function getApplyUrl(job) {

        return cleanText(
            job.absolute_url
        );
    }


    /* =====================================================
       FETCH GREENHOUSE JOBS
       ===================================================== */

    async function fetchGreenhouseJobs() {

        const response =
            await fetch(
                CONFIG.greenhouseUrl,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "Greenhouse API error: " +
                response.status
            );
        }


        const data =
            await response.json();


        if (
            !data ||
            !Array.isArray(data.jobs)
        ) {

            throw new Error(
                "Invalid Greenhouse API response."
            );
        }


        return data.jobs;
    }


    /* =====================================================
       CONVERT GREENHOUSE JOB
       ===================================================== */

    function convertJob(job) {

        const description =
            stripHtml(
                job.content || ""
            );


        const location =
            getLocation(job);


        const applyUrl =
            getApplyUrl(job);


        return {

            title:
                cleanText(job.title),

            company:
                CONFIG.companyName,

            location:
                location,

            type:
                getJobType(job),

            description:
                description,

            skills:
                "",

            salary:
                "",

            application_url:
                applyUrl,

            apply_link:
                applyUrl,

            company_id:
                null,

            source:
                CONFIG.source,

            source_job_id:
                String(job.id),

            source_url:
                applyUrl,

            source_updated_at:
                job.updated_at ||
                null,

            published_at:
                getPublishedDate(job),

            is_featured:
                false

        };
    }


    /* =====================================================
       UPSERT JOBS
       ===================================================== */

    async function syncJobs() {

        if (
            !window.supabaseClient
        ) {

            throw new Error(
                "Supabase client is not initialized."
            );
        }


        console.log(
            "Web3Jobs: Starting Greenhouse sync..."
        );


        const greenhouseJobs =
            await fetchGreenhouseJobs();


        console.log(
            "Greenhouse jobs received:",
            greenhouseJobs.length
        );


        if (
            greenhouseJobs.length === 0
        ) {

            return {

                success: true,

                total: 0,

                inserted: 0,

                updated: 0

            };
        }


        let inserted = 0;

        let updated = 0;


        for (
            const greenhouseJob
            of greenhouseJobs
        ) {

            try {

                const job =
                    convertJob(
                        greenhouseJob
                    );


                if (
                    !job.source_job_id
                ) {
                    continue;
                }


                /* =================================================
                   CHECK EXISTING JOB
                   ================================================= */

                const {
                    data: existingJob,
                    error: lookupError
                } =
                    await window.supabaseClient

                        .from("jobs")

                        .select(
                            "id, source_job_id"
                        )

                        .eq(
                            "source",
                            CONFIG.source
                        )

                        .eq(
                            "source_job_id",
                            job.source_job_id
                        )

                        .maybeSingle();


                if (lookupError) {

                    console.error(
                        "Lookup error:",
                        lookupError
                    );

                    continue;
                }


                /* =================================================
                   UPDATE EXISTING
                   ================================================= */

                if (existingJob) {

                    const {
                        error: updateError
                    } =
                        await window.supabaseClient

                            .from("jobs")

                            .update({

                                title:
                                    job.title,

                                company:
                                    job.company,

                                location:
                                    job.location,

                                type:
                                    job.type,

                                description:
                                    job.description,

                                application_url:
                                    job.application_url,

                                apply_link:
                                    job.apply_link,

                                source_url:
                                    job.source_url,

                                source_updated_at:
                                    job.source_updated_at,

                                published_at:
                                    job.published_at,

                                updated_at:
                                    new Date()
                                        .toISOString()

                            })

                            .eq(
                                "id",
                                existingJob.id
                            );


                    if (updateError) {

                        console.error(
                            "Update error:",
                            updateError
                        );

                        continue;
                    }


                    updated++;

                    console.log(
                        "Updated:",
                        job.title
                    );

                }


                /* =================================================
                   INSERT NEW
                   ================================================= */

                else {

                    const {
                        error: insertError
                    } =
                        await window.supabaseClient

                            .from("jobs")

                            .insert(
                                job
                            );


                    if (insertError) {

                        console.error(
                            "Insert error:",
                            insertError
                        );

                        continue;
                    }


                    inserted++;

                    console.log(
                        "Inserted:",
                        job.title
                    );
                }

            }

            catch (error) {

                console.error(
                    "Job synchronization error:",
                    error
                );

            }

        }


        console.log(
            "================================"
        );

        console.log(
            "Greenhouse Sync Completed"
        );

        console.log(
            "Total:",
            greenhouseJobs.length
        );

        console.log(
            "Inserted:",
            inserted
        );

        console.log(
            "Updated:",
            updated
        );

        console.log(
            "================================"
        );


        return {

            success: true,

            total:
                greenhouseJobs.length,

            inserted:
                inserted,

            updated:
                updated

        };
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.Web3JobsGreenhouse = {

        syncJobs:
            syncJobs,

        fetchJobs:
            fetchGreenhouseJobs,

        convertJob:
            convertJob

    };


    console.log(
        "Web3Jobs Greenhouse Sync loaded."
    );

})();
