const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const jobForm = document.getElementById("jobForm");
const saveDraftButton = document.getElementById("saveDraftButton");
const formMessage = document.getElementById("formMessage");
const logoutButton = document.getElementById("logoutButton");

const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const pageTitle = document.getElementById("pageTitle");

const publishButton = jobForm?.querySelector('button[type="submit"]');

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

const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get("jobId");

let editingJob = null;
let employerName = "Employer";
let isEmployerAuthenticated = false;

const fieldLabels = {
    title: "Job title",
    company_name: "Company name",
    category: "Job category",
    location: "Location",
    work_mode: "Work mode",
    employment_type: "Employment type",
    experience_level: "Experience level",
    description: "Job description",
    requirements: "Job requirements",
    benefits: "Job benefits",
    application_email: "Application email",
    application_link: "Application link",
    application_deadline: "Application deadline",
    salary_min: "Minimum salary",
    salary_max: "Maximum salary",
    salary_currency: "Salary currency",
    required_skills: "Required skills",
    status: "Job status"
};

function formatValidationMessage(message) {
    const text = String(message || "").trim();

    const rules = [
        {
            pattern: /too small.*>=\s*(\d+)\s*characters?/i,
            message: match => `Must contain at least ${match[1]} characters.`
        },
        {
            pattern: /too small.*>=\s*(\d+)/i,
            message: match => `Must contain at least ${match[1]} characters.`
        },
        {
            pattern: /too big.*<=\s*(\d+)\s*characters?/i,
            message: match => `Must not exceed ${match[1]} characters.`
        },
        {
            pattern: /too big.*<=\s*(\d+)/i,
            message: match => `Must not exceed ${match[1]} characters.`
        },
        {
            pattern: /required/i,
            message: () => "This field is required."
        },
        {
            pattern: /invalid email/i,
            message: () => "Please enter a valid email address."
        },
        {
            pattern: /invalid url|valid url/i,
            message: () => "Please enter a valid URL."
        },
        {
            pattern: /expected string/i,
            message: () => "Please enter a valid text value."
        },
        {
            pattern: /expected number/i,
            message: () => "Please enter a valid number."
        },
        {
            pattern: /expected array/i,
            message: () => "Please provide valid items for this field."
        },
        {
            pattern: /expected boolean/i,
            message: () => "Please select a valid option."
        }
    ];

    for (const rule of rules) {
        const match = text.match(rule.pattern);

        if (match) {
            return rule.message(match);
        }
    }

    return text;
}

function getValidationErrors(data) {
    if (!Array.isArray(data.errors)) {
        return [];
    }

    return data.errors.map(error => {
        const field = error.field || error.path?.join(".") || "general";
        const label = fieldLabels[field] || field.replace(/_/g, " ");

        return {
            field,
            label,
            message: formatValidationMessage(error.message)
        };
    });
}

function showMessage(message, type) {
    if (!formMessage) return;

    formMessage.innerHTML = "";

    const messageElement = document.createElement("p");
    messageElement.textContent = message;

    formMessage.appendChild(messageElement);
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = "block";

    formMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function showValidationErrors(errors) {
    if (!formMessage) return;

    formMessage.innerHTML = "";

    const heading = document.createElement("strong");
    heading.textContent = "Please correct the following errors:";

    const errorList = document.createElement("ul");

    errors.forEach(error => {
        const item = document.createElement("li");

        const field = document.createElement("strong");
        field.textContent = `${error.label}: `;

        const message = document.createElement("span");
        message.textContent = error.message;

        item.append(field, message);
        errorList.appendChild(item);
    });

    formMessage.append(heading, errorList);
    formMessage.className = "form-message error";
    formMessage.style.display = "block";

    formMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function clearMessage() {
    if (!formMessage) return;

    formMessage.innerHTML = "";
    formMessage.style.display = "none";
}

function setFormDisabled(disabled) {
    if (!jobForm) return;

    jobForm.querySelectorAll("input, textarea, select, button").forEach(element => {
        element.disabled = disabled;
    });

    if (saveDraftButton) {
        saveDraftButton.disabled = disabled;
    }
}

function showPreviewMode() {
    isEmployerAuthenticated = false;
    editingJob = null;

    if (userName) {
        userName.textContent = "Guest Preview";
    }

    if (userAvatar) {
        userAvatar.textContent = "G";
    }

    if (pageTitle) {
        pageTitle.textContent = jobId ? "Edit Job Preview" : "Post a Job Preview";
    }

    setFormDisabled(true);

    showMessage(
        "You are viewing the job posting preview. Please log in as an employer to post, edit, or save job listings.",
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
        const errors = getValidationErrors(data);

        if (errors.length > 0) {
            const validationError = new Error("Validation failed.");
            validationError.validationErrors = errors;
            throw validationError;
        }

        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

async function loadEmployerInformation() {
    const data = await apiRequest("/auth/me");

    if (!data) return false;

    const user = data.user || data;

    if (user.role !== "employer") {
        clearUserSession();
        return false;
    }

    isEmployerAuthenticated = true;

    employerName =
        user.fullName ||
        user.full_name ||
        user.name ||
        user.firstName ||
        "Employer";

    if (userName) {
        userName.textContent = employerName;
    }

    if (userAvatar) {
        userAvatar.textContent = employerName.charAt(0).toUpperCase();
    }

    return true;
}

function normalizeEmploymentType(value) {
    const types = {
        "full-time": "full_time",
        "full_time": "full_time",
        "part-time": "part_time",
        "part_time": "part_time",
        "contract": "contract",
        "internship": "internship",
        "temporary": "temporary"
    };

    return types[value?.toLowerCase()] || value;
}

function normalizeWorkMode(value) {
    const modes = {
        "on-site": "onsite",
        "on_site": "onsite",
        "onsite": "onsite",
        "remote": "remote",
        "hybrid": "hybrid"
    };

    return modes[value?.toLowerCase()] || value;
}

function parseSalary(value) {
    const salary = value.trim();

    const currency =
        salary.includes("₦") || /\bNGN\b/i.test(salary)
            ? "NGN"
            : salary.includes("$") || /\bUSD\b/i.test(salary)
                ? "USD"
                : salary.includes("£") || /\bGBP\b/i.test(salary)
                    ? "GBP"
                    : salary.includes("€") || /\bEUR\b/i.test(salary)
                        ? "EUR"
                        : undefined;

    const numbers = salary.match(/\d[\d,]*(?:\.\d+)?/g) || [];

    const parsedNumbers = numbers.map(number =>
        Number(number.replace(/,/g, ""))
    ).filter(Number.isFinite);

    return {
        salary_min: parsedNumbers[0],
        salary_max: parsedNumbers[1],
        salary_currency: currency,
        salary_display: salary || undefined
    };
}

function loadJobForEditing(job) {
    document.getElementById("jobTitle").value =
        job.title || "";

    document.getElementById("companyName").value =
        job.company_name || "";

    document.getElementById("jobCategory").value =
        job.category || "";

    document.getElementById("jobLocation").value =
        job.location || "";

    document.getElementById("workMode").value =
        job.work_mode || "";

    document.getElementById("jobType").value =
        job.employment_type || "";

    document.getElementById("experienceLevel").value =
        job.experience_level || "";

    document.getElementById("salary").value =
        job.salary_display || "";

    document.getElementById("applicationDeadline").value =
        job.application_deadline
            ? String(job.application_deadline).split("T")[0]
            : "";

    document.getElementById("jobDescription").value =
        job.description || "";

    document.getElementById("jobRequirements").value =
        job.requirements || "";

    document.getElementById("jobBenefits").value =
        job.benefits || "";

    document.getElementById("applicationEmail").value =
        job.application_email || "";

    document.getElementById("applicationLink").value =
        job.application_link || "";

    const skillsInput = document.getElementById("requiredSkills");

    if (skillsInput) {
        const skills = Array.isArray(job.required_skills)
            ? job.required_skills
            : typeof job.required_skills === "string"
                ? JSON.parse(job.required_skills || "[]")
                : [];

        skillsInput.value = skills.join(", ");
    }
}

async function fetchJobForEditing() {
    try {
        const data = await apiRequest("/jobs/employer");

        if (!data) {
            showPreviewMode();
            return;
        }

        const jobs = data.jobs || [];

        editingJob = jobs.find(
            job => String(job.id) === String(jobId)
        );

        if (!editingJob) {
            showMessage(
                "The job you are trying to edit could not be found.",
                "error"
            );
            return;
        }

        loadJobForEditing(editingJob);

        if (pageTitle) {
            pageTitle.textContent = "Edit Job";
        }

        if (publishButton) {
            publishButton.textContent =
                editingJob.status === "draft"
                    ? "Publish Job"
                    : "Update Job";
        }
    } catch (error) {
        if (error.validationErrors) {
            showValidationErrors(error.validationErrors);
        } else {
            showMessage(error.message, "error");
        }
    }
}

function getJobFormData(status) {
    const salary = parseSalary(
        document.getElementById("salary").value
    );

    const skillsInput = document.getElementById("requiredSkills");

    const jobData = {
        title: document.getElementById("jobTitle").value.trim(),
        company_name: document.getElementById("companyName").value.trim(),
        category: document.getElementById("jobCategory").value.trim(),
        location: document.getElementById("jobLocation").value.trim(),
        work_mode: normalizeWorkMode(
            document.getElementById("workMode").value
        ),
        employment_type: normalizeEmploymentType(
            document.getElementById("jobType").value
        ),
        experience_level: document.getElementById("experienceLevel").value,
        description: document.getElementById("jobDescription").value.trim(),
        requirements: document.getElementById("jobRequirements").value.trim(),
        benefits: document.getElementById("jobBenefits").value.trim(),
        application_email: document.getElementById("applicationEmail").value.trim(),
        application_link: document.getElementById("applicationLink").value.trim(),
        application_deadline:
            document.getElementById("applicationDeadline").value || null,
        status
    };

    if (salary.salary_min !== undefined) {
        jobData.salary_min = salary.salary_min;
    }

    if (salary.salary_max !== undefined) {
        jobData.salary_max = salary.salary_max;
    }

    if (salary.salary_currency) {
        jobData.salary_currency = salary.salary_currency;
    }

    if (salary.salary_display) {
        jobData.salary_display = salary.salary_display;
    }

    if (skillsInput) {
        jobData.required_skills = skillsInput.value
            .split(",")
            .map(skill => skill.trim())
            .filter(Boolean);
    }

    return jobData;
}

function validateJobForm(jobData) {
    const errors = [];

    if (!jobData.title) {
        errors.push({
            field: "title",
            label: "Job title",
            message: "Please enter a job title."
        });
    }

    if (!jobData.company_name) {
        errors.push({
            field: "company_name",
            label: "Company name",
            message: "Please enter your company name."
        });
    }

    if (!jobData.description) {
        errors.push({
            field: "description",
            label: "Job description",
            message: "Please provide a job description."
        });
    } else if (jobData.description.length < 20) {
        errors.push({
            field: "description",
            label: "Job description",
            message: "Must contain at least 20 characters."
        });
    }

    if (
        jobData.salary_min !== undefined &&
        jobData.salary_max !== undefined &&
        jobData.salary_min > jobData.salary_max
    ) {
        errors.push({
            field: "salary_min",
            label: "Salary range",
            message: "Minimum salary cannot be greater than maximum salary."
        });
    }

    return errors;
}

async function saveJob(status) {
    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to save job posts.", "error");
        return;
    }

    clearMessage();

    const jobData = getJobFormData(status);
    const localErrors = validateJobForm(jobData);

    if (localErrors.length > 0) {
        showValidationErrors(localErrors);
        return;
    }

    const actionButton = status === "draft"
        ? saveDraftButton
        : publishButton;

    if (actionButton) {
        actionButton.disabled = true;
    }

    try {
        const data = editingJob
            ? await apiRequest(`/jobs/${editingJob.id}`, {
                method: "PATCH",
                body: JSON.stringify(jobData)
            })
            : await apiRequest("/jobs", {
                method: "POST",
                body: JSON.stringify(jobData)
            });

        if (!data) {
            showPreviewMode();
            return;
        }

        window.location.href = "my-job-posts.html";
    } catch (error) {
        if (error.validationErrors) {
            showValidationErrors(error.validationErrors);
        } else {
            showMessage(error.message, "error");
        }
    } finally {
        if (actionButton) {
            actionButton.disabled = false;
        }
    }
}

jobForm?.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to post a job.", "error");
        return;
    }

    if (!jobForm.checkValidity()) {
        jobForm.reportValidity();
        return;
    }

    await saveJob("open");
});

saveDraftButton?.addEventListener("click", async function (event) {
    event.preventDefault();

    if (!isEmployerAuthenticated || !getToken()) {
        showMessage("Please log in as an employer to save a draft.", "error");
        return;
    }

    if (!jobForm.checkValidity()) {
        jobForm.reportValidity();
        return;
    }

    await saveJob("draft");
});

if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
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

        setFormDisabled(false);

        if (jobId) {
            await fetchJobForEditing();
        }
    } catch (error) {
        if (error.validationErrors) {
            showValidationErrors(error.validationErrors);
        } else {
            showMessage(error.message, "error");
        }
    }
}

initializePage();