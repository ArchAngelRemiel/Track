// Only tabs and dark mode
document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll('.tablink');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            tabContents.forEach(tc => tc.style.display = tc.id === tabId ? 'block' : 'none');
        });
    });

    // Show only Home tab initially
    tabContents.forEach(tc => tc.style.display = 'none');
    const homeTab = document.getElementById('home');
    if(homeTab) homeTab.style.display = 'block';

    // Dark mode
    const darkBtn = document.getElementById('darkModeToggle');
    if(darkBtn){
        darkBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
});