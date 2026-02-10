// ===================================
// Admin Dashboard - Montáže EPS
// With Supabase Auth + Real Data
// ===================================

// --- Supabase Config ---
const SUPABASE_URL = localStorage.getItem('sb_url') || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = localStorage.getItem('sb_key') || 'YOUR_SUPABASE_ANON_KEY';

let sb = null;
let currentSession = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    // Init Supabase
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase) {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Check auth
    await checkAuth();

    initNavigation();
    initDate();
    initCharts();
    initMobileMenu();
    initPeriodSelector();
    initLogout();

    // Load real analytics data from Vercel
    await loadVercelAnalytics('30d');

    // Load real data if Supabase is connected
    if (sb && currentSession) {
        await loadRealInquiries();
        await loadInquiryStats();
    }
});

// --- Authentication ---
async function checkAuth() {
    if (!sb) {
        console.warn('Supabase not configured - running in demo mode');
        return;
    }

    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (!session) {
            window.location.href = '/admin/login';
            return;
        }
        currentSession = session;

        // Update avatar with user initials
        const email = session.user.email || '';
        const initials = email.substring(0, 2).toUpperCase();
        document.querySelectorAll('.topbar-avatar span, .mobile-avatar').forEach(el => {
            el.textContent = initials;
        });

    } catch (err) {
        console.error('Auth error:', err);
    }
}

function initLogout() {
    // Add logout to sidebar footer
    const logoutLink = document.querySelector('.sidebar-footer .nav-item');
    if (logoutLink && sb) {
        const logoutBtn = document.createElement('a');
        logoutBtn.href = '#';
        logoutBtn.className = 'nav-item';
        logoutBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 3h3a1 1 0 011 1v12a1 1 0 01-1 1h-3M8 14l-4-4m0 0l4-4m-4 4h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Odhlásit se
        `;
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (sb) await sb.auth.signOut();
            window.location.href = '/admin/login';
        });
        logoutLink.parentElement.appendChild(logoutBtn);
    }
}

// --- Load Real Vercel Analytics ---
async function loadVercelAnalytics(period) {
    try {
        const res = await fetch(`/api/analytics?period=${period}`);
        if (!res.ok) {
            console.warn('Analytics API not available, using demo data');
            return;
        }
        const data = await res.json();
        if (data.error) {
            console.warn('Analytics:', data.error);
            return;
        }

        // Update traffic chart with real timeseries data
        if (data.timeseries && data.timeseries.data && trafficChart) {
            const tsData = data.timeseries.data;
            const labels = tsData.map(d => {
                const date = new Date(d.key);
                return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
            });
            const visitors = tsData.map(d => d.uniques || d.visitors || 0);
            const pageviews = tsData.map(d => d.pageViews || d.hits || 0);

            trafficChart.data.labels = labels;
            trafficChart.data.datasets[0].data = visitors;
            trafficChart.data.datasets[1].data = pageviews;
            trafficChart.update();

            // Update KPIs with real totals
            const totalVisitors = visitors.reduce((a, b) => a + b, 0);
            const totalPageviews = pageviews.reduce((a, b) => a + b, 0);
            document.getElementById('kpiVisitors').textContent = totalVisitors.toLocaleString('cs-CZ');
            document.getElementById('kpiPageviews').textContent = totalPageviews.toLocaleString('cs-CZ');

            // Calculate avg time (if available)
            if (totalPageviews > 0) {
                const avgPagesPerVisit = (totalPageviews / Math.max(totalVisitors, 1)).toFixed(1);
                document.getElementById('kpiAvgTime').textContent = `${avgPagesPerVisit} str/návštěva`;
            }
        }

        // Update top pages table with real data
        if (data.pages && data.pages.data) {
            const tableBody = document.querySelector('.data-table');
            if (tableBody) {
                const headerHtml = `<div class="table-header">
                    <span>Stránka</span><span>Zobrazení</span><span>Návštěvníci</span><span>%</span>
                </div>`;
                const totalViews = data.pages.data.reduce((s, p) => s + (p.pageViews || p.hits || 0), 0);
                const rowsHtml = data.pages.data.slice(0, 8).map(page => {
                    const views = page.pageViews || page.hits || 0;
                    const uniques = page.uniques || page.visitors || 0;
                    const pct = totalViews > 0 ? ((views / totalViews) * 100).toFixed(1) : '0';
                    const path = page.key || page.path || '/';
                    const name = getPageName(path);
                    return `<div class="table-row">
                        <span class="page-name">${escapeHtml(path)} <em>${name}</em></span>
                        <span>${views.toLocaleString('cs-CZ')}</span>
                        <span>${uniques.toLocaleString('cs-CZ')}</span>
                        <span>${pct} %</span>
                    </div>`;
                }).join('');
                tableBody.innerHTML = headerHtml + rowsHtml;
            }
        }

        // Update sources chart with real referrer data
        if (data.referrers && data.referrers.data && sourcesChart) {
            const refs = data.referrers.data.slice(0, 5);
            if (refs.length > 0) {
                const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'];
                sourcesChart.data.labels = refs.map(r => r.key || 'Přímý přístup');
                sourcesChart.data.datasets[0].data = refs.map(r => r.pageViews || r.hits || 0);
                sourcesChart.data.datasets[0].backgroundColor = colors.slice(0, refs.length);
                sourcesChart.update();

                // Update sources list
                const sourcesList = document.querySelectorAll('.sources-list')[0];
                if (sourcesList) {
                    const total = refs.reduce((s, r) => s + (r.pageViews || r.hits || 0), 0);
                    sourcesList.innerHTML = refs.map((r, i) => {
                        const pct = total > 0 ? Math.round((r.pageViews || r.hits || 0) / total * 100) : 0;
                        return `<div class="source-item">
                            <span class="source-dot" style="background:${colors[i]}"></span>
                            <span class="source-name">${escapeHtml(r.key || 'Přímý přístup')}</span>
                            <span class="source-value">${pct} %</span>
                        </div>`;
                    }).join('');
                }
            }
        }

        // Update devices chart with real data
        if (data.devices && data.devices.data && devicesChart) {
            const devs = data.devices.data;
            if (devs.length > 0) {
                const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
                devicesChart.data.labels = devs.map(d => d.key || 'Jiné');
                devicesChart.data.datasets[0].data = devs.map(d => d.pageViews || d.hits || 0);
                devicesChart.data.datasets[0].backgroundColor = colors.slice(0, devs.length);
                devicesChart.update();

                // Update devices list
                const devicesList = document.querySelectorAll('.sources-list')[1];
                if (devicesList) {
                    const total = devs.reduce((s, d) => s + (d.pageViews || d.hits || 0), 0);
                    devicesList.innerHTML = devs.map((d, i) => {
                        const pct = total > 0 ? Math.round((d.pageViews || d.hits || 0) / total * 100) : 0;
                        return `<div class="source-item">
                            <span class="source-dot" style="background:${colors[i]}"></span>
                            <span class="source-name">${escapeHtml(d.key || 'Jiné')}</span>
                            <span class="source-value">${pct} %</span>
                        </div>`;
                    }).join('');
                }
            }
        }

        console.log('Real analytics loaded successfully');

    } catch (err) {
        console.warn('Could not load analytics, using demo data:', err.message);
    }
}

function getPageName(path) {
    const names = {
        '/': 'Hlavní stránka',
        '/sluzby/cctv': 'Kamerové systémy',
        '/sluzby/eps': 'Požární systémy',
        '/sluzby/pzts': 'Zabezpečení',
        '/sluzby/loxone': 'Chytrá domácnost',
        '/sluzby/wifi': 'Wi-Fi řešení',
        '/sluzby/videozvonky': 'Videozvonky',
        '/admin': 'Admin Dashboard',
        '/admin/login': 'Admin Login',
    };
    return names[path] || path;
}

// --- Load Real Data from Supabase ---
async function loadRealInquiries() {
    if (!sb || !currentSession) return;

    try {
        const { data: inquiries, error } = await sb
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        if (!inquiries || !inquiries.length) return;

        // Update KPI - real inquiry count
        const kpiInq = document.getElementById('kpiInquiries');
        if (kpiInq) kpiInq.textContent = inquiries.length.toString();

        // Update inquiry list in dashboard
        const inquiryList = document.querySelector('.inquiry-list');
        if (inquiryList) {
            inquiryList.innerHTML = inquiries.map(inq => {
                const timeAgo = getTimeAgo(new Date(inq.created_at));
                const isNew = inq.status === 'new';
                return `
                    <div class="inquiry-item ${isNew ? 'new' : ''}">
                        <div class="inquiry-header">
                            <strong>${escapeHtml(inq.name)}</strong>
                            <span class="inquiry-time">${timeAgo}</span>
                        </div>
                        <span class="inquiry-service">${escapeHtml(inq.service || 'Nespecifikováno')}</span>
                        <p>${escapeHtml(inq.message || 'Bez zprávy')}</p>
                        <div class="inquiry-contact">
                            <span>${escapeHtml(inq.email)}</span>
                            <span>${escapeHtml(inq.phone)}</span>
                        </div>
                        ${isNew ? `<button class="mark-read-btn" data-id="${inq.id}" onclick="markAsRead('${inq.id}')">Označit jako přečteno</button>` : ''}
                    </div>
                `;
            }).join('');
        }

        // Update services bar chart with real data
        updateServicesChartWithRealData(inquiries);

    } catch (err) {
        console.error('Error loading inquiries:', err);
    }
}

async function loadInquiryStats() {
    if (!sb || !currentSession) return;

    try {
        // Count total inquiries
        const { count: totalCount } = await sb
            .from('inquiries')
            .select('*', { count: 'exact', head: true });

        // Count new inquiries
        const { count: newCount } = await sb
            .from('inquiries')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'new');

        // Update badge
        const badge = document.querySelector('.badge');
        if (badge && newCount > 0) {
            badge.textContent = `${newCount} nových`;
        }

        // Update KPI
        const kpiInq = document.getElementById('kpiInquiries');
        if (kpiInq && totalCount) kpiInq.textContent = totalCount.toString();

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function markAsRead(id) {
    if (!sb || !currentSession) return;

    try {
        const { error } = await sb
            .from('inquiries')
            .update({ status: 'read', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Refresh data
        await loadRealInquiries();
        await loadInquiryStats();
    } catch (err) {
        console.error('Error:', err);
    }
}

// Make markAsRead globally accessible
window.markAsRead = markAsRead;

function updateServicesChartWithRealData(inquiries) {
    if (!servicesChart) return;

    const serviceCounts = {};
    inquiries.forEach(inq => {
        const svc = inq.service || 'Jiné';
        serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
    });

    const labels = Object.keys(serviceCounts);
    const data = Object.values(serviceCounts);

    if (labels.length > 0) {
        servicesChart.data.labels = labels;
        servicesChart.data.datasets[0].data = data;
        servicesChart.data.datasets[0].backgroundColor = labels.map((_, i) =>
            `rgba(59, 130, 246, ${0.8 - i * 0.1})`
        );
        servicesChart.update();
    }
}

// --- Helpers ---
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `před ${mins} min`;
    if (hours < 24) return `před ${hours} h`;
    if (days === 1) return 'včera';
    if (days < 7) return `před ${days} dny`;
    return date.toLocaleDateString('cs-CZ');
}

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
    // Demo data - will be replaced by real analytics once Vercel Analytics API is connected
    const data = {
        '7d': { visitors: '724', pageviews: '2,156', inquiries: '8', avgTime: '2m 05s', vChange: '+8.2 %', pChange: '+5.1 %', iChange: '+14.3 %', tChange: '+3.2 %' },
        '30d': { visitors: '2,847', pageviews: '8,432', inquiries: '34', avgTime: '2m 18s', vChange: '+12.5 %', pChange: '+8.3 %', iChange: '+23.1 %', tChange: '+5.7 %' },
        '90d': { visitors: '8,124', pageviews: '24,891', inquiries: '97', avgTime: '2m 24s', vChange: '+18.7 %', pChange: '+14.2 %', iChange: '+31.5 %', tChange: '+8.1 %' },
        '12m': { visitors: '31,456', pageviews: '94,732', inquiries: '412', avgTime: '2m 12s', vChange: '+22.3 %', pChange: '+19.8 %', iChange: '+45.2 %', tChange: '+6.4 %' }
    };

    const d = data[period] || data['30d'];
    document.getElementById('kpiVisitors').textContent = d.visitors;
    document.getElementById('kpiPageviews').textContent = d.pageviews;
    // Don't override real inquiry count if loaded from Supabase
    if (!sb || !currentSession) {
        document.getElementById('kpiInquiries').textContent = d.inquiries;
    }
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

    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getLast30DaysLabels(),
            datasets: [
                {
                    label: 'Návštěvníci',
                    data: generateTrafficData(30, 60, 140),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderWidth: 2, fill: true, tension: 0.4,
                    pointRadius: 0, pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#3b82f6',
                },
                {
                    label: 'Zobrazení',
                    data: generateTrafficData(30, 150, 380),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderWidth: 2, fill: true, tension: 0.4,
                    pointRadius: 0, pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#22c55e',
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                    cornerRadius: 10, padding: 12, bodySpacing: 6,
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 11 } }, border: { display: false } },
                y: { grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, ticks: { font: { size: 11 } }, border: { display: false }, beginAtZero: true }
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
            datasets: [{ data: [42, 31, 18, 9], backgroundColor: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', cornerRadius: 10, padding: 10, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} %` } } }
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
            datasets: [{ data: [58, 34, 8], backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', cornerRadius: 10, padding: 10, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} %` } } }
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
                label: 'Poptávky', data: [12, 8, 5, 4, 3, 2],
                backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(59,130,246,0.65)', 'rgba(59,130,246,0.5)', 'rgba(59,130,246,0.4)', 'rgba(59,130,246,0.3)', 'rgba(59,130,246,0.2)'],
                borderRadius: 8, borderSkipped: false, barThickness: 36
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', cornerRadius: 10, padding: 10, callbacks: { label: (ctx) => ` ${ctx.raw} poptávek` } } },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: '500' } } },
                y: { grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, border: { display: false }, beginAtZero: true, ticks: { stepSize: 4, font: { size: 11 } } }
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

// --- Label & Data Helpers ---
function getLast30DaysLabels() { return getLabels(30); }

function getLabels(days) {
    const labels = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }));
    }
    return labels;
}

function getLast12MonthsLabels() {
    const labels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now); d.setMonth(d.getMonth() - i);
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
        const dayOfWeek = new Date(Date.now() - (count - i) * 86400000).getDay();
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1;
        data.push(Math.floor(prev * weekendFactor));
    }
    return data;
}
