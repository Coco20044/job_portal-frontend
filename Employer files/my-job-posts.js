const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

let jobs = [];
let isEmployerAuthenticated = false;

const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

const jobsContainer = document.getElementById("jobsContainer");
const emptyState = document.getElementById("emptyState");

const totalJobs = document.getElementById("totalJobs");
const activeJobs = document.getElementById("activeJobs");
const draftJobs = document.getElementById("draftJobs");
const closedJobs = document.getElementById("closedJobs");

const jobSearch = document.getElementById("jobSearch");
const statusFilter = document.getElementById("statusFilter");
const typeFilter = document.getElementById("typeFilter");
const logoutButton = document.getElementById("logoutButton");

function clearUserSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("selectedRole");
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return characters[character];
    });
}

function showPreviewMode() {
    isEmployerAuthenticated = false;
    jobs = [];

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (userName) {
        userName.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (totalJobs) totalJobs.textContent = "—";
    if (activeJobs) activeJobs.textContent = "—";
    if (draftJobs) draftJobs.textContent = "—";
    if (closedJobs) closedJobs.textContent = "—";

    if (jobsContainer) {
        jobsContainer.innerHTML = "";
        jobsContainer.style.display = "none";
    }

    if (emptyState) {
        emptyState.textContent = "Log in as an employer to view and manage your job posts.";
        emptyState.style.display = "block";
    }
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
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

async function loadEmployerInformation() {
    const data = await apiRequest("/auth/me");

    if (!data) return false;

    const employer = data.user || data;

    if (employer.role !== "employer") {
        clearUserSession();
        return false;
    }

    isEmployerAuthenticated = true;

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    const name = employer.name || "Employer";

    if (userName) {
        userName.textContent = name;
    }

    if (userAvatar) {
        userAvatar.textContent = name.charAt(0).toUpperCase();
    }

    return true;
}

async function loadJobs() {
    const data = await apiRequest("/jobs/employer");

    if (!data) return false;

    jobs = data.jobs || [];
    renderPage();

    return true;
}

function getDisplayStatus(status) {
    if (status === "open") return "active";
    return status || "unknown";
}

function formatSalary(job) {
    if (job.salary_min == null && job.salary_max == null) {
        return "Not specified";
    }

    const currency = job.salary_currency || "";

    if (job.salary_min != null && job.salary_max != null) {
        return `${currency}${Number(job.salary_min).toLocaleString()} - ${currency}${Number(job.salary_max).toLocaleString()}`;
    }

    if (job.salary_min != null) {
        return `From ${currency}${Number(job.salary_min).toLocaleString()}`;
    }

    return `Up to ${currency}${Number(job.salary_max).toLocaleString()}`;
}

function formatDate(date) {
    if (!date) return "Not specified";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Not specified";
    }

    return parsedDate.toLocaleDateString();
}

function updateStatistics(allJobs) {
    if (totalJobs) {
        totalJobs.textContent = allJobs.length;
    }

    if (activeJobs) {
        activeJobs.textContent = allJobs.filter(
            job => getDisplayStatus(job.status) === "active"
        ).length;
    }

    if (draftJobs) {
        draftJobs.textContent = allJobs.filter(
            job => getDisplayStatus(job.status) === "draft"
        ).length;
    }

    if (closedJobs) {
        closedJobs.textContent = allJobs.filter(
            job => getDisplayStatus(job.status) === "closed"
        ).length;
    }
}

function displayJobs(filteredJobs) {
    if (!jobsContainer || !emptyState) return;

    jobsContainer.innerHTML = "";

    if (filteredJobs.length === 0) {
        emptyState.textContent = "You haven't posted any jobs yet.";
        emptyState.style.display = "block";
        jobsContainer.style.display = "none";
        return;
    }

    emptyState.style.display = "none";
    jobsContainer.style.display = "flex";

    filteredJobs.forEach(job => {
        const card = document.createElement("div");
        card.className = "job-card";

        const status = getDisplayStatus(job.status);

        const statusClass = {
            active: "status-active",
            draft: "status-draft",
            closed: "status-closed",
            archived: "status-closed",
            expired: "status-expired"
        }[status] || "status-draft";

        const actionButtons = `
            <button class="edit-button" data-action="edit" data-id="${escapeHTML(job.id)}">
                Edit
            </button>

            <button class="applicants-button" data-action="applicants" data-id="${escapeHTML(job.id)}">
                View Applicants
            </button>

            ${status !== "archived" ? `
                <button class="delete-button" data-action="archive" data-id="${escapeHTML(job.id)}">
                    Archive
                </button>
            ` : ""}
        `;

        card.innerHTML = `
            <div class="job-card-top">
                <div class="job-info">
                    <h3>${escapeHTML(job.title)}</h3>
                    <p class="job-company">
                        ${escapeHTML(job.company_name)}
                    </p>
                </div>

                <span class="job-status ${statusClass}">
                    ${escapeHTML(status)}
                </span>
            </div>

            <div class="job-details">
                <span>${escapeHTML(job.location)}</span>
                <span>${escapeHTML(job.employment_type)}</span>
                <span>${escapeHTML(formatSalary(job))}</span>
                <span>Posted: ${escapeHTML(formatDate(job.posted_at))}</span>
            </div>

            <div class="job-card-bottom">
                <p class="applicant-count">
                    ${Number(job.applicants_count) || 0} Applicants
                </p>

                <div class="job-actions">
                    ${actionButtons}
                </div>
            </div>
        `;

        jobsContainer.appendChild(card);
    });
}

function filterJobs() {
    if (!jobSearch || !statusFilter || !typeFilter) {
        displayJobs(jobs);
        return;
    }

    const searchValue = jobSearch.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const selectedType = typeFilter.value;

    const filteredJobs = jobs.filter(job => {
        const status = getDisplayStatus(job.status);

        const matchesSearch =
            (job.title || "").toLowerCase().includes(searchValue) ||
            (job.location || "").toLowerCase().includes(searchValue) ||
            (job.company_name || "").toLowerCase().includes(searchValue);

        const matchesStatus =
            selectedStatus === "all" || status === selectedStatus;

        const matchesType =
            selectedType === "all" || job.employment_type === selectedType;

        return matchesSearch && matchesStatus && matchesType;
    });

    displayJobs(filteredJobs);
}

async function handleJobAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    if (!isEmployerAuthenticated || !getToken()) {
        alert("Please log in as an employer to manage job posts.");
        return;
    }

    const action = button.dataset.action;
    const jobId = button.dataset.id;

    const job = jobs.find(item => String(item.id) === jobId);

    if (!job) {
        alert("Job post not found.");
        return;
    }

    if (action === "edit") {
        window.location.href = `post-job.html?jobId=${encodeURIComponent(jobId)}`;
        return;
    }

    if (action === "applicants") {
        window.location.href = `applicants.html?jobId=${encodeURIComponent(jobId)}`;
        return;
    }

    if (action === "archive") {
        const confirmed = confirm(
            `Are you sure you want to archive "${job.title}"?`
        );

        if (!confirmed) return;

        button.disabled = true;

        try {
            const data = await apiRequest(`/jobs/${encodeURIComponent(jobId)}`, {
                method: "DELETE"
            });

            if (!data) {
                showPreviewMode();
                return;
            }

            alert(data.message || "Job archived successfully.");
            await loadJobs();
        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    }
}

jobsContainer?.addEventListener("click", handleJobAction);

jobSearch?.addEventListener("input", filterJobs);
statusFilter?.addEventListener("change", filterJobs);
typeFilter?.addEventListener("change", filterJobs);

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

async function initializePage() {
    if (!getToken()) {
        showPreviewMode();
        return;
    }

    try {
        const authorized = await loadEmployerInformation();

        if (!authorized) {
            showPreviewMode();
            return;
        }

        const loaded = await loadJobs();

        if (!loaded) {
            showPreviewMode();
        }
    } catch (error) {
        console.error("Employer jobs page error:", error);

        if (emptyState) {
            emptyState.textContent = "Unable to load your jobs. Please refresh the page.";
            emptyState.style.display = "block";
        }

        if (jobsContainer) {
            jobsContainer.style.display = "none";
        }
    }
}

function renderPage() {
    updateStatistics(jobs);
    filterJobs();
}

initializePage();