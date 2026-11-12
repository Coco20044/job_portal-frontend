const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const getToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
};

const logoutButton = document.getElementById("logoutButton");
const themeToggle = document.getElementById("themeToggle");

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".dashboard-section");

const pageTitle = document.getElementById("pageTitle");
const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");

const totalUsers = document.getElementById("totalUsers");
const totalJobSeekers = document.getElementById("totalJobSeekers");
const totalEmployers = document.getElementById("totalEmployers");
const totalJobs = document.getElementById("totalJobs");
const openJobs = document.getElementById("openJobs");
const closedJobs = document.getElementById("closedJobs");
const archivedJobs = document.getElementById("archivedJobs");

const usersTableBody = document.getElementById("usersTableBody");
const jobsTableBody = document.getElementById("jobsTableBody");

const jobSearch = document.getElementById("jobSearch");
const jobStatusFilter = document.getElementById("jobStatusFilter");

let users = [];
let jobs = [];
let isAdminAuthenticated = false;

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
        return null;
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

function showPreviewMode() {
    adminName.textContent = "Dashboard Preview";
    adminEmail.textContent = "Public Preview";

    usersTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-state">Log in as an administrator to view registered users.</td>
        </tr>
    `;

    jobsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">Log in as an administrator to view and manage job listings.</td>
        </tr>
    `;
}

async function loadAdminInformation() {
    const data = await apiRequest("/auth/me");

    if (!data) return false;

    const user = data.user || data;

    if (user.role !== "admin") return false;

    adminName.textContent = user.name || "Administrator";
    adminEmail.textContent = user.email || "";

    return true;
}

async function loadUsers() {
    const data = await apiRequest("/admin/users");

    if (!data) return;

    users = data.users || [];

    displayUsers();
    updateStatistics();
}

async function loadJobs() {
    const data = await apiRequest("/admin/jobs");

    if (!data) return;

    jobs = data.jobs || [];

    displayJobs();
    updateStatistics();
}

function updateStatistics() {
    totalUsers.textContent = users.length;

    totalJobSeekers.textContent = users.filter(
        user => user.role === "job_seeker"
    ).length;

    totalEmployers.textContent = users.filter(
        user => user.role === "employer"
    ).length;

    totalJobs.textContent = jobs.length;

    openJobs.textContent = jobs.filter(
        job => job.status === "open"
    ).length;

    closedJobs.textContent = jobs.filter(
        job => job.status === "closed"
    ).length;

    archivedJobs.textContent = jobs.filter(
        job => job.status === "archived"
    ).length;
}

function formatDate(date) {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Not available";
    }

    return parsedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function displayUsers() {
    if (!users.length) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">No registered users found.</td>
            </tr>
        `;
        return;
    }

    usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHTML(user.name || "N/A")}</td>
            <td>${escapeHTML(user.email || "N/A")}</td>
            <td>${escapeHTML(formatRole(user.role))}</td>
            <td>${formatDate(user.created_at)}</td>
        </tr>
    `).join("");
}

function formatRole(role) {
    const roles = {
        job_seeker: "Job Seeker",
        employer: "Employer",
        admin: "Admin"
    };

    return roles[role] || role || "Unknown";
}

function displayJobs() {
    const search = jobSearch.value.trim().toLowerCase();
    const status = jobStatusFilter.value;

    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            (job.title || "").toLowerCase().includes(search) ||
            (job.company_name || "").toLowerCase().includes(search);

        const matchesStatus =
            status === "all" || job.status === status;

        return matchesSearch && matchesStatus;
    });

    if (!filteredJobs.length) {
        jobsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">No jobs found.</td>
            </tr>
        `;
        return;
    }

    jobsTableBody.innerHTML = filteredJobs.map(job => `
        <tr>
            <td>${escapeHTML(job.title || "N/A")}</td>
            <td>${escapeHTML(job.company_name || "N/A")}</td>
            <td>${escapeHTML(job.location || "N/A")}</td>
            <td>${escapeHTML(String(job.employer_id ?? "N/A"))}</td>
            <td>
                <span class="status-badge ${escapeHTML(job.status || "")}">
                    ${escapeHTML(job.status || "Unknown")}
                </span>
            </td>
            <td>${formatDate(job.posted_at)}</td>
            <td>
                <select class="job-status-select" data-job-id="${Number(job.id)}">
                    <option value="open" ${job.status === "open" ? "selected" : ""}>Open</option>
                    <option value="closed" ${job.status === "closed" ? "selected" : ""}>Closed</option>
                    <option value="archived" ${job.status === "archived" ? "selected" : ""}>Archived</option>
                </select>
            </td>
        </tr>
    `).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function updateJobStatus(jobId, status, selectElement) {
    if (!isAdminAuthenticated) {
        alert("Only an authenticated administrator can update job statuses.");
        displayJobs();
        return;
    }

    const previousStatus = jobs.find(
        job => Number(job.id) === Number(jobId)
    )?.status;

    if (!previousStatus) return;

    selectElement.disabled = true;

    try {
        const data = await apiRequest(`/admin/jobs/${jobId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        if (!data) {
            alert("Your admin session is invalid or has expired. Please log in again.");
            displayJobs();
            return;
        }

        const job = jobs.find(
            item => Number(item.id) === Number(jobId)
        );

        if (job) {
            job.status = status;
        }

        displayJobs();
        updateStatistics();

    } catch (error) {
        alert(error.message);
        selectElement.value = previousStatus;
        selectElement.disabled = false;
    }
}

navLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const sectionName = link.dataset.section;

        navLinks.forEach(item => item.classList.remove("active"));
        sections.forEach(section => section.classList.remove("active"));

        link.classList.add("active");

        const selectedSection = document.getElementById(
            `${sectionName}Section`
        );

        if (selectedSection) {
            selectedSection.classList.add("active");
        }

        const titles = {
            overview: "Dashboard Overview",
            users: "User Management",
            jobs: "Job Management"
        };

        pageTitle.textContent = titles[sectionName] || "Admin Dashboard";
    });
});

jobsTableBody.addEventListener("change", event => {
    if (!event.target.classList.contains("job-status-select")) return;

    const jobId = event.target.dataset.jobId;
    const status = event.target.value;

    updateJobStatus(jobId, status, event.target);
});

jobSearch.addEventListener("input", displayJobs);
jobStatusFilter.addEventListener("change", displayJobs);

logoutButton.addEventListener("click", () => {
    if (!confirm("Are you sure you want to log out?")) return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedRole");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("selectedRole");

    window.location.replace("../index.html");
});

function initializeTheme() {
    const currentTheme = localStorage.getItem("theme") || "light";

    document.body.classList.toggle(
        "dark-mode",
        currentTheme === "dark"
    );

    themeToggle.textContent =
        currentTheme === "dark" ? "Dark Mode" : "Light Mode";
}

themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    const theme = isDark ? "dark" : "light";

    localStorage.setItem("theme", theme);

    themeToggle.textContent = isDark ? "Dark Mode" : "Light Mode";
});

async function initializeDashboard() {
    initializeTheme();

    if (!getToken()) {
        showPreviewMode();
        return;
    }

    try {
        const authorized = await loadAdminInformation();

        if (!authorized) {
            showPreviewMode();
            return;
        }

        isAdminAuthenticated = true;

        await Promise.all([
            loadUsers(),
            loadJobs()
        ]);

    } catch (error) {
        console.error("Dashboard initialization error:", error);
        showPreviewMode();
    }
}

initializeDashboard();