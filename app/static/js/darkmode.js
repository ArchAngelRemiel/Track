document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("darkModeToggle");
    if(btn){
        btn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
        });
    }
});