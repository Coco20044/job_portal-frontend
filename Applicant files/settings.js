const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const accountEmail = document.getElementById("accountEmail");

const saveSettingsButton = document.getElementById("saveSettings");
const settingsMessage = document.getElementById("settingsMessage");
const darkModeInput = document.getElementById("darkMode");

const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmNewPassword");

const changePasswordForm = document.getElementById("changePasswordForm");

const passwordMessage = document.getElementById("passwordMessage");

const settingInputs = {
    jobSearchStatus: document.getElementById("jobSearchStatus"),
    jobAlerts: document.getElementById("jobAlerts"),
    applicationUpdates: document.getElementById("applicationUpdates"),
    employerMessages: document.getElementById("employerMessages"),
    marketingEmails: document.getElementById("marketingEmails"),
    profileVisibility: document.getElementById("profileVisibility"),
    showContactInfo: document.getElementById("showContactInfo")
};

let isJobSeekerAuthenticated = false;

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

function showMessage(message, type = "info") {
    const messageElement = passwordMessage || settingsMessage;

    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `settings-message ${type}`;
    messageElement.style.display = "block";
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    if (!token) return null;

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
        isJobSeekerAuthenticated = false;
        return null;
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

function getSettings() {
    try {
        return JSON.parse(
            localStorage.getItem("jobPortalSettings") ||
            sessionStorage.getItem("jobPortalSettings") ||
            "{}"
        );
    } catch {
        return {};
    }
}

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);

    localStorage.setItem("theme", isDark ? "dark" : "light");
    sessionStorage.setItem("theme", isDark ? "dark" : "light");

    if (darkModeInput) {
        darkModeInput.checked = isDark;
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || sessionStorage.getItem("theme") || "light";
    applyTheme(savedTheme);
}

function showGuestPreview() {
    isJobSeekerAuthenticated = false;

    if (userName) {
        userName.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (accountEmail) {
        accountEmail.textContent = "Log in to view your account email";
    }
}

async function loadUserInformation() {
    const token = getToken();

    if (!token) {
        showGuestPreview();
        return false;
    }

    try {
        const data = await apiRequest("/auth/me");

        if (!data) {
            showGuestPreview();
            return false;
        }

        const user = data.user || data;

        if (!user || user.role !== "job_seeker") {
            clearUserSession();
            showGuestPreview();
            return false;
        }

        isJobSeekerAuthenticated = true;

        const fullName = user.name || "Job Seeker";

        if (userName) {
            userName.textContent = fullName;
        }

        if (userAvatar) {
            userAvatar.textContent = fullName.charAt(0).toUpperCase();
        }

        if (accountEmail) {
            accountEmail.textContent = user.email || "No email available";
        }

        return true;
    } catch (error) {
        console.error("Account loading error:", error);
        showGuestPreview();

        if (settingsMessage) {
            settingsMessage.textContent = error.message;
        }

        return false;
    }
}

function loadSettings() {
    const savedSettings = getSettings();

    Object.keys(settingInputs).forEach(function (setting) {
        const input = settingInputs[setting];

        if (input && savedSettings[setting] !== undefined) {
            input.checked = savedSettings[setting];
        }
    });
}

function saveSettings() {
    const settings = {};

    Object.keys(settingInputs).forEach(function (setting) {
        const input = settingInputs[setting];

        if (input) {
            settings[setting] = input.checked;
        }
    });

    localStorage.setItem("jobPortalSettings", JSON.stringify(settings));
    sessionStorage.setItem("jobPortalSettings", JSON.stringify(settings));

    if (settingsMessage) {
        settingsMessage.textContent = "Settings saved successfully.";

        setTimeout(function () {
            settingsMessage.textContent = "";
        }, 3000);
    }
}

if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!isJobSeekerAuthenticated || !getToken()) {
            showMessage("Please log in as a job seeker to change your password.", "error");
            return;
        }

        const currentPassword = currentPasswordInput?.value.trim();
        const newPassword = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage("Please complete all password fields.", "error");
            return;
        }

        if (newPassword.length < 8) {
            showMessage("Your new password must contain at least 8 characters.", "error");
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage("Your new password and confirmation do not match.", "error");
            return;
        }

        const changePasswordButton = document.getElementById("changePasswordButton");

        try {
            if (changePasswordButton) {
                changePasswordButton.disabled = true;
                changePasswordButton.textContent = "Updating...";
            }

            const data = await apiRequest("/auth/change-password", {
                method: "PATCH",
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (!data) {
                showGuestPreview();
                showMessage("Your session has expired. Please log in again.", "error");
                return;
            }

            changePasswordForm.reset();

            showMessage(
                data.message || "Password changed successfully.",
                "success"
            );
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            if (changePasswordButton) {
                changePasswordButton.disabled = false;
                changePasswordButton.textContent = "Update Password";
            }
        }
    });
}

if (darkModeInput) {
    darkModeInput.addEventListener("change", function () {
        applyTheme(this.checked ? "dark" : "light");
    });
}

if (saveSettingsButton) {
    saveSettingsButton.addEventListener("click", saveSettings);
}

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
        event.preventDefault();

        clearUserSession();

        window.location.replace("../index.html");
    });
}

initializeTheme();
loadSettings();
loadUserInformation();