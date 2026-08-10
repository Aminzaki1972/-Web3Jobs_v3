<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <meta
        name="description"
        content="Web3Jobs Company Dashboard"
    >

    <meta
        name="theme-color"
        content="#06101d"
    >

    <title>Company Dashboard - Web3Jobs</title>


    <!-- =====================================================
         SUPABASE
         ===================================================== -->

    <script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
    ></script>

    <script src="js/supabase.js"></script>

    <script src="js/auth.js"></script>

    <script src="js/company-dashboard.js"></script>


    <!-- =====================================================
         DASHBOARD STYLE
         ===================================================== -->

    <style>

        :root {

            --bg:
                #06101d;

            --bg-secondary:
                #09182a;

            --card:
                #0d1b2e;

            --card-hover:
                #10233a;

            --border:
                #1d3553;

            --border-light:
                #294563;

            --text:
                #f5f8ff;

            --muted:
                #9db0c8;

            --green:
                #6ee7b7;

            --blue:
                #60a5fa;

            --red:
                #f87171;

            --yellow:
                #fbbf24;

            --max-width:
                1200px;

        }


        * {

            box-sizing:
                border-box;

            margin:
                0;

            padding:
                0;

        }


        html {

            scroll-behavior:
                smooth;

        }


        body {

            min-height:
                100vh;

            background:
                linear-gradient(
                    180deg,
                    var(--bg),
                    var(--bg-secondary)
                );

            color:
                var(--text);

            font-family:
                Inter,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Arial,
                sans-serif;

            line-height:
                1.5;

        }


        button,
        input,
        select,
        textarea {

            font:
                inherit;

        }


        button {

            cursor:
                pointer;

        }


        a {

            color:
                inherit;

            text-decoration:
                none;

        }


        /* =====================================================
           LOADING
           ===================================================== */

        #loading-spinner {

            position:
                fixed;

            inset:
                0;

            z-index:
                99999;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            padding:
                20px;

            background:
                var(--bg);

        }


        .loading-card {

            width:
                min(
                    100%,
                    420px
                );

            padding:
                35px;

            text-align:
                center;

            background:
                var(--card);

            border:
                1px solid var(--border);

            border-radius:
                18px;

            box-shadow:
                0 20px 60px
                rgba(0, 0, 0, .25);

        }


        .loading-logo {

            width:
                58px;

            height:
                58px;

            margin:
                0 auto 20px;

            display:
                grid;

            place-items:
                center;

            border:
                1px solid var(--border-light);

            border-radius:
                15px;

            background:
                #071423;

            font-size:
                25px;

        }


        .loading-card h2 {

            margin-bottom:
                8px;

            font-size:
                20px;

        }


        .loading-card p {

            color:
                var(--muted);

            font-size:
                13px;

        }


        .loading-spinner-circle {

            width:
                34px;

            height:
                34px;

            margin:
                20px auto 0;

            border:
                3px solid
                #19304a;

            border-top-color:
                var(--green);

            border-radius:
                50%;

            animation:
                spin .8s linear infinite;

        }


        @keyframes spin {

            to {

                transform:
                    rotate(360deg);

            }

        }


        /* =====================================================
           DASHBOARD
           ===================================================== */

        #dashboard-content {

            display:
                none;

            min-height:
                100vh;

        }


        .container {

            width:
                min(
                    var(--max-width),
                    92%
                );

            margin:
                0 auto;

        }


        /* =====================================================
           HEADER
           ===================================================== */

        .dashboard-header {

            position:
                sticky;

            top:
                0;

            z-index:
                1000;

            border-bottom:
                1px solid var(--border);

            background:
                rgba(
                    6,
                    16,
                    29,
                    .96
                );

            backdrop-filter:
                blur(15px);

        }


        .header-inner {

            min-height:
                72px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            gap:
                20px;

        }


        .brand {

            display:
                flex;

            align-items:
                center;

            gap:
                11px;

            min-width:
                0;

        }


        .brand-icon {

            width:
                43px;

            height:
                43px;

            display:
                grid;

            place-items:
                center;

            flex:
                0 0 43px;

            border:
                1px solid var(--border-light);

            border-radius:
                11px;

            background:
                #0b1d31;

            color:
                var(--green);

            font-size:
                20px;

            font-weight:
                900;

        }


        .brand-text {

            min-width:
                0;

        }


        .brand-title {

            font-size:
                16px;

            font-weight:
                850;

        }


        .brand-subtitle {

            color:
                var(--muted);

            font-size:
                10px;

        }


        .header-actions {

            display:
                flex;

            align-items:
                center;

            gap:
                9px;

        }


        .header-button {

            display:
                inline-flex;

            align-items:
                center;

            justify-content:
                center;

            min-height:
                40px;

            padding:
                9px 14px;

            border:
                1px solid var(--border-light);

            border-radius:
                9px;

            background:
                #10233a;

            color:
                var(--text);

            font-size:
                12px;

            font-weight:
                750;

            transition:
                .2s;

        }


        .header-button:hover {

            transform:
                translateY(-1px);

            border-color:
                var(--blue);

        }


        .logout-button {

            border-color:
                rgba(
                    248,
                    113,
                    113,
                    .3
                );

            color:
                #fecaca;

        }


        .logout-button:hover {

            border-color:
                var(--red);

            background:
                rgba(
                    248,
                    113,
                    113,
                    .08
                );

        }


        /* =====================================================
           MAIN
           ===================================================== */

        .dashboard-main {

            padding:
                45px 0 80px;

        }


        /* =====================================================
           WELCOME
           ===================================================== */

        .welcome-card {

            position:
                relative;

            overflow:
                hidden;

            padding:
                32px;

            margin-bottom:
                24px;

            border:
                1px solid var(--border);

            border-radius:
                20px;

            background:
                linear-gradient(
                    135deg,
                    #0e2035,
                    #0b192b
                );

        }


        .welcome-card::after {

            content:
                "";

            position:
                absolute;

            width:
                260px;

            height:
                260px;

            right:
                -100px;

            top:
                -100px;

            border-radius:
                50%;

            background:
                radial-gradient(
                    circle,
                    rgba(
                        110,
                        231,
                        183,
                        .12
                    ),
                    transparent 70%
                );

            pointer-events:
                none;

        }


        .welcome-label {

            display:
                inline-flex;

            align-items:
                center;

            gap:
                7px;

            margin-bottom:
                12px;

            color:
                var(--green);

            font-size:
                11px;

            font-weight:
                850;

            letter-spacing:
                1px;

        }


        .welcome-card h1 {

            margin-bottom:
                7px;

            font-size:
                clamp(
                    27px,
                    5vw,
                    40px
                );

            line-height:
                1.15;

        }


        .welcome-card p {

            color:
                var(--muted);

            font-size:
                13px;

        }


        #company-email {

            color:
                #c7d7e9;

        }


        /* =====================================================
           STATS
           ===================================================== */

        .stats-grid {

            display:
                grid;

            grid-template-columns:
                repeat(
                    3,
                    1fr
                );

            gap:
                16px;

            margin-bottom:
                24px;

        }


        .stat-card {

            padding:
                23px;

            border:
                1px solid var(--border);

            border-radius:
                16px;

            background:
                var(--card);

        }


        .stat-top {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            gap:
                10px;

            margin-bottom:
                15px;

        }


        .stat-label {

            color:
                var(--muted);

            font-size:
                11px;

            font-weight:
                700;

        }


        .stat-icon {

            width:
                36px;

            height:
                36px;

            display:
                grid;

            place-items:
                center;

            border:
                1px solid var(--border-light);

            border-radius:
                10px;

            background:
                #122a43;

        }


        .stat-value {

            font-size:
                30px;

            font-weight:
                900;

        }


        /* =====================================================
           SECTION
           ===================================================== */

        .dashboard-section {

            margin-bottom:
                25px;

            padding:
                25px;

            border:
                1px solid var(--border);

            border-radius:
                18px;

            background:
                var(--card);

        }


        .section-header {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            gap:
                15px;

            margin-bottom:
                22px;

        }


        .section-title {

            font-size:
                21px;

            font-weight:
                850;

        }


        .section-description {

            margin-top:
                4px;

            color:
                var(--muted);

            font-size:
                11px;

        }


        /* =====================================================
           FORM
           ===================================================== */

        #create-job-form {

            display:
                grid;

            grid-template-columns:
                repeat(
                    2,
                    1fr
                );

            gap:
                15px;

        }


        .form-group {

            display:
                flex;

            flex-direction:
                column;

            gap:
                7px;

        }


        .form-group.full {

            grid-column:
                1 / -1;

        }


        .form-group label {

            color:
                #d8e4f1;

            font-size:
                11px;

            font-weight:
                750;

        }


        .form-group input,
        .form-group select,
        .form-group textarea {

            width:
                100%;

            outline:
                none;

            border:
                1px solid var(--border-light);

            border-radius:
                10px;

            background:
                #071423;

            color:
                var(--text);

            padding:
                12px 13px;

            font-size:
                12px;

            transition:
                .2s;

        }


        .form-group textarea {

            min-height:
                125px;

            resize:
                vertical;

        }


        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {

            border-color:
                var(--blue);

            box-shadow:
                0 0 0 3px
                rgba(
                    96,
                    165,
                    250,
                    .08
                );

        }


        .form-actions {

            grid-column:
                1 / -1;

            display:
                flex;

            justify-content:
                flex-end;

            gap:
                10px;

            margin-top:
                4px;

        }


        .primary-button {

            display:
                inline-flex;

            align-items:
                center;

            justify-content:
                center;

            min-height:
                43px;

            padding:
                11px 18px;

            border:
                0;

            border-radius:
                10px;

            background:
                var(--green);

            color:
                #06101d;

            font-size:
                12px;

            font-weight:
                850;

        }


        .primary-button:hover {

            filter:
                brightness(1.05);

            transform:
                translateY(-1px);

        }


        /* =====================================================
           JOB LIST
           ===================================================== */

        #company-jobs-list {

            display:
                grid;

            grid-template-columns:
                repeat(
                    2,
                    1fr
                );

            gap:
                15px;

        }


        .company-job-card {

            display:
                flex;

            flex-direction:
                column;

            justify-content:
                space-between;

            min-height:
                220px;

            padding:
                21px;

            border:
                1px solid var(--border);

            border-radius:
                15px;

            background:
                #0b192b;

            transition:
                .2s;

        }


        .company-job-card:hover {

            transform:
                translateY(-2px);

            border-color:
                var(--border-light);

            background:
                var(--card-hover);

        }


        .company-job-content h3 {

            margin-bottom:
                10px;

            font-size:
                17px;

        }


        .company-job-meta {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                7px;

            margin-bottom:
                13px;

        }


        .company-job-meta span {

            padding:
                5px 8px;

            border:
                1px solid var(--border);

            border-radius:
                999px;

            background:
                #10243b;

            color:
                var(--muted);

            font-size:
                9px;

        }


        .company-job-content p {

            color:
                var(--muted);

            font-size:
                11px;

            line-height:
                1.7;

            display:
                -webkit-box;

            -webkit-line-clamp:
                4;

            -webkit-box-orient:
                vertical;

            overflow:
                hidden;

            margin-top:
                10px;

        }


        .company-job-actions {

            display:
                flex;

            justify-content:
                flex-end;

            margin-top:
                17px;

        }


        .company-job-actions button {

            min-height:
                37px;

            padding:
                8px 13px;

            border:
                1px solid
                rgba(
                    248,
                    113,
                    113,
                    .3
                );

            border-radius:
                9px;

            background:
                rgba(
                    248,
                    113,
                    113,
                    .06
                );

            color:
                #fca5a5;

            font-size:
                10px;

            font-weight:
                800;

        }


        .company-job-actions button:hover {

            border-color:
                var(--red);

        }


        /* =====================================================
           EMPTY JOB STATE
           ===================================================== */

        .no-company-jobs {

            grid-column:
                1 / -1;

            padding:
                45px 20px;

            text-align:
                center;

            border:
                1px dashed var(--border-light);

            border-radius:
                15px;

            background:
                rgba(
                    7,
                    20,
                    35,
                    .65
                );

        }


        .no-company-jobs h3 {

            margin-bottom:
                8px;

            font-size:
                18px;

        }


        .no-company-jobs p {

            margin-bottom:
                18px;

            color:
                var(--muted);

            font-size:
                12px;

        }


        .company-create-job-button {

            min-height:
                40px;

            padding:
                9px 16px;

            border:
                0;

            border-radius:
                9px;

            background:
                var(--green);

            color:
                #06101d;

            font-size:
                11px;

            font-weight:
                850;

        }


        /* =====================================================
           FOOTER
           ===================================================== */

        .dashboard-footer {

            padding:
                25px 0;

            border-top:
                1px solid var(--border);

        }


        .footer-inner {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            gap:
                20px;

        }


        .footer-text {

            color:
                #71869e;

            font-size:
                10px;

        }


        .footer-links {

            display:
                flex;

            gap:
                15px;

        }


        .footer-links a {

            color:
                #9db0c8;

            font-size:
                10px;

        }


        .footer-links a:hover {

            color:
                var(--green);

        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 850px) {

            .stats-grid {

                grid-template-columns:
                    repeat(
                        3,
                        1fr
                    );

            }

            #company-jobs-list {

                grid-template-columns:
                    1fr;

            }

        }


        @media (max-width: 700px) {

            .dashboard-main {

                padding:
                    25px 0 55px;

            }


            .header-inner {

                min-height:
                    64px;

            }


            .brand-subtitle {

                display:
                    none;

            }


            .header-button {

                min-height:
                    37px;

                padding:
                    8px 10px;

                font-size:
                    10px;

            }


            .stats-grid {

                grid-template-columns:
                    1fr;

            }


            #create-job-form {

                grid-template-columns:
                    1fr;

            }


            .form-group.full {

                grid-column:
                    auto;

            }


            .form-actions {

                grid-column:
                    auto;

            }


            .dashboard-section {

                padding:
                    18px;

            }


            .welcome-card {

                padding:
                    24px 20px;

            }


            .section-header {

                align-items:
                    flex-start;

                flex-direction:
                    column;

            }


            .footer-inner {

                flex-direction:
                    column;

                text-align:
                    center;

            }

        }


        @media (max-width: 430px) {

            .container {

                width:
                    94%;

            }


            .brand-title {

                font-size:
                    14px;

            }


            .brand-icon {

                width:
                    39px;

                height:
                    39px;

                flex-basis:
                    39px;

            }


            .header-actions {

                gap:
                    5px;

            }


            .header-button {

                padding:
                    7px 8px;

            }


            .logout-button {

                font-size:
                    0;

            }


            .logout-button::before {

                content:
                    "↪";

                font-size:
                    17px;

            }

        }

    </style>

</head>


<body>


    <!-- =====================================================
         LOADING
         ===================================================== -->

    <div id="loading-spinner">

        <div class="loading-card">

            <div class="loading-logo">
                ◈
            </div>

            <h2>
                Loading Company Dashboard
            </h2>

            <p>
                Authenticating your company account...
            </p>

            <div class="loading-spinner-circle"></div>

        </div>

    </div>


    <!-- =====================================================
         DASHBOARD
         ===================================================== -->

    <div id="dashboard-content">


        <!-- =================================================
             HEADER
             ================================================= -->

        <header class="dashboard-header">

            <div class="container header-inner">

                <a
                    href="index.html"
                    class="brand"
                >

                    <div class="brand-icon">
                        ◈
                    </div>

                    <div class="brand-text">

                        <div class="brand-title">
                            Web3Jobs
                        </div>

                        <div class="brand-subtitle">
                            Company Dashboard
                        </div>

                    </div>

                </a>


                <div class="header-actions">

                    <a
                        href="jobs.html"
                        class="header-button"
                    >
                        Browse Jobs
                    </a>

                    <button
                        type="button"
                        id="company-logout"
                        class="header-button logout-button"
                        data-action="logout"
                    >
                        Logout
                    </button>

                </div>

            </div>

        </header>


        <!-- =================================================
             MAIN
             ================================================= -->

        <main class="dashboard-main">

            <div class="container">


                <!-- =========================================
                     WELCOME
                     ========================================= -->

                <section class="welcome-card">

                    <div class="welcome-label">
                        ● COMPANY ACCOUNT
                    </div>

                    <h1>
                        Welcome back,
                        <span id="company-name">
                            Company
                        </span>
                    </h1>

                    <p>
                        Manage your Web3 opportunities and company jobs.
                    </p>

                    <p style="margin-top: 6px;">
                        <span id="company-email"></span>
                    </p>

                </section>


                <!-- =========================================
                     STATS
                     ========================================= -->

                <section class="stats-grid">


                    <article class="stat-card">

                        <div class="stat-top">

                            <span class="stat-label">
                                Published Jobs
                            </span>

                            <div class="stat-icon">
                                💼
                            </div>

                        </div>

                        <div
                            class="stat-value"
                            id="total-jobs"
                            data-total-jobs
                        >
                            0
                        </div>

                    </article>


                    <article class="stat-card">

                        <div class="stat-top">

                            <span class="stat-label">
                                Active Jobs
                            </span>

                            <div class="stat-icon">
                                ⚡
                            </div>

                        </div>

                        <div
                            class="stat-value"
                            id="active-jobs"
                            data-active-jobs
                        >
                            0
                        </div>

                    </article>


                    <article class="stat-card">

                        <div class="stat-top">

                            <span class="stat-label">
                                Account Status
                            </span>

                            <div class="stat-icon">
                                ✓
                            </div>

                        </div>

                        <div
                            class="stat-value"
                            style="
                                font-size: 20px;
                                color: #6ee7b7;
                            "
                        >
                            Active
                        </div>

                    </article>


                </section>


                <!-- =========================================
                     CREATE JOB
                     ========================================= -->

                <section class="dashboard-section">

                    <div class="section-header">

                        <div>

                            <h2 class="section-title">
                                Post a New Job
                            </h2>

                            <p class="section-description">
                                Publish a new opportunity for Web3 professionals.
                            </p>

                        </div>

                    </div>


                    <form
                        id="create-job-form"
                        class="create-job-form"
                        data-create-job-form
                    >


                        <div class="form-group">

                            <label for="job-title">
                                Job Title
                            </label>

                            <input
                                id="job-title"
                                type="text"
                                name="title"
                                placeholder="e.g. Senior Solidity Developer"
                                required
                                autocomplete="off"
                            >

                        </div>


                        <div class="form-group">

                            <label for="job-company">
                                Company
                            </label>

                            <input
                                id="job-company"
                                type="text"
                                name="company"
                                placeholder="Company name"
                                autocomplete="organization"
                            >

                        </div>


                        <div class="form-group">

                            <label for="job-location">
                                Location
                            </label>

                            <input
                                id="job-location"
                                type="text"
                                name="location"
                                placeholder="Remote / New York / London"
                                autocomplete="off"
                            >

                        </div>


                        <div class="form-group">

                            <label for="job-type">
                                Job Type
                            </label>

                            <select
                                id="job-type"
                                name="type"
                            >

                                <option value="Full Time">
                                    Full Time
                                </option>

                                <option value="Part Time">
                                    Part Time
                                </option>

                                <option value="Remote">
                                    Remote
                                </option>

                                <option value="Freelance">
                                    Freelance
                                </option>

                                <option value="Internship">
                                    Internship
                                </option>

                                <option value="Contract">
                                    Contract
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label for="job-skills">
                                Skills
                            </label>

                            <input
                                id="job-skills"
                                type="text"
                                name="skills"
                                placeholder="Solidity, React, Ethereum"
                                autocomplete="off"
                            >

                        </div>


                        <div class="form-group">

                            <label for="job-salary">
                                Salary
                            </label>

                            <input
                                id="job-salary"
                                type="text"
                                name="salary"
                                placeholder="e.g. $80k - $120k"
                                autocomplete="off"
                            >

                        </div>


                        <div class="form-group full">

                            <label for="job-application-url">
                                Application URL
                            </label>

                            <input
                                id="job-application-url"
                                type="url"
                                name="application_url"
                                placeholder="https://example.com/apply"
                                autocomplete="url"
                            >

                        </div>


                        <div class="form-group full">

                            <label for="job-description">
                                Job Description
                            </label>

                            <textarea
                                id="job-description"
                                name="description"
                                placeholder="Describe the role, responsibilities and requirements..."
                            ></textarea>

                        </div>


                        <div class="form-actions">

                            <button
                                type="submit"
                                class="primary-button"
                            >
                                Publish Job
                            </button>

                        </div>


                    </form>

                </section>


                <!-- =========================================
                     JOBS
                     ========================================= -->

                <section class="dashboard-section">

                    <div class="section-header">

                        <div>

                            <h2 class="section-title">
                                Your Published Jobs
                            </h2>

                            <p class="section-description">
                                Manage the opportunities published by your company.
                            </p>

                        </div>

                        <button
                            type="button"
                            class="primary-button"
                            data-action="create-job"
                        >
                            + New Job
                        </button>

                    </div>


                    <div
                        id="company-jobs-list"
                        class="company-jobs-list"
                        data-company-jobs
                    >

                        <div class="no-company-jobs">

                            <h3>
                                Loading Jobs...
                            </h3>

                            <p>
                                Please wait while your jobs are loaded.
                            </p>

                        </div>

                    </div>

                </section>


            </div>

        </main>


        <!-- =================================================
             FOOTER
             ================================================= -->

        <footer class="dashboard-footer">

            <div class="container footer-inner">

                <div class="footer-text">

                    © 2026 Web3Jobs. All rights reserved.

                </div>


                <div class="footer-links">

                    <a href="index.html">
                        Home
                    </a>

                    <a href="jobs.html">
                        Jobs
                    </a>

                    <a href="companies.html">
                        Companies
                    </a>

                    <a href="profile.html">
                        Profile
                    </a>

                </div>

            </div>

        </footer>


    </div>


</body>

</html>
