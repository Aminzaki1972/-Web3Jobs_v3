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

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <script src="js/supabase.js"></script>

    <script src="js/auth.js"></script>

    <script src="js/company-dashboard.js"></script>


    <!-- =====================================================
         ETHERS
         Used for BNB Smart Chain wallet connection
         ===================================================== -->

    <script
        src="https://cdn.jsdelivr.net/npm/ethers@6.13.5/dist/ethers.umd.min.js"
    ></script>


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

            --bnb:
                #f3ba2f;

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
                3px solid #19304a;

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
           SUBSCRIPTION
           ===================================================== */

        .subscription-section {

            position:
                relative;

            overflow:
                hidden;

        }


        .subscription-section::before {

            content:
                "";

            position:
                absolute;

            width:
                320px;

            height:
                320px;

            right:
                -160px;

            top:
                -160px;

            border-radius:
                50%;

            background:
                radial-gradient(
                    circle,
                    rgba(
                        243,
                        186,
                        47,
                        .09
                    ),
                    transparent 70%
                );

            pointer-events:
                none;

        }


        .subscription-notice {

            display:
                flex;

            align-items:
                flex-start;

            gap:
                12px;

            margin-bottom:
                20px;

            padding:
                15px;

            border:
                1px solid
                rgba(
                    243,
                    186,
                    47,
                    .25
                );

            border-radius:
                12px;

            background:
                rgba(
                    243,
                    186,
                    47,
                    .05
                );

        }


        .subscription-notice-icon {

            width:
                32px;

            height:
                32px;

            flex:
                0 0 32px;

            display:
                grid;

            place-items:
                center;

            border-radius:
                9px;

            background:
                rgba(
                    243,
                    186,
                    47,
                    .12
                );

            color:
                var(--bnb);
