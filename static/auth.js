// auth.js - Updated version

const API_BASE_URL = 'https://bookspace-aw3i.onrender.com';

class AuthManager {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // Check if already logged in
        this.checkExistingSession();
    }
    
    async checkExistingSession() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success && data.user) {
                // Already logged in, redirect
                if (data.user.role === 'admin') {
                    window.location.href = 'admin_dashboard.html';
                } else {
                    window.location.href = 'homepage.html';
                }
            }
        } catch (error) {
            console.log('Not logged in');
        }
    }
    
    setupEventListeners() {
        this.form?.addEventListener('submit', (e) => this.handleLogin(e));
        
        this.emailInput?.addEventListener('input', () => this.validateEmail());
        this.passwordInput?.addEventListener('input', () => this.validatePassword());
        
        this.passwordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin(e);
            }
        });
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        if (!this.validateEmail() || !this.validatePassword()) {
            this.showToast('Please fill in all fields correctly', 'error');
            return;
        }
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        this.setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
                mode: 'cors'
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.user) {
                    sessionStorage.setItem('bookspace_user', JSON.stringify(data.user));
                }
                
                this.showToast(data.message || 'Login successful! Redirecting...', 'success');
                
                // Verify the session is saved
                const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    credentials: 'include'
                });
                const verifyData = await verifyResponse.json();
                
                if (verifyData.success) {
                    console.log('Session verified for:', verifyData.user.name);
                }
                
                setTimeout(() => {
                    if (data.user && data.user.role === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    } else {
                        window.location.href = 'homepage.html';
                    }
                }, 1000);
                
            } else {
                this.showToast(data.error || 'Invalid email or password', 'error');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    validateEmail() {
        const email = this.emailInput?.value.trim();
        if (!email) {
            this.showInputError(this.emailInput, 'Email is required');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showInputError(this.emailInput, 'Enter a valid email');
            return false;
        }
        
        this.clearInputError(this.emailInput);
        return true;
    }
    
    validatePassword() {
        const password = this.passwordInput?.value;
        if (!password) {
            this.showInputError(this.passwordInput, 'Password is required');
            return false;
        }
        
        this.clearInputError(this.passwordInput);
        return true;
    }
    
    showInputError(input, message) {
        if (!input) return;
        input.classList.add('error');
        
        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorMsg.style.cssText = `
            color: #ef4444;
            font-size: 0.75rem;
            margin-top: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        `;
        input.parentElement?.appendChild(errorMsg);
    }
    
    clearInputError(input) {
        if (!input) return;
        input.classList.remove('error');
        const errorMsg = input.parentElement?.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }
    
    setLoading(loading) {
        if (!this.loginBtn) return;
        
        const btnText = this.loginBtn.querySelector('.btn-text');
        const btnLoader = this.loginBtn.querySelector('.btn-loader');
        
        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-flex';
            this.loginBtn.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'inline-flex';
            if (btnLoader) btnLoader.style.display = 'none';
            this.loginBtn.disabled = false;
        }
    }
    
    showToast(message, type = 'success') {
        const existingToast = document.getElementById('toastMsg');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.className = `toast-message ${type}`;
        
        let icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
        toast.innerHTML = `${icon} ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});