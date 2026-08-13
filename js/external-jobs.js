
"use strict";

/*
 * Web3Jobs v3
 * File: js/external-jobs.js
 *
 * External Jobs Aggregator
 * Step 1: Supabase connection test
 */

(function () {

    const ExternalJobs = {

        async testConnection() {

            try {

                if (!window.supabaseClient) {
                    console.error(
                        "Web3Jobs: Supabase client is not available."
                    );
                    return false;
                }

                const { data, error } = await window.supabaseClient
                    .from("external_jobs")
                    .select("id")
                    .limit(1);

                if (error) {
                    console.error(
                        "Web3Jobs: external_jobs error:",
                        error
                    );
                    return false;
                }

                console.log(
                    "Web3Jobs: external_jobs connection successful.",
                    data
                );

                return true;

            } catch (error) {

                console.error(
                    "Web3Jobs: External Jobs error:",
                    error
                );

                return false;
            }
        }

    };

    window.ExternalJobs = ExternalJobs;

})();
