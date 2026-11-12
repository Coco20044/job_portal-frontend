const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const accountForm = document.getElementById("accountForm");
const companyForm = document.getElementById("companyForm");
const passwordForm = document.getElementById("passwordForm");
const notificationForm = document.getElementById("notificationForm");

const settingsMessage = document.getElementById("settingsMessage");
const logoutButton = document.getElementById("logoutButton");

const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");

const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

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

let user = {};
let companyData = {};
let isEmployerAuthenticated = false;

const defaultNotifications = {
    applicationNotifications: true,
    applicationUpdates: true,
    platformNotifications: true
};

function showMessage(message, type) {
    if (!settingsMessage) return;

    settingsMessage.textContent = message;
    settingsMessage.className = `settings-message ${type}`;
    settingsMessage.style.display = "block";

    settingsMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function setFormsDisabled(disabled) {
    [
        accountForm,
        companyForm,
        passwordForm,
        notificationForm
    ].forEach(form => {
        if (!form) return;

        form.querySelectorAll("input, textarea, select, button").forEach(element => {
            element.disabled = disabled;
        });
    });
}

function showPreviewMode() {
    isEmployerAuthenticated = false;
    user = {};
    companyData = {};

    if (userName) {
        userName.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    setFormsDisabled(true);

    showMessage(
        "You are viewing the settings preview. Log in as an employer to view and manage your account, company information, password, and notification preferences.",
        "info"
    );
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
        return null;
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

function updateSidebar() {
    const name = user.name || user.fullName || "Employer";

    if (userName) {
        userName.textContent = name;
    }

    if (userAvatar) {
        userAvatar.textContent = name.charAt(0).toUpperCase();
    }
}

function loadAccountInformation() {
    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const jobTitle = document.getElementById("jobTitle");

    if (fullName) {
        fullName.value = user.name || user.fullName || "";
    }

    if (email) {
        email.value = user.email || "";
    }

    if (phone) {
        phone.value = user.phone || "";
    }

    if (jobTitle) {
        jobTitle.value = user.job_title || user.jobTitle || "";
    }
}

async function loadAccount() {
    const data = await apiRequest("/auth/me");

    if (!data) return false;

    user = data.user || data;

    if (user.role !== "employer") {
        clearUserSession();
        return false;
    }

    isEmployerAuthenticated = true;

    updateSidebar();
    loadAccountInformation();

    return true;
}

async function loadCompany() {
    const data = await apiRequest("/employer/settings/company");

    if (!data) return false;

    companyData = data.company || data || {};

    const companyName = document.getElementById("companyName");
    const industry = document.getElementById("industry");
    const companyWebsite = document.getElementById("companyWebsite");
    const companyLocation = document.getElementById("companyLocation");
    const companyDescription = document.getElementById("companyDescription");

    if (companyName) {
        companyName.value = companyData.company_name || "";
    }

    if (industry) {
        industry.value = companyData.industry || "";
    }

    if (companyWebsite) {
        companyWebsite.value = companyData.company_website || "";
    }

    if (companyLocation) {
        companyLocation.value = companyData.company_location || "";
    }

    if (companyDescription) {
        companyDescription.value = companyData.company_description || "";
    }

    return true;
}

async function loadNotifications() {
    const data = await apiRequest("/employer/settings/notifications");

    if (!data) return false;

    const settings = {
        ...defaultNotifications,
        ...(data.preferences || data)
    };

    const applicationNotifications = document.getElementById("applicationNotifications");
    const applicationUpdates = document.getElementById("applicationUpdates");
    const platformNotifications = document.getElementById("platformNotifications");

    if (applicationNotifications) {
        applicationNotifications.checked = settings.applicationNotifications;
    }

    if (applicationUpdates) {
        applicationUpdates.checked = settings.applicationUpdates;
    }

    if (platformNotifications) {
        platformNotifications.checked = settings.platformNotifications;
    }

    return true;
}

accountForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to update your account.", "error");
        return;
    }

    const updatedAccount = {
        name: document.getElementById("fullName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        job_title: document.getElementById("jobTitle").value.trim()
    };

    if (!updatedAccount.name || !updatedAccount.email) {
        showMessage("Please provide your full name and email address.", "error");
        return;
    }

    try {
        const data = await apiRequest("/auth/me", {
            method: "PATCH",
            body: JSON.stringify(updatedAccount)
        });

        if (!data) {
            showPreviewMode();
            return;
        }

        user = data.user || { ...user, ...updatedAccount };
        updateSidebar();

        showMessage(
            data.message || "Account information updated successfully.",
            "success"
        );
    } catch (error) {
        showMessage(error.message, "error");
    }
});

companyForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to update company information.", "error");
        return;
    }

    const updatedCompany = {
        company_name: document.getElementById("companyName").value.trim(),
        industry: document.getElementById("industry").value.trim(),
        company_website: document.getElementById("companyWebsite").value.trim(),
        company_location: document.getElementById("companyLocation").value.trim(),
        company_description: document.getElementById("companyDescription").value.trim()
    };

    try {
        const data = await apiRequest("/employer/settings/company", {
            method: "PUT",
            body: JSON.stringify(updatedCompany)
        });

        if (!data) {
            showPreviewMode();
            return;
        }

        companyData = data.company || updatedCompany;

        showMessage(
            data.message || "Company information updated successfully.",
            "success"
        );
    } catch (error) {
        showMessage(error.message, "error");
    }
});

passwordForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to change your password.", "error");
        return;
    }

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (newPassword.length < 8) {
        showMessage("Your new password must contain at least 8 characters.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage("Your new password and confirmation do not match.", "error");
        return;
    }

    try {
        const data = await apiRequest("/auth/change-password", {
            method: "PATCH",
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!data) {
            showPreviewMode();
            return;
        }

        passwordForm.reset();

        showMessage(
            data.message || "Password changed successfully.",
            "success"
        );
    } catch (error) {
        showMessage(error.message, "error");
    }
});

notificationForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to update notification preferences.", "error");
        return;
    }

    const updatedNotifications = {
        applicationNotifications:
            document.getElementById("applicationNotifications").checked,

        applicationUpdates:
            document.getElementById("applicationUpdates").checked,

        platformNotifications:
            document.getElementById("platformNotifications").checked
    };

    try {
        const data = await apiRequest("/employer/settings/notifications", {
            method: "PUT",
            body: JSON.stringify(updatedNotifications)
        });

        if (!data) {
            showPreviewMode();
            return;
        }

        showMessage(
            data.message || "Notification preferences saved successfully.",
            "success"
        );
    } catch (error) {
        showMessage(error.message, "error");
    }
});

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");

    if (themeToggle) {
        themeToggle.checked = isDark;
    }

    if (themeLabel) {
        themeLabel.textContent = isDark ? "Dark Mode" : "Light Mode";
    }
}

applyTheme(localStorage.getItem("theme") || "light");

themeToggle?.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
});

if (logoutButton) {
    logoutButton.addEventListener("click", event => {
        event.preventDefault();

        if (!getToken()) {
            window.location.replace("../index.html");
            return;
        }

        const confirmed = confirm("Are you sure you want to log out?");

        if (!confirmed) return;

        clearUserSession();
        window.location.replace("../index.html");
    });
}

async function initializeSettings() {
    if (!getToken()) {
        showPreviewMode();
        return;
    }

    try {
        const authorized = await loadAccount();

        if (!authorized) {
            showPreviewMode();
            return;
        }

        setFormsDisabled(false);

        const results = await Promise.all([
            loadCompany(),
            loadNotifications()
        ]);

        if (results.some(result => !result)) {
            showPreviewMode();
        }
    } catch (error) {
        showMessage(error.message, "error");
    }
}

initializeSettings();