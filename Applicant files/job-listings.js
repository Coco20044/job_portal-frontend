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

function normalizeValue(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeEmploymentType(value) {
    const normalized = normalizeValue(value);

    const aliases = {
        fulltime: "full-time",
        "full time": "full-time",
        parttime: "part-time",
        "part time": "part-time",
        internship: "internship",
        intern: "internship",
        contract: "contract"
    };

    return aliases[normalized] || normalized;
}

function normalizeWorkLocation(value) {
    const normalized = normalizeValue(value);

    const aliases = {
        remote: "remote",
        onsite: "on-site",
        "on site": "on-site",
        office: "on-site",
        hybrid: "hybrid"
    };

    return aliases[normalized] || normalized;
}

function normalizeExperienceLevel(value) {
    const normalized = normalizeValue(value);

    const aliases = {
        entry: "entry-level",
        "entry level": "entry-level",
        entrylevel: "entry-level",
        junior: "junior",
        internship: "internship",
        intern: "internship",
        graduate: "entry-level",
        senior: "senior",
        mid: "mid-level",
        "mid level": "mid-level",
        midlevel: "mid-level"
    };

    return aliases[normalized] || normalized;
}

function parseAmount(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const amount = Number(String(value).replace(/[^\d.-]/g, ""));

    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function formatSalary(job) {
    const minimum = parseAmount(job.salary_min ?? job.salaryMin);
    const maximum = parseAmount(job.salary_max ?? job.salaryMax);
    const currency = job.salary_currency || job.salaryCurrency || "NGN";

    if (minimum !== null && maximum !== null) {
        return `${currency} ${minimum.toLocaleString("en-NG")} - ${maximum.toLocaleString("en-NG")}`;
    }

    if (minimum !== null) {
        return `From ${currency} ${minimum.toLocaleString("en-NG")}`;
    }

    if (maximum !== null) {
        return `Up to ${currency} ${maximum.toLocaleString("en-NG")}`;
    }

    return job.salary || job.salary_range || job.salaryRange || "Salary not specified";
}

function getSalaryValue(job) {
    return job.salaryMinimum ?? job.salaryMaximum ?? null;
}

function getJobDate(job) {
    return job.posted_at ||
        job.postedAt ||
        job.date_posted ||
        job.datePosted ||
        job.created_at ||
        job.createdAt ||
        job.published_at ||
        job.publishedAt ||
        null;
}

function formatJobDate(dateValue) {
    if (!dateValue) {
        return "Date not available";
    }

    const dateString = String(dateValue);
    const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

    let date;

    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        date = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
        date = new Date(dateValue);
    }

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getDateTimestamp(dateValue) {
    if (!dateValue) return 0;

    const dateString = String(dateValue);
    const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        ).getTime();
    }

    const timestamp = new Date(dateValue).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function parseSkills(value) {
    if (Array.isArray(value)) {
        return value.map(skill => String(skill).trim()).filter(Boolean);
    }

    if (typeof value !== "string" || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.map(skill => String(skill).trim()).filter(Boolean);
        }
    } catch (error) {
        return value.split(/[,;|]/).map(skill => skill.trim()).filter(Boolean);
    }

    return value.split(/[,;|]/).map(skill => skill.trim()).filter(Boolean);
}

function prepareJob(job) {
    const location = job.location || job.job_location || "Not specified";

    const rawWorkLocation =
        job.work_location ||
        job.workLocation ||
        job.work_mode ||
        job.workMode ||
        (/remote/i.test(location) ? "Remote" : "");

    const rawExperience =
        job.experience_level ||
        job.experienceLevel ||
        job.experience ||
        "";

    const rawEmployment =
        job.employment_type ||
        job.employmentType ||
        job.job_type ||
        job.jobType ||
        "";

    const date = getJobDate(job);
    const salaryMinimum = parseAmount(job.salary_min ?? job.salaryMin);
    const salaryMaximum = parseAmount(job.salary_max ?? job.salaryMax);

    return {
        id: job.id,
        title: job.title || "Untitled Job",
        company: job.company_name || job.companyName || job.company || "Company",
        location,
        normalizedLocation: normalizeValue(location),
        workLocation: rawWorkLocation
            ? normalizeWorkLocation(rawWorkLocation)
            : "not specified",
        employmentType: rawEmployment
            ? normalizeEmploymentType(rawEmployment)
            : "not specified",
        experienceLevel: rawExperience
            ? normalizeExperienceLevel(rawExperience)
            : "",
        salary: formatSalary(job),
        salaryMinimum,
        salaryMaximum,
        description: job.description || "",
        skills: parseSkills(
            job.required_skills ??
            job.requiredSkills ??
            job.skills
        ),
        date,
        posted: formatJobDate(date)
    };
}

async function fetchJobs() {
    const data = await apiRequest("/jobs");

    const jobData = Array.isArray(data)
        ? data
        : data.jobs || data.data || [];

    jobs = jobData.map(prepareJob);
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

function getCheckedValues(name) {
    return Array.from(
        document.querySelectorAll(`input[name="${name}"]:checked`)
    ).map(checkbox => normalizeValue(checkbox.value));
}

function matchesExperience(job, selectedLevels) {
    if (selectedLevels.length === 0) {
        return true;
    }

    return selectedLevels.some(level => {
        if (level === "internship") {
            return job.experienceLevel === "internship" ||
                job.employmentType === "internship";
        }

        if (level === "junior") {
            if (job.experienceLevel) {
                return job.experienceLevel === "junior";
            }

            return /\bjunior\b/i.test(job.title);
        }

        if (level === "entry level") {
            if (job.experienceLevel) {
                return job.experienceLevel === "entry-level";
            }

            return /\b(entry.level|graduate|junior)\b/i.test(job.title);
        }

        return normalizeValue(job.experienceLevel) === level;
    });
}

function filterJobs() {
    if (!jobsList || !emptyState) return;

    const employmentTypes = getCheckedValues("employmentType");
    const workLocations = getCheckedValues("workLocation");
    const experienceLevels = getCheckedValues("experienceLevel");
    const selectedSalary = Number(
        document.getElementById("salaryFilter")?.value || 0
    );

    let filteredJobs = jobs.filter(job => {
        const keyword = normalizeValue(currentKeyword);
        const locationSearch = normalizeValue(currentLocation);

        const searchableText = normalizeValue([
            job.title,
            job.company,
            job.description,
            ...job.skills
        ].join(" "));

        const keywordMatch =
            !keyword || searchableText.includes(keyword);

        const locationMatch =
            !locationSearch ||
            job.normalizedLocation.includes(locationSearch) ||
            normalizeValue(job.workLocation).includes(locationSearch);

        const employmentMatch =
            employmentTypes.length === 0 ||
            employmentTypes.includes(normalizeValue(job.employmentType));

        const workLocationMatch =
            workLocations.length === 0 ||
            workLocations.includes(normalizeValue(job.workLocation));

        const experienceMatch =
            matchesExperience(job, experienceLevels);

        const salaryValue = getSalaryValue(job);

        const salaryMatch =
            !selectedSalary ||
            (salaryValue !== null && salaryValue >= selectedSalary);

        return keywordMatch &&
            locationMatch &&
            employmentMatch &&
            workLocationMatch &&
            experienceMatch &&
            salaryMatch;
    });

    const sortValue = sortJobs?.value || "newest";

    if (sortValue === "newest") {
        filteredJobs.sort(
            (a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date)
        );
    } else if (sortValue === "oldest") {
        filteredJobs.sort(
            (a, b) => getDateTimestamp(a.date) - getDateTimestamp(b.date)
        );
    } else if (sortValue === "salary-high") {
        filteredJobs.sort(
            (a, b) => (getSalaryValue(b) ?? -1) - (getSalaryValue(a) ?? -1)
        );
    } else if (sortValue === "salary-low") {
        filteredJobs.sort(
            (a, b) => (getSalaryValue(a) ?? Infinity) - (getSalaryValue(b) ?? Infinity)
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
        jobHeading.className = "job-title-info";

        const title = document.createElement("h3");
        title.textContent = job.title;

        const company = document.createElement("p");
        company.className = "company-name";
        company.textContent = job.company;

        jobHeading.append(title, company);

        const saveButton = document.createElement("button");
        saveButton.className = `save-job ${isSaved ? "saved" : ""}`;
        saveButton.dataset.action = "save";
        saveButton.dataset.id = job.id;
        saveButton.type = "button";
        saveButton.textContent = isSaved ? "♥ Saved" : "♡ Save";

        header.append(jobHeading, saveButton);

        const meta = document.createElement("div");
        meta.className = "job-details";

        const metaValues = [
            job.location,
            job.employmentType === "not specified"
                ? ""
                : job.employmentType,
            job.workLocation === "not specified"
                ? ""
                : job.workLocation,
            job.experienceLevel
        ];

        const displayedMeta = new Set();

        metaValues.forEach(value => {
            if (!value || value === "Not specified") return;

            const normalized = normalizeValue(value);

            if (displayedMeta.has(normalized)) return;

            displayedMeta.add(normalized);

            const span = document.createElement("span");
            span.textContent = String(value)
                .replace(/\b\w/g, character => character.toUpperCase());

            meta.appendChild(span);
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
        salaryInfo.className = "job-salary-info";

        const salary = document.createElement("strong");
        salary.className = "job-salary";
        salary.textContent = job.salary;

        const posted = document.createElement("small");
        posted.className = "job-posted-date";
        posted.textContent = `Posted: ${job.posted}`;

        salaryInfo.append(salary, posted);

        const applyButton = document.createElement("button");
        applyButton.className = hasApplied
            ? "apply-button applied-button"
            : "apply-button";
        applyButton.dataset.action = "apply";
        applyButton.dataset.id = job.id;
        applyButton.type = "button";
        applyButton.disabled = hasApplied;
        applyButton.textContent = hasApplied ? "Applied" : "Apply Now";

        footer.append(salaryInfo, applyButton);

        jobCard.append(
            header,
            meta,
            description,
            skillsContainer,
            footer
        );

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

jobsList?.addEventListener("click", handleJobAction);

jobSearchForm?.addEventListener("submit", event => {
    event.preventDefault();

    currentKeyword = searchKeyword?.value.trim() || "";
    currentLocation = searchLocation?.value.trim() || "";

    filterJobs();
});

applyFiltersButton?.addEventListener("click", filterJobs);
sortJobs?.addEventListener("change", filterJobs);

clearFiltersButton?.addEventListener("click", resetAllFilters);
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