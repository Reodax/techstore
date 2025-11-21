// Firebase Firestore - Управление категориями
// Этот файл заменяет localStorage на облачное хранилище

(function() {
    'use strict';
    
    // Ждём загрузки Firebase
    let db = null;
    
    // Инициализация после загрузки страницы
    window.addEventListener('load', function() {
        if (typeof firebase !== 'undefined' && typeof initializeFirebase === 'function') {
            const firebaseInstance = initializeFirebase();
            if (firebaseInstance) {
                db = firebaseInstance.db;
                console.log('✅ Firebase Categories модуль готов');
            }
        }
    });
    
    // Получить категории из Firestore
    async function getCategoriesFromFirestore() {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован, используем localStorage');
            return JSON.parse(localStorage.getItem('techstore_categories') || '[]');
        }
        
        try {
            console.log('📥 Загрузка категорий из Firestore...');
            const snapshot = await db.collection('categories').get();
            
            if (snapshot.empty) {
                console.log('📝 Категории не найдены, загружаем дефолтные');
                return getDefaultCategories();
            }
            
            const categories = [];
            snapshot.forEach(doc => {
                categories.push({ id: doc.id, ...doc.data() });
            });
            
            console.log(`✅ Загружено ${categories.length} категорий из Firestore`);
            return categories;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки категорий:', error);
            // Fallback на localStorage
            return JSON.parse(localStorage.getItem('techstore_categories') || '[]');
        }
    }
    
    // Сохранить категории в Firestore
    async function saveCategoriesToFirestore(categories) {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован, сохраняем в localStorage');
            localStorage.setItem('techstore_categories', JSON.stringify(categories));
            return;
        }
        
        try {
            console.log('💾 Сохранение категорий в Firestore...');
            
            // Удаляем все старые категории
            const snapshot = await db.collection('categories').get();
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Добавляем новые категории
            categories.forEach(category => {
                const docRef = db.collection('categories').doc(category.id);
                batch.set(docRef, {
                    name: category.name,
                    description: category.description,
                    icon: category.icon,
                    url: category.url || '',
                    showInMenu: category.showInMenu !== false,
                    showOnMainPage: category.showOnMainPage !== false
                });
            });
            
            await batch.commit();
            console.log(`✅ Сохранено ${categories.length} категорий в Firestore`);
            
            // Также сохраняем в localStorage для быстрого доступа
            localStorage.setItem('techstore_categories', JSON.stringify(categories));
            
        } catch (error) {
            console.error('❌ Ошибка сохранения категорий:', error);
            // Fallback на localStorage
            localStorage.setItem('techstore_categories', JSON.stringify(categories));
        }
    }
    
    // Добавить одну категорию
    async function addCategoryToFirestore(category) {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован');
            return;
        }
        
        try {
            await db.collection('categories').doc(category.id).set({
                name: category.name,
                description: category.description,
                icon: category.icon,
                url: category.url || '',
                showInMenu: category.showInMenu !== false,
                showOnMainPage: category.showOnMainPage !== false
            });
            
            console.log(`✅ Категория "${category.name}" добавлена в Firestore`);
        } catch (error) {
            console.error('❌ Ошибка добавления категории:', error);
        }
    }
    
    // Удалить категорию
    async function deleteCategoryFromFirestore(categoryId) {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован');
            return;
        }
        
        try {
            await db.collection('categories').doc(categoryId).delete();
            console.log(`✅ Категория удалена из Firestore`);
        } catch (error) {
            console.error('❌ Ошибка удаления категории:', error);
        }
    }
    
    // Дефолтные категории
    function getDefaultCategories() {
        return [
            {
                id: 'processors',
                name: 'Процессоры',
                description: 'CPU для игр и работы',
                icon: '⚡',
                url: 'processors.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'video-cards',
                name: 'Видеокарты',
                description: 'Мощные GPU для гейминга',
                icon: '🎮',
                url: 'video-cards.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'memory',
                name: 'Оперативная память',
                description: 'Быстрая RAM DDR4/DDR5',
                icon: '💾',
                url: 'memory.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'motherboards',
                name: 'Материнские платы',
                description: 'Основа вашего ПК',
                icon: '🖥️',
                url: 'motherboards.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'storage',
                name: 'Накопители',
                description: 'SSD и HDD-диски',
                icon: '💽',
                url: 'storage.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'power-supplies',
                name: 'Блоки питания',
                description: 'Надежное питание системы',
                icon: '⚡',
                url: 'power-supplies.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'cooling',
                name: 'Охлаждение',
                description: 'Кулеры и системы охлаждения',
                icon: '❄️',
                url: 'cooling.html',
                showInMenu: true,
                showOnMainPage: true
            },
            {
                id: 'cases',
                name: 'Корпуса',
                description: 'Стильные корпуса для ПК',
                icon: '📦',
                url: 'cases.html',
                showInMenu: true,
                showOnMainPage: true
            }
        ];
    }
    
    // Экспортируем функции
    window.getCategoriesFromFirestore = getCategoriesFromFirestore;
    window.saveCategoriesToFirestore = saveCategoriesToFirestore;
    window.addCategoryToFirestore = addCategoryToFirestore;
    window.deleteCategoryFromFirestore = deleteCategoryFromFirestore;
    window.getDefaultCategoriesFirebase = getDefaultCategories;
    
})();

