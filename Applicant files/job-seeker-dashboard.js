const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || sessionStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark-mode", savedTheme === "dark");
}

initializeTheme();

let dashboardData = {
    user: null,
    statistics: {
        savedJobs: 0,
        applications: 0,
        interviews: 0
    },
    recommendedJobs: [],
    recentActivity: []
};

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

async function apiRequest(endpoint) {
    const token = getToken();

    if (!token) return null;

    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        clearUserSession();
        return null;
    }

    if (!response.ok) {
        throw new Error(data.message || "Unable to load dashboard data.");
    }

    return data;
}

function getRelativeDate(date) {
    if (!date) return "Recently";

    const timestamp = new Date(date).getTime();

    if (Number.isNaN(timestamp)) return "Recently";

    const difference = Date.now() - timestamp;
    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return new Date(date).toLocaleDateString();
}

function clearDashboard() {
    const welcomeName = document.getElementById("welcomeName");
    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");
    const savedJobsCount = document.getElementById("savedJobsCount");
    const applicationsCount = document.getElementById("applicationsCount");
    const interviewsCount = document.getElementById("interviewsCount");
    const recommendedJobs = document.getElementById("recommendedJobs");
    const recentActivity = document.getElementById("recentActivity");

    if (welcomeName) welcomeName.textContent = "Welcome";
    if (userName) userName.textContent = "Guest Preview";
    if (userAvatar) userAvatar.textContent = "G";
    if (savedJobsCount) savedJobsCount.textContent = "—";
    if (applicationsCount) applicationsCount.textContent = "—";
    if (interviewsCount) interviewsCount.textContent = "—";
    if (recommendedJobs) recommendedJobs.textContent = "Log in to view recommended jobs.";
    if (recentActivity) recentActivity.textContent = "Log in to view your recent activity.";
}

async function fetchUser() {
    const data = await apiRequest("/auth/me");

    if (!data) return null;

    const user = data.user || data;

    if (!user || user.role !== "job_seeker") return null;

    dashboardData.user = user;

    const fullName =
        user.name ||
        user.fullName ||
        user.email?.split("@")[0] ||
        "Job Seeker";

    const firstName = fullName.split(" ")[0];

    const welcomeName = document.getElementById("welcomeName");
    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (welcomeName) welcomeName.textContent = firstName;
    if (userName) userName.textContent = fullName;
    if (userAvatar) {
        userAvatar.textContent = firstName.charAt(0).toUpperCase();
    }

    return user;
}

async function fetchJobs() {
    const data = await apiRequest("/jobs");

    if (!data) return;

    const jobs = Array.isArray(data)
        ? data
        : data.jobs || data.data || [];

    dashboardData.recommendedJobs = jobs.slice(0, 3);
}

async function fetchSavedJobs() {
    const data = await apiRequest("/saved-jobs");

    if (!data) return;

    const jobs = data.jobs || [];

    dashboardData.statistics.savedJobs =
        Number(data.count ?? jobs.length);
}

async function fetchApplications() {
    const data = await apiRequest("/applications/my-applications");

    if (!data) return;

    const applications = data.applications || [];

    dashboardData.statistics.applications =
        Number(data.count ?? applications.length);

    dashboardData.statistics.interviews = applications.filter(
        application => {
            const status = String(application.status || "").toLowerCase();

            return ["shortlisted", "accepted"].includes(status);
        }
    ).length;

    dashboardData.recentActivity = applications
        .slice()
        .sort((a, b) => {
            return new Date(b.applied_at || 0) -
                new Date(a.applied_at || 0);
        })
        .slice(0, 3)
        .map(createActivity);
}

function createActivity(application) {
    const status = String(application.status || "pending").toLowerCase();
    const company = application.company_name || "a company";
    const title = application.job_title || "a job";

    let activity = {
        type: "applied",
        icon: "↗",
        title: "Application submitted",
        description: `You applied for ${title} at ${company}.`
    };

    if (status === "shortlisted") {
        activity = {
            type: "interview",
            icon: "✓",
            title: "Application shortlisted",
            description: `Your application for ${title} at ${company} has been shortlisted.`
        };
    } else if (status === "reviewing") {
        activity = {
            type: "review",
            icon: "◷",
            title: "Application under review",
            description: `Your application for ${title} at ${company} is being reviewed.`
        };
    } else if (status === "rejected") {
        activity = {
            type: "review",
            icon: "×",
            title: "Application update",
            description: `Your application for ${title} at ${company} was not selected.`
        };
    } else if (status === "accepted") {
        activity = {
            type: "interview",
            icon: "✓",
            title: "Application accepted",
            description: `Your application for ${title} at ${company} was accepted.`
        };
    }

    return {
        ...activity,
        date: getRelativeDate(application.applied_at)
    };
}

function displayStatistics() {
    document.getElementById("savedJobsCount").textContent =
        dashboardData.statistics.savedJobs;

    document.getElementById("applicationsCount").textContent =
        dashboardData.statistics.applications;

    document.getElementById("interviewsCount").textContent =
        dashboardData.statistics.interviews;
}

function formatSalary(job) {
    const minimum = job.salary_min;
    const maximum = job.salary_max;
    const currency = job.salary_currency || "";

    if (minimum == null && maximum == null) {
        return "Not specified";
    }

    const formatAmount = amount => {
        return Number(amount).toLocaleString();
    };

    if (minimum != null && maximum != null) {
        return `${currency} ${formatAmount(minimum)} - ${formatAmount(maximum)}`.trim();
    }

    if (minimum != null) {
        return `${currency} ${formatAmount(minimum)}+`.trim();
    }

    return `Up to ${currency} ${formatAmount(maximum)}`.trim();
}

function displayRecommendedJobs() {
    const jobsContainer = document.getElementById("recommendedJobs");

    jobsContainer.innerHTML = "";

    if (!dashboardData.recommendedJobs.length) {
        jobsContainer.textContent = "No jobs available at the moment.";
        return;
    }

    dashboardData.recommendedJobs.forEach(job => {
        const title = job.title || "Untitled Job";
        const company = job.company_name || "Company";
        const location = job.location || "Location not specified";
        const type = String(job.employment_type || "Not specified")
            .replaceAll("_", " ")
            .replace(/\b\w/g, character => character.toUpperCase());

        const jobElement = document.createElement("article");
        jobElement.className = "job-item";

        const logo = document.createElement("div");
        logo.className = "company-logo";
        logo.textContent = company.charAt(0).toUpperCase();

        const info = document.createElement("div");
        info.className = "job-info";

        const heading = document.createElement("h3");
        heading.textContent = title;

        const companyName = document.createElement("p");
        companyName.className = "job-company";
        companyName.textContent = company;

        const tags = document.createElement("div");
        tags.className = "job-tags";

        const locationTag = document.createElement("span");
        locationTag.textContent = location;

        const typeTag = document.createElement("span");
        typeTag.textContent = type;

        tags.append(locationTag, typeTag);
        info.append(heading, companyName, tags);

        const salaryElement = document.createElement("span");
        salaryElement.className = "job-salary";
        salaryElement.textContent = formatSalary(job);

        jobElement.append(logo, info, salaryElement);
        jobsContainer.appendChild(jobElement);
    });
}

function displayRecentActivity() {
    const activityContainer = document.getElementById("recentActivity");

    activityContainer.innerHTML = "";

    if (!dashboardData.recentActivity.length) {
        activityContainer.textContent = "No recent activity yet.";
        return;
    }

    dashboardData.recentActivity.forEach(activity => {
        const activityElement = document.createElement("article");
        activityElement.className = "activity-item";

        const icon = document.createElement("div");
        icon.className = `activity-icon activity-${activity.type}`;
        icon.textContent = activity.icon;

        const info = document.createElement("div");
        info.className = "activity-info";

        const heading = document.createElement("h4");
        heading.textContent = activity.title;

        const description = document.createElement("p");
        description.textContent = activity.description;

        const date = document.createElement("small");
        date.textContent = activity.date;

        info.append(heading, description, date);
        activityElement.append(icon, info);

        activityContainer.appendChild(activityElement);
    });
}

function handleLogout() {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", event => {
        event.preventDefault();

        if (confirm("Are you sure you want to log out?")) {
            clearUserSession();
            window.location.replace("../index.html");
        }
    });
}

async function initializeDashboard() {
    clearDashboard();
    handleLogout();

    const token = getToken();

    if (!token) return;

    try {
        const user = await fetchUser();

        if (!user) return;

        await Promise.all([
            fetchJobs(),
            fetchSavedJobs(),
            fetchApplications()
        ]);

        displayStatistics();
        displayRecommendedJobs();
        displayRecentActivity();

    } catch (error) {
        console.error("Dashboard loading error:", error);

        const recommendedJobs = document.getElementById("recommendedJobs");
        const recentActivity = document.getElementById("recentActivity");

        if (recommendedJobs) {
            recommendedJobs.textContent = "Unable to load dashboard data.";
        }

        if (recentActivity) {
            recentActivity.textContent = "Unable to load recent activity.";
        }
    }
}

function showThemeNotice() {
    const notice = document.getElementById("themeNotice");

    if (!notice) return;

    let startY = 0;
    let noticeTimeout;

    const dismissNotice = () => {
        notice.classList.remove("show");
        clearTimeout(noticeTimeout);
    };

    notice.addEventListener("touchstart", event => {
        startY = event.changedTouches[0].clientY;
    }, { passive: true });

    notice.addEventListener("touchend", event => {
        const endY = event.changedTouches[0].clientY;
        const swipeDistance = startY - endY;

        if (swipeDistance > 40) {
            dismissNotice();
        }
    }, { passive: true });

    const closeButton = notice.querySelector(".theme-notice-close");

    if (closeButton) {
        closeButton.addEventListener("click", dismissNotice);
    }

    requestAnimationFrame(() => {
        notice.classList.add("show");
    });

    noticeTimeout = setTimeout(dismissNotice, 6000);
}

showThemeNotice();
initializeDashboard();