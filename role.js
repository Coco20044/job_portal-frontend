const API_URL = "https://job-portal-backend-rt3x.onrender.com/api";

const roleButtons = document.querySelectorAll(".role-button");

const getToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
};

const getDashboard = (role) => {
    const dashboards = {
        job_seeker: "Applicant files/job-seeker-dashboard.html",
        employer: "Employer files/employer-dashboard.html",
        admin: "admin-dashboard.html"
    };

    return dashboards[role] || null;
};

roleButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
        event.preventDefault();

        const selectedRole = button.dataset.role;
        const token = getToken();

        if (!token) {
            window.location.replace("index.html");
            return;
        }

        if (!["job_seeker", "employer"].includes(selectedRole)) {
            alert("Please select a valid role.");
            return;
        }

        roleButtons.forEach((roleButton) => {
            roleButton.disabled = true;
        });

        try {
            const response = await fetch(`${API_URL}/auth/select-role`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: selectedRole
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to save your role.");
            }

            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("user", JSON.stringify(data.user));

            const dashboard = getDashboard(data.user.role);

            if (!dashboard) {
                throw new Error("Invalid account role.");
            }

            window.location.replace(dashboard);

        } catch (error) {
            alert(error.message);

            roleButtons.forEach((roleButton) => {
                roleButton.disabled = false;
            });
        }
    });
});