let currentBookings = [];
let currentFilter = 'all';
let searchTerm = '';

async function loadBookings() {
    const container = document.getElementById('bookingsContainer');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading your bookings...</p></div>';
    
    try {
        const response = await fetch('/api/bookings/my');
        const data = await response.json();
        
        if (data.success) {
            currentBookings = data.data;
            updateStats();
            filterAndRenderBookings();
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load bookings</p></div>';
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi"></i><p>Network error. Please try again.</p></div>';
    }
}

function updateStats() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const upcoming = currentBookings.filter(b => b.status === 'confirmed' && b.booking_date >= today);
    const past = currentBookings.filter(b => b.status === 'confirmed' && b.booking_date < today);
    const cancelled = currentBookings.filter(b => b.status === 'cancelled');
    
    // Calculate total hours for upcoming bookings
    let totalHours = 0;
    upcoming.forEach(booking => {
        const start = parseInt(booking.start_time.split(':')[0]);
        const end = parseInt(booking.end_time.split(':')[0]);
        totalHours += (end - start);
    });
    
    document.getElementById('upcomingCount').textContent = upcoming.length;
    document.getElementById('pastCount').textContent = past.length;
    document.getElementById('cancelledCount').textContent = cancelled.length;
    document.getElementById('totalHours').textContent = totalHours;
}

function filterAndRenderBookings() {
    let filtered = currentBookings;
    
    // Apply status filter
    if (currentFilter !== 'all') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        if (currentFilter === 'upcoming') {
            filtered = filtered.filter(b => b.status === 'confirmed' && b.booking_date >= today);
        } else if (currentFilter === 'past') {
            filtered = filtered.filter(b => b.status === 'confirmed' && b.booking_date < today);
        } else if (currentFilter === 'cancelled') {
            filtered = filtered.filter(b => b.status === 'cancelled');
        }
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(b => 
            b.resource_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderBookings(filtered);
}

function renderBookings(bookings) {
    const container = document.getElementById('bookingsContainer');
    
    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No bookings found</p>
                <a href="/" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Make a Booking
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = bookings.map(booking => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        let statusClass = 'upcoming';
        if (booking.status === 'cancelled') {
            statusClass = 'cancelled';
        } else if (booking.booking_date < today) {
            statusClass = 'past';
        }
        
        const canEdit = booking.status !== 'cancelled' && booking.booking_date >= today;
        
        return `
            <div class="booking-card ${statusClass}" data-id="${booking.id}">
                <div class="booking-info">
                    <div class="booking-resource">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(booking.resource_name)}
                    </div>
                    <div class="booking-details">
                        <span class="detail-item">
                            <i class="fas fa-calendar"></i> ${formatDate(booking.booking_date)}
                        </span>
                        <span class="detail-item">
                            <i class="fas fa-clock"></i> ${booking.start_time} - ${booking.end_time}
                        </span>
                        <span class="detail-item">
                            <i class="fas fa-tag"></i> ${booking.resource_type}
                        </span>
                    </div>
                    ${booking.purpose ? `
                        <div class="booking-purpose">
                            <i class="fas fa-pen"></i> ${escapeHtml(booking.purpose)}
                        </div>
                    ` : ''}
                </div>
                ${canEdit ? `
                    <div class="booking-actions">
                        <button class="btn btn-primary" onclick="openEditModal(${booking.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="openCancelModal(${booking.id})">
                            <i class="fas fa-trash"></i> Cancel
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Search and Filter
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    filterAndRenderBookings();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        filterAndRenderBookings();
    });
});

// Edit Modal
let currentEditBookingId = null;

async function openEditModal(bookingId) {
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    currentEditBookingId = bookingId;
    document.getElementById('editBookingId').value = bookingId;
    document.getElementById('editResourceName').value = booking.resource_name;
    document.getElementById('editBookingDate').value = booking.booking_date;
    document.getElementById('editStartTime').value = booking.start_time;
    document.getElementById('editEndTime').value = booking.end_time;
    document.getElementById('editPurpose').value = booking.purpose || '';
    
    // Set min date to today
    document.getElementById('editBookingDate').min = new Date().toISOString().split('T')[0];
    
    document.getElementById('editModal').style.display = 'block';
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookingData = {
        booking_date: document.getElementById('editBookingDate').value,
        start_time: document.getElementById('editStartTime').value,
        end_time: document.getElementById('editEndTime').value,
        purpose: document.getElementById('editPurpose').value
    };
    
    if (bookingData.start_time >= bookingData.end_time) {
        showToast('End time must be after start time', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/bookings/${currentEditBookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Booking updated successfully!', 'success');
            closeModal('editModal');
            loadBookings();
        } else {
            showToast(data.error || 'Failed to update booking', 'error');
        }
    } catch (error) {
        console.error('Error updating booking:', error);
        showToast('Error updating booking', 'error');
    }
});

// Cancel Modal
let currentCancelBookingId = null;

async function openCancelModal(bookingId) {
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    currentCancelBookingId = bookingId;
    
    document.getElementById('cancelBookingDetails').innerHTML = `
        <strong><i class="fas fa-building"></i> ${escapeHtml(booking.resource_name)}</strong><br>
        <i class="fas fa-calendar"></i> ${formatDate(booking.booking_date)}<br>
        <i class="fas fa-clock"></i> ${booking.start_time} - ${booking.end_time}
    `;
    
    document.getElementById('cancelModal').style.display = 'block';
}

document.getElementById('confirmCancelBtn').addEventListener('click', async () => {
    if (!currentCancelBookingId) return;
    
    try {
        const response = await fetch(`/api/bookings/${currentCancelBookingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Booking cancelled successfully', 'success');
            closeModal('cancelModal');
            loadBookings();
        } else {
            showToast(data.error || 'Failed to cancel booking', 'error');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast('Error cancelling booking', 'error');
    }
});

// Modal helpers
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function closeSuccessModal() {
    closeModal('successModal');
}

// Close modals with X button
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = () => {
        closeModal('editModal');
        closeModal('cancelModal');
    };
});

document.getElementById('closeCancelModal').addEventListener('click', () => {
    closeModal('cancelModal');
});

window.onclick = (event) => {
    if (event.target === document.getElementById('editModal')) {
        closeModal('editModal');
    }
    if (event.target === document.getElementById('cancelModal')) {
        closeModal('cancelModal');
    }
};

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMsg');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initial load
loadBookings();