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
let app;
let db;
let storage;

try {
    console.log('🚀 Начало инициализации Firebase...');
    
    // Инициализируем Firebase
    app = firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase App инициализирован');
    
    // Получаем ссылку на Firestore
    db = firebase.firestore();
    console.log('✅ Firestore подключен');
    
    // Получаем ссылку на Storage
    storage = firebase.storage();
    console.log('✅ Firebase Storage подключен');
    
    // Делаем db и storage доступными глобально
    window.db = db;
    window.storage = storage;
    
    // Устанавливаем persistence для сохранения сессии между перезагрузками
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log('✅ Firebase Auth persistence установлен (LOCAL)');
        })
        .catch((error) => {
            console.error('❌ Ошибка установки persistence:', error);
        });
    
    // Проверяем текущего пользователя сразу
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('👤 Firebase Auth: Пользователь загружен -', user.email);
        } else {
            console.log('👤 Firebase Auth: Пользователь не авторизован');
        }
    });
    
    console.log('✅ Firebase инициализирован успешно!');
    console.log('📊 Firestore подключен');
    console.log('🔐 Firebase Auth подключен');
    console.log('📦 Firebase Storage подключен');
} catch (error) {
    console.error('❌ Ошибка инициализации Firebase:', error);
}

