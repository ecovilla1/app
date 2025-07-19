// owner-dashboard.js - Owner dashboard functionality
import { auth, db } from '../firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// DOM elements
const loadingMessage = document.getElementById('loading-message');
const errorMessage = document.getElementById('error-message');
const dashboardContent = document.getElementById('dashboard-content');
const ownerNameSpan = document.getElementById('owner-name');
const logoutBtn = document.getElementById('logout-btn');
const updateCalendarBtn = document.getElementById('update-calendar-btn');
const updateBtnText = updateCalendarBtn.querySelector('.btn-text');
const updateLoadingSpinner = updateCalendarBtn.querySelector('.loading-spinner');

// Global variables
let currentUser = null;
let currentVilla = null;
let villaImages = [];
let currentImageIndex = 0;
let currentDate = new Date();
let bookedDatesSet = new Set();
let pendingBookedDates = new Set();

// Utility functions
function formatDateToYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatPrice(price) {
    if (price >= 1000000) {
        return (price / 1000000).toFixed(1) + ' مليون ل.س';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(0) + ' ألف ل.س';
    } else {
        return price + ' ل.س';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

function setUpdateButtonLoading(isLoading) {
    updateCalendarBtn.disabled = isLoading;
    if (isLoading) {
        updateBtnText.style.display = 'none';
        updateLoadingSpinner.style.display = 'inline';
    } else {
        updateBtnText.style.display = 'inline';
        updateLoadingSpinner.style.display = 'none';
    }
}

// Authentication and data loading
async function initializeDashboard() {
    try {
        console.log('🚀 Initializing owner dashboard...');
        
        if (!currentUser) {
            throw new Error('المستخدم غير مسجل الدخول');
        }
        
        // Fetch user document
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            throw new Error('بيانات المستخدم غير موجودة');
        }
        
        const userData = userDoc.data();
        console.log('👤 User data loaded:', userData);
        
        // Verify owner role
        if (userData.role !== 'owner') {
            throw new Error('ليس لديك صلاحية الوصول كمالك');
        }
        
        // Check associated villa
        if (!userData.associatedVillaId) {
            throw new Error('لا توجد فيلا مرتبطة بحسابك');
        }
        
        // Display owner name
        ownerNameSpan.textContent = userData.username || userData.email || 'المالك';
        
        // Fetch villa details
        await loadVillaDetails(userData.associatedVillaId);
        
        // Display villa details
        displayVillaDetails();
        
        // Show dashboard content
        loadingMessage.style.display = 'none';
        dashboardContent.style.display = 'block';
        
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        loadingMessage.style.display = 'none';
        showError(error.message || 'حدث خطأ في تحميل لوحة التحكم');
    }
}

async function loadVillaDetails(villaId) {
    try {
        console.log('🏠 Loading villa details for ID:', villaId);
        
        const villaDocRef = doc(db, 'villas', villaId);
        const villaDoc = await getDoc(villaDocRef);
        
        if (!villaDoc.exists()) {
            throw new Error('الفيلا غير موجودة');
        }
        
        currentVilla = { id: villaDoc.id, ...villaDoc.data() };
        console.log('✅ Villa data loaded:', currentVilla);
        
        // Load booked dates
        loadBookedDatesFromVilla();
        
    } catch (error) {
        console.error('❌ Error loading villa details:', error);
        throw error;
    }
}

function loadBookedDatesFromVilla() {
    console.log('📅 Loading booked dates from villa document...');
    
    bookedDatesSet.clear();
    pendingBookedDates.clear();
    
    if (currentVilla.bookedDates && Array.isArray(currentVilla.bookedDates)) {
        console.log('📅 Raw bookedDates array:', currentVilla.bookedDates);
        
        currentVilla.bookedDates.forEach((dateString, index) => {
            if (typeof dateString === 'string' && dateString.trim()) {
                const cleanDate = dateString.trim();
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                
                if (dateRegex.test(cleanDate)) {
                    bookedDatesSet.add(cleanDate);
                    console.log(`✅ Added booked date [${index}]: ${cleanDate}`);
                } else {
                    console.warn(`⚠️ Invalid date format [${index}]: ${cleanDate}`);
                }
            }
        });
    }
    
    console.log('📊 Final bookedDatesSet:', Array.from(bookedDatesSet));
    console.log('📊 Total booked dates loaded:', bookedDatesSet.size);
}

// Villa details display
function displayVillaDetails() {
    // Basic villa information
    document.getElementById('villa-name').textContent = currentVilla.name || 'اسم الفيلا غير متاح';
    document.getElementById('villa-id').textContent = `رقم الفيلا: ${currentVilla.villaId || 'غير محدد'}`;
    document.getElementById('villa-area').textContent = `📍 ${currentVilla.area || 'المنطقة غير محددة'}`;
    document.getElementById('villa-rooms').textContent = `🛏️ ${currentVilla.rooms || 0} غرف`;
    document.getElementById('villa-price').textContent = `${formatPrice(currentVilla.pricePerDay || 0)} / لليوم`;
    document.getElementById('villa-description').textContent = currentVilla.description || 'لا يوجد وصف متاح';
    
    // Setup image gallery
    setupImageGallery();
    
    // Setup map
    setupOpenStreetMap();
    
    // Setup calendar
    setupCalendar();
}

function setupImageGallery() {
    console.log('🖼️ Setting up image gallery...');
    
    villaImages = [];
    
    if (Array.isArray(currentVilla.imageUrls) && currentVilla.imageUrls.length > 0) {
        villaImages = currentVilla.imageUrls
            .map(url => url.trim())
            .filter(url => url.length > 0);
    }
    
    if (villaImages.length === 0) {
        villaImages = ['https://via.placeholder.com/800x600/4CAF50/white?text=صورة+الفيلا'];
    }
    
    const mainImage = document.getElementById('main-image');
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    currentImageIndex = 0;
    loadMainImage(0);
    
    // Create thumbnails
    thumbnailsContainer.innerHTML = '';
    villaImages.forEach((imageUrl, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = imageUrl;
        thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumbnail.alt = `صورة مصغرة ${index + 1}`;
        thumbnail.loading = 'lazy';
        
        thumbnail.onerror = function() {
            this.src = 'https://via.placeholder.com/150x100/4CAF50/white?text=صورة+غير+متاحة';
            this.onerror = null;
        };
        
        thumbnail.addEventListener('click', () => showImage(index));
        thumbnailsContainer.appendChild(thumbnail);
    });
    
    // Navigation buttons
    prevBtn.addEventListener('click', () => showPreviousImage());
    nextBtn.addEventListener('click', () => showNextImage());
    
    if (villaImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function loadMainImage(index) {
    const mainImage = document.getElementById('main-image');
    const imageUrl = villaImages[index];
    
    mainImage.src = imageUrl;
    mainImage.alt = `صورة ${currentVilla.name || 'الفيلا'} - ${index + 1}`;
    
    mainImage.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/4CAF50/white?text=صورة+غير+متاحة';
        this.onerror = null;
    };
}

function showImage(index) {
    if (index < 0 || index >= villaImages.length) return;
    
    currentImageIndex = index;
    loadMainImage(index);
    
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function showPreviousImage() {
    currentImageIndex = (currentImageIndex - 1 + villaImages.length) % villaImages.length;
    showImage(currentImageIndex);
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % villaImages.length;
    showImage(currentImageIndex);
}

function setupOpenStreetMap() {
    const mapIframe = document.getElementById('osm-map');
    
    if (currentVilla.locationUrl && currentVilla.locationUrl.includes(',')) {
        const coordinates = currentVilla.locationUrl.split(',');
        const latitude = parseFloat(coordinates[0].trim());
        const longitude = parseFloat(coordinates[1].trim());
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
            const bbox = {
                west: longitude - 0.01,
                south: latitude - 0.01,
                east: longitude + 0.01,
                north: latitude + 0.01
            };
            
            const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&layer=mapnik&marker=${latitude},${longitude}`;
            mapIframe.src = osmUrl;
        } else {
            mapIframe.src = "https://www.openstreetmap.org/export/embed.html?bbox=36.2665,33.5038,36.2865,33.5238&layer=mapnik&marker=33.5138,36.2765";
        }
    } else {
        mapIframe.src = "https://www.openstreetmap.org/export/embed.html?bbox=36.2665,33.5038,36.2865,33.5238&layer=mapnik&marker=33.5138,36.2765";
    }
}

// Calendar functionality
function setupCalendar() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    renderCalendar();
}

function renderCalendar() {
    const currentMonthElement = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    
    calendarGrid.innerHTML = '';
    
    // Day headers
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    dayNames.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = dayName;
        calendarGrid.appendChild(dayHeader);
    });
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    console.log('🗓️ Rendering calendar for:', monthNames[month], year);
    
    // Create calendar days
    for (let i = 0; i < 42; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        currentDay.setHours(0, 0, 0, 0);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = currentDay.getDate();
        
        if (currentDay.getMonth() !== month) {
            dayElement.classList.add('other-month');
        } else {
            const dayString = formatDateToYMD(currentDay);
            const isBooked = bookedDatesSet.has(dayString);
            const isPending = pendingBookedDates.has(dayString);
            
            if (isPending) {
                dayElement.classList.add('pending');
                dayElement.title = 'في انتظار التحديث';
            } else if (isBooked) {
                dayElement.classList.add('booked');
                dayElement.title = 'محجوز';
            } else {
                dayElement.classList.add('available');
                dayElement.title = 'متاح - اضغط للحجز';
            }
            
            // Add click functionality
            dayElement.addEventListener('click', () => handleDayClick(dayString, dayElement));
        }
        
        // Highlight today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentDay.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

function handleDayClick(dayString, dayElement) {
    console.log('📅 Day clicked:', dayString);
    
    const isBooked = bookedDatesSet.has(dayString);
    const isPending = pendingBookedDates.has(dayString);
    
    if (isBooked) {
        // Cannot unbook a booked day
        showError('لا يمكن إلغاء حجز يوم محجوز من هنا');
        return;
    }
    
    if (isPending) {
        // Remove from pending
        pendingBookedDates.delete(dayString);
        dayElement.classList.remove('pending');
        dayElement.classList.add('available');
        dayElement.title = 'متاح - اضغط للحجز';
        console.log('➖ Removed from pending:', dayString);
    } else {
        // Add to pending
        pendingBookedDates.add(dayString);
        dayElement.classList.remove('available');
        dayElement.classList.add('pending');
        dayElement.title = 'في انتظار التحديث';
        console.log('➕ Added to pending:', dayString);
    }
    
    console.log('📊 Pending dates:', Array.from(pendingBookedDates));
}

// Update calendar functionality
async function updateCalendar() {
    try {
        if (pendingBookedDates.size === 0) {
            showError('لا توجد تغييرات للحفظ');
            return;
        }
        
        console.log('💾 Updating calendar with pending dates:', Array.from(pendingBookedDates));
        
        setUpdateButtonLoading(true);
        hideError();
        
        // Combine existing booked dates with pending dates
        const updatedBookedDates = [...bookedDatesSet, ...pendingBookedDates].sort();
        
        console.log('📅 Updated booked dates array:', updatedBookedDates);
        
        // Update villa document in Firestore
        const villaDocRef = doc(db, 'villas', currentVilla.id);
        await updateDoc(villaDocRef, {
            bookedDates: updatedBookedDates
        });
        
        console.log('✅ Calendar updated successfully in Firestore');
        
        // Update local state
        pendingBookedDates.forEach(date => bookedDatesSet.add(date));
        pendingBookedDates.clear();
        
        // Re-render calendar
        renderCalendar();
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = 'تم تحديث التقويم بنجاح';
        successMsg.style.cssText = `
            background: #e8f5e8;
            color: #2e7d32;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            border: 1px solid #4CAF50;
            text-align: center;
        `;
        
        updateCalendarBtn.parentNode.appendChild(successMsg);
        
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error updating calendar:', error);
        showError('حدث خطأ في تحديث التقويم. يرجى المحاولة مرة أخرى.');
    } finally {
        setUpdateButtonLoading(false);
    }
}

// Event listeners
logoutBtn.addEventListener('click', async () => {
    try {
        console.log('🚪 Logging out...');
        await signOut(auth);
        window.location.href = 'owner-login.html';
    } catch (error) {
        console.error('❌ Logout error:', error);
        showError('حدث خطأ في تسجيل الخروج');
    }
});

updateCalendarBtn.addEventListener('click', updateCalendar);

// Authentication state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('👤 User authenticated:', user.email);
        currentUser = user;
        await initializeDashboard();
    } else {
        console.log('❌ User not authenticated, redirecting to login...');
        window.location.href = 'owner-login.html';
    }
});

console.log('🚀 Owner dashboard script initialized');