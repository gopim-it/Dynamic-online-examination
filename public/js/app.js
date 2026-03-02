const API_URL = '/api';


// --- UI Utilities ---
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function toggleAuth() {
    document.getElementById('loginBox').classList.toggle('hidden');
    document.getElementById('registerBox').classList.toggle('hidden');
}

// --- Authentication Logic ---

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showNotification('Login successful!');
                setTimeout(() => {
                    redirectBasedOnRole(data.user.role);
                }, 1000);
            } else {
                showNotification(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Server connection error', 'error');
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();

            if (response.ok) {
                showNotification('Registration successful! Please login.');
                toggleAuth();
                document.getElementById('loginEmail').value = email;
            } else {
                showNotification(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Server connection error', 'error');
        }
    });
}

function redirectBasedOnRole(role) {
    if (role === 'admin') {
        window.location.href = '/admin.html';
    } else {
        window.location.href = '/student.html';
    }
}

function checkAuthAndRedirect() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // If on index.html and logged in, redirect
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        if (token && userStr) {
            const user = JSON.parse(userStr);
            redirectBasedOnRole(user.role);
        }
    } else {
        // If on student/admin page and not logged in, redirect to login
        if (!token) {
            window.location.href = '/index.html';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Run auth check on load
checkAuthAndRedirect();

// Utility for authenticated fetch requests
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        throw new Error('No token found');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
    };

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Authentication failed');
    }

    return response;
}
