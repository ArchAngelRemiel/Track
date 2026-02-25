let chartInstance = null;

function mmssToMinutes(duration) {
    if (!duration) return 0;
    const [min, sec] = duration.split(":").map(Number);
    return min + sec / 60;
}

function minutesToMMSS(decimal) {
    const min = Math.floor(decimal);
    const sec = Math.round((decimal - min) * 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

function calculateAveragePace(distance, duration) {
    const totalMin = mmssToMinutes(duration);
    return totalMin / distance;
}

function generateSyntheticSplits(distance, duration, segmentSize) {
    const totalMin = mmssToMinutes(duration);
    const pacePerMile = totalMin / distance;

    const segments = Math.floor(distance / segmentSize);
    const splits = [];

    for (let i = 1; i <= segments; i++) {
        splits.push({
            label: `Mile ${i}`,
            pace: pacePerMile
        });
    }

    return splits;
}

function renderChart(splits) {
    const ctx = document.getElementById("splitChart").getContext("2d");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: splits.map(s => s.label),
            datasets: [{
                label: "Pace (min/mile)",
                data: splits.map(s => s.pace),
                tension: 0.3
            }]
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {

    const run = window.RUN_DATA;

    // Calculate avg pace
    const avgPace = calculateAveragePace(run.distance, run.duration);
    const avgPaceEl = document.getElementById("avgPace");
    if (avgPaceEl) {
        avgPaceEl.textContent = minutesToMMSS(avgPace) + " / mile";
    }

    // Chart toggle
    const toggle = document.getElementById("splitToggle");
    if (toggle) {
        function updateChart() {
            const segmentSize = parseFloat(toggle.value);
            const splits = generateSyntheticSplits(run.distance, run.duration, segmentSize);
            renderChart(splits);
        }

        toggle.addEventListener("change", updateChart);
        updateChart();
    }

    // Cancel button
    const cancelBtn = document.querySelector("#closeModal");
if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        window.location.href = "/runs"; // or whatever main page
    });
}

    // Back button (only if it exists)
    const backBtn = document.getElementById("backButton");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.history.back();
        });
    }
});