// Import Firebase functions
import { auth, db } from '../firebase-config.js';
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM elements
const loginForm = document.getElementById('adminLoginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.querySelector('.loading-spinner');
const errorMessage = document.getElementById('errorMessage');

// Show/hide loading state
function setLoadingState(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'inline';
    } else {
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Handle admin login
async function handleAdminLogin(email, password) {
    try {
        console.log('Login attempt for:', email);
        setLoadingState(true);
        hideError();
        
        // Authenticate user with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User authenticated successfully:', user.uid);
        
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            console.error('User document not found in Firestore');
            await signOut(auth);
            showError('بيانات المستخدم غير موجودة في النظام');
            return;
        }
        
        const userData = userDocSnap.data();
        console.log('User data fetched:', userData);
        console.log('User role:', userData.role);
        
        // Verify admin role
        if (userData.role !== 'admin') {
            console.log('Access denied: User is not an admin');
            await signOut(auth);
            showError('ليس لديك صلاحية الوصول كمدير');
            return;
        }
        
        console.log('Admin role verified. Redirecting to dashboard...');
        // Redirect to admin dashboard
        window.location.href = 'admin-dashboard.html';
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = 'البريد الإلكتروني غير مسجل';
                break;
            case 'auth/wrong-password':
                errorMsg = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMsg = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/too-many-requests':
                errorMsg = 'تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى لاحقاً';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'خطأ في الاتصال بالإنترنت';
                break;
            default:
                errorMsg = `خطأ: ${error.message}`;
        }
        
        showError(errorMsg);
    } finally {
        setLoadingState(false);
    }
}

// Form submission event listener
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    
    await handleAdminLogin(email, password);
});

// Initialize
console.log('Admin login script initialized');