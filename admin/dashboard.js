// ===================================
// Admin Dashboard - Montáže EPS
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDate();
    initCharts();
    initMobileMenu();
    initPeriodSelector();
});

// --- Navigation ---
function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('pageTitle');
    const sectionTitles = {
        overview: 'Přehled',
        traffic: 'Návštěvnost',
        inquiries: 'Poptávky',
        pages: 'Stránky',
        settings: 'Nastavení'
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (!section) return;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(`section-${section}`);
            if (target) target.classList.add('active');

            pageTitle.textContent = sectionTitles[section] || 'Dashboard';

            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.classList.remove('active');
        });
    });
}

// --- Date ---
function initDate() {
    const dateEl = document.getElementById('currentDate');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('cs-CZ', options);
}

// --- Mobile Menu ---
function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });
}

// --- Period Selector ---
function initPeriodSelector() {
    const select = document.getElementById('periodSelect');
    select.addEventListener('change', () => {
        updateKPIs(select.value);
        updateCharts(select.value);
    });
}

function updateKPIs(period) {
    const data = {
        '7d': { visitors: '724', pageviews: '2,156', inquiries: '8', avgTime: '2m 05s', vChange: '+8.2 %', pChange: '+5.1 %', iChange: '+14.3 %', tChange: '+3.2 %' },
        '30d': { visitors: '2,847', pageviews: '8,432', inquiries: '34', avgTime: '2m 18s', vChange: '+12.5 %', pChange: '+8.3 %', iChange: '+23.1 %', tChange: '+5.7 %' },
        '90d': { visitors: '8,124', pageviews: '24,891', inquiries: '97', avgTime: '2m 24s', vChange: '+18.7 %', pChange: '+14.2 %', iChange: '+31.5 %', tChange: '+8.1 %' },
        '12m': { visitors: '31,456', pageviews: '94,732', inquiries: '412', avgTime: '2m 12s', vChange: '+22.3 %', pChange: '+19.8 %', iChange: '+45.2 %', tChange: '+6.4 %' }
    };

    const d = data[period] || data['30d'];
    document.getElementById('kpiVisitors').textContent = d.visitors;
    document.getElementById('kpiPageviews').textContent = d.pageviews;
    document.getElementById('kpiInquiries').textContent = d.inquiries;
    document.getElementById('kpiAvgTime').textContent = d.avgTime;

    const changes = document.querySelectorAll('.kpi-change');
    const changeValues = [d.vChange, d.pChange, d.iChange, d.tChange];
    changes.forEach((el, i) => {
        if (changeValues[i]) {
            el.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3m0 0l-3 3m3-3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ${changeValues[i]}`;
        }
    });
}

// --- Charts ---
let trafficChart, sourcesChart, devicesChart, servicesChart;

function initCharts() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#94a3b8';

    createTrafficChart();
    createSourcesChart();
    createDevicesChart();
    createServicesChart();
}

function createTrafficChart() {
    const ctx = document.getElementById('trafficChart');
    if (!ctx) return;

    const labels = getLast30DaysLabels();

    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Návštěvníci',
                    data: generateTrafficData(30, 60, 140),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#3b82f6',
                },
                {
                    label: 'Zobrazení',
                    data: generateTrafficData(30, 150, 380),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#22c55e',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    bodySpacing: 6,
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8, font: { size: 11 } },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    ticks: { font: { size: 11 } },
                    border: { display: false },
                    beginAtZero: true
                }
            }
        }
    });
}

function createSourcesChart() {
    const ctx = document.getElementById('sourcesChart');
    if (!ctx) return;

    sourcesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Přímý přístup', 'Google', 'Sociální sítě', 'Ostatní'],
            datasets: [{
                data: [42, 31, 18, 9],
                backgroundColor: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    cornerRadius: 10,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} %`
                    }
                }
            }
        }
    });
}

function createDevicesChart() {
    const ctx = document.getElementById('devicesChart');
    if (!ctx) return;

    devicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mobil', 'Desktop', 'Tablet'],
            datasets: [{
                data: [58, 34, 8],
                backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    cornerRadius: 10,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} %`
                    }
                }
            }
        }
    });
}

function createServicesChart() {
    const ctx = document.getElementById('servicesChart');
    if (!ctx) return;

    servicesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['CCTV', 'EPS', 'PZTS', 'Loxone', 'Wi-Fi', 'Videozvonky'],
            datasets: [{
                label: 'Poptávky',
                data: [12, 8, 5, 4, 3, 2],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(59, 130, 246, 0.65)',
                    'rgba(59, 130, 246, 0.5)',
                    'rgba(59, 130, 246, 0.4)',
                    'rgba(59, 130, 246, 0.3)',
                    'rgba(59, 130, 246, 0.2)'
                ],
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 36
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    cornerRadius: 10,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} poptávek`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 11, weight: '500' } }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    border: { display: false },
                    beginAtZero: true,
                    ticks: { stepSize: 4, font: { size: 11 } }
                }
            }
        }
    });
}

function updateCharts(period) {
    if (!trafficChart) return;

    const dayMap = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    const days = dayMap[period] || 30;

    const labels = period === '12m' ? getLast12MonthsLabels() : getLabels(days);
    const count = labels.length;

    trafficChart.data.labels = labels;
    trafficChart.data.datasets[0].data = generateTrafficData(count, 60, 140);
    trafficChart.data.datasets[1].data = generateTrafficData(count, 150, 380);
    trafficChart.update('none');
}

// --- Helpers ---
function getLast30DaysLabels() {
    return getLabels(30);
}

function getLabels(days) {
    const labels = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }));
    }
    return labels;
}

function getLast12MonthsLabels() {
    const labels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        labels.push(d.toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' }));
    }
    return labels;
}

function generateTrafficData(count, min, max) {
    const data = [];
    let prev = Math.floor((min + max) / 2);
    for (let i = 0; i < count; i++) {
        const change = Math.floor(Math.random() * (max - min) * 0.4) - (max - min) * 0.2;
        prev = Math.max(min, Math.min(max, prev + change));
        // Add weekend dip
        const dayOfWeek = new Date(Date.now() - (count - i) * 86400000).getDay();
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1;
        data.push(Math.floor(prev * weekendFactor));
    }
    return data;
}
