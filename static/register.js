class RegisterManager {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.nameInput = document.getElementById('name');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirm_password');
        this.registerBtn = document.getElementById('registerBtn');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.addInputAnimations();
        this.setupPasswordStrength();
    }
    
    setupEventListeners() {
        // Form submission
        this.form?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Password visibility toggles
        this.togglePasswordBtn?.addEventListener('click', () => 
            this.togglePasswordVisibility(this.passwordInput, this.togglePasswordBtn));
        this.toggleConfirmPasswordBtn?.addEventListener('click', () => 
            this.togglePasswordVisibility(this.confirmPasswordInput, this.toggleConfirmPasswordBtn));
        
        // Real-time validations
        this.nameInput?.addEventListener('input', () => this.validateName());
        this.emailInput?.addEventListener('input', () => this.validateEmail());
        this.passwordInput?.addEventListener('input', () => {
            this.validatePassword();
            this.checkPasswordMatch();
            this.updatePasswordStrength();
        });
        this.confirmPasswordInput?.addEventListener('input', () => this.checkPasswordMatch());
        
        // Enter key support
        this.confirmPasswordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleRegister(e);
            }
        });
    }
    
    addInputAnimations() {
        const inputs = [this.nameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput];
        inputs.forEach(input => {
            if (!input) return;
            
            input.addEventListener('focus', () => {
                input.parentElement?.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement?.classList.remove('focused');
                if (input === this.nameInput) this.validateName();
                if (input === this.emailInput) this.validateEmail();
                if (input === this.passwordInput) this.validatePassword();
                if (input === this.confirmPasswordInput) this.checkPasswordMatch();
            });
        });
    }
    
    setupPasswordStrength() {
        const strengthContainer = document.getElementById('passwordStrength');
        if (!strengthContainer) return;
        
        // Create strength bar and text
        strengthContainer.innerHTML = `
            <div class="strength-bar"></div>
            <div class="strength-text"></div>
        `;
    }
    
    updatePasswordStrength() {
        const password = this.passwordInput?.value || '';
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;
        
        const strength = this.calculatePasswordStrength(password);
        
        // Update classes
        strengthBar.className = 'strength-bar';
        strengthText.className = 'strength-text';
        
        if (password.length === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            return;
        }
        
        switch(strength) {
            case 'weak':
                strengthBar.classList.add('weak');
                strengthText.classList.add('weak');
                strengthText.textContent = '⚠️ Weak password - Use at least 8 characters with numbers and symbols';
                break;
            case 'medium':
                strengthBar.classList.add('medium');
                strengthText.classList.add('medium');
                strengthText.textContent = '⚡ Medium password - Add numbers or symbols for stronger password';
                break;
            case 'strong':
                strengthBar.classList.add('strong');
                strengthText.classList.add('strong');
                strengthText.textContent = '✅ Strong password - Good job!';
                break;
            case 'very-strong':
                strengthBar.classList.add('very-strong');
                strengthText.classList.add('very-strong');
                strengthText.textContent = '🎉 Very strong password - Excellent!';
                break;
        }
    }
    
    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score++;
        if (password.match(/\d/)) score++;
        if (password.match(/[^a-zA-Z\d]/)) score++;
        
        if (score <= 2) return 'weak';
        if (score === 3) return 'medium';
        if (score === 4) return 'strong';
        return 'very-strong';
    }
    
    async handleRegister(event) {
        event.preventDefault();
        
        // Validate all fields
        if (!this.validateName() || !this.validateEmail() || 
            !this.validatePassword() || !this.checkPasswordMatch()) {
            this.showToast('Please fix the errors before submitting', 'error');
            return;
        }
        
        const name = this.nameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        // Show loading state
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    name, 
                    email, 
                    password, 
                    role: 'customer' 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message || 'Registration successful! Redirecting to login...', 'success');
                
                // Store email for auto-fill on login page
                localStorage.setItem('bookspace_registered_email', email);
                
                // Redirect after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'BookSpace/index';
                }, 1500);
            } else {
                this.showToast(data.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Network error. Please check your connection.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    validateName() {
        const name = this.nameInput?.value.trim();
        
        if (!name) {
            this.showInputError(this.nameInput, 'Full name is required');
            return false;
        }
        
        if (name.length < 2) {
            this.showInputError(this.nameInput, 'Name must be at least 2 characters');
            return false;
        }
        
        if (name.length > 50) {
            this.showInputError(this.nameInput, 'Name must be less than 50 characters');
            return false;
        }
        
        this.clearInputError(this.nameInput);
        return true;
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
        
        // Check for common email domains
        const validDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        const domain = email.split('@')[1];
        if (domain && !validDomains.includes(domain)) {
            // Warning but not error
            console.log('Uncommon email domain:', domain);
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
        
        if (password.length > 50) {
            this.showInputError(this.passwordInput, 'Password must be less than 50 characters');
            return false;
        }
        
        // Check for common weak passwords
        const weakPasswords = ['password', '123456', '12345678', 'qwerty', 'abc123'];
        if (weakPasswords.includes(password.toLowerCase())) {
            this.showInputError(this.passwordInput, 'Please choose a stronger password');
            return false;
        }
        
        this.clearInputError(this.passwordInput);
        return true;
    }
    
    checkPasswordMatch() {
        const password = this.passwordInput?.value;
        const confirmPassword = this.confirmPasswordInput?.value;
        
        if (!confirmPassword) {
            this.showInputError(this.confirmPasswordInput, 'Please confirm your password');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showInputError(this.confirmPasswordInput, 'Passwords do not match');
            return false;
        }
        
        this.clearInputError(this.confirmPasswordInput);
        return true;
    }
    
    showInputError(input, message) {
        if (!input) return;
        input.classList.add('error');
        input.classList.remove('valid');
        
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
        input.classList.add('valid');
        
        const errorMsg = input.parentElement?.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }
    
    togglePasswordVisibility(input, button) {
        if (!input || !button) return;
        
        const currentType = input.getAttribute('type');
        
        if (currentType === 'password') {
            input.setAttribute('type', 'text');
            button.textContent = 'Hide';
        } else {
            input.setAttribute('type', 'password');
            button.textContent = 'Show';
        }
    }
    
    setLoading(loading) {
        if (!this.registerBtn) return;
        
        const btnText = this.registerBtn.querySelector('.btn-text');
        const btnLoader = this.registerBtn.querySelector('.btn-loader');
        
        if (loading) {
            this.registerBtn.classList.add('disabled');
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-flex';
            this.registerBtn.disabled = true;
        } else {
            this.registerBtn.classList.remove('disabled');
            if (btnText) btnText.style.display = 'inline-flex';
            if (btnLoader) btnLoader.style.display = 'none';
            this.registerBtn.disabled = false;
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
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
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
    new RegisterManager();
    
    // Auto-fill email if coming from login page
    const registeredEmail = localStorage.getItem('bookspace_registered_email');
    if (registeredEmail) {
        const emailInput = document.getElementById('email');
        if (emailInput && !emailInput.value) {
            emailInput.value = registeredEmail;
            localStorage.removeItem('bookspace_registered_email');
        }
    }
});