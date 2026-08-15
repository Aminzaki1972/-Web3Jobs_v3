/* =========================================================
   Web3Jobs Company Dashboard
   Subscription + USDT Payment
   BNB Smart Chain
   Plans: Free / $2 / $5 / $10
   ========================================================= */

"use strict";

(function () {

    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const CONFIG = {

        chainId: "0x38",

        chainName: "BNB Smart Chain",

        nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18
        },

        rpcUrl:
            "https://bsc-dataseed.binance.org/",

        blockExplorer:
            "https://bscscan.com",

        /*
         * Web3Jobs payment receiving wallet
         *
         * IMPORTANT:
         * Never put a private key or seed phrase here.
         */

        paymentWallet:
            "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

        /*
         * USDT on BNB Smart Chain
         */

        usdtContract:
            "0x55d398326f99059fF775485246999027B3197955",

        usdtDecimals: 18

    };


    /* =====================================================
       PLANS
       ===================================================== */

    const PLANS = {

        free: {

            code: "free",

            name: "Free",

            price: 0,

            limit: 2,

            durationDays: 30

        },

        starter: {

            code: "starter",

            name: "Starter",

            price: 2,

            limit: 5,

            durationDays: 30

        },

        professional: {

            code: "professional",

            name: "Professional",

            price: 5,

            limit: 20,

            durationDays: 30

        },

        enterprise: {

            code: "enterprise",

            name: "Enterprise",

            price: 10,

            limit: Infinity,

            durationDays: 30

        }

    };


    /* =====================================================
       USDT ABI
       ===================================================== */

    const USDT_ABI = [

        "function balanceOf(address owner) view returns (uint256)",

        "function transfer(address to, uint256 amount) returns (bool)"

    ];


    /* =====================================================
       STATE
       ===================================================== */

    let client = null;

    let currentUser = null;

    let currentProfile = null;

    let currentCompany = null;

    let currentPlan = PLANS.free;

    let jobs = [];

    let applications = [];

    let paymentInProgress = false;


    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    function getClient() {

        if (client) {

            return client;

        }


        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {

            client =
                window.supabaseClient;

            return client;

        }


        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {

            client =
                window.supabase;

            return client;

        }


        return null;

    }


    /* =====================================================
       ALERT
       ===================================================== */

    function alertBox(
        message,
        type = "success"
    ) {

        const element =
            document.getElementById(
                "dashboard-alert"
            );


        if (!element) {

            if (type === "error") {

                console.error(message);

            } else {

                console.log(message);

            }

            return;

        }


        element.textContent =
            message;

        element.className =
            type;

        element.style.display =
            "block";


        clearTimeout(
            alertBox.timer
        );


        alertBox.timer =
            setTimeout(
                function () {

                    element.style.display =
                        "none";

                },
                7000
            );

    }


    window.showDashboardAlert =
        alertBox;


    /* =====================================================
       NORMALIZE PLAN
       ===================================================== */

    function normalizePlan(
        code
    ) {

        const normalized =
            String(
                code || "free"
            )
            .trim()
            .toLowerCase();


        return (
            PLANS[normalized] ||
            PLANS.free
        );

    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value ?? ""
        )

            .replaceAll(
                "&",
                "&amp;"
            )

            .replaceAll(
                "<",
                "&lt;"
            )

            .replaceAll(
                ">",
                "&gt;"
            )

            .replaceAll(
                '"',
                "&quot;"
            )

            .replaceAll(
                "'",
                "&#039;"
            );

    }


    /* =====================================================
       GET CURRENT USER
       ===================================================== */

    async function getUser() {

        const sb =
            getClient();


        if (
            !sb ||
            !sb.auth
        ) {

            throw new Error(
                "Supabase connection is not initialized."
            );

        }


        const {
            data,
            error
        } =
            await sb.auth.getUser();


        if (error) {

            throw error;

        }


        currentUser =
            data?.user || null;


        if (!currentUser) {

            window.location.href =
                "login.html";

            return null;

        }


        return currentUser;

    }


    /* =====================================================
       LOAD PROFILE
       ===================================================== */

    async function loadProfile() {

        const sb =
            getClient();


        if (
            !sb ||
            !currentUser
        ) {

            return;

        }


        const {
            data,
            error
        } =
            await sb

                .from("profiles")

                .select("*")

                .eq(
                    "id",
                    currentUser.id
                )

                .maybeSingle();


        if (
            error &&
            error.code !== "PGRST116"
        ) {

            console.warn(
                "Profile load:",
                error
            );

            return;

        }


        currentProfile =
            data || null;


        updateCompanyNameUI();

    }


    /* =====================================================
       LOAD COMPANY PROFILE
       ===================================================== */

    async function loadCompanyProfile() {

        const sb =
            getClient();


        if (
            !sb ||
            !currentUser
        ) {

            return;

        }


        const {
            data,
            error
        } =
            await sb

                .from("company_profiles")

                .select("*")

                .eq(
                    "id",
                    currentUser.id
                )

                .maybeSingle();


        if (!error) {

            currentCompany =
                data || null;

        }


        updateCompanyNameUI();

    }


    /* =====================================================
       GET COMPANY NAME
       ===================================================== */

    function getCompanyName() {

        return (

            currentCompany?.company_name ||

            currentCompany?.name ||

            currentProfile?.company_name ||

            currentProfile?.name ||

            currentProfile?.full_name ||

            currentUser?.user_metadata?.company_name ||

            currentUser?.user_metadata?.name ||

            currentUser?.email?.split("@")[0] ||

            "Company"

        );

    }


    /* =====================================================
       UPDATE COMPANY NAME UI
       ===================================================== */

    function updateCompanyNameUI() {

        const companyName =
            getCompanyName();


        const companyInput =
            document.getElementById(
                "job-company"
            );


        const sidebarName =
            document.getElementById(
                "sidebar-company-name"
            );


        if (
            companyInput &&
            !companyInput.value
        ) {

            companyInput.value =
                companyName;

        }


        if (sidebarName) {

            sidebarName.textContent =
                companyName;

        }

    }


    /* =====================================================
       LOAD SUBSCRIPTION
       ===================================================== */

    async function loadSubscription() {

        const sb =
            getClient();


        if (
            !sb ||
            !currentUser
        ) {

            return;

        }


        try {

            const {
                data,
                error
            } =
                await sb

                    .from("company_plans")

                    .select("*")

                    .eq(
                        "company_id",
                        currentUser.id
                    )

                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )

                    .limit(1)

                    .maybeSingle();


            if (error) {

                console.warn(
                    "Subscription load:",
                    error
                );

                currentPlan =
                    PLANS.free;

                updatePlanUI();

                return;

            }


            if (data) {

                const code =
                    data.plan_code ||
                    data.plan ||
                    data.code ||
                    "free";


                const expires =
                    data.expires_at ||
                    data.expiration_date;


                if (
                    !expires ||
                    new Date(expires) >
                    new Date()
                ) {

                    currentPlan =
                        normalizePlan(
                            code
                        );

                } else {

                    currentPlan =
                        PLANS.free;

                }

            } else {

                currentPlan =
                    PLANS.free;

            }

        } catch (error) {

            console.warn(
                "Subscription table unavailable:",
                error
            );

            currentPlan =
                PLANS.free;

        }


        updatePlanUI();

    }


    /* =====================================================
       SAVE PLAN
       ===================================================== */

    async function savePlan(
        planCode,
        paymentData = {}
    ) {

        const sb =
            getClient();


        if (
            !sb ||
            !currentUser
        ) {

            throw new Error(
                "Supabase connection is not initialized."
            );

        }


        const plan =
            normalizePlan(
                planCode
            );


        const expiresAt =
            new Date(
                Date.now() +
                plan.durationDays *
                86400000
            ).toISOString();


        const payload = {

            company_id:
                currentUser.id,

            plan_code:
                plan.code,

            expires_at:
                expiresAt,

            updated_at:
                new Date().toISOString()

        };


        if (paymentData.txHash) {

            payload.tx_hash =
                paymentData.txHash;

        }


        if (paymentData.wallet) {

            payload.wallet_address =
                paymentData.wallet;

        }


        const {
            error
        } =
            await sb

                .from("company_plans")

                .upsert(
                    payload,
                    {
                        onConflict:
                            "company_id"
                    }
                );


        if (error) {

            console.error(
                "Saving company plan failed:",
                error
            );

            throw error;

        }


        currentPlan =
            plan;


        updatePlanUI();

    }


    /* =====================================================
       UPDATE PLAN UI
       ===================================================== */

    function updatePlanUI() {

        document

            .querySelectorAll(
                ".plan-button"
            )

            .forEach(
                function (button) {

                    button.classList.toggle(

                        "active",

                        button.dataset.plan ===
                        currentPlan.code

                    );

                }
            );


        const note =
            document.getElementById(
                "publish-note"
            );


        if (!note) {

            return;

        }


        const limit =
            currentPlan.limit === Infinity
                ? "Unlimited"
                : currentPlan.limit;


        note.textContent =
            `Current plan: ${currentPlan.name} — ${limit} job${limit === 1 ? "" : "s"} / month.`;

    }


    /* =====================================================
       LOAD JOBS
       ===================================================== */

    async function loadJobs() {

        const sb =
            getClient();


        const list =
            document.getElementById(
                "company-jobs-list"
            );


        if (
            !sb ||
            !currentUser ||
            !list
        ) {

            return;

        }


        const {
            data,
            error
        } =
            await sb

                .from("jobs")

                .select("*")

                .eq(
                    "company_id",
                    currentUser.id
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Company jobs query:",
                error
            );


            list.innerHTML = `

                <div class="empty-state">

                    Unable to load your jobs.
                    Please check the jobs table and RLS policies.

                </div>

            `;


            return;

        }


        jobs =
            data || [];


        renderJobs();

    }


    /* =====================================================
       RENDER JOBS
       ===================================================== */

    function renderJobs() {

        const list =
            document.getElementById(
                "company-jobs-list"
            );


        if (!list) {

            return;

        }


        if (!jobs.length) {

            list.innerHTML = `

                <div class="empty-state">

                    You have not published any jobs yet.

                </div>

            `;


            return;

        }


        list.innerHTML =

            jobs

                .map(
                    function (job) {

                        const description =
                            String(
                                job.description ||
                                ""
                            );


                        const safeDescription =
                            escapeHTML(

                                description.length > 500

                                    ? description.slice(
                                        0,
                                        500
                                    ) + "…"

                                    : description

                            );


                        const applyLink =
                            job.apply_link
                                ? `

                                    <a
                                        class="small-button"
                                        href="${escapeHTML(
                                            job.apply_link
                                        )}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View Apply Link
                                    </a>

                                  `
                                : "";


                        return `

                            <article class="job-card">

                                <div class="job-card-header">

                                    <div>

                                        <div class="job-title">

                                            ${escapeHTML(
                                                job.title ||
                                                "Untitled Job"
                                            )}

                                        </div>


                                        <div class="job-meta">

                                            <span>

                                                ${escapeHTML(
                                                    job.company ||
                                                    "Company"
                                                )}

                                            </span>


                                            <span>

                                                ${escapeHTML(
                                                    job.location ||
                                                    "Remote"
                                                )}

                                            </span>


                                            <span>

                                                ${escapeHTML(
                                                    job.type ||
                                                    "Full-time"
                                                )}

                                            </span>

                                        </div>

                                    </div>


                                    <div class="job-actions">

                                        ${applyLink}


                                        <button
                                            class="small-button delete"
                                            type="button"
                                            data-delete-job="${escapeHTML(
                                                job.id
                                            )}"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>


                                <div class="job-description">

                                    ${safeDescription}

                                </div>

                            </article>

                        `;

                    }
                )

                .join("");


        list

            .querySelectorAll(
                "[data-delete-job]"
            )

            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            deleteJob(
                                button.dataset.deleteJob
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       DELETE JOB
       ===================================================== */

    async function deleteJob(
        id
    ) {

        if (
            !id ||
            !currentUser
        ) {

            return;

        }


        if (
            !window.confirm(
                "Delete this job?"
            )
        ) {

            return;

        }


        const sb =
            getClient();


        if (!sb) {

            alertBox(
                "Supabase is not available.",
                "error"
            );

            return;

        }


        const {
            error
        } =
            await sb

                .from("jobs")

                .delete()

                .eq(
                    "id",
                    id
                )

                .eq(
                    "company_id",
                    currentUser.id
                );


        if (error) {

            console.error(
                "Delete job:",
                error
            );


            alertBox(
                "Unable to delete the job. Check your database policy.",
                "error"
            );


            return;

        }


        alertBox(
            "Job deleted successfully."
        );


        await loadJobs();

    }


    /* =====================================================
       ADD JOB
       ===================================================== */

    async function addJob(
        form
    ) {

        if (!currentUser) {

            throw new Error(
                "You are not signed in."
            );

        }


        if (
            currentPlan.limit !== Infinity &&
            jobs.length >= currentPlan.limit
        ) {

            throw new Error(

                `Your ${currentPlan.name} plan allows ${currentPlan.limit} job postings. Please upgrade your plan.`

            );

        }


        const formData =
            new FormData(
                form
            );


        const payload = {

            title:
                String(
                    formData.get("title") ||
                    ""
                ).trim(),

            company:
                String(
                    formData.get("company") ||
                    ""
                ).trim(),

            location:
                String(
                    formData.get("location") ||
                    ""
                ).trim(),

            type:
                String(
                    formData.get("type") ||
                    "Full-time"
                ).trim(),

            apply_link:
                String(
                    formData.get("apply_link") ||
                    ""
                ).trim(),

            description:
                String(
                    formData.get("description") ||
                    ""
                ).trim(),

            company_id:
                currentUser.id

        };


        if (
            !payload.title ||
            !payload.company ||
            !payload.apply_link ||
            !payload.description
        ) {

            throw new Error(
                "Please complete all required fields."
            );

        }


        const sb =
            getClient();


        if (!sb) {

            throw new Error(
                "Supabase connection is not initialized."
            );

        }


        const {
            error
        } =
            await sb

                .from("jobs")

                .insert(
                    payload
                );


        if (error) {

            throw error;

        }


        form.reset();


        updateCompanyNameUI();


        alertBox(
            "Job published successfully."
        );


        await loadJobs();

    }


    /* =====================================================
       LOAD APPLICATIONS
       ===================================================== */

    async function loadApplications() {

        const sb =
            getClient();


        const body =
            document.getElementById(
                "applications-table-body"
            );


        if (
            !sb ||
            !currentUser ||
            !body
        ) {

            return;

        }


        const {
            data,
            error
        } =
            await sb

                .from("applications")

                .select(
                    "*, jobs(title, company_id)"
                )

                .eq(
                    "jobs.company_id",
                    currentUser.id
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.warn(
                "Applications query:",
                error
            );


            body.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        class="empty-state"
                    >

                        Applications are currently unavailable.

                    </td>

                </tr>

            `;


            return;

        }


        applications =
            data || [];


        if (!applications.length) {

            body.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        class="empty-state"
                    >

                        No applications yet.

                    </td>

                </tr>

            `;


            return;

        }


        body.innerHTML =

            applications

                .map(
                    function (application) {

                        const status =
                            String(
                                application.status ||
                                "pending"
                            )
                            .toLowerCase();


                        const statusClass =

                            [
                                "pending",
                                "approved",
                                "rejected"
                            ]
                            .includes(status)

                                ? status

                                : "pending";


                        return `

                            <tr>

                                <td>

                                    ${escapeHTML(
                                        application.candidate_name ||
                                        application.name ||
                                        application.email ||
                                        application.user_id ||
                                        "Candidate"
                                    )}

                                </td>


                                <td>

                                    ${escapeHTML(
                                        application.jobs?.title ||
                                        application.job_title ||
                                        "Job"
                                    )}

                                </td>


                                <td>

                                    <span
                                        class="status ${statusClass}"
                                    >

                                        ${escapeHTML(
                                            status
                                        )}

                                    </span>

                                </td>


                                <td>

                                    ${escapeHTML(

                                        application.created_at

                                            ? new Date(
                                                application.created_at
                                            ).toLocaleDateString()

                                            : "—"

                                    )}

                                </td>

                            </tr>

                        `;

                    }
                )

                .join("");

    }


    /* =====================================================
       VALIDATE PAYMENT WALLET
       ===================================================== */

    function validatePaymentWallet() {

        const wallet =
            CONFIG.paymentWallet;


        if (
            !wallet ||
            !/^0x[a-fA-F0-9]{40}$/.test(
                wallet
            )
        ) {

            throw new Error(
                "The Web3Jobs payment wallet address is invalid."
            );

        }


        return wallet;

    }


    /* =====================================================
       CHECK WALLET
       ===================================================== */

    async function connectWallet() {

        if (!window.ethereum) {

            throw new Error(

                "MetaMask is not installed. Please install MetaMask and try again."

            );

        }


        const accounts =
            await window.ethereum.request({

                method:
                    "eth_requestAccounts"

            });


        if (
            !accounts ||
            !accounts.length
        ) {

            throw new Error(
                "No wallet account was connected."
            );

        }


        return accounts[0];

    }


    /* =====================================================
       SWITCH TO BSC
       ===================================================== */

    async function switchToBSC() {

        if (!window.ethereum) {

            throw new Error(
                "MetaMask or another compatible Web3 wallet is required."
            );

        }


        try {

            await window.ethereum.request({

                method:
                    "wallet_switchEthereumChain",

                params: [

                    {
                        chainId:
                            CONFIG.chainId
                    }

                ]

            });

        } catch (error) {

            if (
                error.code !== 4902
            ) {

                throw error;

            }


            await window.ethereum.request({

                method:
                    "wallet_addEthereumChain",

                params: [

                    {

                        chainId:
                            CONFIG.chainId,

                        chainName:
                            CONFIG.chainName,

                        nativeCurrency:
                            CONFIG.nativeCurrency,

                        rpcUrls: [
                            CONFIG.rpcUrl
                        ],

                        blockExplorerUrls: [
                            CONFIG.blockExplorer
                        ]

                    }

                ]

            });

        }

    }


    /* =====================================================
       GET ETHERS
       ===================================================== */

    function getEthers() {

        if (
            window.ethers &&
            typeof window.ethers.BrowserProvider ===
            "function"
        ) {

            return window.ethers;

        }


        throw new Error(

            "Ethers.js is not loaded. Add the ethers.js script before company-dashboard.js."

        );

    }


    /* =====================================================
       PAY USDT
       ===================================================== */

    async function payUSDT(
        plan
    ) {

        if (paymentInProgress) {

            throw new Error(
                "A payment is already in progress."
            );

        }


        paymentInProgress =
            true;


        try {

            /* =============================================
               FREE
               ============================================= */

            if (
                plan.price <= 0
            ) {

                await savePlan(
                    plan.code
                );


                alertBox(
                    "Free plan activated successfully."
                );


                return;

            }


            /* =============================================
               WALLET
               ============================================= */

            if (!window.ethereum) {

                throw new Error(

                    "MetaMask is not installed. Please install MetaMask to subscribe."

                );

            }


            /* =============================================
               VALIDATE RECEIVING WALLET
               ============================================= */

            const receivingWallet =
                validatePaymentWallet();


            /* =============================================
               ETHERS
               ============================================= */

            const ethers =
                getEthers();


            /* =============================================
               CONNECT WALLET
               ============================================= */

            alertBox(
                "Connecting to your wallet..."
            );


            const connectedWallet =
                await connectWallet();


            /* =============================================
               BSC
               ============================================= */

            await switchToBSC();


            /* =============================================
               PROVIDER
               ============================================= */

            const provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );


            /* =============================================
               NETWORK CHECK
               ============================================= */

            const network =
                await provider.getNetwork();


            if (
                network.chainId !==
                56n
            ) {

                throw new Error(
                    "Please switch MetaMask to BNB Smart Chain."
                );

            }


            /* =============================================
               SIGNER
               ============================================= */

            const signer =
                await provider.getSigner();


            const wallet =
                await signer.getAddress();


            /* =============================================
               VERIFY CONNECTED WALLET
               ============================================= */

            if (
                wallet.toLowerCase() !==
                connectedWallet.toLowerCase()
            ) {

                throw new Error(
                    "Wallet account changed. Please reconnect and try again."
                );

            }


            /* =============================================
               USDT CONTRACT
               ============================================= */

            const token =
                new ethers.Contract(

                    CONFIG.usdtContract,

                    USDT_ABI,

                    signer

                );


            /* =============================================
               AMOUNT
               ============================================= */

            const amount =
                ethers.parseUnits(

                    String(
                        plan.price
                    ),

                    CONFIG.usdtDecimals

                );


            /* =============================================
               BALANCE
               ============================================= */

            alertBox(
                "Checking your USDT balance..."
            );


            const balance =
                await token.balanceOf(
                    wallet
                );


            if (
                balance < amount
            ) {

                throw new Error(

                    `Insufficient USDT balance. You need ${plan.price} USDT.`

                );

            }


            /* =============================================
               PAYMENT
               ============================================= */

            alertBox(

                `Please confirm the ${plan.name} payment of ${plan.price} USDT in MetaMask.`

            );


            const transaction =
                await token.transfer(

                    receivingWallet,

                    amount

                );


            alertBox(

                "Payment submitted. Waiting for blockchain confirmation..."

            );


            /* =============================================
               WAIT
               ============================================= */

            const receipt =
                await transaction.wait();


            if (
                !receipt ||
                receipt.status !== 1
            ) {

                throw new Error(

                    "The USDT transaction was not confirmed successfully."

                );

            }


            /* =============================================
               SAVE SUBSCRIPTION
               ============================================= */

            try {

                await savePlan(

                    plan.code,

                    {

                        txHash:
                            receipt.hash,

                        wallet:
                            wallet

                    }

                );

            } catch (saveError) {

                console.error(
                    "Subscription save error:",
                    saveError
                );


                alertBox(

                    `Payment confirmed on BNB Smart Chain, but the subscription could not be saved to the database. Transaction: ${receipt.hash}`,

                    "error"

                );


                throw saveError;

            }


            /* =============================================
               SUCCESS
               ============================================= */

            alertBox(

                `${plan.name} activated successfully for 30 days. Payment: ${plan.price} USDT.`

            );


        } finally {

            paymentInProgress =
                false;

        }

    }


    /* =====================================================
       PLAN SELECTION
       ===================================================== */

    async function handlePlanSelection(
        planCode
    ) {

        try {

            const plan =
                normalizePlan(
                    planCode
                );


            await payUSDT(
                plan
            );

        } catch (error) {

            console.error(
                "Plan payment error:",
                error
            );


            if (
                error?.code ===
                4001
            ) {

                alertBox(

                    "The wallet transaction was cancelled.",

                    "error"

                );

                return;

            }


            alertBox(

                error?.message ||
                "Unable to complete the subscription.",

                "error"

            );

        }

    }


    /* =====================================================
       EXPOSE PAYMENT FUNCTIONS
       ===================================================== */

    window.handlePlanSelection =
        handlePlanSelection;


    window.selectPlan =
        handlePlanSelection;


    window.connectPaymentWallet =
        async function () {

            try {

                const wallet =
                    await connectWallet();


                await switchToBSC();


                alertBox(

                    `Wallet connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`

                );

                return wallet;

            } catch (error) {

                console.error(
                    "Wallet connection error:",
                    error
                );


                alertBox(

                    error?.message ||
                    "Unable to connect wallet.",

                    "error"

                );

                return null;

            }

        };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        try {

            getClient();


            if (!getClient()) {

                throw new Error(
                    "Supabase connection is not initialized."
                );

            }


            const user =
                await getUser();


            if (!user) {

                return;

            }


            await loadProfile();

            await loadCompanyProfile();

            await loadSubscription();

            await loadJobs();

            await loadApplications();


            /* =============================================
               POST JOB FORM
               ============================================= */

            const form =
                document.getElementById(
                    "post-job-form"
                );


            if (form) {

                form.addEventListener(

                    "submit",

                    async function (event) {

                        event.preventDefault();


                        const button =
                            document.getElementById(
                                "publish-job-button"
                            );


                        const oldText =
                            button
                                ? button.textContent
                                : "Publish Job";


                        if (button) {

                            button.disabled =
                                true;

                            button.textContent =
                                "Publishing...";

                        }


                        try {

                            await addJob(
                                form
                            );

                        } catch (error) {

                            console.error(
                                "Add job:",
                                error
                            );


                            alertBox(

                                error?.message ||
                                "Unable to publish the job.",

                                "error"

                            );

                        } finally {

                            if (button) {

                                button.disabled =
                                    false;

                                button.textContent =
                                    oldText;

                            }

                        }

                    }

                );

            }


            /* =============================================
               SHOW DASHBOARD
               ============================================= */

            const loader =
                document.getElementById(
                    "loading-spinner"
                );


            const dashboard =
                document.getElementById(
                    "dashboard-content"
                );


            if (loader) {

                loader.style.display =
                    "none";

            }


            if (dashboard) {

                dashboard.style.display =
                    "block";

            }

        } catch (error) {

            console.error(

                "Company dashboard initialization error:",

                error

            );


            const loader =
                document.getElementById(
                    "loading-spinner"
                );


            if (loader) {

                loader.innerHTML = `

                    <div class="loading-card">

                        <div class="loading-logo">
                            W3
                        </div>

                        <h2>
                            Unable to load dashboard
                        </h2>

                        <p>

                            ${escapeHTML(
                                error?.message ||
                                "An unexpected error occurred."
                            )}

                        </p>


                        <button
                            type="button"
                            onclick="location.reload()"
                            style="
                                margin-top:20px;
                                padding:10px 16px;
                                border:0;
                                border-radius:9px;
                                background:#1c765a;
                                color:white;
                                cursor:pointer;
                            "
                        >

                            Try Again

                        </button>

                    </div>

                `;

            }

        }

    }


    /* =====================================================
       DOM READY
       ===================================================== */

    document.addEventListener(

        "DOMContentLoaded",

        init

    );


})();
