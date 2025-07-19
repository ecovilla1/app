// Import Firebase functions
import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM elements
const logoutBtn = document.getElementById('logoutBtn');
const adminWelcome = document.getElementById('adminWelcome');
const manageVillasBtn = document.getElementById('manageVillasBtn');
const manageUsersBtn = document.getElementById('manageUsersBtn');
const reviewBookingsBtn = document.getElementById('reviewBookingsBtn');
const messageDisplay = document.getElementById('messageDisplay');
const messageTitle = document.getElementById('messageTitle');
const messageText = document.getElementById('messageText');

// Show temporary message
function showMessage(title, text) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageDisplay.style.display = 'block';
    
    // Hide welcome section
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

// Hide message and show welcome section
function hideMessage() {
    messageDisplay.style.display = 'none';
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'block';
    }
}

// Set active navigation item
function setActiveNavItem(activeBtn) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Handle logout
async function handleLogout() {
    try {
        console.log('Logging out admin user...');
        await signOut(auth);
        console.log('Admin logged out successfully');
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('حدث خطأ أثناء تسجيل الخروج');
    }
}

// Verify admin authentication and role
async function verifyAdminAccess(user) {
    try {
        console.log('Verifying admin access for user:', user.uid);
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            console.error('User document not found');
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return false;
        }
        
        const userData = userDocSnap.data();
        console.log('User data:', userData);
        console.log('User role:', userData.role);
        
        if (userData.role !== 'admin') {
            console.log('Access denied: User is not an admin');
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return false;
        }
        
        console.log('Admin access verified');
        
        // Update welcome message
        if (userData.username) {
            adminWelcome.textContent = `مرحباً، ${userData.username}`;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verifying admin access:', error);
        window.location.href = 'admin-login.html';
        return false;
    }
}

// Initialize dashboard
function initializeDashboard() {
    console.log('Admin dashboard script initialized');
    
    // Authentication state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            await verifyAdminAccess(user);
        } else {
            console.log('No user authenticated, redirecting to login');
            window.location.href = 'admin-login.html';
        }
    });
    
    // Logout button event listener
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation event listeners
    manageVillasBtn.addEventListener('click', () => {
        console.log('Manage Villas clicked!');
        setActiveNavItem(manageVillasBtn);
        showMessage(
            'إدارة الفلل',
            'هذه الميزة قيد التطوير. ستتمكن قريباً من إضافة وتعديل وحذف الفلل من هنا.'
        );
    });
    
    manageUsersBtn.addEventListener('click', () => {
        console.log('Manage Users clicked!');
        setActiveNavItem(manageUsersBtn);
        showMessage(
            'إدارة المستخدمين',
            'هذه الميزة قيد التطوير. ستتمكن قريباً من إدارة حسابات المستخدمين وصلاحياتهم من هنا.'
        );
    });
    
    reviewBookingsBtn.addEventListener('click', () => {
        console.log('Review Bookings clicked!');
        setActiveNavItem(reviewBookingsBtn);
        showMessage(
            'مراجعة الحجوزات',
            'هذه الميزة قيد التطوير. ستتمكن قريباً من مراجعة جميع الحجوزات وإدارتها من هنا.'
        );
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);