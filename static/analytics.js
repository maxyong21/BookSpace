let currentBookings = [];
let currentResources = [];
let currentUsers = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        loadData();
        showToast('Analytics data refreshed!', 'success');
    });
    
    document.getElementById('exportBtn')?.addEventListener('click', exportToPDF);
    
    document.getElementById('dateRangeSelect')?.addEventListener('change', () => {
        updateCharts();
    });
}

async function loadData() {
    showLoading();
    
    try {
        const [bookingsRes, resourcesRes, usersRes] = await Promise.all([
            fetch('/api/bookings/all'),
            fetch('/api/resources'),
            fetch('/api/users/count')
        ]);
        
        const bookingsData = await bookingsRes.json();
        const resourcesData = await resourcesRes.json();
        const usersData = await usersRes.json();
        
        if (bookingsData.success) currentBookings = bookingsData.data;
        if (resourcesData.success) currentResources = resourcesData.data;
        
        updateMetrics();
        loadAllCharts();
        loadTopUsers();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load analytics data', 'error');
    }
}

function updateMetrics() {
    const totalBookings = currentBookings.length;
    const totalResources = currentResources.length;
    const totalUsers = currentUsers.length || 5;
    
    const confirmedBookings = currentBookings.filter(b => b.status === 'confirmed').length;
    const bookingRate = totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : 0;
    
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('totalResources').textContent = totalResources;
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('bookingRate').textContent = `${bookingRate}%`;
}

function getFilteredBookings() {
    const range = document.getElementById('dateRangeSelect').value;
    if (range === 'all') return currentBookings;
    
    const days = parseInt(range);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    return currentBookings.filter(b => b.booking_date >= cutoffStr);
}

function loadAllCharts() {
    const filteredBookings = getFilteredBookings();
    loadTrendChart(filteredBookings);
    loadPopularityChart(filteredBookings);
    loadStatusChart(filteredBookings);
    loadPeakHoursChart(filteredBookings);
    loadWeekdayChart(filteredBookings);
    loadTypeChart(filteredBookings);
}

function loadTrendChart(bookings) {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last30Days.push(date.toISOString().split('T')[0]);
    }
    
    const dailyCounts = last30Days.map(date => 
        bookings.filter(b => b.booking_date === date).length
    );
    
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (ctx) {
        if (charts.trend) charts.trend.destroy();
        charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map(d => new Date(d).toLocaleDateString()),
                datasets: [{
                    label: 'Bookings',
                    data: dailyCounts,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} bookings` } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Bookings' } },
                    x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 10 } }
                }
            }
        });
    }
}

function loadPopularityChart(bookings) {
    const resourceCounts = {};
    bookings.forEach(booking => {
        const name = booking.resource_name || 'Unknown';
        resourceCounts[name] = (resourceCounts[name] || 0) + 1;
    });
    
    const sorted = Object.entries(resourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(item => item[0]);
    const data = sorted.map(item => item[1]);
    
    const ctx = document.getElementById('popularityChart')?.getContext('2d');
    if (ctx) {
        if (charts.popularity) charts.popularity.destroy();
        charts.popularity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Bookings',
                    data: data,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    borderColor: '#4f46e5',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} bookings` } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Bookings' } },
                    x: { ticks: { autoSkip: true, maxRotation: 45 } }
                }
            }
        });
    }
}

function loadStatusChart(bookings) {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    
    const ctx = document.getElementById('statusChart')?.getContext('2d');
    if (ctx) {
        if (charts.status) charts.status.destroy();
        charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Confirmed', 'Cancelled'],
                datasets: [{
                    data: [confirmed, cancelled],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / (confirmed + cancelled)) * 100).toFixed(1)}%)` } }
                }
            }
        });
    }
}

function loadPeakHoursChart(bookings) {
    const hourCounts = Array(24).fill(0);
    bookings.forEach(booking => {
        const hour = parseInt(booking.start_time.split(':')[0]);
        if (hour >= 0 && hour < 24) hourCounts[hour]++;
    });
    
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    
    const ctx = document.getElementById('peakHoursChart')?.getContext('2d');
    if (ctx) {
        if (charts.peakHours) charts.peakHours.destroy();
        charts.peakHours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Bookings',
                    data: hourCounts,
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} bookings` } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Bookings' } },
                    x: { ticks: { stepSize: 2, autoSkip: true } }
                }
            }
        });
    }
}

function loadWeekdayChart(bookings) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayCounts = Array(7).fill(0);
    
    bookings.forEach(booking => {
        const date = new Date(booking.booking_date);
        const day = date.getDay();
        weekdayCounts[day]++;
    });
    
    const ctx = document.getElementById('weekdayChart')?.getContext('2d');
    if (ctx) {
        if (charts.weekday) charts.weekday.destroy();
        charts.weekday = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekdays,
                datasets: [{
                    label: 'Bookings',
                    data: weekdayCounts,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} bookings` } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Bookings' } }
                }
            }
        });
    }
}

function loadTypeChart(bookings) {
    const typeCounts = {
        'Meeting Rooms': 0,
        'Lab Equipment': 0,
        'Study Pods': 0
    };
    
    bookings.forEach(booking => {
        const type = booking.resource_type;
        if (typeCounts.hasOwnProperty(type)) typeCounts[type]++;
    });
    
    const ctx = document.getElementById('typeChart')?.getContext('2d');
    if (ctx) {
        if (charts.resourceType) charts.resourceType.destroy();
        charts.resourceType = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#4f46e5', '#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} bookings` } }
                }
            }
        });
    }
}

async function loadTopUsers() {
    const container = document.getElementById('topUsersContainer');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading top users...</p></div>';
    
    try {
        const userCounts = {};
        currentBookings.forEach(booking => {
            const email = booking.user_email;
            userCounts[email] = userCounts[email] || { name: booking.user_name, email: email, count: 0 };
            userCounts[email].count++;
        });
        
        const topUsers = Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 10);
        
        if (topUsers.length === 0) {
            container.innerHTML = '<div class="loading-state">No user data available</div>';
            return;
        }
        
        container.innerHTML = topUsers.map((user, index) => `
            <div class="user-rank-card">
                <div class="rank-number">${index + 1}</div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(user.name)}</div>
                    <div class="user-email">${escapeHtml(user.email)}</div>
                </div>
                <div class="user-bookings">${user.count} bookings</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading top users:', error);
        container.innerHTML = '<div class="loading-state">Failed to load top users</div>';
    }
}

function updateCharts() {
    const filteredBookings = getFilteredBookings();
    loadTrendChart(filteredBookings);
    loadPopularityChart(filteredBookings);
    loadStatusChart(filteredBookings);
    loadPeakHoursChart(filteredBookings);
    loadWeekdayChart(filteredBookings);
    loadTypeChart(filteredBookings);
    updateMetrics();
}

async function exportToPDF() {
    showToast('Generating PDF report...', 'info');
    
    const element = document.querySelector('.analytics-page');
    const originalTitle = document.title;
    document.title = `BookSpace_Analytics_${new Date().toISOString().split('T')[0]}`;
    
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `bookspace_analytics_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    
    try {
        await html2pdf().set(opt).from(element).save();
        showToast('PDF report downloaded successfully!', 'success');
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('Failed to generate PDF', 'error');
    }
    
    document.title = originalTitle;
}

function showLoading() {
    const containers = document.querySelectorAll('.chart-container canvas');
    containers.forEach(container => {
        const parent = container.parentElement;
        if (parent && !parent.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.background = 'rgba(255,255,255,0.8)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.borderRadius = '1rem';
            parent.style.position = 'relative';
            parent.appendChild(overlay);
        }
    });
}

function hideLoading() {
    document.querySelectorAll('.loading-overlay').forEach(overlay => overlay.remove());
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMsg');
    let icon = '';
    switch(type) {
        case 'success': icon = '✅'; break;
        case 'error': icon = '❌'; break;
        case 'info': icon = 'ℹ️'; break;
        default: icon = '✅';
    }
    toast.innerHTML = `${icon} ${message}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}