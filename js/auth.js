/**
 * AgriNova Authentication Logic (Firebase CDN)
 */
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth, provider } from './firebase-config.js';

export const DEV_BYPASS_AUTH = false;

const POST_LOGIN_REDIRECT_KEY = 'agrinova_post_login_redirect';
let isLoggingIn = false;
let isHandlingRedirectResult = false;

function getPostLoginRedirect() {
    return sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) || 'dashboard.html';
}

function setPostLoginRedirect(path = 'dashboard.html') {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
}

function clearPostLoginRedirect() {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
}

function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function getSafeUser(user) {
    if (!user) {
        return {
            appName: 'AgriNova',
            email: 'Sign in to access your dashboard',
            photoURL: 'https://ui-avatars.com/api/?name=AgriNova&background=1B4332&color=fff',
            initials: 'A'
        };
    }

    const email = user.email || 'No email available';
    const displayName = user.displayName || email.split('@')[0] || 'AgriNova User';
    const initials = displayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return {
        appName: 'AgriNova',
        email,
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1B4332&color=fff`,
        initials: initials || 'A'
    };
}

function closeProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    const trigger = document.getElementById('profile-menu-trigger');

    if (dropdown) {
        dropdown.classList.remove('is-open');
        dropdown.setAttribute('aria-hidden', 'true');
    }

    if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
    }
}

function attachProfileMenuHandlers() {
    const wrapper = document.getElementById('profile-menu');
    const trigger = document.getElementById('profile-menu-trigger');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!wrapper || !trigger) return;

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const dropdown = document.getElementById('profile-dropdown');
        if (!dropdown) return;

        const willOpen = !dropdown.classList.contains('is-open');
        closeProfileMenu();

        if (willOpen) {
            dropdown.classList.add('is-open');
            dropdown.setAttribute('aria-hidden', 'false');
            trigger.setAttribute('aria-expanded', 'true');
        }
    });

    wrapper.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProfileMenu();
            trigger.focus();
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            closeProfileMenu();
            logoutUser();
        });
    }
}

/**
 * Handle Google Login
 */
export async function loginWithGoogle(redirectTo = 'dashboard.html') {
    if (isLoggingIn) return;

    const loginError = document.getElementById('loginError');
    const loginStatus = document.getElementById('loginStatus');
    const googleBtn = document.getElementById('googleLoginBtn');

    isLoggingIn = true;
    setPostLoginRedirect(redirectTo);

    if (googleBtn) googleBtn.disabled = true;
    if (loginStatus) loginStatus.innerText = 'Redirecting to Google sign-in...';
    if (loginError) loginError.innerText = '';

    try {
        console.log('Current Domain:', window.location.hostname);
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
            clearPostLoginRedirect();
            window.location.href = redirectTo;
            return;
        }
    } catch (error) {
        const popupFallbackErrors = [
            'auth/popup-blocked',
            'auth/cancelled-popup-request',
            'auth/operation-not-supported-in-this-environment'
        ];

        if (popupFallbackErrors.includes(error.code)) {
            try {
                if (loginStatus) loginStatus.innerText = 'Opening secure Google sign-in...';
                await signInWithRedirect(auth, provider);
                return;
            } catch (redirectError) {
                console.error('Redirect fallback error:', redirectError);
                if (loginError) {
                    loginError.innerText = 'Login failed: ' + redirectError.message;
                }
            }
        } else {
            console.error('Auth error:', error);

            if (loginError) {
                if (error.code === 'auth/network-request-failed') {
                    loginError.innerHTML = `
                        <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                            <p class="font-bold mb-1">Network/Configuration Error</p>
                            <p>1. Ensure <b>${window.location.hostname}</b> is in "Authorized Domains" in Firebase Console.</p>
                            <p class="mt-1">2. Check your internet connection or disable ad-blockers.</p>
                        </div>
                    `;
                } else if (error.code === 'auth/popup-closed-by-user') {
                    loginError.innerText = 'Google sign-in was closed before completion.';
                } else {
                    loginError.innerText = 'Login failed: ' + error.message;
                }
            }
        }
    }

    isLoggingIn = false;
    if (googleBtn) googleBtn.disabled = false;
    if (loginStatus) loginStatus.innerText = '';
}

export async function startDashboardAccess() {
    if (DEV_BYPASS_AUTH) {
        window.location.href = 'dashboard.html';
        return;
    }

    if (auth.currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    await loginWithGoogle('dashboard.html');
}

/**
 * Handle Redirect Result
 */
export async function handleRedirectResult() {
    if (isHandlingRedirectResult) return null;
    isHandlingRedirectResult = true;

    try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
            console.log('User signed in via redirect:', result.user);
            const redirectTarget = getPostLoginRedirect();
            clearPostLoginRedirect();

            const currentPage = getCurrentPage();
            if (currentPage !== redirectTarget) {
                window.location.href = redirectTarget;
            }
        }
        return result;
    } catch (error) {
        console.error('Redirect error:', error);
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.innerText = 'Redirect login failed: ' + error.message;
        }
        return null;
    } finally {
        isHandlingRedirectResult = false;
    }
}

/**
 * Get current user (Promise-based)
 */
export function getCurrentUser() {
    return new Promise((resolve) => {
        if (DEV_BYPASS_AUTH) {
            resolve({ displayName: 'Dev User', photoURL: '', email: 'dev@agrinova.com' });
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

/**
 * Handle Logout
 */
export function logoutUser() {
    if (DEV_BYPASS_AUTH) {
        window.location.href = 'index.html';
        return Promise.resolve();
    }

    return signOut(auth).then(() => {
        clearPostLoginRedirect();
        window.location.href = 'index.html';
    }).catch((err) => {
        console.error('Logout error', err);
    });
}

/**
 * Protect pages - Redirect to login if not authenticated
 */
export function requireAuth() {
    return new Promise((resolve) => {
        if (DEV_BYPASS_AUTH) {
            updateNavbarAuthState({ displayName: 'Dev User', email: 'dev@agrinova.com', photoURL: '' });
            resolve({ displayName: 'Dev User', email: 'dev@agrinova.com', photoURL: '' });
            return;
        }

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                setPostLoginRedirect(getCurrentPage());
                window.location.href = 'login.html';
            } else {
                updateNavbarAuthState(user);
                resolve(user);
            }
        });
    });
}

/**
 * Redirect to dashboard if user is already logged in (for login page)
 */
export function redirectIfLoggedIn() {
    if (DEV_BYPASS_AUTH) {
        window.location.href = 'dashboard.html';
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = getPostLoginRedirect();
        }
    });
}

/**
 * Update navbar based on auth state
 */
export function updateNavbarAuthState(user) {
    const authNav = document.getElementById('auth-nav');
    if (!authNav) return;

    if (!user) {
        authNav.innerHTML = `
            <a href="login.html" class="navbar-login-btn">Login</a>
        `;
        return;
    }

    const safeUser = getSafeUser(user);
    const altText = safeUser.email.replace(/"/g, '&quot;');

    authNav.innerHTML = `
        <div id="profile-menu" class="profile-menu">
            <button
                id="profile-menu-trigger"
                class="profile-trigger"
                type="button"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="profile-dropdown"
            >
                <div class="profile-trigger-copy">
                    <span class="profile-trigger-label">${safeUser.appName}</span>
                    <span class="profile-trigger-email">${safeUser.email}</span>
                </div>
                <div class="profile-trigger-avatar-wrap">
                    <img src="${safeUser.photoURL}" alt="${altText}" class="profile-trigger-avatar">
                </div>
                <i data-lucide="chevron-down" class="profile-trigger-icon"></i>
            </button>

            <div
                id="profile-dropdown"
                class="profile-dropdown"
                aria-hidden="true"
            >
                <div class="profile-dropdown-header">
                    <div class="profile-dropdown-brand">
                        <span class="profile-dropdown-kicker">Signed in to</span>
                        <h3 class="profile-dropdown-app">AgriNova</h3>
                    </div>
                    <div class="profile-dropdown-avatar-shell">
                        <img src="${safeUser.photoURL}" alt="${altText}" class="profile-dropdown-avatar">
                    </div>
                </div>

                <div class="profile-dropdown-body">
                    <div class="profile-dropdown-field">
                        <span class="profile-dropdown-field-label">Google Account</span>
                        <p class="profile-dropdown-field-value">${safeUser.email}</p>
                    </div>
                </div>

                <div class="profile-dropdown-actions">
                    <button id="logoutBtn" class="profile-logout-btn" type="button">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    attachProfileMenuHandlers();
}

// Global initialization
document.addEventListener('DOMContentLoaded', async () => {
    await handleRedirectResult();

    onAuthStateChanged(auth, (user) => {
        updateNavbarAuthState(user);
    });

    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => loginWithGoogle('dashboard.html'));
    }

    document.addEventListener('click', (event) => {
        const wrapper = document.getElementById('profile-menu');
        if (wrapper && !wrapper.contains(event.target)) {
            closeProfileMenu();
        }
    });
});
