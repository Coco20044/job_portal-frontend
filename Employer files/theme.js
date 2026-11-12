(() => {
    const theme = localStorage.getItem("theme") || "light";

    document.body.classList.toggle("dark-mode", theme === "dark");
})();