const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";
function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || sessionStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark-mode", savedTheme === "dark");
}

initializeTheme();

const profileForm = document.getElementById("profileForm");
const skillsForm = document.getElementById("skillsForm");
const educationForm = document.getElementById("educationForm");
const experienceForm = document.getElementById("experienceForm");

const profileMessage = document.getElementById("profileMessage");
const skillsPreview = document.getElementById("skillsPreview");

const profileFields = [
    "firstName",
    "lastName",
    "phone",
    "location",
    "headline",
    "bio",
    "school",
    "degree",
    "fieldOfStudy",
    "graduationYear",
    "jobTitle",
    "company",
    "startDate",
    "endDate",
    "experienceDescription"
];

let accountData = null;
let profileData = {};

function getToken() {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function clearUserSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("selectedRole");
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
        return null;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        clearUserSession();
        return null;
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

function showMessage(message, type = "success") {
    if (!profileMessage) return;

    profileMessage.textContent = message;
    profileMessage.className = `message ${type}`;
    profileMessage.style.display = "block";
}

function clearMessage() {
    if (!profileMessage) return;

    profileMessage.textContent = "";
    profileMessage.style.display = "none";
}

function setFormsDisabled(disabled) {
    [profileForm, skillsForm, educationForm, experienceForm].forEach(form => {
        if (!form) return;

        form.querySelectorAll("input, textarea, select, button").forEach(element => {
            element.disabled = disabled;
        });
    });
}

function setFieldValue(id, value) {
    const field = document.getElementById(id);

    if (!field) return;

    field.value = value ?? "";
}

function getFieldValue(id) {
    const field = document.getElementById(id);

    return field ? field.value.trim() : "";
}

function formatDate(value) {
    if (!value) return "";

    return String(value).slice(0, 10);
}

function getDisplayName() {
    const firstName = profileData.firstName || "";
    const lastName = profileData.lastName || "";

    return `${firstName} ${lastName}`.trim() || accountData?.name || "Guest Preview";
}

function updateUserDisplay() {
    const displayName = getDisplayName();

    const profileDisplayName = document.getElementById("profileDisplayName");
    const profileHeadline = document.getElementById("profileHeadline");
    const profileLocation = document.getElementById("profileLocation");
    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (profileDisplayName) {
        profileDisplayName.textContent = displayName;
    }

    if (profileHeadline) {
        profileHeadline.textContent = profileData.headline || "Add a professional headline";
    }

    if (profileLocation) {
        profileLocation.textContent = profileData.location || "Add your location";
    }

    if (userName) {
        userName.textContent = displayName;
    }

    if (userAvatar) {
        const initials = displayName
            .split(/\s+/)
            .filter(Boolean)
            .map(part => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        userAvatar.textContent = initials || "JS";
    }
}

function updateSkillsPreview() {
    if (!skillsPreview) return;

    skillsPreview.replaceChildren();

    const skills = Array.isArray(profileData.skills)
        ? profileData.skills
        : [];

    if (!skills.length) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No skills added yet.";
        skillsPreview.appendChild(emptyMessage);
        return;
    }

    skills.forEach(skill => {
        const skillElement = document.createElement("span");
        skillElement.textContent = skill;
        skillsPreview.appendChild(skillElement);
    });
}

function updateProfileCompletion() {
    const completionFields = [
        "firstName",
        "lastName",
        "phone",
        "location",
        "headline",
        "bio",
        "skills",
        "school",
        "degree",
        "fieldOfStudy",
        "graduationYear",
        "jobTitle",
        "company",
        "startDate",
        "endDate",
        "experienceDescription"
    ];

    const completed = completionFields.filter(field => {
        const value = profileData[field];

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return Boolean(value);
    }).length;

    const percentage = Math.round(
        (completed / completionFields.length) * 100
    );

    const profileCompletion = document.getElementById("profileCompletion");
    const completionText = document.getElementById("completionText");

    if (profileCompletion) {
        profileCompletion.style.width = `${percentage}%`;
    }

    if (completionText) {
        completionText.textContent = `${percentage}% Complete`;
    }
}

function populateProfile() {
    profileFields.forEach(field => {
        setFieldValue(field, profileData[field]);
    });

    setFieldValue("profileEmail", accountData?.email || "");

    updateUserDisplay();
    updateSkillsPreview();
    updateProfileCompletion();
}

function collectProfileData() {
    return {
        firstName: getFieldValue("firstName"),
        lastName: getFieldValue("lastName"),
        phone: getFieldValue("phone"),
        location: getFieldValue("location"),
        headline: getFieldValue("headline"),
        bio: getFieldValue("bio"),
        skills: getFieldValue("skills")
            .split(",")
            .map(skill => skill.trim())
            .filter(Boolean),
        school: getFieldValue("school"),
        degree: getFieldValue("degree"),
        fieldOfStudy: getFieldValue("fieldOfStudy"),
        graduationYear: getFieldValue("graduationYear"),
        jobTitle: getFieldValue("jobTitle"),
        company: getFieldValue("company"),
        startDate: getFieldValue("startDate") || null,
        endDate: getFieldValue("endDate") || null,
        experienceDescription: getFieldValue("experienceDescription")
    };
}

async function saveProfile(event) {
    event.preventDefault();
    clearMessage();

    if (!getToken()) {
        showMessage("Please log in as a job seeker to update your profile.", "error");
        return;
    }

    const submitButton = event.submitter;

    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        const updatedData = collectProfileData();

        const response = await apiRequest("/profile", {
            method: "PUT",
            body: JSON.stringify(updatedData)
        });

        if (!response) {
            showPreviewMode();
            showMessage("Your session has expired. Please log in again.", "error");
            return;
        }

        profileData = response.profile || updatedData;

        populateProfile();
        showMessage(response.message || "Profile updated successfully.");
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        if (submitButton && getToken()) {
            submitButton.disabled = false;
        }
    }
}

function clearProfileFields() {
    profileFields.forEach(field => setFieldValue(field, ""));
    setFieldValue("profileEmail", "");

    profileData = {
        skills: []
    };

    updateUserDisplay();
    updateSkillsPreview();
    updateProfileCompletion();
}

function showPreviewMode() {
    accountData = null;

    clearProfileFields();
    setFormsDisabled(true);

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (userName) {
        userName.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    clearMessage();
}

async function initializeProfile() {
    showPreviewMode();

    if (!getToken()) {
        return;
    }

    try {
        const userResponse = await apiRequest("/auth/me");

        if (!userResponse) {
            showPreviewMode();
            return;
        }

        const user = userResponse.user || userResponse;

        if (!user || user.role !== "job_seeker") {
            clearUserSession();
            showPreviewMode();
            return;
        }

        const response = await apiRequest("/profile");

        if (!response) {
            showPreviewMode();
            return;
        }

        accountData = response.profile || {};

        const accountName = accountData.name || user.name || "";
        const nameParts = accountName.trim().split(/\s+/).filter(Boolean);

        profileData = {
            ...accountData,
            firstName: accountData.firstName || nameParts[0] || "",
            lastName: accountData.lastName || nameParts.slice(1).join(" "),
            skills: Array.isArray(accountData.skills)
                ? accountData.skills
                : [],
            startDate: formatDate(accountData.startDate),
            endDate: formatDate(accountData.endDate)
        };

        populateProfile();
        setFormsDisabled(false);
    } catch (error) {
        console.error("Profile loading error:", error);
        showPreviewMode();
        showMessage(error.message, "error");
    }
}

[profileForm, skillsForm, educationForm, experienceForm].forEach(form => {
    if (form) {
        form.addEventListener("submit", saveProfile);
    }
});

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", event => {
        event.preventDefault();
        clearUserSession();
        window.location.replace("../index.html");
    });
}

initializeProfile();