const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || sessionStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark-mode", savedTheme === "dark");
}

initializeTheme();

const applicationsList = document.getElementById("applicationsList");
const emptyState = document.getElementById("emptyState");

const totalApplications = document.getElementById("totalApplications");
const pendingApplications = document.getElementById("pendingApplications");
const interviewApplications = document.getElementById("interviewApplications");
const rejectedApplications = document.getElementById("rejectedApplications");

const filterTabs = document.querySelectorAll(".filter-tab");

const userNameElement = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");

const logoutButton = document.getElementById("logoutButton");

let applications = [];

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

function showPreviewMode() {
    if (userNameElement) {
        userNameElement.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (totalApplications) {
        totalApplications.textContent = "—";
    }

    if (pendingApplications) {
        pendingApplications.textContent = "—";
    }

    if (interviewApplications) {
        interviewApplications.textContent = "—";
    }

    if (rejectedApplications) {
        rejectedApplications.textContent = "—";
    }

    applications = [];

    if (applicationsList) {
        applicationsList.innerHTML = "";
        applicationsList.hidden = true;
    }

    if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = "Log in as a job seeker to view and manage your applications.";
    }
}

async function fetchUser() {
    const data = await apiRequest("/auth/me");

    if (!data) {
        return false;
    }

    const user = data.user || data;

    if (!user || user.role !== "job_seeker") {
        clearUserSession();
        return false;
    }

    const userName = user.name || user.email || "Job Seeker";

    if (userNameElement) {
        userNameElement.textContent = userName;
    }

    if (userAvatar) {
        const initials = userName
            .trim()
            .split(/\s+/)
            .map(name => name.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();

        userAvatar.textContent = initials || "U";
    }

    return true;
}

async function fetchApplications() {
    const data = await apiRequest("/applications/my-applications");

    if (!data) {
        showPreviewMode();
        return;
    }

    applications = Array.isArray(data)
        ? data
        : data.applications || data.data || [];

    updateStatistics();
    displayApplications(getActiveFilter());
}

function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getStatusDetails(status) {
    const statuses = {
        pending: {
            label: "Pending",
            className: "status-pending"
        },
        reviewing: {
            label: "Reviewed",
            className: "status-reviewed"
        },
        shortlisted: {
            label: "Interview",
            className: "status-interview"
        },
        accepted: {
            label: "Accepted",
            className: "status-interview"
        },
        rejected: {
            label: "Not Selected",
            className: "status-rejected"
        }
    };

    return statuses[String(status).toLowerCase()] || statuses.pending;
}

function updateStatistics() {
    if (totalApplications) {
        totalApplications.textContent = applications.length;
    }

    if (pendingApplications) {
        pendingApplications.textContent = applications.filter(
            application => ["pending", "reviewing"].includes(
                String(application.status).toLowerCase()
            )
        ).length;
    }

    if (interviewApplications) {
        interviewApplications.textContent = applications.filter(
            application => application.status === "shortlisted"
        ).length;
    }

    if (rejectedApplications) {
        rejectedApplications.textContent = applications.filter(
            application => application.status === "rejected"
        ).length;
    }
}

function getActiveFilter() {
    const activeTab = document.querySelector(".filter-tab.active");

    return activeTab?.dataset.filter || "all";
}

function displayApplications(filter = "all") {
    if (!applicationsList || !emptyState) return;

    applicationsList.innerHTML = "";

    let filteredApplications = applications;

    if (filter !== "all") {
        filteredApplications = applications.filter(application => {
            const status = String(application.status).toLowerCase();

            if (filter === "pending") {
                return ["pending", "reviewing"].includes(status);
            }

            if (filter === "interview") {
                return status === "shortlisted";
            }

            return status === filter;
        });
    }

    if (filteredApplications.length === 0) {
        applicationsList.hidden = true;
        emptyState.hidden = false;

        emptyState.textContent = applications.length === 0
            ? "You haven't submitted any applications yet."
            : "No applications found in this category.";

        return;
    }

    applicationsList.hidden = false;
    emptyState.hidden = true;

    filteredApplications.forEach(application => {
        const status = getStatusDetails(application.status);

        const company = application.company_name || "Unknown Company";
        const title = application.job_title || "Untitled Position";

        const applicationCard = document.createElement("div");
        applicationCard.className = "application-card";

        const applicationMain = document.createElement("div");
        applicationMain.className = "application-main";

        const companyLogo = document.createElement("div");
        companyLogo.className = "company-logo";
        companyLogo.textContent = company.charAt(0).toUpperCase();

        const applicationInfo = document.createElement("div");
        applicationInfo.className = "application-info";

        const jobTitle = document.createElement("h3");
        jobTitle.textContent = title;

        const companyName = document.createElement("p");
        companyName.textContent = company;

        const applicationMeta = document.createElement("div");
        applicationMeta.className = "application-meta";

        const location = document.createElement("span");
        location.textContent = `⌖ ${application.location || "Location unavailable"}`;

        applicationMeta.appendChild(location);
        applicationInfo.append(jobTitle, companyName, applicationMeta);
        applicationMain.append(companyLogo, applicationInfo);

        const applicationSide = document.createElement("div");
        applicationSide.className = "application-side";

        const statusBadge = document.createElement("span");
        statusBadge.className = `status-badge ${status.className}`;
        statusBadge.textContent = status.label;

        const applicationActions = document.createElement("div");
        applicationActions.className = "application-actions";

        const applicationDate = document.createElement("span");
        applicationDate.className = "application-date";
        applicationDate.textContent = `Applied ${formatDate(application.applied_at)}`;

        const withdrawButton = document.createElement("button");
        withdrawButton.className = "withdraw-button";
        withdrawButton.dataset.id = application.id;
        withdrawButton.type = "button";
        withdrawButton.textContent = "Withdraw";

        applicationActions.append(applicationDate, withdrawButton);
        applicationSide.append(statusBadge, applicationActions);
        applicationCard.append(applicationMain, applicationSide);

        applicationsList.appendChild(applicationCard);
    });
}

filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        filterTabs.forEach(button => {
            button.classList.remove("active");
        });

        tab.classList.add("active");

        displayApplications(tab.dataset.filter);
    });
});

async function handleWithdrawal(event) {
    const withdrawButton = event.target.closest(".withdraw-button");

    if (!withdrawButton) return;

    if (!getToken()) {
        alert("Please log in to withdraw an application.");
        return;
    }

    const applicationId = Number(withdrawButton.dataset.id);

    const selectedApplication = applications.find(
        application => Number(application.id) === applicationId
    );

    if (!selectedApplication) return;

    const confirmed = confirm(
        `Are you sure you want to withdraw your application for ${selectedApplication.job_title} at ${selectedApplication.company_name}?`
    );

    if (!confirmed) return;

    withdrawButton.disabled = true;
    withdrawButton.textContent = "Withdrawing...";

    try {
        const data = await apiRequest(
            `/applications/${applicationId}`,
            {
                method: "DELETE"
            }
        );

        if (!data) {
            showPreviewMode();
            alert("Your session has expired. Please log in again.");
            return;
        }

        applications = applications.filter(
            application => Number(application.id) !== applicationId
        );

        updateStatistics();
        displayApplications(getActiveFilter());

        if (data.message) {
            alert(data.message);
        }
    } catch (error) {
        alert(error.message);

        withdrawButton.disabled = false;
        withdrawButton.textContent = "Withdraw";
    }
}

applicationsList?.addEventListener("click", handleWithdrawal);

function logout() {
    const confirmed = confirm("Are you sure you want to log out?");

    if (!confirmed) return;

    clearUserSession();
    window.location.replace("../index.html");
}

logoutButton?.addEventListener("click", event => {
    event.preventDefault();
    logout();
});

async function initializeApplications() {
    showPreviewMode();

    if (!getToken()) {
        return;
    }

    try {
        const authorized = await fetchUser();

        if (!authorized) {
            showPreviewMode();
            return;
        }

        await fetchApplications();
    } catch (error) {
        console.error("Applications loading error:", error);
        showPreviewMode();
    }
}

initializeApplications();