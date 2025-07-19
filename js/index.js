// index.js - Main client interface functionality
// استيراد قاعدة البيانات من ملف التكوين
import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// عناصر DOM
const villasContainer = document.getElementById('villas-container');
const loadingMessage = document.getElementById('loading-message');
const noResultsMessage = document.getElementById('no-results');
const searchBtn = document.getElementById('search-btn');
const searchText = document.getElementById('search-text');
const priceFilter = document.getElementById('price-filter');
const roomsFilter = document.getElementById('rooms-filter');
const areaFilter = document.getElementById('area-filter');

// متغير لحفظ جميع الفلل
let allVillas = [];

// دالة لتنسيق السعر بالليرة السورية
function formatPrice(price) {
    if (price >= 1000000) {
        return (price / 1000000).toFixed(1) + ' مليون ل.س';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(0) + ' ألف ل.س';
    } else {
        return price + ' ل.س';
    }
}

// دالة لإنشاء بطاقة فيلا
function createVillaCard(villa) {
    const villaCard = document.createElement('div');
    villaCard.className = 'villa-card';
    villaCard.setAttribute('data-villa-id', villa.id);
    
    villaCard.innerHTML = `
        <div class="villa-image">
            <img src="${villa.imageUrls && villa.imageUrls[0] ? villa.imageUrls[0] : 'images/placeholder-villa.jpg'}" 
                 alt="${villa.name}" 
                 onerror="this.src='images/placeholder-villa.jpg'">
        </div>
        <div class="villa-info">
            <h3 class="villa-name">${villa.name}</h3>
            <p class="villa-id">رقم الفيلا: ${villa.villaId}</p>
            <div class="villa-details">
                <span class="villa-area">📍 ${villa.area}</span>
                <span class="villa-rooms">🛏️ ${villa.rooms} غرف</span>
            </div>
            <div class="villa-price">
                <span class="price">${formatPrice(villa.pricePerDay)}</span>
                <span class="per-day">/ لليوم الواحد</span>
            </div>
            <div class="villa-status ${villa.isAvailable ? 'available' : 'unavailable'}">
                ${villa.isAvailable ? '✅ متاحة' : '❌ غير متاحة'}
            </div>
        </div>
    `;
    
    // إضافة مستمع للنقر على البطاقة
    villaCard.addEventListener('click', () => {
        window.location.href = `villa-details.html?id=${villa.id}`;
    });
    
    return villaCard;
}

// دالة لعرض الفلل
function displayVillas(villas) {
    villasContainer.innerHTML = '';
    
    if (villas.length === 0) {
        noResultsMessage.style.display = 'block';
        return;
    }
    
    noResultsMessage.style.display = 'none';
    
    villas.forEach(villa => {
        const villaCard = createVillaCard(villa);
        villasContainer.appendChild(villaCard);
    });
}

// دالة لتصفية الفلل
function filterVillas() {
    let filteredVillas = [...allVillas];
    
    // تصفية بالنص
    const searchValue = searchText.value.toLowerCase().trim();
    if (searchValue) {
        filteredVillas = filteredVillas.filter(villa => 
            villa.name.toLowerCase().includes(searchValue) ||
            (villa.description && villa.description.toLowerCase().includes(searchValue)) ||
            villa.area.toLowerCase().includes(searchValue)
        );
    }
    
    // تصفية بالسعر (بالليرة السورية)
    const priceValue = priceFilter.value;
    if (priceValue) {
        filteredVillas = filteredVillas.filter(villa => {
            const price = villa.pricePerDay;
            switch (priceValue) {
                case '0-500000':
                    return price < 500000;
                case '500000-1000000':
                    return price >= 500000 && price <= 1000000;
                case '1000000-2000000':
                    return price >= 1000000 && price <= 2000000;
                case '2000000+':
                    return price > 2000000;
                default:
                    return true;
            }
        });
    }
    
    // تصفية بعدد الغرف
    const roomsValue = roomsFilter.value;
    if (roomsValue) {
        filteredVillas = filteredVillas.filter(villa => {
            if (roomsValue === '5+') {
                return villa.rooms >= 5;
            }
            return villa.rooms == roomsValue;
        });
    }
    
    // تصفية بالمنطقة (المناطق السورية المحددة)
    const areaValue = areaFilter.value;
    if (areaValue) {
        filteredVillas = filteredVillas.filter(villa => 
            villa.area === areaValue
        );
    }
    
    displayVillas(filteredVillas);
}

// دالة لجلب الفلل من Firebase
async function fetchVillas() {
    try {
        loadingMessage.style.display = 'block';
        villasContainer.innerHTML = '';
        noResultsMessage.style.display = 'none';
        
        // جلب جميع الفلل من مجموعة villas
        const villasCollection = collection(db, 'villas');
        const villasSnapshot = await getDocs(villasCollection);
        
        allVillas = [];
        villasSnapshot.forEach((doc) => {
            const villaData = doc.data();
            allVillas.push({
                id: doc.id,
                ...villaData
            });
        });
        
        loadingMessage.style.display = 'none';
        
        // عرض جميع الفلل في البداية
        displayVillas(allVillas);
        
        console.log(`تم تحميل ${allVillas.length} فيلا بنجاح`);
        
    } catch (error) {
        console.error('خطأ في جلب الفلل:', error);
        loadingMessage.style.display = 'none';
        villasContainer.innerHTML = `
            <div class="error-message">
                <p>حدث خطأ في تحميل الفلل. يرجى المحاولة مرة أخرى.</p>
                <button onclick="fetchVillas()" class="btn">إعادة المحاولة</button>
            </div>
        `;
    }
}

// إضافة مستمعي الأحداث
searchBtn.addEventListener('click', filterVillas);
searchText.addEventListener('input', filterVillas);
priceFilter.addEventListener('change', filterVillas);
roomsFilter.addEventListener('change', filterVillas);
areaFilter.addEventListener('change', filterVillas);

// البحث عند الضغط على Enter في حقل البحث
searchText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        filterVillas();
    }
});

// تحميل الفلل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    fetchVillas();
});

// تصدير الدوال للاستخدام العام
window.fetchVillas = fetchVillas;
window.filterVillas = filterVillas;