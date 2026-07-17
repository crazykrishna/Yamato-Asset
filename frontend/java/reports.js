// ============================================================
// NAVIGATION
// ============================================================
document.getElementById('home')?.addEventListener('click', () => { window.location.href = '/home'; });
document.getElementById('assets-list')?.addEventListener('click', () => { window.location.href = '/assets-list'; });
document.getElementById('inventory')?.addEventListener('click', () => { window.location.href = '/inventory'; });
document.getElementById('reports')?.addEventListener('click', () => { window.location.href = '/reports'; });
document.getElementById('log-out')?.addEventListener('click', () => { window.location.href = '/login'; });
document.getElementById('find')?.addEventListener('click', () => { window.location.href = '/inventory'; });
document.getElementById('Register-Asset')?.addEventListener('click', () => { window.location.href = '/register-asset'; });
document.getElementById('assests-list')?.addEventListener('click', () => { window.location.href = '/assets-list'; });
document.getElementById('Register-New-User')?.addEventListener('click', () => { window.location.href = '/register-user'; });
document.getElementById('profilee')?.addEventListener('click', () => { window.location.href = '/profile'; });

const BASE = '';  // Empty = same origin — FastAPI serves frontend + API on port 8000

// ============================================================
// REPORT ENDPOINT MAP
// Keyed by data-report attribute value on each button.
// To add a new report: add an entry here + a button in the HTML
// with the matching data-report attribute. No JS changes needed.
// ============================================================
const REPORT_CONFIG = {
    'audit-trail':      { pdf: '/api/reports/audit-trail',         svg: '/api/reports/audit-trail/svg',         label: 'Asset Audit Trail' },
    'maintenance':      { pdf: '/api/reports/maintenance-schedule', svg: '/api/reports/maintenance-schedule/svg', label: 'Maintenance Schedule' },
    'user-activity':    { pdf: '/api/reports/user-activity-log',    svg: '/api/reports/user-activity-log/svg',    label: 'User Activity Log' },
    'checkout-history': { pdf: '/api/reports/checkout-history',     svg: '/api/reports/checkout-history/svg',     label: 'Check-out History' },
};

// ============================================================
// DEPRECIATION CHART  (horizontal bar — Y=labels, X=count)
// ============================================================
let depreciationChart = null;

const CHART_COLORS = [
    'rgba(245, 207,  4, 0.85)',
    'rgba(230, 129, 13, 0.85)',
    'rgba( 59, 130,246, 0.85)',
    'rgba( 34, 197, 94, 0.85)',
    'rgba(239,  68, 68, 0.85)',
    'rgba(168,  85,247, 0.85)',
];

async function loadDepreciationChart(schedule = '1year') {
    const canvas = document.getElementById('depreciationChart');
    if (!canvas) return;

    try {
        const res  = await fetch(`${BASE}/api/assets/depreciation?schedule=${schedule}`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();

        const labels = json.labels || [];
        const values = json.values || [];

        // Destroy existing chart before re-drawing
        if (depreciationChart) {
            depreciationChart.destroy();
            depreciationChart = null;
        }

        if (labels.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#aaa';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data available yet.', canvas.width / 2, canvas.height / 2);
            return;
        }

        const xLabel = schedule === '5year' ? 'Total Assets per Year' : 'Asset Count by Status';
        const yLabel = schedule === '5year' ? 'Year' : 'Status';

        depreciationChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: xLabel,
                    data: values,
                    backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',          // horizontal bar: labels on Y, count on X
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.x} asset${ctx.parsed.x !== 1 ? 's' : ''}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Number of Assets', font: { size: 12 } },
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    y: {
                        title: { display: true, text: yLabel, font: { size: 12 } },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Depreciation chart error:', err);
        const canvas = document.getElementById('depreciationChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#e55';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Failed to load chart data.', canvas.width / 2, canvas.height / 2);
        }
    }
}

// Re-draw chart when schedule dropdown changes
document.getElementById('generate-report-dd')?.addEventListener('change', (e) => {
    loadDepreciationChart(e.target.value);
});

// ============================================================
// TOTAL INVENTORY VALUE  (fetched live from DB)
// ============================================================
async function loadTotalValue() {
    const el = document.getElementById('total-value-display');
    if (!el) return;
    try {
        const res  = await fetch(`${BASE}/api/assets/total-value`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        el.textContent = json.formatted || '₹0';
    } catch (err) {
        el.textContent = 'N/A';
        console.error('Total value fetch error:', err);
    }
}

// ============================================================
// AUTHENTICATED REPORT DOWNLOAD ENGINE
// ============================================================
let currentAction = null; // 'pdf' or 'svg'
let currentReportKey = null;
let currentButton = null;

const modal = document.getElementById('custom-verify-modal');
const pwInput = document.getElementById('verify-password-input');
const errorMsg = document.getElementById('verify-error-msg');

function showVerifyModal(action, reportKey, buttonEl) {
    currentAction = action;
    currentReportKey = reportKey;
    currentButton = buttonEl;
    if (pwInput) pwInput.value = '';
    if (errorMsg) { errorMsg.style.display = 'none'; errorMsg.innerText = ''; }
    if (modal) modal.style.display = 'flex';
}

function closeVerifyModal() {
    if (modal) modal.style.display = 'none';
    currentAction = null;
    currentReportKey = null;
    currentButton = null;
}

document.getElementById('verify-modal-close-btn')?.addEventListener('click', closeVerifyModal);
document.getElementById('verify-cancel-btn')?.addEventListener('click', closeVerifyModal);
document.getElementById('custom-verify-modal')?.addEventListener('click', (e) => {
    if (e.target === modal) closeVerifyModal();
});

document.getElementById('verify-confirm-btn')?.addEventListener('click', async () => {
    const password = pwInput ? pwInput.value.trim() : "";
    if (!password) {
        if (errorMsg) {
            errorMsg.innerText = "Please enter the admin password.";
            errorMsg.style.display = "block";
        }
        return;
    }

    const config = REPORT_CONFIG[currentReportKey];
    if (!config) return;

    const originalText = currentButton.textContent;
    currentButton.textContent = 'Generating...';
    currentButton.disabled = true;
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const endpoint = currentAction === 'pdf' ? config.pdf : config.svg;
        const response = await fetch(`${BASE}${endpoint}?security_key=${encodeURIComponent(password)}`);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (errorMsg) {
                errorMsg.innerText = errData.detail || "Authentication failed.";
                errorMsg.style.display = "block";
            }
            currentButton.textContent = originalText;
            currentButton.disabled = false;
            return;
        }

        // Success: download file
        const disposition = response.headers.get('Content-Disposition') || '';
        const match       = disposition.match(/filename=([^;]+)/);
        const ext         = currentAction === 'pdf' ? 'pdf' : 'svg';
        const filename    = match ? match[1].replace(/['"]/g, '') : `${currentReportKey}_report.${ext}`;

        const blob = await response.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        closeVerifyModal();
    } catch (error) {
        console.error('Report download error:', error);
        if (errorMsg) {
            errorMsg.innerText = "Could not connect to the report server.";
            errorMsg.style.display = "block";
        }
    } finally {
        currentButton.textContent = originalText;
        currentButton.disabled    = false;
    }
});

// ============================================================
// INITIALISE ON PAGE LOAD
// ============================================================
window.addEventListener('DOMContentLoaded', () => {

    // Bind Generate Report buttons via data-report attribute
    document.querySelectorAll('button.special[data-report]').forEach(btn => {
        btn.addEventListener('click', () => showVerifyModal('pdf', btn.dataset.report, btn));
    });

    // Bind SVG buttons via data-report attribute
    document.querySelectorAll('button.svg[data-report]').forEach(btn => {
        btn.addEventListener('click', () => showVerifyModal('svg', btn.dataset.report, btn));
    });

    // Load data
    loadDepreciationChart('1year');
    loadTotalValue();
});