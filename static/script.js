const API_BASE_URL = 'https://bookspace-aw3i.onrender.com';

let currentResources = [];
let searchTerm = '';
let currentFilter = 'all';
let currentView = 'grid';
let currentWeekStart = new Date();
const userRole = document.getElementById('userRole')?.value || 'customer';
let currentResourceId = null;
const modal = document.getElementById('bookingModal');

document.addEventListener('DOMContentLoaded', () => {
    loadResources();
    setupEventListeners();
    setupDatePicker();
    setupBackToTop();
    initCalendar();
});

function setupEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        filterAndRenderResources();
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
        document.querySelector('.nav-menu')?.classList.toggle('active');
    });
    
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('backToTop');
        if (window.scrollY > 300) {
            btn?.classList.add('show');
        } else {
            btn?.classList.remove('show');
        }
    });
}

function initCalendar() {
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentView = btn.dataset.view;
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (currentView === 'calendar') {
                document.getElementById('calendarView').style.display = 'block';
                document.querySelector('.resources-section').style.display = 'none';
                renderCalendar();
            } else {
                document.getElementById('calendarView').style.display = 'none';
                document.querySelector('.resources-section').style.display = 'block';
            }
        });
    });
    
    document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderCalendar();
    });
    
    document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderCalendar();
    });
}

async function renderCalendar() {
    const timeSlots = generateTimeSlots();
    const weekDays = generateWeekDays(currentWeekStart);
    
    const title = document.getElementById('calendarTitle');
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    title.textContent = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/all`);
        const data = await response.json();
        const bookings = data.success ? data.data : [];
        
        let html = '<div class="calendar-grid">';
        html += '<div class="calendar-time-cell">Time</div>';
        
        weekDays.forEach(day => {
            html += `<div class="calendar-day-header">${day.date}<br><small>${day.dayName}</small></div>`;
        });
        
        timeSlots.forEach(slot => {
            html += `<div class="calendar-time-cell">${slot}</div>`;
            
            weekDays.forEach(day => {
                const isBooked = bookings.some(b => 
                    b.booking_date === day.fullDate && 
                    b.start_time === slot &&
                    b.status === 'confirmed'
                );
                
                const bookedClass = isBooked ? 'booked' : 'available';
                html += `
                    <div class="calendar-slot ${bookedClass}" 
                         onclick="${!isBooked ? `quickBookSlot('${day.fullDate}', '${slot}')` : ''}"
                         data-date="${day.fullDate}" 
                         data-time="${slot}">
                        ${isBooked ? '<div class="slot-info">Booked</div>' : '<div class="slot-info">Available</div>'}
                    </div>
                `;
            });
        });
        
        html += '</div>';
        document.getElementById('calendarGrid').innerHTML = html;
    } catch (error) {
        console.error('Error rendering calendar:', error);
        document.getElementById('calendarGrid').innerHTML = '<div class="loading-state">Failed to load calendar</div>';
    }
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
}

function generateWeekDays(startDate) {
    const days = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        days.push({
            fullDate: date.toISOString().split('T')[0],
            date: date.getDate(),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }
    return days;
}

function quickBookSlot(date, time) {
    if (userRole === 'admin') {
        showToast('Admin users cannot book resources', 'warning');
        return;
    }
    
    if (currentResources.length > 0) {
        openBookingModal(currentResources[0].id, currentResources[0].name);
        document.getElementById('bookingDate').value = date;
        document.getElementById('startTime').value = time;
        
        const [hour, minute] = time.split(':');
        let endHour = parseInt(hour);
        let endMinute = parseInt(minute) + 30;
        if (endMinute >= 60) {
            endHour++;
            endMinute -= 60;
        }
        document.getElementById('endTime').value = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Trigger validation
        const event = new Event('change');
        document.getElementById('startTime').dispatchEvent(event);
        document.getElementById('endTime').dispatchEvent(event);
    } else {
        showToast('No resources available', 'error');
    }
}

function setupDatePicker() {
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        dateInput.max = maxDate.toISOString().split('T')[0];
        
        dateInput.addEventListener('change', () => {
            if (currentResourceId) {
                loadBookedSlots(currentResourceId, dateInput.value);
            }
        });
    }
}

async function loadBookedSlots(resourceId, date) {
    const summaryDiv = document.getElementById('bookingSummary');
    const summaryText = document.getElementById('summaryText');
    
    if (!date) {
        summaryDiv.style.display = 'none';
        return;
    }
    
    summaryDiv.style.display = 'flex';
    summaryText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading booked slots...';
    summaryDiv.style.background = '#e0e7ff';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/all`);
        const data = await response.json();
        
        if (data.success) {
            const bookedSlots = data.data.filter(booking => 
                booking.resource_id === resourceId && 
                booking.booking_date === date &&
                booking.status === 'confirmed'
            );
            
            if (bookedSlots.length === 0) {
                summaryText.innerHTML = '✓ No bookings yet for this date. All time slots are available!';
                summaryDiv.style.background = '#def7ec';
            } else {
                const slotsHtml = bookedSlots.map(slot => 
                    `⏰ ${slot.start_time} - ${slot.end_time}`
                ).join(' • ');
                summaryText.innerHTML = `<strong>Booked time slots:</strong> ${slotsHtml}`;
                summaryDiv.style.background = '#fed7d7';
            }
        }
    } catch (error) {
        console.error('Error loading booked slots:', error);
        summaryText.innerHTML = 'Unable to load booked slots. Please check availability before booking.';
        summaryDiv.style.background = '#fed7d7';
    }
}

async function checkTimeSlotAvailability(resourceId, date, startTime, endTime) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resource_id: resourceId,
                booking_date: date,
                start_time: startTime,
                end_time: endTime
            })
        });
        
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking availability:', error);
        return false;
    }
}

function setupTimeValidation() {
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    const dateInput = document.getElementById('bookingDate');
    
    const validateTimes = async () => {
        if (startTime.value && endTime.value && dateInput.value && currentResourceId) {
            if (startTime.value >= endTime.value) {
                const summary = document.getElementById('bookingSummary');
                const summaryText = document.getElementById('summaryText');
                summary.style.display = 'flex';
                summaryText.textContent = '⚠️ End time must be after start time';
                summary.style.background = '#fed7d7';
                return false;
            } else {
                const isAvailable = await checkTimeSlotAvailability(
                    currentResourceId, 
                    dateInput.value, 
                    startTime.value, 
                    endTime.value
                );
                
                const summary = document.getElementById('bookingSummary');
                const summaryText = document.getElementById('summaryText');
                const duration = calculateDuration(startTime.value, endTime.value);
                
                if (isAvailable) {
                    summary.style.display = 'flex';
                    summaryText.innerHTML = `✓ Duration: ${duration} hour${duration !== 1 ? 's' : ''} - Time slot is available!`;
                    summary.style.background = '#def7ec';
                    return true;
                } else {
                    summary.style.display = 'flex';
                    summaryText.innerHTML = `❌ This time slot is already booked. Please choose a different time.`;
                    summary.style.background = '#fed7d7';
                    return false;
                }
            }
        }
        return false;
    };
    
    startTime?.addEventListener('change', validateTimes);
    endTime?.addEventListener('change', validateTimes);
    dateInput?.addEventListener('change', validateTimes);
}

function setupBackToTop() {
    const btn = document.getElementById('backToTop');
    btn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

async function loadResources() {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading available resources...</p></div>';
    
    try {
        const url = currentFilter === 'all' ? `${API_BASE_URL}/api/resources` : `${API_BASE_URL}/api/resources?type=${encodeURIComponent(currentFilter)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentResources = data.data;
            updateResultsCount(currentResources.length);
            filterAndRenderResources();
        } else {
            container.innerHTML = '<div class="loading-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load resources</p></div>';
        }
    } catch (error) {
        console.error('Error loading resources:', error);
        container.innerHTML = '<div class="loading-state"><i class="fas fa-wifi"></i><p>Network error. Please check your connection.</p></div>';
    }
}

function filterAndRenderResources() {
    let filtered = currentResources;
    
    if (searchTerm) {
        filtered = filtered.filter(resource =>
            resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderCards(filtered);
    updateResultsCount(filtered.length);
}

function updateResultsCount(count) {
    const resultsElement = document.getElementById('resultsCount');
    if (resultsElement) {
        resultsElement.textContent = `${count} resource${count !== 1 ? 's' : ''} available`;
    }
}

function renderCards(resources) {
    const container = document.getElementById('cardsContainer');
    
    if (resources.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-search"></i>
                <p>No resources found matching your criteria</p>
                <button onclick="clearSearch()" class="btn-book" style="margin-top: 1rem;">
                    <i class="fas fa-undo"></i> Clear Search
                </button>
            </div>
        `;
        return;
    }
    
    const isAdmin = userRole === 'admin';
    
    container.innerHTML = resources.map(resource => {
        let amenities = [];
        try {
            amenities = JSON.parse(resource.amenities || '[]');
        } catch(e) {
            amenities = [];
        }
        
        let icon = '🏢';
        if (resource.type === 'Meeting Rooms') icon = '💼';
        if (resource.type === 'Lab Equipment') icon = '🔬';
        if (resource.type === 'Study Pods') icon = '📚';
        
        const actionButton = isAdmin ? `
            <button class="btn-book view-only" onclick="viewResourceDetails(${resource.id})" style="background: #6c8da3;">
                <i class="fas fa-eye"></i> View Details
            </button>
        ` : `
            <button class="btn-book" onclick="openBookingModal(${resource.id}, '${escapeHtml(resource.name).replace(/'/g, "\\'")}')">
                <i class="fas fa-calendar-check"></i> Book Now
            </button>
        `;
        
        return `
            <div class="resource-card" data-id="${resource.id}">
                <div class="card-header">
                    <div class="badge-type">${icon} ${escapeHtml(resource.type)}</div>
                    <div class="resource-name">${escapeHtml(resource.name)}</div>
                    <div class="description">${escapeHtml(resource.description)}</div>
                    <div class="capacity">
                        <i class="fas fa-users"></i> 
                        ${resource.capacity} person${resource.capacity > 1 ? 's' : ''}
                    </div>
                </div>
                <div class="details-section">
                    <div class="amenities-list">
                        ${amenities.map(a => `<span class="amenity-tag">${escapeHtml(a)}</span>`).join('')}
                    </div>
                </div>
                ${actionButton}
            </div>
        `;
    }).join('');
}

function viewResourceDetails(resourceId) {
    const resource = currentResources.find(r => r.id === resourceId);
    if (!resource) return;
    
    let amenities = [];
    try {
        amenities = JSON.parse(resource.amenities || '[]');
    } catch(e) {
        amenities = [];
    }
    
    let icon = '🏢';
    if (resource.type === 'Meeting Rooms') icon = '💼';
    if (resource.type === 'Lab Equipment') icon = '🔬';
    if (resource.type === 'Study Pods') icon = '📚';
    
    const detailsHtml = `
        <div style="padding: 1rem;">
            <div style="text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 3rem;">${icon}</div>
                <h3 style="margin-top: 0.5rem;">${escapeHtml(resource.name)}</h3>
                <span class="badge-type" style="background: #667eea; color: white;">${escapeHtml(resource.type)}</span>
            </div>
            <div class="detail-section">
                <h4><i class="fas fa-align-left"></i> Description</h4>
                <p>${escapeHtml(resource.description)}</p>
            </div>
            <div class="detail-section">
                <h4><i class="fas fa-users"></i> Capacity</h4>
                <p>${resource.capacity} person${resource.capacity > 1 ? 's' : ''}</p>
            </div>
            <div class="detail-section">
                <h4><i class="fas fa-gift"></i> Amenities</h4>
                <div class="amenities-list">
                    ${amenities.map(a => `<span class="amenity-tag">${escapeHtml(a)}</span>`).join('')}
                </div>
            </div>
            <div style="text-align: center; margin-top: 1.5rem;">
                <button class="btn-close-modal" onclick="this.closest('.modal').remove()" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    const detailModal = document.createElement('div');
    detailModal.className = 'modal';
    detailModal.style.display = 'block';
    detailModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-info-circle"></i> Resource Details</h2>
                <span class="close-details" style="cursor: pointer; font-size: 1.5rem; position: absolute; right: 1.5rem; top: 1rem;">&times;</span>
            </div>
            ${detailsHtml}
        </div>
    `;
    
    document.body.appendChild(detailModal);
    
    detailModal.querySelector('.close-details')?.addEventListener('click', () => {
        detailModal.remove();
    });
    
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
            detailModal.remove();
        }
    });
}

function clearSearch() {
    searchTerm = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    filterAndRenderResources();
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentFilter = btn.getAttribute('data-filter');
        await loadResources();
    });
});

async function openBookingModal(resourceId, resourceName) {
    if (userRole === 'admin') {
        showToast('Admin users cannot book resources. You can only view details.', 'warning');
        return;
    }
    
    currentResourceId = resourceId;
    document.getElementById('resourceId').value = resourceId;
    document.getElementById('resourceName').value = resourceName;
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('bookingDate').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('purpose').value = '';
    
    const summaryDiv = document.getElementById('bookingSummary');
    summaryDiv.style.display = 'none';
    
    const userInfo = document.querySelector('.user-greeting span:nth-child(2)');
    if (userInfo && userInfo.textContent !== 'Welcome, !') {
        const userName = userInfo.textContent.replace('Welcome, ', '').trim();
        document.getElementById('userName').value = userName;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    setupTimeValidation();
}

function calculateDuration(start, end) {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    let duration = endHour - startHour;
    if (endMin > startMin) duration += (endMin - startMin) / 60;
    if (endMin < startMin) duration -= (startMin - endMin) / 60;
    return duration.toFixed(1);
}

document.querySelector('.close')?.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
});

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentResourceId = null;
}

document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookingData = {
        resource_id: currentResourceId,
        user_name: document.getElementById('userName').value,
        user_email: document.getElementById('userEmail').value,
        booking_date: document.getElementById('bookingDate').value,
        start_time: document.getElementById('startTime').value,
        end_time: document.getElementById('endTime').value,
        purpose: document.getElementById('purpose').value
    };
    
    if (!bookingData.user_name || !bookingData.user_email || !bookingData.booking_date || 
        !bookingData.start_time || !bookingData.end_time) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.user_email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (bookingData.start_time >= bookingData.end_time) {
        showToast('End time must be after start time', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('.submit-booking');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal();
            showSuccessModal(bookingData);
            loadResources();
            if (currentView === 'calendar') {
                renderCalendar();
            }
        } else {
            showToast(data.error || 'Booking failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

function showSuccessModal(bookingData) {
    const successModal = document.getElementById('successModal');
    const message = document.getElementById('successMessage');
    const resource = currentResources.find(r => r.id === currentResourceId);
    message.innerHTML = `
        <strong>${escapeHtml(resource?.name || 'Your resource')}</strong><br>
        on ${bookingData.booking_date} at ${bookingData.start_time}<br>
        A confirmation has been sent to ${bookingData.user_email}
    `;
    successModal.style.display = 'block';
    
    setTimeout(() => closeSuccessModal(), 3000);
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMsg');
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
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