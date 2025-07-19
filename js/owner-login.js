// owner-login.js - Owner login functionality
import { auth, db } from '../firebase-config.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// DOM elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const btnText = loginBtn.querySelector('.btn-text');
const loadingSpinner = loginBtn.querySelector('.loading-spinner');
const errorMessage = document.getElementById('error-message');

// Show/hide loading state
function setLoadingState(isLoading) {
    loginBtn.disabled = isLoading;
    if (isLoading) {
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'inline';
    } else {
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

// Validate form inputs
function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email) {
        showError('يرجى إدخال البريد الإلكتروني');
        emailInput.focus();
        return false;
    }
    
    if (!password) {
        showError('يرجى إدخال كلمة المرور');
        passwordInput.focus();
        return false;
    }
    
    if (password.length < 6) {
        showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        passwordInput.focus();
        return false;
    }
    
    return true;
}

// Handle login
async function handleLogin(email, password) {
    try {
        console.log('🔐 Attempting to sign in owner:', email);
        
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Authentication successful for:', user.email);
        console.log('🔍 Fetching user document for UID:', user.uid);
        
        // Fetch user document from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            console.error('❌ User document not found in Firestore');
            await signOut(auth);
            throw new Error('بيانات المستخدم غير موجودة في النظام');
        }
        
        const userData = userDoc.data();
        console.log('📄 User document data:', userData);
        
        // Check if user role is 'owner'
        if (userData.role !== 'owner') {
            console.error('❌ User role is not owner:', userData.role);
            await signOut(auth);
            throw new Error('ليس لديك صلاحية الوصول كمالك. يرجى التواصل مع الإدارة.');
        }
        
        // Check if owner has an associated villa
        if (!userData.associatedVillaId) {
            console.error('❌ Owner has no associated villa');
            await signOut(auth);
            throw new Error('لا توجد فيلا مرتبطة بحسابك. يرجى التواصل مع الإدارة.');
        }
        
        console.log('✅ Owner validation successful');
        console.log('🏠 Associated villa ID:', userData.associatedVillaId);
        
        // Redirect to owner dashboard
        console.log('🔄 Redirecting to owner dashboard...');
        window.location.href = 'owner-dashboard.html';
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Handle specific Firebase Auth errors
        let errorMsg = 'حدث خطأ في تسجيل الدخول';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = 'البريد الإلكتروني غير مسجل في النظام';
                break;
            case 'auth/wrong-password':
                errorMsg = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMsg = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/user-disabled':
                errorMsg = 'تم تعطيل هذا الحساب';
                break;
            case 'auth/too-many-requests':
                errorMsg = 'تم تجاوز عدد المحاولات المسموح. يرجى المحاولة لاحقاً';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'خطأ في الاتصال بالإنترنت';
                break;
            default:
                errorMsg = error.message || 'حدث خطأ غير متوقع';
        }
        
        showError(errorMsg);
    }
}

// Form submission handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    if (!validateForm()) {
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    setLoadingState(true);
    
    try {
        await handleLogin(email, password);
    } finally {
        setLoadingState(false);
    }
});

// Input event listeners for real-time validation
emailInput.addEventListener('input', () => {
    if (errorMessage.style.display === 'block') {
        hideError();
    }
});

passwordInput.addEventListener('input', () => {
    if (errorMessage.style.display === 'block') {
        hideError();
    }
});

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('👤 User already logged in, checking role...');
        
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists() && userDoc.data().role === 'owner') {
                console.log('🔄 Redirecting logged-in owner to dashboard...');
                window.location.href = 'owner-dashboard.html';
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    }
});

console.log('🚀 Owner login page initialized');