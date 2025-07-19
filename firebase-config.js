// firebase-config.js
// هذا الملف يقوم بتهيئة Firebase في تطبيقك ويصدر كائن قاعدة البيانات (Firestore) وكائن المصادقة (Auth).

// استيراد الدوال اللازمة من Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"; // استيراد Firebase Storage

// إعدادات مشروع Firebase الخاص بك
// هذه القيم تم الحصول عليها من Firebase Console
const firebaseConfig = {
  apiKey: "",
  authDomain: "ecovilla-723df.firebaseapp.com",
  projectId: "ecovilla-723df",
  storageBucket: "ecovilla-723df.firebasestorage.app",
  messagingSenderId: "488495908885",
  appId: "1:488495908885:web:2bf6cd61130bc8a9d5e61c",
  measurementId: "G-1ZHSD0Y4WB"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// الحصول على كائن قاعدة البيانات (Firestore)
const db = getFirestore(app);
// الحصول على كائن المصادقة (Auth)
const auth = getAuth(app);
// الحصول على كائن التخزين (Storage)
const storage = getStorage(app); // تهيئة Firebase Storage

// تصدير الكائنات ليتم استخدامها في ملفات JavaScript الأخرى
export { db, auth, storage };
