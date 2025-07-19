// villa-details.js - Villa details page functionality
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// عناصر DOM
const loadingMessage = document.getElementById('loading-message');
const villaDetailsContainer = document.getElementById('villa-details-container');
const errorMessage = document.getElementById('error-message');

// متغيرات عامة
let currentVilla = null;
let villaImages = [];
let currentImageIndex = 0;
let currentDate = new Date();
let bookedDatesSet = new Set(); // مجموعة التواريخ المحجوزة

// دالة لتحويل التاريخ إلى تنسيق YYYY-MM-DD
function formatDateToYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// دالة لتنسيق السعر
function formatPrice(price) {
    if (price >= 1000000) {
        return (price / 1000000).toFixed(1) + ' مليون ل.س';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(0) + ' ألف ل.س';
    } else {
        return price + ' ل.س';
    }
}

// دالة لاستخراج معرف الفيلا من URL
function getVillaIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// دالة لتحميل تفاصيل الفيلا - محدثة لاستخدام bookedDates من وثيقة الفيلا
async function loadVillaDetails() {
    try {
        const villaId = getVillaIdFromURL();
        if (!villaId) {
            throw new Error('معرف الفيلا غير موجود');
        }

        // جلب تفاصيل الفيلا
        const villaDoc = await getDoc(doc(db, 'villas', villaId));
        if (!villaDoc.exists()) {
            throw new Error('الفيلا غير موجودة');
        }

        currentVilla = { id: villaDoc.id, ...villaDoc.data() };
        console.log('🏠 Villa data loaded:', currentVilla);
        
        // تحميل التواريخ المحجوزة مباشرة من وثيقة الفيلا
        loadBookedDatesFromVilla();
        
        // عرض تفاصيل الفيلا
        displayVillaDetails();
        
        loadingMessage.style.display = 'none';
        villaDetailsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('خطأ في تحميل تفاصيل الفيلا:', error);
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}

// دالة لتحميل التواريخ المحجوزة من وثيقة الفيلا - جديدة
function loadBookedDatesFromVilla() {
    console.log('🔍 Loading booked dates from villa document...');
    
    // مسح البيانات السابقة
    bookedDatesSet.clear();
    
    // التحقق من وجود bookedDates في وثيقة الفيلا
    if (currentVilla.bookedDates && Array.isArray(currentVilla.bookedDates)) {
        console.log('📅 Raw bookedDates array from villa:', currentVilla.bookedDates);
        
        // إضافة كل تاريخ محجوز إلى المجموعة
        currentVilla.bookedDates.forEach((dateString, index) => {
            if (typeof dateString === 'string' && dateString.trim()) {
                const cleanDate = dateString.trim();
                
                // التحقق من تنسيق YYYY-MM-DD
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (dateRegex.test(cleanDate)) {
                    bookedDatesSet.add(cleanDate);
                    console.log(`✅ Added booked date [${index}]: ${cleanDate}`);
                } else {
                    console.warn(`⚠️ Invalid date format [${index}]: ${cleanDate} (expected YYYY-MM-DD)`);
                }
            } else {
                console.warn(`⚠️ Invalid date entry [${index}]:`, dateString);
            }
        });
    } else {
        console.log('📅 No bookedDates array found in villa document or it\'s empty');
    }
    
    console.log('📊 Final bookedDatesSet:', Array.from(bookedDatesSet));
    console.log('📊 Total booked dates loaded:', bookedDatesSet.size);
    
    if (bookedDatesSet.size === 0) {
        console.log('ℹ️ No booked dates found - all dates will show as available');
    }
}

// دالة لعرض تفاصيل الفيلا
function displayVillaDetails() {
    // عرض المعلومات الأساسية
    document.getElementById('villa-name').textContent = currentVilla.name || 'اسم الفيلا غير متاح';
    document.getElementById('villa-id').textContent = `رقم الفيلا: ${currentVilla.villaId || 'غير محدد'}`;
    document.getElementById('villa-area').textContent = `📍 ${currentVilla.area || 'المنطقة غير محددة'}`;
    document.getElementById('villa-rooms').textContent = `🛏️ ${currentVilla.rooms || 0} غرف`;
    document.getElementById('villa-price').textContent = `${formatPrice(currentVilla.pricePerDay || 0)} / لليوم`;
    document.getElementById('villa-description').textContent = currentVilla.description || 'لا يوجد وصف متاح';
    
    // إعداد معرض الصور
    setupImageGallery();
    
    // إعداد خريطة OpenStreetMap
    setupOpenStreetMap();
    
    // إعداد التقويم
    setupCalendar();
    
    // إعداد زر الحجز
    setupBookingButton();
}

// دالة لإعداد معرض الصور - محدثة للتعامل مع GitHub raw URLs
function setupImageGallery() {
    console.log('Setting up image gallery with URLs:', currentVilla.imageUrls);
    
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
    
    thumbnailsContainer.innerHTML = '';
    villaImages.forEach((imageUrl, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = imageUrl;
        thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumbnail.alt = `صورة مصغرة ${index + 1}`;
        thumbnail.loading = 'lazy';
        
        thumbnail.onerror = function() {
            console.warn('Failed to load thumbnail:', imageUrl);
            this.src = 'https://via.placeholder.com/150x100/4CAF50/white?text=صورة+غير+متاحة';
            this.onerror = null;
        };
        
        thumbnail.addEventListener('click', () => showImage(index));
        thumbnailsContainer.appendChild(thumbnail);
    });
    
    prevBtn.addEventListener('click', () => showPreviousImage());
    nextBtn.addEventListener('click', () => showNextImage());
    
    if (villaImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }
}

// دالة لتحميل الصورة الرئيسية
function loadMainImage(index) {
    const mainImage = document.getElementById('main-image');
    const imageUrl = villaImages[index];
    
    console.log('Loading main image:', imageUrl);
    
    mainImage.src = imageUrl;
    mainImage.alt = `صورة ${currentVilla.name || 'الفيلا'} - ${index + 1}`;
    
    mainImage.onerror = function() {
        console.warn('Failed to load main image:', imageUrl);
        this.src = 'https://via.placeholder.com/800x600/4CAF50/white?text=صورة+غير+متاحة';
        this.onerror = null;
    };
    
    mainImage.onload = function() {
        console.log('Main image loaded successfully:', imageUrl);
    };
}

// دالة لعرض صورة معينة
function showImage(index) {
    if (index < 0 || index >= villaImages.length) return;
    
    currentImageIndex = index;
    loadMainImage(index);
    
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// دالة للصورة السابقة
function showPreviousImage() {
    currentImageIndex = (currentImageIndex - 1 + villaImages.length) % villaImages.length;
    showImage(currentImageIndex);
}

// دالة للصورة التالية
function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % villaImages.length;
    showImage(currentImageIndex);
}

// دالة لإعداد خريطة OpenStreetMap
function setupOpenStreetMap() {
    const mapIframe = document.getElementById('osm-map');
    
    if (!mapIframe) {
        console.error('Map iframe element not found');
        return;
    }
    
    if (currentVilla.locationUrl && currentVilla.locationUrl.includes(',')) {
        const coordinates = currentVilla.locationUrl.split(',');
        const latitude = parseFloat(coordinates[0].trim());
        const longitude = parseFloat(coordinates[1].trim());
        
        console.log('Setting up map with coordinates:', latitude, longitude);
        
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

// دالة لإعداد التقويم
function setupCalendar() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    renderCalendar();
}

// دالة لرسم التقويم - محدثة مع مقارنة التواريخ المحسنة
function renderCalendar() {
    const currentMonthElement = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    
    if (!currentMonthElement || !calendarGrid) {
        console.error('Calendar elements not found');
        return;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    
    calendarGrid.innerHTML = '';
    
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    dayNames.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = dayName;
        calendarGrid.appendChild(dayHeader);
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    console.log('🗓️ Rendering calendar for:', monthNames[month], year);
    console.log('📅 Available booked dates for comparison:', Array.from(bookedDatesSet));
    
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
            
            console.log(`📅 Day ${currentDay.getDate()}: ${dayString} - Booked: ${isBooked}`);
            
            if (isBooked) {
                dayElement.classList.add('booked');
                dayElement.title = 'محجوز';
                console.log(`🔴 Day ${currentDay.getDate()} marked as BOOKED`);
            } else {
                dayElement.classList.add('available');
                dayElement.title = 'متاح';
                console.log(`🟢 Day ${currentDay.getDate()} marked as AVAILABLE`);
            }
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentDay.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }
        
        calendarGrid.appendChild(dayElement);
    }
    
    console.log('✅ Calendar rendered successfully');
}

// دالة لإعداد زر الحجز - محدثة مع رابط الواتساب الصحيح
function setupBookingButton() {
    const bookNowBtn = document.getElementById('book-now-btn');
    
    if (bookNowBtn) {
        bookNowBtn.addEventListener('click', () => {
            const whatsappUrl = 'https://wa.me/message/BYXCXGRI5CQTM1';
            const message = `أود حجز المزرعة ${currentVilla.name} ورقم عرضها ${currentVilla.villaId}`;
            const fullWhatsappUrl = `${whatsappUrl}?text=${encodeURIComponent(message)}`;
            
            console.log('Opening WhatsApp with message:', message);
            console.log('WhatsApp URL:', fullWhatsappUrl);
            
            window.open(fullWhatsappUrl, '_blank');
        });
    }
}

// تحميل تفاصيل الفيلا عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadVillaDetails();
});