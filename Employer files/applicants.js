const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";
let applicants = [];
let employerJobs = [];

const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");

const totalApplicants = document.getElementById("totalApplicants");
const pendingApplicants = document.getElementById("pendingApplicants");
const shortlistedApplicants = document.getElementById("shortlistedApplicants");
const interviewApplicants = document.getElementById("interviewApplicants");

const applicantSearch = document.getElementById("applicantSearch");
const jobFilter = document.getElementById("jobFilter");
const statusFilter = document.getElementById("statusFilter");

const applicantsContainer = document.getElementById("applicantsContainer");
const emptyState = document.getElementById("emptyState");
const logoutButton = document.getElementById("logoutButton");

const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

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

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function showPreviewMode() {
    applicants = [];
    employerJobs = [];

    if (userName) {
        userName.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (totalApplicants) {
        totalApplicants.textContent = "—";
    }

    if (pendingApplicants) {
        pendingApplicants.textContent = "—";
    }

    if (shortlistedApplicants) {
        shortlistedApplicants.textContent = "—";
    }

    if (interviewApplicants) {
        interviewApplicants.textContent = "—";
    }

    if (jobFilter) {
        jobFilter.innerHTML = '<option value="all">All Job Posts</option>';
    }

    if (applicantsContainer) {
        applicantsContainer.innerHTML = "";
        applicantsContainer.style.display = "none";
    }

    if (emptyState) {
        emptyState.style.display = "block";
        emptyState.textContent = "Log in as an employer to view and manage applicants.";
    }
}

async function loadEmployerInformation() {
    const data = await apiRequest("/auth/me");

    if (!data) {
        return false;
    }

    const employer = data.user || data;

    if (!employer || employer.role !== "employer") {
        clearUserSession();
        return false;
    }

    const name = employer.name || "Employer";

    if (userName) {
        userName.textContent = name;
    }

    if (userAvatar) {
        userAvatar.textContent = name.charAt(0).toUpperCase();
    }

    return true;
}

async function loadEmployerJobs() {
    const data = await apiRequest("/jobs/employer");

    if (!data) {
        return false;
    }

    employerJobs = data.jobs || [];
    populateJobFilter();

    return true;
}

async function loadApplicants() {
    const data = await apiRequest("/applications/employer");

    if (!data) {
        return false;
    }

    applicants = data.applications || [];

    return true;
}

function populateJobFilter() {
    if (!jobFilter) return;

    const selectedJob = jobFilter.value;
    const requestedJobId = new URLSearchParams(window.location.search).get("jobId");

    jobFilter.innerHTML = `
        <option value="all">All Job Posts</option>
    `;

    employerJobs.forEach(job => {
        const option = document.createElement("option");
        option.value = job.id;
        option.textContent = job.title;
        jobFilter.appendChild(option);
    });

    if (
        requestedJobId &&
        employerJobs.some(job => String(job.id) === requestedJobId)
    ) {
        jobFilter.value = requestedJobId;
    } else if (
        selectedJob !== "all" &&
        employerJobs.some(job => String(job.id) === selectedJob)
    ) {
        jobFilter.value = selectedJob;
    }
}

function updateStatistics() {
    if (totalApplicants) {
        totalApplicants.textContent = applicants.length;
    }

    if (pendingApplicants) {
        pendingApplicants.textContent = applicants.filter(
            applicant => applicant.status === "pending"
        ).length;
    }

    if (shortlistedApplicants) {
        shortlistedApplicants.textContent = applicants.filter(
            applicant => applicant.status === "shortlisted"
        ).length;
    }

    if (interviewApplicants) {
        interviewApplicants.textContent = applicants.filter(
            applicant => applicant.status === "interview"
        ).length;
    }
}

function getStatusClass(status) {
    const validStatuses = [
        "pending",
        "shortlisted",
        "interview",
        "rejected"
    ];

    return validStatuses.includes(status)
        ? `status-${status}`
        : "status-pending";
}

function getApplicantName(applicant) {
    return applicant.applicant_name || applicant.name || "Applicant";
}

function getApplicantEmail(applicant) {
    return applicant.applicant_email || applicant.email || "Email not provided";
}

function getJobTitle(applicant) {
    return applicant.job_title || applicant.title || "Job title unavailable";
}

function formatDate(date) {
    if (!date) return "Date not provided";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date not provided";
    }

    return parsedDate.toLocaleDateString();
}

function displayApplicants() {
    if (!applicantsContainer || !emptyState) return;

    const searchTerm = applicantSearch?.value.toLowerCase().trim() || "";
    const selectedJob = jobFilter?.value || "all";
    const selectedStatus = statusFilter?.value || "all";

    const filteredApplicants = applicants.filter(applicant => {
        const name = getApplicantName(applicant).toLowerCase();
        const email = getApplicantEmail(applicant).toLowerCase();
        const jobTitle = getJobTitle(applicant).toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            email.includes(searchTerm) ||
            jobTitle.includes(searchTerm);

        const matchesJob =
            selectedJob === "all" ||
            String(applicant.job_id) === selectedJob;

        const matchesStatus =
            selectedStatus === "all" ||
            applicant.status === selectedStatus;

        return matchesSearch && matchesJob && matchesStatus;
    });

    applicantsContainer.innerHTML = "";

    if (filteredApplicants.length === 0) {
        emptyState.style.display = "block";
        emptyState.textContent = applicants.length === 0
            ? "No applicants yet. Applications submitted for your job posts will appear here."
            : "No applicants match your current filters.";

        applicantsContainer.style.display = "none";
        return;
    }

    emptyState.style.display = "none";
    applicantsContainer.style.display = "flex";

    filteredApplicants.forEach(applicant => {
        const card = document.createElement("div");
        card.className = "applicant-card";

        const skills = Array.isArray(applicant.skills)
            ? applicant.skills
            : [];

        const status = applicant.status || "pending";
        const safeStatus = getStatusClass(status);

        card.innerHTML = `
            <div class="applicant-info">
                <h3>${escapeHTML(getApplicantName(applicant))}</h3>

                <p class="applicant-email">
                    ${escapeHTML(getApplicantEmail(applicant))}
                </p>

                <p class="applicant-job">
                    Applied for: ${escapeHTML(getJobTitle(applicant))}
                </p>

                <div class="applicant-meta">
                    <span>${escapeHTML(applicant.location || "Location not provided")}</span>
                    <span>${escapeHTML(applicant.experience || "Experience not provided")}</span>
                    <span>${escapeHTML(formatDate(applicant.applied_at || applicant.appliedAt))}</span>
                </div>

                <div class="applicant-skills">
                    ${skills.map(skill => `
                        <span class="skill-tag">
                            ${escapeHTML(skill)}
                        </span>
                    `).join("")}
                </div>

                <div style="margin-top: 15px;">
                    <span class="status-badge ${safeStatus}">
                        ${escapeHTML(status)}
                    </span>
                </div>
            </div>

            <div class="applicant-actions">
                <button
                    class="view-btn"
                    data-action="view"
                    data-id="${escapeHTML(applicant.id)}"
                >
                    View Details
                </button>

                <button
                    class="shortlist-btn"
                    data-action="shortlist"
                    data-id="${escapeHTML(applicant.id)}"
                    ${status === "shortlisted" ? "disabled" : ""}
                >
                    Shortlist
                </button>

                <button
                    class="interview-btn"
                    data-action="interview"
                    data-id="${escapeHTML(applicant.id)}"
                    ${status === "interview" ? "disabled" : ""}
                >
                    Interview
                </button>

                <button
                    class="reject-btn"
                    data-action="reject"
                    data-id="${escapeHTML(applicant.id)}"
                    ${status === "rejected" ? "disabled" : ""}
                >
                    Reject
                </button>
            </div>
        `;

        applicantsContainer.appendChild(card);
    });
}

function viewApplicant(id) {
    const applicant = applicants.find(
        item => String(item.id) === String(id)
    );

    if (!applicant) return;

    const skills = Array.isArray(applicant.skills)
        ? applicant.skills.join(", ")
        : "Not provided";

    alert(`
APPLICANT DETAILS

Name: ${getApplicantName(applicant)}

Email: ${getApplicantEmail(applicant)}

Location: ${applicant.location || "Not provided"}

Experience: ${applicant.experience || "Not provided"}

Job Applied For: ${getJobTitle(applicant)}

Application Date: ${formatDate(applicant.applied_at || applicant.appliedAt)}

Status: ${applicant.status || "pending"}

Skills: ${skills}

Cover Letter:
${applicant.cover_letter || applicant.coverLetter || "No cover letter provided."}
    `);
}

async function updateApplicantStatus(id, newStatus, button) {
    if (!getToken()) {
        alert("Please log in as an employer to manage applicants.");
        return;
    }

    const applicant = applicants.find(
        item => String(item.id) === String(id)
    );

    if (!applicant) {
        alert("Applicant not found.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to change ${getApplicantName(applicant)}'s status to ${newStatus}?`
    );

    if (!confirmed) return;

    button.disabled = true;

    try {
        const data = await apiRequest(
            `/applications/${encodeURIComponent(id)}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus })
            }
        );

        if (!data) {
            showPreviewMode();
            alert("Your session has expired. Please log in again.");
            return;
        }

        applicant.status = newStatus;

        updateStatistics();
        displayApplicants();

        alert(data.message || "Application status updated successfully.");
    } catch (error) {
        alert(error.message);
        button.disabled = false;
    }
}

applicantsContainer?.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const applicantId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "view") {
        if (!getToken()) {
            alert("Please log in as an employer to view applicant details.");
            return;
        }

        viewApplicant(applicantId);
        return;
    }

    const statusMap = {
        shortlist: "shortlisted",
        interview: "interview",
        reject: "rejected"
    };

    if (statusMap[action]) {
        await updateApplicantStatus(
            applicantId,
            statusMap[action],
            button
        );
    }
});

applicantSearch?.addEventListener("input", displayApplicants);
jobFilter?.addEventListener("change", displayApplicants);
statusFilter?.addEventListener("change", displayApplicants);

if (logoutButton) {
    logoutButton.addEventListener("click", event => {
        event.preventDefault();

        clearUserSession();
        window.location.replace("../index.html");
    });
}

async function initializePage() {
    showPreviewMode();

    if (!getToken()) {
        return;
    }

    try {
        const authorized = await loadEmployerInformation();

        if (!authorized) {
            showPreviewMode();
            return;
        }

        const results = await Promise.all([
            loadEmployerJobs(),
            loadApplicants()
        ]);

        if (results.some(result => !result)) {
            showPreviewMode();
            return;
        }

        updateStatistics();
        displayApplicants();
    } catch (error) {
        console.error("Applicants loading error:", error);
        showPreviewMode();
    }
}

initializePage();