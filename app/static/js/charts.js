// ===============================
// GLOBAL STATE
// ===============================
let runsData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let acwrChartInstance = null;


// ===============================
// TIME HELPERS
// ===============================
function mmssToMinutes(duration) {
    if (!duration) return 0;
    if (typeof duration === "number") return duration;
    const str = duration.toString();
    if (!str.includes(":")) return parseFloat(str);
    const [min, sec] = str.split(":").map(Number);
    return min + sec / 60;
}

function minutesToMMSS(minutesDecimal) {
    const min = Math.floor(minutesDecimal);
    const sec = Math.round((minutesDecimal - min) * 60);
    return `${min}:${sec.toString().padStart(2,'0')}`;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function calculatePace(distanceMeters, durationStr) {
    const durationMin = mmssToMinutes(durationStr);
    if (!durationMin || distanceMeters <= 0) return "0:00";
    const paceMinPerMile = durationMin / (distanceMeters / 1609.34);
    return minutesToMMSS(paceMinPerMile);
}


// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {

    setupTabs();
    setupDarkMode();

    fetch("/runs-data")
        .then(res => res.json())
        .then(data => {
            runsData = data || [];
            initializeAll();
        });
});

function initializeAll() {
    populateHomeTable();
    populateDistanceDropdowns();
    renderLeaderboard();
    updateAnalytics();
    updateCalendar();
    renderACWR();
}


// ===============================
// TAB SYSTEM
// ===============================
function setupTabs() {
    const tablinks = document.querySelectorAll(".tablink");
    const tabcontents = document.querySelectorAll(".tab-content");

    tablinks.forEach(btn => {
        btn.addEventListener("click", () => {
            tablinks.forEach(b => b.classList.remove("active"));
            tabcontents.forEach(c => c.style.display = "none");
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).style.display = "block";

            if(btn.dataset.tab === "analytics") {
                renderACWR();
            }
        });
    });

    tabcontents.forEach(c => c.style.display = "none");
    document.getElementById("home").style.display = "block";
}


// ===============================
// WEEKLY STREAK (IN WEEKS)
// ===============================
function calculateWeeklyStreak(runs) {
    if (!runs.length) return 0;

    const weeks = new Set();
    runs.forEach(r => {
        const d = new Date(r.date);
        const week = getISOWeek(d);
        weeks.add(`${d.getFullYear()}-${week}`);
    });

    return weeks.size;
}

function getISOWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
}

// ===============================
// MODAL EDIT SETUP
// ===============================
const modal = document.createElement("div");
    modal.id = "editModal";
    modal.style.display = "none";
    modal.innerHTML = `
        <div id="modalContent">
            <h3>Edit Run</h3>
            <form id="modalForm">
                <label>Date:</label><input type="date" name="date" required><br>
                <label>Distance:</label><input type="number" step="0.01" name="distance" required><br>
                <label>Duration (mm:ss):</label><input type="text" name="duration" pattern="\\d{1,2}:\\d{2}" placeholder="mm:ss" required><br>
                <button type="submit">Save</button>
                <button type="button" id="closeModal">Cancel</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const modalForm = document.getElementById("modalForm");
    const closeModalBtn = document.getElementById("closeModal");
    let currentRunId = null;


// ===============================
// MODAL BUTTONS
// ===============================
function setupModalButtons() {
        document.querySelectorAll(".editRun").forEach(btn => {
            btn.addEventListener("click", e => {
                const row = e.target.closest("tr");
                currentRunId = row.dataset.id;
                const run = runsData.find(r => r.id == currentRunId);
                modal.style.display = "block";
                modalForm.date.value = run.date;
                modalForm.distance.value = run.distance;
                modalForm.duration.value = run.duration;
            });
        });
        document.querySelectorAll(".deleteRun").forEach(btn => {
            btn.addEventListener("click", e => {
                const row = e.target.closest("tr");
                if(confirm("Are you sure you want to delete this run?")) {
                    fetch(`/delete_run/${row.dataset.id}`, {method:"POST"})
                        .then(()=> location.reload());
                }
            });
        });
    }

    modalForm.addEventListener("submit", e => {
        e.preventDefault();
        const formData = new FormData(modalForm);
        fetch(`/edit_run/${currentRunId}`, {
            method: "POST",
            body: new URLSearchParams(formData)
        }).then(() => location.reload());
    });
    closeModalBtn.addEventListener("click", () => modal.style.display = "none");


// ===============================
// HOME TABLE
// ===============================
function populateHomeTable() {
    const tbody = document.querySelector("#runsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    runsData.forEach(run => {
        const durationDecimal = mmssToMinutes(run.duration);
        const durationDisplay = minutesToMMSS(durationDecimal);
        const pace = calculatePace(run.distance, run.duration);

        const tr = document.createElement("tr");
        tr.dataset.id = run.id;

        tr.innerHTML = `
            <td>${run.date}</td>
            <td>${run.distance}</td>
            <td>${durationDisplay}</td>
            <td>${pace}</td>
            <td>
                <button class="editRun">Edit</button>
                <button class="deleteRun">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    setupModalButtons();
}


// ===============================
// CALENDAR
// ===============================
function updateCalendar() {
    const calendar = document.getElementById("calendar");
    const title = document.getElementById("calendar-title");
    calendar.innerHTML = "";

    if (!runsData) return;

    const today = new Date();
    const monthDate = new Date(currentYear, currentMonth);

    const monthName = monthDate.toLocaleString("default", { month: "long" });
    title.textContent = `${monthName} ${currentYear}`;

    const runDays = runsData
        .map(r => {
    const [year, month, day] = r.date.split("-");
    return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
    );
})
        .filter(d => d.getMonth() === currentMonth && d.getFullYear() === currentYear)
        .map(d => d.getDate());

    const daysOfWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    daysOfWeek.forEach(day => {
        const header = document.createElement("div");
        header.textContent = day;
        header.classList.add("calendar-header-day");
        calendar.appendChild(header);
    });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement("div");
        dayDiv.textContent = day;
        dayDiv.classList.add("calendar-day");

        if (runDays.includes(day)) {
            dayDiv.classList.add("has-run");
        }

        if (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        ) {
            dayDiv.classList.add("today");
        }

        calendar.appendChild(dayDiv);
    }
}

document.getElementById("prev-month").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateCalendar();
});

// ===============================
// POPULATE DISTANCE DROPDOWNS
// ===============================
function populateDistanceDropdowns() {
    const filters = [
        document.getElementById("dataDistanceFilter"),
        document.getElementById("analyticsDistanceFilter"),
        document.getElementById("leaderboardDistanceFilter")
    ];

    if (!runsData || runsData.length === 0) return;

    const uniqueDistances = [...new Set(runsData.map(r => r.distance))].sort((a,b)=>a-b);

    filters.forEach(select => {
        if (!select) return;
        select.innerHTML = `<option value="" disabled selected>Distance</option>`;
        uniqueDistances.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d;
            opt.textContent = d;
            select.appendChild(opt);
        });

        select.addEventListener("change", () => {
            if(select.id === "dataDistanceFilter") updateDataTab();
            if(select.id === "analyticsDistanceFilter") updateAnalytics();
            if(select.id === "leaderboardDistanceFilter") renderLeaderboard();
        });
    });
}
// ===============================
// DATA TAB
// ===============================
function updateDataTab() {
        const distance = document.getElementById("dataDistanceFilter").value;
        const tableContainer = document.getElementById("dataTableContainer");
        let filtered = runsData;
        if(distance) filtered = runsData.filter(r=>r.distance==distance);

        // Table
        let html = `<table>
            <thead><tr><th>Date</th><th>Duration</th><th>Pace</th></tr></thead><tbody>`;
        filtered.forEach(r=>{
            const pace = minutesToMMSS(mmssToMinutes(r.duration)/(r.distance/1609.34));
            html+=`<tr><td>${r.date}</td><td>${r.duration}</td><td>${pace}</td></tr>`;
        });
        html+=`</tbody></table>`;
        tableContainer.innerHTML = html;

        // PACE CHART
        const trace = {
            x: filtered.map(r=>r.date),
            y: filtered.map(r=>mmssToMinutes(r.duration)/(r.distance/1609.34)),
            type:'scatter',
            mode:'lines+markers',
            name:'Pace'
        };
        const layout = {
            title: "Pace per Run",
            yaxis: { title: "Pace (min/mile)" }
        };
        Plotly.newPlot("paceChart",[trace], layout);
    }

// ===============================
// ANALYTICS TAB
// ===============================
function updateAnalytics() {
        const distance = document.getElementById("analyticsDistanceFilter").value;
        let filtered = runsData;
        if(distance) filtered = runsData.filter(r=>r.distance==distance);

        // VO2 Estimation
        const vo2 = filtered.map(r=>({date:r.date, vo2:(r.distance*0.2/mmssToMinutes(r.duration))*3.5}));
        Plotly.newPlot("vo2Estimation",[{
            x: vo2.map(v=>v.date),
            y: vo2.map(v=>v.vo2),
            type:'scatter',
            mode:'lines+markers',
            name:'VO₂ Estimation'
        }], {title:"VO₂ Estimation"});

        // Performance Prediction
        const perf = filtered.map(r=>({date:r.date, predicted: mmssToMinutes(r.duration)/(r.distance/1609.34)*0.95}));
        Plotly.newPlot("performancePrediction",[{
            x: perf.map(p=>p.date),
            y: perf.map(p=>p.predicted),
            type:'scatter',
            mode:'lines+markers',
            name:'Predicted Pace'
        }], {title:"Performance Prediction"});

        // Rolling 7-day load
        const rolling = filtered.map((r,i)=>({
            date:r.date,
            load: filtered.slice(Math.max(0,i-6),i+1).reduce((sum,rr)=>sum+mmssToMinutes(rr.duration),0)
        }));
        Plotly.newPlot("rollingLoad",[{
            x: rolling.map(r=>r.date),
            y: rolling.map(r=>r.load),
            type:'bar',
            name:'7-Day Load'
        }], {title:"Rolling 7-Day Load"});

        // Longest streak
        let streak=0, maxStreak=0, lastDate=null;
        filtered.forEach(r=>{
            const d = new Date(r.date);
            if(lastDate && (d - lastDate)/86400000 === 1) streak++;
            else streak = 1;
            if(streak > maxStreak) maxStreak = streak;
            lastDate = d;
        });
        document.getElementById("streaks").innerHTML=`<h4>Longest Streak: ${maxStreak} days</h4>`;
    }
// ===============================
// LEADERBOARD TAB
// ===============================
function renderLeaderboard() {
    const container = document.getElementById("leaderboard-container");
    container.innerHTML = "";

    if (!runsData || runsData.length === 0) {
        container.innerHTML = "<p>No runs recorded yet.</p>";
        return;
    }

    const selectedDistance = document.getElementById("leaderboardDistanceFilter").value;

    // Filter runs by selected distance (or show all if none selected)
    const filteredRuns = selectedDistance ? runsData.filter(r => r.distance == selectedDistance) : runsData;

    if (filteredRuns.length === 0) {
        container.innerHTML = "<p>No runs for this distance yet.</p>";
        return;
    }

    const section = document.createElement("div");
    section.classList.add("leaderboard-section");

    // If a specific distance is selected, only show that distance
    const distancesToShow = selectedDistance ? [selectedDistance] : [...new Set(filteredRuns.map(r => r.distance))];

    distancesToShow.forEach(distance => {
        const runs = filteredRuns.filter(r => r.distance == distance);

        // Sort by fastest time
        runs.sort((a, b) => a.time - b.time);

        const title = document.createElement("h2");
        title.textContent = distance + " Leaderboard";
        section.appendChild(title);

        const table = document.createElement("table");
        table.classList.add("leaderboard-table");

        table.innerHTML = `
    <thead>
        <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Time</th>
            <th>Date</th>
        </tr>
    </thead>
    <tbody>
        ${runs.map((run, index) => {
            // Determine username safely
            const username = run.username || run.user || run.created_by || "Unknown";

            // Convert duration to seconds for formatTime
            const durationSeconds = Math.round(mmssToMinutes(run.duration) * 60);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${username}</td>
                    <td>${formatTime(durationSeconds)}</td>
                    <td>${run.date}</td>
                </tr>
            `;
        }).join("")}
    </tbody>
`;

        section.appendChild(table);
    });

    container.appendChild(section);
}

// ===============================
// ACWR
// ===============================
function calculateACWR() {
    if (!runsData.length) return null;

    const today = new Date();
    const acute = runsData.filter(r => (today - new Date(r.date))/86400000 <=7)
        .reduce((sum,r)=>sum+mmssToMinutes(r.duration),0);

    const chronic = runsData.filter(r => (today - new Date(r.date))/86400000 <=28)
        .reduce((sum,r)=>sum+mmssToMinutes(r.duration),0)/4;

    if(chronic===0) return null;
    return acute/chronic;
}

function renderACWR() {
    const acwr = calculateACWR();
    const statusEl = document.getElementById("trainingStatus");
    const insightEl = document.getElementById("trainingInsight");
    const streakEl = document.getElementById("weeklyStreak");

    const streakWeeks = calculateWeeklyStreak(runsData);

    if(streakEl)
        streakEl.textContent=`Weekly Streak: ${streakWeeks} week${streakWeeks!==1?"s":""}`;

    if(statusEl)
        statusEl.textContent=`Training Status: ${getTrainingStatus(acwr)}`;

    if(insightEl)
        insightEl.textContent=`Insight: ${generateInsight(acwr)}`;

    const canvas=document.getElementById("acwrChart");
    if(!canvas) return;

    const ctx=canvas.getContext("2d");
    if(acwrChartInstance) acwrChartInstance.destroy();

    acwrChartInstance=new Chart(ctx,{
        type:"line",
        data:{
            labels:["4w","3w","2w","1w","This Week"],
            datasets:[{
                label:"Weekly Load",
                data:calculateWeeklyLoads(),
                tension:0.3
            }]
        }
    });
}

function calculateWeeklyLoads(){
    const weeks=[];
    const today=new Date();
    for(let i=4;i>=0;i--){
        const start=new Date(today);
        start.setDate(today.getDate()-i*7);
        const end=new Date(today);
        end.setDate(today.getDate()-(i-1)*7);
        const load=runsData.filter(r=>{
            const d=new Date(r.date);
            return d>=start && d<end;
        }).reduce((sum,r)=>sum+mmssToMinutes(r.duration),0);
        weeks.push(Math.round(load));
    }
    return weeks;
}

function getTrainingStatus(acwr){
    if(acwr===null) return "No Data";
    if(acwr<0.8) return "Detraining";
    if(acwr<=1.3) return "Productive";
    if(acwr<=1.6) return "High Load";
    return "Overreaching";
}

function generateInsight(acwr){
    if(acwr===null) return "Log more runs to generate insight.";
    if(acwr>1.5) return "Load spike detected. Prioritize recovery.";
    if(acwr<0.8) return "Training load low. Gradually increase volume.";
    return "Balanced training load. Stay consistent.";
}


// ===============================
// DARK MODE
// ===============================
function setupDarkMode(){
    const toggle=document.getElementById("darkModeToggle");
    if(toggle)
        toggle.addEventListener("click",()=>document.body.classList.toggle("dark-mode"));
}