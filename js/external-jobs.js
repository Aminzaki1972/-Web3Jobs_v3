"use strict";

/*
 * =========================================================
 * Web3Jobs v3
 * File: js/external-jobs.js
 *
 * External Jobs Aggregator
 * Step 1: Supabase connection test
 * =========================================================
 */

(function () {

    const ExternalJobs = {

        async testConnection() {

            try {

                const client =
                    window.supabaseClient;

                if (
                    !client ||
                    typeof client.from !== "function"
                ) {

                    console.error(
                        "Web3Jobs: Supabase client is not available."
                    );

                    return false;
                }


                const {
                    data,
                    error
                } =
                    await client
                        .from("external_jobs")
                        .select("id, title, source")
                        .limit(5);


                if (error) {

                    console.error(
                        "Web3Jobs: external_jobs error:",
                        error
                    );

                    return false;
                }


                console.log(
                    "Web3Jobs: external_jobs connection successful."
                );

                console.log(
                    "Web3Jobs: external jobs:",
                    data
                );


                return true;

            } catch (error) {

                console.error(
                    "Web3Jobs: External Jobs exception:",
                    error
                );

                return false;
            }
        }

    };


    /*
     * Expose ExternalJobs globally.
     */

    window.ExternalJobs =
        ExternalJobs;


})();
