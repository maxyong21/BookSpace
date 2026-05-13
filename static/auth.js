// auth.js - Enhanced Login Functionality

class AuthManager {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.forgotPasswordLink = document.getElementById('forgotPassword');
        
        this.init();
    }
    
    init() {
        this.loadRememberedEmail();
        this.setupEventListeners();
        this.addInputAnimations();
    }
    
    setupEventListeners() {
        // Form submission
        this.form?.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Password visibility toggle
        this.togglePasswordBtn?.addEventListener('click', () => this.togglePasswordVisibility());
        
        // Forgot password
        this.forgotPasswordLink?.addEventListener('click', (e) => this.handleForgotPassword(e));
        
        // Real-time validation
        this.emailInput?.addEventListener('input', () => this.validateEmail());
        this.passwordInput?.addEventListener('input', () => this.validatePassword());
        
        // Enter key support
        this.passwordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin(e);
            }
        });
    }
    
    addInputAnimations() {
        // Add focus animations
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement?.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement?.classList.remove('focused');
                if (input.id === 'email') this.validateEmail();
                if (input.id === 'password') this.validatePassword();
            });
        });
    }
    
    loadRememberedEmail() {
        const rememberedEmail = localStorage.getItem('bookspace_remembered_email');
        if (rememberedEmail && this.rememberMeCheckbox) {
            this.emailInput.value = rememberedEmail;
            this.rememberMeCheckbox.checked = true;
        }
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        // Validate inputs
        if (!this.validateEmail() || !this.validatePassword()) {
            this.showToast('Please fill in all fields correctly', 'error');
            return;
        }
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        // Show loading state
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Handle remember me
                if (this.rememberMeCheckbox?.checked) {
                    localStorage.setItem('bookspace_remembered_email', email);
                } else {
                    localStorage.removeItem('bookspace_remembered_email');
                }
                
                // Store user info in session storage
                if (data.user) {
                    sessionStorage.setItem('bookspace_user', JSON.stringify(data.user));
                }
                
                this.showToast(data.message || 'Login successful! Redirecting...', 'success');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
                
            } else {
                this.showToast(data.error || 'Invalid email or password', 'error');
                this.shakeInputs();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Network error. Please check your connection.', 'error');
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
            this.showInputError(this.emailInput, 'Please enter a valid email address');
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
        
        if (password.length < 6) {
            this.showInputError(this.passwordInput, 'Password must be at least 6 characters');
            return false;
        }
        
        this.clearInputError(this.passwordInput);
        return true;
    }
    
    showInputError(input, message) {
        if (!input) return;
        input.classList.add('error');
        
        // Remove existing error message
        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        // Add error message
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
    
    togglePasswordVisibility() {
        const type = this.passwordInput?.getAttribute('type') === 'password' ? 'text' : 'password';
        this.passwordInput?.setAttribute('type', type);
        
        const icon = this.togglePasswordBtn?.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }
    
    handleForgotPassword(event) {
        event.preventDefault();
        this.showToast('Please contact admin to reset your password', 'warning');
    }
    
    shakeInputs() {
        const inputs = [this.emailInput, this.passwordInput];
        inputs.forEach(input => {
            if (input) {
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 300);
            }
        });
    }
    
    setLoading(loading) {
        if (!this.loginBtn) return;
        
        const btnText = this.loginBtn.querySelector('.btn-text');
        const btnLoader = this.loginBtn.querySelector('.btn-loader');
        
        if (loading) {
            this.loginBtn.classList.add('disabled');
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-flex';
            this.loginBtn.disabled = true;
        } else {
            this.loginBtn.classList.remove('disabled');
            if (btnText) btnText.style.display = 'inline-flex';
            if (btnLoader) btnLoader.style.display = 'none';
            this.loginBtn.disabled = false;
        }
    }
    
    showToast(message, type = 'success') {
        // Remove existing toast
        const existingToast = document.getElementById('toastMsg');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.className = `toast-message ${type}`;
        
        // Add icon based on type
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i>';
        }
        
        toast.innerHTML = `${icon} ${message}`;
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Pre-fill demo credentials (optional - for testing)
function fillDemoCredentials(role = 'customer') {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (role === 'admin') {
        emailInput.value = 'admin@bookspace.com';
        passwordInput.value = 'admin123';
    } else {
        emailInput.value = 'customer@bookspace.com';
        passwordInput.value = 'customer123';
    }
    
    // Trigger validation
    const event = new Event('input', { bubbles: true });
    emailInput.dispatchEvent(event);
    passwordInput.dispatchEvent(event);
}

// Add quick demo fill buttons (optional feature)
function addDemoButtons() {
    const demoContainer = document.querySelector('.demo-credentials');
    if (demoContainer) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 0.75rem; display: flex; gap: 0.5rem;';
        buttonContainer.innerHTML = `
            <button onclick="fillDemoCredentials('customer')" style="padding: 0.25rem 0.75rem; background: #667eea; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem;">
                <i class="fas fa-user"></i> Fill Customer
            </button>
            <button onclick="fillDemoCredentials('admin')" style="padding: 0.25rem 0.75rem; background: #764ba2; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem;">
                <i class="fas fa-shield-alt"></i> Fill Admin
            </button>
        `;
        demoContainer.appendChild(buttonContainer);
    }
}

// Expose functions globally for onclick handlers
window.fillDemoCredentials = fillDemoCredentials;

// Add demo buttons after DOM loads
document.addEventListener('DOMContentLoaded', addDemoButtons);