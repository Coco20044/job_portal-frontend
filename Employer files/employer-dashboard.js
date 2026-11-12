const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const activeJobsCount = document.getElementById("activeJobsCount");
const totalApplicantsCount = document.getElementById("totalApplicantsCount");
const shortlistedCount = document.getElementById("shortlistedCount");
const interviewsCount = document.getElementById("interviewsCount");

const employerJobsContainer = document.getElementById("employerJobs");
const recentApplicantsContainer = document.getElementById("recentApplicants");

const logoutButton = document.getElementById("logoutButton");
const postJobButton = document.getElementById("postJobButton");

let employerJobs = [];
let recentApplicants = [];
let isEmployerAuthenticated = false;

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

function showMessage(container, message) {
    if (!container) return;

    container.innerHTML = "";

    const emptyState = document.createElement("div");
    emptyState.className = "dashboard-empty";
    emptyState.textContent = message;

    container.appendChild(emptyState);
}

function showPreviewMode() {
    isEmployerAuthenticated = false;
    employerJobs = [];
    recentApplicants = [];

    const userNameElement = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (userNameElement) {
        userNameElement.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (activeJobsCount) activeJobsCount.textContent = "—";
    if (totalApplicantsCount) totalApplicantsCount.textContent = "—";
    if (shortlistedCount) shortlistedCount.textContent = "—";
    if (interviewsCount) interviewsCount.textContent = "—";

    showMessage(
        employerJobsContainer,
        "Log in as an employer to view your posted jobs."
    );

    showMessage(
        recentApplicantsContainer,
        "Log in as an employer to view recent applicants."
    );
}

async function apiRequest(endpoint) {
    const token = getToken();

    if (!token) return null;

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
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

async function loadEmployer() {
    const data = await apiRequest("/auth/me");

    if (!data) return false;

    const user = data.user || data;

    if (user.role !== "employer") {
        clearUserSession();
        return false;
    }

    isEmployerAuthenticated = true;

    const employerName = user.name || "Employer";

    const userNameElement = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (userNameElement) {
        userNameElement.textContent = employerName;
    }

    if (userAvatar) {
        userAvatar.textContent = employerName.charAt(0).toUpperCase();
    }

    return true;
}

async function loadEmployerJobs() {
    const data = await apiRequest("/jobs/employer");

    if (!data) return false;

    employerJobs = data.jobs || [];

    displayEmployerJobs();
    displayStatistics();

    return true;
}

async function loadRecentApplicants() {
    const data = await apiRequest("/applications/employer");

    if (!data) return false;

    recentApplicants = data.applications || [];

    displayRecentApplicants();
    displayStatistics();

    return true;
}

function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatJobStatus(status) {
    if (!status) return "Unknown";

    return status.charAt(0).toUpperCase() + status.slice(1);
}

function displayStatistics() {
    const activeJobs = employerJobs.filter(
        job => job.status === "open"
    ).length;

    const totalApplicants = recentApplicants.length;

    const shortlisted = recentApplicants.filter(
        applicant => applicant.status?.toLowerCase() === "shortlisted"
    ).length;

    const interviews = recentApplicants.filter(
        applicant => applicant.status?.toLowerCase() === "interview"
    ).length;

    if (activeJobsCount) {
        activeJobsCount.textContent = activeJobs;
    }

    if (totalApplicantsCount) {
        totalApplicantsCount.textContent = totalApplicants;
    }

    if (shortlistedCount) {
        shortlistedCount.textContent = shortlisted;
    }

    if (interviewsCount) {
        interviewsCount.textContent = interviews;
    }
}

function displayEmployerJobs() {
    if (!employerJobsContainer) return;

    employerJobsContainer.innerHTML = "";

    if (employerJobs.length === 0) {
        showMessage(
            employerJobsContainer,
            "You haven't posted any jobs yet."
        );
        return;
    }

    employerJobs.forEach(job => {
        const jobCard = document.createElement("div");

        jobCard.className = "employer-job-card";

        const jobInfo = document.createElement("div");
        jobInfo.className = "job-info";

        const title = document.createElement("h3");
        title.textContent = job.title;

        const company = document.createElement("p");
        company.className = "job-company";
        company.textContent = job.company_name || "";

        const details = document.createElement("div");
        details.className = "job-details";

        const location = document.createElement("span");
        location.textContent = job.location || "Location not specified";

        const employmentType = document.createElement("span");
        employmentType.textContent = job.employment_type || "Not specified";

        const posted = document.createElement("span");
        posted.textContent = `Posted ${formatDate(job.posted_at)}`;

        details.append(location, employmentType, posted);
        jobInfo.append(title, company, details);

        const right = document.createElement("div");
        right.className = "job-card-right";

        const applicants = document.createElement("span");
        applicants.className = "applicant-count";
        applicants.textContent = `${Number(job.applicants_count || 0)} Applicants`;

        const status = document.createElement("span");
        status.className = "job-status";
        status.textContent = formatJobStatus(job.status);

        right.append(applicants, status);
        jobCard.append(jobInfo, right);

        employerJobsContainer.appendChild(jobCard);
    });
}

function displayRecentApplicants() {
    if (!recentApplicantsContainer) return;

    recentApplicantsContainer.innerHTML = "";

    if (recentApplicants.length === 0) {
        showMessage(
            recentApplicantsContainer,
            "No applicants yet."
        );
        return;
    }

    recentApplicants.slice(0, 5).forEach(applicant => {
        const applicantCard = document.createElement("div");

        applicantCard.className = "applicant-card";

        const name = applicant.applicant_name || "Applicant";

        const initials = name
            .split(" ")
            .map(part => part.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase();

        const applicantInfo = document.createElement("div");
        applicantInfo.className = "applicant-info";

        const avatar = document.createElement("div");
        avatar.className = "applicant-avatar";
        avatar.textContent = initials;

        const details = document.createElement("div");

        const applicantName = document.createElement("h3");
        applicantName.textContent = name;

        const jobTitle = document.createElement("p");
        jobTitle.textContent = `Applied for ${applicant.job_title || "a job"}`;

        details.append(applicantName, jobTitle);
        applicantInfo.append(avatar, details);

        const status = document.createElement("span");
        status.className = "applicant-status";
        status.textContent = formatJobStatus(applicant.status);

        applicantCard.append(applicantInfo, status);

        recentApplicantsContainer.appendChild(applicantCard);
    });
}

function showThemeNotice() {
    const notice = document.getElementById("themeNotice");

    if (!notice) return;

    requestAnimationFrame(() => {
        notice.classList.add("show");
    });

    setTimeout(() => {
        notice.classList.remove("show");
    }, 6000);
}

if (postJobButton) {
    postJobButton.addEventListener("click", () => {
        if (!isEmployerAuthenticated || !getToken()) {
            alert("Please log in as an employer to post a job.");
            return;
        }

        window.location.href = "post-job.html";
    });
}

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

async function initializeDashboard() {
    showThemeNotice();

    if (!getToken()) {
        showPreviewMode();
        return;
    }

    try {
        const authorized = await loadEmployer();

        if (!authorized) {
            showPreviewMode();
            return;
        }

        const results = await Promise.all([
            loadEmployerJobs(),
            loadRecentApplicants()
        ]);

        if (results.some(result => !result)) {
            showPreviewMode();
        }
    } catch (error) {
        console.error("Employer dashboard error:", error);

        showMessage(
            employerJobsContainer,
            "Unable to load your jobs. Please refresh the page."
        );

        showMessage(
            recentApplicantsContainer,
            "Unable to load recent applicants."
        );
    }
}

initializeDashboard();