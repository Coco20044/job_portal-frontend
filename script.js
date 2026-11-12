const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const passwordToggles = document.querySelectorAll(".password-toggle");

passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
        event.preventDefault();

        const passwordInput = document.getElementById(toggle.dataset.target);

        if (!passwordInput) return;

        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";
        toggle.textContent = isPassword ? "Hide" : "Show";
    });
});

function showMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.className = `form-message ${type}`;
}

async function getResponseData(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function getErrorMessage(data, response, fallback) {
    if (Array.isArray(data.errors) && data.errors.length > 0) {
        const messages = data.errors.map((error) => {
            const field = error.field || error.path || error.name;
            const message = error.message || error.msg || "Invalid value";

            return field ? `${field}: ${message}` : message;
        });

        return messages.join(" ");
    }

    if (data.message && data.message.toLowerCase() !== "invalid request") {
        return data.message;
    }

    if (data.message === "Invalid request") {
        return "Your request could not be processed. Please check your details and try again.";
    }

    if (data.error) {
        return typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error);
    }

    if (response.status === 400) {
        return "Some of the information you provided is invalid. Please check your details.";
    }

    if (response.status === 401) {
        return "Invalid email or password. Please check your login details.";
    }

    if (response.status === 403) {
        return "You are not authorized to perform this action.";
    }

    if (response.status === 404) {
        return "The requested resource could not be found.";
    }

    if (response.status === 409) {
        return "An account with these details already exists.";
    }

    if (response.status === 422) {
        return "Some of the information you provided did not pass validation.";
    }

    if (response.status >= 500) {
        return "A server error occurred. Please try again later.";
    }

    return fallback;
}

function saveUserSession(data, rememberMe = false) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("token", data.token);
    storage.setItem("user", JSON.stringify(data.user));
}

function getDashboard(role) {
    const dashboards = {
        job_seeker: "Applicant files/job-seeker-dashboard.html",
        employer: "Employer files/employer-dashboard.html",
        admin: "Admin files/admin-dashboard.html"
    };

    return dashboards[role] || null;
}

const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        signupMessage.textContent = "";
        signupMessage.className = "form-message";

        if (!name || !email || !password || !confirmPassword) {
            showMessage(signupMessage, "Please fill in all fields.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage(signupMessage, "Password must be at least 8 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(signupMessage, "Passwords do not match.", "error");
            return;
        }

        const submitButton = signupForm.querySelector('[type="submit"]');

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await getResponseData(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(data, response, "Registration failed.")
                );
            }

            if (!data.token || !data.user) {
                throw new Error("The server did not return the required account information. Please contact support.");
            }

            saveUserSession(data, false);

            window.location.replace("role.html");

        } catch (error) {
            const message = error instanceof TypeError
                ? "Unable to connect to the server. Please check your internet connection or try again later."
                : error.message;

            showMessage(signupMessage, message, "error");

            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    });
}

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = document.getElementById("loginEmail");
        const passwordInput = document.getElementById("loginPassword");
        const rememberMeInput = document.getElementById("rememberMe");

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeInput.checked;

        loginMessage.textContent = "";
        loginMessage.className = "form-message";

        if (!email || !password) {
            showMessage(loginMessage, "Email and password are required.", "error");
            return;
        }

        const submitButton = loginForm.querySelector('[type="submit"]');

        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await getResponseData(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(data, response, "Login failed.")
                );
            }

            if (!data.token || !data.user) {
                throw new Error("The server did not return the required account information. Please contact support.");
            }

            saveUserSession(data, rememberMe);

            if (data.user.role !== "admin" && data.user.role_selected === false) {
                window.location.replace("role.html");
                return;
            }

            const dashboard = getDashboard(data.user.role);

            if (!dashboard) {
                throw new Error("Your account has an unrecognized role. Please contact support.");
            }

            window.location.replace(dashboard);

        } catch (error) {
            const message = error instanceof TypeError
                ? "Unable to connect to the server. Please check your internet connection or try again later."
                : error.message;

            showMessage(loginMessage, message, "error");

            submitButton.disabled = false;
            submitButton.textContent = "Log In";
        }
    });
}

const goToLogin = document.getElementById("goToLogin");

if (goToLogin) {
    goToLogin.addEventListener("click", (event) => {
        event.preventDefault();

        document.getElementById("login").scrollIntoView({
            behavior: "smooth"
        });
    });
}