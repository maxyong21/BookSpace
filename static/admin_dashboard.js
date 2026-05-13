class AdminDashboard {
    constructor() {
        this.bookings = [];
        this.resources = [];
        this.currentTab = 'bookings';
        this.searchTerm = '';
        this.statusFilter = 'all';
        this.dateFilter = 'all';
        this.resourceSearchTerm = '';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadData();
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Filters
        const searchInput = document.getElementById('searchBookings');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterAndRenderBookings();
            });
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.filterAndRenderBookings();
            });
        }
        
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.dateFilter = e.target.value;
                this.filterAndRenderBookings();
            });
        }
        
        const resourceSearch = document.getElementById('searchResources');
        if (resourceSearch) {
            resourceSearch.addEventListener('input', (e) => {
                this.resourceSearchTerm = e.target.value;
                this.filterAndRenderResources();
            });
        }
        
        // Add resource button
        const addBtn = document.getElementById('addResourceBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openResourceModal());
        }
        
        // Resource form submission
        const resourceForm = document.getElementById('resourceForm');
        if (resourceForm) {
            resourceForm.addEventListener('submit', (e) => this.handleResourceSubmit(e));
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        // Cancel booking confirmation
        const confirmCancelBtn = document.getElementById('adminConfirmCancelBtn');
        if (confirmCancelBtn) {
            confirmCancelBtn.addEventListener('click', () => this.confirmCancelBooking());
        }
        
        const closeCancelModal = document.getElementById('closeAdminCancelModal');
        if (closeCancelModal) {
            closeCancelModal.addEventListener('click', () => this.closeModal('adminCancelModal'));
        }
        
        // Delete resource confirmation
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteResource());
        }
        
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => this.closeModal('deleteResourceModal'));
        }
        
        // Close modals on outside click
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });
    }
    
    async loadData() {
        await Promise.all([
            this.loadBookings(),
            this.loadResources(),
            this.loadStats()
        ]);
    }
    
    async loadBookings() {
        const container = document.getElementById('allBookingsContainer');
        container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading bookings...</p></div>';
        
        try {
            const response = await fetch('/api/bookings/all');
            const data = await response.json();
            
            if (data.success) {
                this.bookings = data.data;
                console.log('Bookings loaded:', this.bookings.length);
                this.filterAndRenderBookings();
                this.updateStats(); // Update stats after loading bookings
            } else {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load bookings</p></div>';
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi"></i><p>Network error. Please try again.</p></div>';
        }
    }
    
    async loadResources() {
        const container = document.getElementById('resourcesContainer');
        container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading resources...</p></div>';
        
        try {
            const response = await fetch('/api/resources');
            const data = await response.json();
            
            if (data.success) {
                this.resources = data.data;
                console.log('Resources loaded:', this.resources.length);
                this.filterAndRenderResources();
                this.updateStats(); // Update stats after loading resources
            } else {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load resources</p></div>';
            }
        } catch (error) {
            console.error('Error loading resources:', error);
            container.innerHTML = '<div class="empty-state"><i class="fas fa-wifi"></i><p>Network error. Please try again.</p></div>';
        }
    }
    
    async loadStats() {
        try {
            const usersResponse = await fetch('/api/users/count');
            const usersData = await usersResponse.json();
            const totalUsers = usersData.success ? usersData.count : 0;
            document.getElementById('totalUsers').textContent = totalUsers;
            
            this.updateStats();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    updateStats() {
        const totalBookings = this.bookings.length;
        const totalResources = this.resources.length;
        
        const today = new Date().toISOString().split('T')[0];
        const activeBookings = this.bookings.filter(b => 
            b.status === 'confirmed' && b.booking_date >= today
        ).length;
        
        document.getElementById('totalBookings').textContent = totalBookings;
        document.getElementById('totalResources').textContent = totalResources;
        document.getElementById('activeBookings').textContent = activeBookings;
        
        console.log('Stats updated:', { totalBookings, totalResources, activeBookings });
    }
    
    filterAndRenderBookings() {
        let filtered = [...this.bookings];
        
        if (this.statusFilter !== 'all') {
            filtered = filtered.filter(b => b.status === this.statusFilter);
        }
        
        if (this.dateFilter !== 'all') {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const monthAgoStr = monthAgo.toISOString().split('T')[0];
            
            if (this.dateFilter === 'today') {
                filtered = filtered.filter(b => b.booking_date === today);
            } else if (this.dateFilter === 'week') {
                filtered = filtered.filter(b => b.booking_date >= weekAgoStr);
            } else if (this.dateFilter === 'month') {
                filtered = filtered.filter(b => b.booking_date >= monthAgoStr);
            }
        }
        
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(b => 
                b.user_name.toLowerCase().includes(term) ||
                b.user_email.toLowerCase().includes(term) ||
                (b.resource_name && b.resource_name.toLowerCase().includes(term))
            );
        }
        
        this.renderBookings(filtered);
    }
    
    renderBookings(bookings) {
        const container = document.getElementById('allBookingsContainer');
        
        if (bookings.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No bookings found</p></div>';
            return;
        }
        
        container.innerHTML = bookings.map(booking => {
            const statusClass = booking.status === 'confirmed' ? 'confirmed' : 'cancelled';
            const canCancel = booking.status === 'confirmed';
            
            return `
                <div class="booking-card ${statusClass}" data-id="${booking.id}">
                    <div class="booking-info">
                        <div class="booking-user">
                            <i class="fas fa-user-circle"></i>
                            <strong>${this.escapeHtml(booking.user_name)}</strong>
                            <span class="status-badge ${statusClass}">${booking.status.toUpperCase()}</span>
                        </div>
                        <div class="booking-details">
                            <span class="detail-item">
                                <i class="fas fa-building"></i> ${this.escapeHtml(booking.resource_name || 'Unknown')}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-calendar"></i> ${this.formatDate(booking.booking_date)}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-clock"></i> ${booking.start_time} - ${booking.end_time}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-envelope"></i> ${this.escapeHtml(booking.user_email)}
                            </span>
                        </div>
                        ${booking.purpose ? `
                            <div class="booking-purpose">
                                <i class="fas fa-pen"></i> ${this.escapeHtml(booking.purpose)}
                            </div>
                        ` : ''}
                    </div>
                    ${canCancel ? `
                        <div class="booking-actions">
                            <button class="btn btn-danger" onclick="adminDashboard.openCancelModal(${booking.id}, '${this.escapeHtml(booking.user_name)}', '${this.escapeHtml(booking.resource_name)}', '${booking.booking_date}', '${booking.start_time}', '${booking.end_time}')">
                                <i class="fas fa-ban"></i> Cancel
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    filterAndRenderResources() {
        let filtered = [...this.resources];
        
        if (this.resourceSearchTerm) {
            const term = this.resourceSearchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.name.toLowerCase().includes(term) ||
                r.type.toLowerCase().includes(term) ||
                r.description.toLowerCase().includes(term)
            );
        }
        
        this.renderResources(filtered);
    }
    
    renderResources(resources) {
        const container = document.getElementById('resourcesContainer');
        
        if (resources.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-cube"></i><p>No resources found</p></div>';
            return;
        }
        
        container.innerHTML = resources.map(resource => {
            let amenities = [];
            try {
                amenities = JSON.parse(resource.amenities || '[]');
            } catch(e) {
                amenities = [];
            }
            
            let typeIcon = '🏢';
            if (resource.type === 'Meeting Rooms') typeIcon = '💼';
            else if (resource.type === 'Lab Equipment') typeIcon = '🔬';
            else if (resource.type === 'Study Pods') typeIcon = '📚';
            
            return `
                <div class="resource-card" data-id="${resource.id}">
                    <div class="resource-info">
                        <div class="resource-name">
                            ${typeIcon} ${this.escapeHtml(resource.name)}
                        </div>
                        <div class="resource-details">
                            <span class="detail-item">
                                <i class="fas fa-tag"></i> ${resource.type}
                            </span>
                            <span class="detail-item">
                                <i class="fas fa-users"></i> Capacity: ${resource.capacity}
                            </span>
                        </div>
                        <div class="resource-description">
                            ${this.escapeHtml(resource.description)}
                        </div>
                        ${amenities.length > 0 ? `
                            <div class="amenities-list">
                                ${amenities.map(a => `<span class="amenity-tag">${this.escapeHtml(a)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="resource-actions">
                        <button class="btn btn-primary" onclick="adminDashboard.editResource(${resource.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="adminDashboard.openDeleteResourceModal(${resource.id}, '${this.escapeHtml(resource.name)}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    openResourceModal(resourceId = null) {
        const modal = document.getElementById('resourceModal');
        const title = document.getElementById('resourceModalTitle');
        const form = document.getElementById('resourceForm');
        
        if (resourceId) {
            const resource = this.resources.find(r => r.id === resourceId);
            if (resource) {
                title.innerHTML = '<i class="fas fa-edit"></i> Edit Resource';
                document.getElementById('resourceId').value = resource.id;
                document.getElementById('resourceType').value = resource.type;
                document.getElementById('resourceName').value = resource.name;
                document.getElementById('resourceDescription').value = resource.description;
                document.getElementById('resourceCapacity').value = resource.capacity;
                
                let amenities = [];
                try {
                    amenities = JSON.parse(resource.amenities || '[]');
                } catch(e) {
                    amenities = [];
                }
                document.getElementById('resourceAmenities').value = amenities.join(', ');
            }
        } else {
            title.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Resource';
            form.reset();
            document.getElementById('resourceId').value = '';
        }
        
        modal.style.display = 'block';
    }
    
    async handleResourceSubmit(event) {
        event.preventDefault();
        
        const resourceId = document.getElementById('resourceId').value;
        const data = {
            type: document.getElementById('resourceType').value,
            name: document.getElementById('resourceName').value,
            description: document.getElementById('resourceDescription').value,
            capacity: parseInt(document.getElementById('resourceCapacity').value),
            amenities: document.getElementById('resourceAmenities').value.split(',').map(a => a.trim()).filter(a => a)
        };
        
        if (!data.type || !data.name || !data.description || !data.capacity) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        try {
            let response;
            if (resourceId) {
                response = await fetch(`/api/resources/${resourceId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/api/resources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast(resourceId ? 'Resource updated successfully!' : 'Resource created successfully!', 'success');
                this.closeModal('resourceModal');
                await this.loadResources();
            } else {
                this.showToast(result.error || 'Failed to save resource', 'error');
            }
        } catch (error) {
            console.error('Error saving resource:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    editResource(resourceId) {
        this.openResourceModal(resourceId);
    }
    
    openDeleteResourceModal(resourceId, resourceName) {
        this.currentDeleteResourceId = resourceId;
        const details = document.getElementById('deleteResourceDetails');
        details.innerHTML = `<strong>${resourceName}</strong>`;
        document.getElementById('deleteResourceModal').style.display = 'block';
    }
    
    async confirmDeleteResource() {
        if (!this.currentDeleteResourceId) return;
        
        try {
            const response = await fetch(`/api/resources/${this.currentDeleteResourceId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Resource deleted successfully!', 'success');
                this.closeModal('deleteResourceModal');
                await this.loadResources();
            } else {
                this.showToast(data.error || 'Failed to delete resource', 'error');
            }
        } catch (error) {
            console.error('Error deleting resource:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }
    
    openCancelModal(bookingId, userName, resourceName, date, startTime, endTime) {
        this.currentCancelBookingId = bookingId;
        const details = document.getElementById('adminCancelDetails');
        details.innerHTML = `
            <strong>${this.escapeHtml(userName)}</strong><br>
            <strong>Resource:</strong> ${this.escapeHtml(resourceName)}<br>
            <strong>Date:</strong> ${this.formatDate(date)}<br>
            <strong>Time:</strong> ${startTime} - ${endTime}
        `;
        document.getElementById('adminCancelModal').style.display = 'block';
    }
    
    async confirmCancelBooking() {
        if (!this.currentCancelBookingId) return;
        
        try {
            const response = await fetch(`/api/bookings/${this.currentCancelBookingId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Booking cancelled successfully!', 'success');
                this.closeModal('adminCancelModal');
                await this.loadBookings();
            } else {
                this.showToast(data.error || 'Failed to cancel booking', 'error');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        document.getElementById('bookingsTab').classList.toggle('active', tab === 'bookings');
        document.getElementById('resourcesTab').classList.toggle('active', tab === 'resources');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    async logout() {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
    
    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toastMsg');
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        toast.className = `toast-message ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
    window.adminDashboard = adminDashboard;
});

const style = document.createElement('style');
style.textContent = `
    .resource-description {
        margin-top: 0.5rem;
        color: var(--gray);
        font-size: 0.875rem;
    }
    
    .amenities-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }
    
    .amenity-tag {
        background: var(--light);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        color: var(--gray);
    }
    
    .booking-purpose {
        margin-top: 0.75rem;
        padding: 0.5rem;
        background: var(--light);
        border-radius: 0.5rem;
        font-size: 0.75rem;
        color: var(--gray);
    }
`;
document.head.appendChild(style);