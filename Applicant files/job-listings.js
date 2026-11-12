const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || sessionStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark-mode", savedTheme === "dark");
}

initializeTheme();

let jobs = [];
let savedJobs = [];
let appliedJobs = [];
let isJobSeekerAuthenticated = false;

const jobsList = document.getElementById("jobsList");
const jobsCount = document.getElementById("jobsCount");
const emptyState = document.getElementById("emptyState");
const jobSearchForm = document.getElementById("jobSearchForm");
const searchKeyword = document.getElementById("searchKeyword");
const searchLocation = document.getElementById("searchLocation");
const applyFiltersButton = document.getElementById("applyFilters");
const clearFiltersButton = document.getElementById("clearFilters");
const sortJobs = document.getElementById("sortJobs");
const resetSearchButton = document.getElementById("resetSearch");
const logoutButton = document.getElementById("logoutButton");

let currentKeyword = "";
let currentLocation = "";

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

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        clearUserSession();
        isJobSeekerAuthenticated = false;
        savedJobs = [];
        appliedJobs = [];

        throw new Error(data.message || "Please log in to continue.");
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

async function fetchUser() {
    const token = getToken();

    if (!token) {
        showGuestPreview();
        return false;
    }

    try {
        const data = await apiRequest("/auth/me");
        const user = data.user || data;

        if (!user || user.role !== "job_seeker") {
            showGuestPreview();
            return false;
        }

        isJobSeekerAuthenticated = true;

        const userName = user.name || user.email || "Job Seeker";
        const userNameElement = document.getElementById("userName");
        const userAvatar = document.getElementById("userAvatar");

        if (userNameElement) {
            userNameElement.textContent = userName;
        }

        if (userAvatar) {
            userAvatar.textContent = userName.charAt(0).toUpperCase();
        }

        if (logoutButton) {
            logoutButton.hidden = false;
        }

        return true;
    } catch (error) {
        console.error("User loading error:", error);
        clearUserSession();
        showGuestPreview();
        return false;
    }
}

function showGuestPreview() {
    isJobSeekerAuthenticated = false;
    savedJobs = [];
    appliedJobs = [];

    const userNameElement = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (userNameElement) {
        userNameElement.textContent = "Guest";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (logoutButton) {
        logoutButton.hidden = true;
    }
}

async function fetchJobs() {
    const data = await apiRequest("/jobs");

    const jobData = Array.isArray(data)
        ? data
        : data.jobs || data.data || [];

    jobs = jobData.map(job => {
        let skills = [];

        if (Array.isArray(job.required_skills)) {
            skills = job.required_skills;
        } else if (typeof job.required_skills === "string") {
            try {
                const parsed = JSON.parse(job.required_skills);
                skills = Array.isArray(parsed)
                    ? parsed
                    : job.required_skills.split(",");
            } catch {
                skills = job.required_skills.split(",");
            }
        }

        skills = skills.map(skill => String(skill).trim()).filter(Boolean);

        const location = job.location || "Not specified";
        const workLocation = job.work_location ||
            (/remote/i.test(location) ? "Remote" : "Not specified");

        return {
            id: job.id,
            title: job.title || "Untitled Job",
            company: job.company_name || "Company",
            location,
            workLocation,
            employmentType: job.employment_type || "Not specified",
            experienceLevel: job.experience_level || "Not specified",
            salary: formatSalary(job),
            description: job.description || "",
            skills,
            posted: getRelativeDate(job.posted_at)
        };
    });
}

async function fetchSavedJobs() {
    const data = await apiRequest("/saved-jobs");
    const savedJobData = data.jobs || [];

    savedJobs = savedJobData.map(job => job.id);
}

async function fetchApplications() {
    const data = await apiRequest("/applications/my-applications");

    appliedJobs = Array.isArray(data)
        ? data
        : data.applications || data.data || [];
}

function formatSalary(job) {
    const minimum = Number(job.salary_min);
    const maximum = Number(job.salary_max);
    const currency = job.salary_currency || "NGN";

    if (!job.salary_min && !job.salary_max) {
        return "Salary not specified";
    }

    const formatAmount = amount => Number(amount).toLocaleString("en-NG");

    if (job.salary_min && job.salary_max) {
        return `${currency} ${formatAmount(minimum)} - ${formatAmount(maximum)}`;
    }

    if (job.salary_min) {
        return `From ${currency} ${formatAmount(minimum)}`;
    }

    return `Up to ${currency} ${formatAmount(maximum)}`;
}

function getRelativeDate(date) {
    if (!date) return "Recently posted";

    const timestamp = new Date(date).getTime();

    if (Number.isNaN(timestamp)) return "Recently posted";

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

function getCheckedValues(name) {
    return Array.from(
        document.querySelectorAll(`input[name="${name}"]:checked`)
    ).map(checkbox => checkbox.value);
}

function getMinimumSalary(salary) {
    if (!salary) return 0;

    const numbers = String(salary).match(/[\d,]+/g);

    if (!numbers || !numbers.length) return 0;

    return Number(numbers[0].replace(/,/g, ""));
}

function filterJobs() {
    if (!jobsList || !emptyState) return;

    const employmentTypes = getCheckedValues("employmentType");
    const workLocations = getCheckedValues("workLocation");
    const experienceLevels = getCheckedValues("experienceLevel");
    const selectedSalary = document.getElementById("salaryFilter")?.value || "";

    let filteredJobs = jobs.filter(job => {
        const keywordMatch =
            !currentKeyword ||
            job.title.toLowerCase().includes(currentKeyword) ||
            job.company.toLowerCase().includes(currentKeyword) ||
            job.description.toLowerCase().includes(currentKeyword) ||
            job.skills.some(skill => skill.toLowerCase().includes(currentKeyword));

        const locationMatch =
            !currentLocation ||
            job.location.toLowerCase().includes(currentLocation) ||
            job.workLocation.toLowerCase().includes(currentLocation);

        const employmentMatch =
            employmentTypes.length === 0 ||
            employmentTypes.includes(job.employmentType);

        const workLocationMatch =
            workLocations.length === 0 ||
            workLocations.includes(job.workLocation);

        const experienceMatch =
            experienceLevels.length === 0 ||
            experienceLevels.includes(job.experienceLevel);

        const salaryMatch =
            !selectedSalary ||
            getMinimumSalary(job.salary) >= Number(selectedSalary);

        return (
            keywordMatch &&
            locationMatch &&
            employmentMatch &&
            workLocationMatch &&
            experienceMatch &&
            salaryMatch
        );
    });

    const sortValue = sortJobs?.value || "newest";

    if (sortValue === "oldest") {
        filteredJobs.reverse();
    }

    if (sortValue === "title") {
        filteredJobs.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortValue === "salary") {
        filteredJobs.sort(
            (a, b) => getMinimumSalary(b.salary) - getMinimumSalary(a.salary)
        );
    }

    renderJobs(filteredJobs);
}

function renderJobs(jobData) {
    if (!jobsList || !emptyState) return;

    jobsList.innerHTML = "";

    if (jobsCount) {
        jobsCount.textContent = `${jobData.length} jobs found`;
    }

    if (jobData.length === 0) {
        jobsList.hidden = true;
        emptyState.hidden = false;
        return;
    }

    jobsList.hidden = false;
    emptyState.hidden = true;

    jobData.forEach(job => {
        const isSaved = savedJobs.some(
            savedId => String(savedId) === String(job.id)
        );

        const hasApplied = appliedJobs.some(
            application => String(application.job_id) === String(job.id)
        );

        const jobCard = document.createElement("article");
        jobCard.className = "job-card";

        const header = document.createElement("div");
        header.className = "job-card-header";

        const jobHeading = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = job.title;

        const company = document.createElement("p");
        company.className = "company-name";
        company.textContent = job.company;

        jobHeading.append(title, company);

        const saveButton = document.createElement("button");
        saveButton.className = `save-button ${isSaved ? "saved" : ""}`;
        saveButton.dataset.action = "save";
        saveButton.dataset.id = job.id;
        saveButton.type = "button";
        saveButton.textContent = isSaved ? "♥ Saved" : "♡ Save";

        header.append(jobHeading, saveButton);

        const meta = document.createElement("div");
        meta.className = "job-meta";

        [
            job.location,
            job.employmentType,
            job.workLocation,
            job.experienceLevel
        ].forEach(value => {
            if (value === "Not specified") return;

            const span = document.createElement("span");
            span.textContent = value;
            meta.append(span);
        });

        const description = document.createElement("p");
        description.className = "job-description";
        description.textContent = job.description;

        const skillsContainer = document.createElement("div");
        skillsContainer.className = "job-skills";

        job.skills.forEach(skill => {
            const skillElement = document.createElement("span");
            skillElement.textContent = skill;
            skillsContainer.appendChild(skillElement);
        });

        const footer = document.createElement("div");
        footer.className = "job-card-footer";

        const salaryInfo = document.createElement("div");

        const salary = document.createElement("strong");
        salary.textContent = job.salary;

        const posted = document.createElement("small");
        posted.textContent = job.posted;

        salaryInfo.append(salary, posted);

        const applyButton = document.createElement("button");
        applyButton.className = "apply-button";
        applyButton.dataset.action = "apply";
        applyButton.dataset.id = job.id;
        applyButton.type = "button";
        applyButton.disabled = hasApplied;
        applyButton.textContent = hasApplied ? "Applied" : "Apply Now";

        footer.append(salaryInfo, applyButton);

        jobCard.append(header, meta, description, skillsContainer, footer);
        jobsList.appendChild(jobCard);
    });
}

async function handleJobAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    if (!isJobSeekerAuthenticated || !getToken()) {
        alert("Please log in as a job seeker to save jobs or submit applications.");
        window.location.href = "../index.html";
        return;
    }

    const jobId = button.dataset.id;
    const action = button.dataset.action;

    const selectedJob = jobs.find(
        job => String(job.id) === String(jobId)
    );

    if (!selectedJob) return;

    if (action === "save") {
        const alreadySaved = savedJobs.some(
            id => String(id) === String(jobId)
        );

        button.disabled = true;

        try {
            if (alreadySaved) {
                await apiRequest(`/saved-jobs/${jobId}`, {
                    method: "DELETE"
                });

                savedJobs = savedJobs.filter(
                    id => String(id) !== String(jobId)
                );
            } else {
                await apiRequest(`/saved-jobs/${jobId}`, {
                    method: "POST"
                });

                savedJobs.push(jobId);
            }

            filterJobs();
        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    }

    if (action === "apply") {
        const alreadyApplied = appliedJobs.some(
            application => String(application.job_id) === String(jobId)
        );

        if (alreadyApplied) return;

        const confirmed = confirm(
            `Are you sure you want to apply for ${selectedJob.title} at ${selectedJob.company}?`
        );

        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "Applying...";

        try {
            const data = await apiRequest(
                `/jobs/${jobId}/applications`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        cover_letter: "",
                        resume_reference: ""
                    })
                }
            );

            await fetchApplications();

            alert(
                data.message ||
                "Your application has been submitted successfully!"
            );

            filterJobs();
        } catch (error) {
            alert(error.message);
            button.disabled = false;
            button.textContent = "Apply Now";
        }
    }
}

jobsList?.addEventListener("click", handleJobAction);

jobSearchForm?.addEventListener("submit", event => {
    event.preventDefault();

    currentKeyword = searchKeyword?.value.trim().toLowerCase() || "";
    currentLocation = searchLocation?.value.trim().toLowerCase() || "";

    filterJobs();
});

applyFiltersButton?.addEventListener("click", filterJobs);
sortJobs?.addEventListener("change", filterJobs);

clearFiltersButton?.addEventListener("click", () => {
    document.querySelectorAll(
        'input[name="employmentType"], input[name="workLocation"], input[name="experienceLevel"]'
    ).forEach(checkbox => {
        checkbox.checked = false;
    });

    const salaryFilter = document.getElementById("salaryFilter");

    if (salaryFilter) {
        salaryFilter.value = "";
    }

    filterJobs();
});

function resetAllFilters() {
    jobSearchForm?.reset();

    document.querySelectorAll(
        'input[name="employmentType"], input[name="workLocation"], input[name="experienceLevel"]'
    ).forEach(checkbox => {
        checkbox.checked = false;
    });

    currentKeyword = "";
    currentLocation = "";

    if (sortJobs) {
        sortJobs.value = "newest";
    }

    filterJobs();
}

resetSearchButton?.addEventListener("click", resetAllFilters);

logoutButton?.addEventListener("click", event => {
    event.preventDefault();

    const confirmed = confirm("Are you sure you want to log out?");

    if (!confirmed) return;

    clearUserSession();
    window.location.replace("../index.html");
});

async function initializeJobListings() {
    showGuestPreview();

    if (jobsList) {
        jobsList.innerHTML = "";
    }

    if (jobsCount) {
        jobsCount.textContent = "Loading jobs...";
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    try {
        const userAuthenticated = await fetchUser();

        if (userAuthenticated) {
            try {
                await Promise.all([
                    fetchSavedJobs(),
                    fetchApplications()
                ]);
            } catch (error) {
                console.error("Unable to load saved jobs or applications:", error);
                savedJobs = [];
                appliedJobs = [];
            }
        }

        await fetchJobs();
        filterJobs();
    } catch (error) {
        console.error("Job listings loading error:", error);

        if (jobsList) {
            jobsList.innerHTML = "";
            jobsList.hidden = true;
        }

        if (jobsCount) {
            jobsCount.textContent = "Unable to load jobs";
        }

        if (emptyState) {
            emptyState.hidden = false;
            emptyState.textContent = error.message;
        }
    }
}

initializeJobListings();