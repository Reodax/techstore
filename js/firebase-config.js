// Firebase Configuration для TechStore
// Этот файл содержит настройки подключения к Firebase

const firebaseConfig = {
    apiKey: "AIzaSyBmJp8auJtxnp3bg2N43Pq7sWG-b1fLa7s",
    authDomain: "techstore-reodax.firebaseapp.com",
    projectId: "techstore-reodax",
    storageBucket: "techstore-reodax.firebasestorage.app",
    messagingSenderId: "683663990376",
    appId: "1:683663990376:web:45f58f7c80ad71b6ade5dd",
    measurementId: "G-1LKLRY42H6"
};

// Инициализация Firebase
try {
    // Инициализируем Firebase
    const app = firebase.initializeApp(firebaseConfig);
    
    // Получаем ссылку на Firestore
    const db = firebase.firestore();
    
    console.log('✅ Firebase инициализирован успешно!');
    console.log('📊 Firestore подключен');
    console.log('🔐 Firebase Auth подключен');
} catch (error) {
    console.error('❌ Ошибка инициализации Firebase:', error);
}

