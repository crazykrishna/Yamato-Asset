const count_api_url = 'http://127.0.0.1:8000/api/assets/count';
const active_api_url = 'http://127.0.0.1:8000/api/assets/active-count';
const categories_api_url = 'http://127.0.0.1:8000/api/assets/categories-count';
const status_api_url = 'http://127.0.0.1:8000/api/assets/status-distribution';
let myAssetChart = null;

// Target DOM Elements
const total_count_assets = document.getElementById('total-assets-count');
const active_count_assets = document.getElementById('active-assets-count');
const categories_count_assets = document.getElementById('total-categories-count');

// UPDATED INTEGRATED DASHBOARD ENGINE: Fetches all metrics collectively
async function updateDashboard() {
    try {
        // 1. Fetch Total Assets
        const resTotal = await fetch(count_api_url);
        if (resTotal.ok) {
            const dataTotal = await resTotal.json();
            if (total_count_assets) total_count_assets.innerText = dataTotal.total_assets;
        }

        // 2. Fetch Active Assets
        const resActive = await fetch(active_api_url);
        if (resActive.ok) {
            const dataActive = await resActive.json();
            if (active_count_assets) active_count_assets.innerText = dataActive.active_assets;
        }

        // 3. Fetch Total Categories
        const resCategories = await fetch(categories_api_url);
        if (resCategories.ok) {
            const dataCategories = await resCategories.json();
            if (categories_count_assets) categories_count_assets.innerText = dataCategories.total_categories;
        }

    } catch (error) {
        console.error("Dashboard metric synchronization failed:", error);
    }
}

// SAFE NAVIGATION LISTENERS
document.getElementById('home')?.addEventListener("click", () => { window.location.href = "home.html"; });
document.getElementById('assets-list')?.addEventListener("click", () => { window.location.href = "assets list.html"; });
document.getElementById('inventory')?.addEventListener("click", () => { window.location.href = "inventory.html"; });
document.getElementById('reports')?.addEventListener("click", () => { window.location.href = "reports.html"; });
document.getElementById('log-out')?.addEventListener("click", () => {
    alert("Log-Out Successful! Back to login page.");
    window.location.href = "login.html"; 
});
document.getElementById('find')?.addEventListener("click", () => { window.location.href = "inventory.html"; });
document.getElementById('Register-Asset')?.addEventListener("click", () => { window.location.href = "register asset.html"; });
document.getElementById('assests-list')?.addEventListener("click", () => { window.location.href = "assets list.html"; });
document.getElementById('Register-New-User')?.addEventListener("click", () => { window.location.href = "register new user.html"; });
document.getElementById('profilee')?.addEventListener("click", () => { window.location.href = "profile.html"; });

// GREETING ENGINE
const mainn = document.getElementById('show');
function displayCurrentTimeMessage() {
    if (!mainn) return;
    const now = new Date().getHours();
    if (now >= 5 && now < 12) {
        mainn.innerText = "Good Morning, Admin 😊";
    } else if (now >= 12 && now < 16) {
        mainn.innerText = "Good Afternoon, Admin ☀️";
    } else if (now >= 16 && now < 21) {
        mainn.innerText = "Good Evening, Admin 🌇";
    } else {
        mainn.innerText = "Have a Good Night, Admin 🌃";
    }
}
displayCurrentTimeMessage();

// CHART.JS DOUGHNUT RENDER ENGINE
async function renderStatusDoughnutChart() {
    try {
        const response = await fetch(status_api_url);
        if (!response.ok) throw new Error("Could not access data distribution endpoint.");
        
        const payload = await response.json();
        const distData = payload.distribution;

        const labels = Object.keys(distData);
        const dataValues = Object.values(distData);

        const ctx = document.getElementById('assetStatusChart')?.getContext('2d');
        if (!ctx) return;

        if (myAssetChart) {
            myAssetChart.destroy();
        }

        myAssetChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Assets Count',
                    data: dataValues,
                    backgroundColor: [
                        '#36A2EB', // Blue
                        '#FF9F43', // Orange
                        '#FF4D4D', // Red
                        '#2ED573', // Green
                        '#747D8C'  // Gray
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Assets Category Distribution',
                        font: { size: 18, weight: 'bold', family: 'main', color: 'black' },
                        padding: { bottom: 15 },
                        align: 'start'
                    },
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            font: { size: 14, family: 'main' },
                            boxWidth: 15,
                            padding: 15
                        }
                    }
                },
                cutout: '70%'
            }
        });
    } catch (error) {
        console.error("Chart rendering engine failed:", error);
    }
}

// UNIFIED PIPELINE INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    renderStatusDoughnutChart();
});