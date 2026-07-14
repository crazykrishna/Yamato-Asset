// ============================================================
// NAVIGATION
// ============================================================
document.getElementById('home')?.addEventListener('click', () => { window.location.href = 'home.html'; });
document.getElementById('assets-list')?.addEventListener('click', () => { window.location.href = 'assets list.html'; });
document.getElementById('inventory')?.addEventListener('click', () => { window.location.href = 'inventory.html'; });
document.getElementById('reports')?.addEventListener('click', () => { window.location.href = 'reports.html'; });
document.getElementById('log-out')?.addEventListener('click', () => { window.location.href = 'login.html'; });
document.getElementById('find')?.addEventListener('click', () => { window.location.href = 'inventory.html'; });
document.getElementById('Register-Asset')?.addEventListener('click', () => { window.location.href = 'register asset.html'; });
document.getElementById('assests-list')?.addEventListener('click', () => { window.location.href = 'assets list.html'; });
document.getElementById('Register-New-User')?.addEventListener('click', () => { window.location.href = 'register new user.html'; });
document.getElementById('profilee')?.addEventListener('click', () => { window.location.href = 'profile.html'; });

const BASE = 'http://127.0.0.1:8000';

// ============================================================
// REPORT ENDPOINT MAP
// Keyed by data-report attribute value on each button.
// To add a new report: add an entry here + a button in the HTML
// with the matching data-report attribute. No JS changes needed.
// ============================================================
const REPORT_CONFIG = {
    'audit-trail':      { pdf: '/api/reports/audit-trail',         label: 'Asset Audit Trail' },
    'maintenance':      { pdf: '/api/reports/maintenance-schedule', label: 'Maintenance Schedule' },
    'user-activity':    { pdf: '/api/reports/user-activity-log',    label: 'User Activity Log' },
    'checkout-history': { pdf: '/api/reports/checkout-history',     label: 'Check-out History' },
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
// PDF REPORT DOWNLOAD ENGINE
// Uses data-report attribute — no index-based mapping needed.
// Adding a new report type only requires a new REPORT_CONFIG
// entry and a button with the matching data-report attribute.
// ============================================================
async function downloadReport(reportKey, buttonEl) {
    const config = REPORT_CONFIG[reportKey];
    if (!config) {
        console.warn('Unknown report key:', reportKey);
        return;
    }

    const originalText = buttonEl.textContent;
    buttonEl.textContent = 'Generating...';
    buttonEl.disabled = true;

    try {
        const response = await fetch(`${BASE}${config.pdf}`);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            alert(`Failed to generate "${config.label}" report:\n${errData.detail || `Server error ${response.status}`}`);
            return;
        }

        // Extract filename from Content-Disposition header if available
        const disposition = response.headers.get('Content-Disposition') || '';
        const match       = disposition.match(/filename=([^;]+)/);
        const filename    = match ? match[1].replace(/['"]/g, '') : `${reportKey}_report.pdf`;

        const blob = await response.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Report download error:', error);
        alert('Could not connect to the report server. Is the backend running?');
    } finally {
        buttonEl.textContent = originalText;
        buttonEl.disabled    = false;
    }
}

// ============================================================
// INITIALISE ON PAGE LOAD
// ============================================================
window.addEventListener('DOMContentLoaded', () => {

    // Bind Generate Report buttons via data-report attribute
    document.querySelectorAll('button.special[data-report]').forEach(btn => {
        btn.addEventListener('click', () => downloadReport(btn.dataset.report, btn));
    });

    // Bind SVG buttons via data-report attribute
    document.querySelectorAll('button.svg[data-report]').forEach(btn => {
        btn.addEventListener('click', () => {
            const label = REPORT_CONFIG[btn.dataset.report]?.label || btn.dataset.report;
            alert(`SVG export for "${label}" is not yet implemented.`);
        });
    });

    // Load data
    loadDepreciationChart('1year');
    loadTotalValue();
});