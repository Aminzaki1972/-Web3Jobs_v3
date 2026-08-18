/* =========================================================
   Web3Jobs v3
   File: js/profile.js

   Individual Profile Management
   ---------------------------------------------------------
   - Uses central Supabase client
   - Uses central Web3JobsAuth
   - Loads current authenticated user
   - Loads profile from profiles table
   - Updates ONLY allowed profile fields
   - Does NOT allow changing:
       id
       email
       account_type
       role
       created_at
   ========================================================= */

"use strict";


/* =========================================================
   STATE
   ========================================================= */

const ProfileSystem = {

    user: null,

    profile: null,

    initialized: false

};


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getProfileSupabase() {

    if (
        window.Web3JobsSupabase &&
        typeof
            window.Web3JobsSupabase.getClient
            === "function"
    ) {

        const client =
            window.Web3JobsSupabase.getClient();

        if (client) {
            return client;
        }
    }


    if (
        window.Web3JobsSupabase &&
        typeof
            window.Web3JobsSupabase.getSupabaseClient
            === "function"
    ) {

        const client =
            window.Web3JobsSupabase
                .getSupabaseClient();

        if (client) {
            return client;
        }
    }


    if (
        window.supabaseClient
    ) {

        return window.supabaseClient;
    }


    console.error(
        "Web3Jobs Profile: Supabase client unavailable."
    );

    return null;
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showProfileMessage(
    message,
    type = "info"
) {

    const box =
        document.getElementById(
            "profile-message"
        );


    if (!box) {
        return;
    }


    box.textContent =
        message;


    box.className =
        "profile-message " +
        type;
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getProfileUser() {

    /* -----------------------------------------------------
       Prefer central authentication system
    ----------------------------------------------------- */

    if (
        window.Web3JobsAuth &&
        typeof
            window.Web3JobsAuth.getCurrentUser
            === "function"
    ) {

        try {

            const user =
                await window.Web3JobsAuth
                    .getCurrentUser();

            ProfileSystem.user =
                user || null;

            return ProfileSystem.user;

        } catch (error) {

            console.error(
                "Profile getCurrentUser error:",
                error
            );
        }
    }


    /* -----------------------------------------------------
       Fallback to Supabase
    ----------------------------------------------------- */

    const supabase =
        getProfileSupabase();


    if (!supabase) {
        return null;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .auth
                .getUser();


        if (error) {

            console.error(
                "Profile getUser error:",
                error
            );

            return null;
        }


        ProfileSystem.user =
            data?.user || null;


        return ProfileSystem.user;

    } catch (error) {

        console.error(
            "Profile getUser exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile() {

    const supabase =
        getProfileSupabase();


    if (
        !supabase ||
        !ProfileSystem.user
    ) {

        return null;
    }


    try {

        const {
            data,
            error
        } =
            await supabase

                .from("profiles")

                .select(
                    [
                        "id",
                        "email",
                        "full_name",
                        "account_type",
                        "avatar_url",
                        "bio",
                        "location",
                        "website",
                        "created_at",
                        "updated_at",
                        "role"
                    ].join(",")
                )

                .eq(
                    "id",
                    ProfileSystem.user.id
                )

                .maybeSingle();


        if (error) {

            console.error(
                "Profile loading error:",
                error
            );

            return null;
        }


        ProfileSystem.profile =
            data || null;


        return ProfileSystem.profile;

    } catch (error) {

        console.error(
            "Profile loading exception:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD FORM
   ========================================================= */

function populateProfileForm() {

    const profile =
        ProfileSystem.profile;

    const user =
        ProfileSystem.user;


    if (!profile) {
        return;
    }


    const fullName =
        document.getElementById(
            "full-name"
        );

    const email =
        document.getElementById(
            "email"
        );

    const avatarUrl =
        document.getElementById(
            "avatar-url"
        );

    const location =
        document.getElementById(
            "location"
        );

    const website =
        document.getElementById(
            "website"
        );

    const bio =
        document.getElementById(
            "bio"
        );

    const accountType =
        document.getElementById(
            "account-type"
        );


    /* -----------------------------------------------------
       FULL NAME
    ----------------------------------------------------- */

    if (fullName) {

        fullName.value =
            profile.full_name ||
            user?.user_metadata?.full_name ||
            "";
    }


    /* -----------------------------------------------------
       EMAIL
    ----------------------------------------------------- */

    if (email) {

        email.value =
            user?.email ||
            profile.email ||
            "";
    }


    /* -----------------------------------------------------
       AVATAR
    ----------------------------------------------------- */

    if (avatarUrl) {

        avatarUrl.value =
            profile.avatar_url ||
            "";
    }


    /* -----------------------------------------------------
       LOCATION
    ----------------------------------------------------- */

    if (location) {

        location.value =
            profile.location ||
            "";
    }


    /* -----------------------------------------------------
       WEBSITE
    ----------------------------------------------------- */

    if (website) {

        website.value =
            profile.website ||
            "";
    }


    /* -----------------------------------------------------
       BIO
    ----------------------------------------------------- */

    if (bio) {

        bio.value =
            profile.bio ||
            "";
    }


    /* -----------------------------------------------------
       ACCOUNT TYPE
    ----------------------------------------------------- */

    if (accountType) {

        accountType.value =
            profile.account_type ||
            profile.role ||
            "individual";
    }


    updateAvatarPreview(
        profile.avatar_url,
        profile.full_name ||
        user?.user_metadata?.full_name
    );
}


/* =========================================================
   AVATAR PREVIEW
   ========================================================= */

function updateAvatarPreview(
    url,
    name
) {

    const preview =
        document.getElementById(
            "avatar-preview"
        );


    if (!preview) {
        return;
    }


    preview.innerHTML =
        "";


    const cleanUrl =
        String(
            url || ""
        ).trim();


    if (cleanUrl) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            cleanUrl;


        image.alt =
            "Profile image";


        image.onerror =
            function () {

                preview.innerHTML =
                    getInitial(
                        name
                    );
            };


        preview.appendChild(
            image
        );

        return;
    }


    preview.textContent =
        getInitial(
            name
        );
}


/* =========================================================
   INITIAL
   ========================================================= */

function getInitial(
    name
) {

    const value =
        String(
            name || ""
        ).trim();


    if (!value) {
        return "?";
    }


    return value
        .charAt(0)
        .toUpperCase();
}


/* =========================================================
   VALIDATE URL
   ========================================================= */

function validateOptionalUrl(
    value
) {

    const url =
        String(
            value || ""
        ).trim();


    if (!url) {
        return true;
    }


    try {

        const parsed =
            new URL(
                url
            );


        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );

    } catch (error) {

        return false;
    }
}


/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function saveProfile(
    event
) {

    event.preventDefault();


    const supabase =
        getProfileSupabase();


    if (!supabase) {

        showProfileMessage(
            "Supabase connection is unavailable.",
            "error"
        );

        return;
    }


    if (!ProfileSystem.user) {

        showProfileMessage(
            "Your session has expired. Please log in again.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       FORM VALUES
    ----------------------------------------------------- */

    const fullName =
        document
            .getElementById(
                "full-name"
            )
            ?.value
            .trim() || "";


    const avatarUrl =
        document
            .getElementById(
                "avatar-url"
            )
            ?.value
            .trim() || "";


    const location =
        document
            .getElementById(
                "location"
            )
            ?.value
            .trim() || "";


    const website =
        document
            .getElementById(
                "website"
            )
            ?.value
            .trim() || "";


    const bio =
        document
            .getElementById(
                "bio"
            )
            ?.value
            .trim() || "";


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (fullName.length > 100) {

        showProfileMessage(
            "Full name is too long.",
            "error"
        );

        return;
    }


    if (location.length > 150) {

        showProfileMessage(
            "Location is too long.",
            "error"
        );

        return;
    }


    if (bio.length > 1000) {

        showProfileMessage(
            "Bio is too long.",
            "error"
        );

        return;
    }


    if (
        !validateOptionalUrl(
            avatarUrl
        )
    ) {

        showProfileMessage(
            "Please enter a valid profile image URL.",
            "error"
        );

        return;
    }


    if (
        !validateOptionalUrl(
            website
        )
    ) {

        showProfileMessage(
            "Please enter a valid website URL.",
            "error"
        );

        return;
    }


    /* -----------------------------------------------------
       BUTTON
    ----------------------------------------------------- */

    const saveButton =
        document.getElementById(
            "save-button"
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";
    }


    showProfileMessage(
        "Saving your profile...",
        "info"
    );


    /* -----------------------------------------------------
       UPDATE
       IMPORTANT:
       Only allowed fields are updated.
       id/account_type/role/email are NOT updated.
    ----------------------------------------------------- */

    try {

        const {
            data,
            error
        } =
            await supabase

                .from("profiles")

                .update({

                    full_name:
                        fullName || null,

                    avatar_url:
                        avatarUrl || null,

                    bio:
                        bio || null,

                    location:
                        location || null,

                    website:
                        website || null,

                    updated_at:
                        new Date()
                            .toISOString()

                })

                .eq(
                    "id",
                    ProfileSystem.user.id
                )

                .select(
                    [
                        "id",
                        "email",
                        "full_name",
                        "account_type",
                        "avatar_url",
                        "bio",
                        "location",
                        "website",
                        "created_at",
                        "updated_at",
                        "role"
                    ].join(",")
                )

                .maybeSingle();


        if (error) {

            console.error(
                "Profile update error:",
                error
            );


            showProfileMessage(
                "Unable to save your profile: " +
                error.message,
                "error"
            );


            return;
        }


        ProfileSystem.profile =
            data ||
            ProfileSystem.profile;


        /* -------------------------------------------------
           Update local Auth metadata name if possible
           ------------------------------------------------- */

        try {

            await supabase
                .auth
                .updateUser({

                    data: {
                        full_name:
                            fullName
                    }

                });

        } catch (metadataError) {

            console.warn(
                "Auth metadata update skipped:",
                metadataError
            );
        }


        updateAvatarPreview(
            avatarUrl,
            fullName
        );


        showProfileMessage(
            "Profile saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Profile save exception:",
            error
        );


        showProfileMessage(
            "An unexpected error occurred while saving your profile.",
            "error"
        );


    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Profile";
        }
    }
}


/* =========================================================
   BACK TO DASHBOARD
   ========================================================= */

function goBackToDashboard() {

    window.location.href =
        "dashboard.html";
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeProfilePage() {

    if (
        ProfileSystem.initialized
    ) {
        return;
    }


    ProfileSystem.initialized =
        true;


    try {

        /* -------------------------------------------------
           Get authenticated user
        ------------------------------------------------- */

        const user =
            await getProfileUser();


        if (!user) {

            showProfileMessage(
                "Please log in to edit your profile.",
                "error"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "login.html";

                },
                1200
            );


            return;
        }


        /* -------------------------------------------------
           Load profile
        ------------------------------------------------- */

        const profile =
            await loadProfile();


        if (!profile) {

            showProfileMessage(
                "Your profile could not be found.",
                "error"
            );


            return;
        }


        /* -------------------------------------------------
           Populate
        ------------------------------------------------- */

        populateProfileForm();


        /* -------------------------------------------------
           Show form
        ------------------------------------------------- */

        const loading =
            document.getElementById(
                "profile-loading"
            );


        const form =
            document.getElementById(
                "profile-form"
            );


        if (loading) {

            loading.style.display =
                "none";
        }


        if (form) {

            form.style.display =
                "block";
        }


    } catch (error) {

        console.error(
            "Profile initialization error:",
            error
        );


        showProfileMessage(
            "Unable to load your profile.",
            "error"
        );
    }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const form =
            document.getElementById(
                "profile-form"
            );


        if (form) {

            form.addEventListener(
                "submit",
                saveProfile
            );
        }


        const backButton =
            document.getElementById(
                "back-button"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                goBackToDashboard
            );
        }


        const avatarInput =
            document.getElementById(
                "avatar-url"
            );


        if (avatarInput) {

            avatarInput.addEventListener(
                "input",
                function () {

                    const name =
                        document
                            .getElementById(
                                "full-name"
                            )
                            ?.v
