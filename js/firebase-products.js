// Firebase Firestore - Управление товарами
// Этот файл синхронизирует товары между localStorage и Firebase Firestore

(function() {
    'use strict';
    
    let db = null;
    let isInitialized = false;
    
    // Инициализация после загрузки Firebase
    function initFirebaseProducts() {
        if (isInitialized) return;
        
        if (typeof firebase !== 'undefined' && window.db) {
            db = window.db;
            isInitialized = true;
            console.log('✅ Firebase Products модуль готов');
            
            // Загружаем товары из Firestore при инициализации
            loadProductsFromFirestore();
        } else {
            console.warn('⚠️ Firebase не инициализирован, используем только localStorage');
        }
    }
    
    // Инициализация при загрузке страницы
    window.addEventListener('load', function() {
        setTimeout(initFirebaseProducts, 500);
    });
    
    // Также пробуем инициализировать сразу, если Firebase уже загружен
    if (typeof firebase !== 'undefined' && window.db) {
        initFirebaseProducts();
    }
    
    /**
     * Загрузка товаров из Firestore
     */
    async function loadProductsFromFirestore() {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован, используем localStorage');
            return;
        }
        
        try {
            console.log('📥 Загрузка товаров из Firestore...');
            const snapshot = await db.collection('products').get();
            
            if (snapshot.empty) {
                console.log('📝 Товары не найдены в Firestore, используем localStorage');
                return;
            }
            
            const products = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Конвертируем ID в число, если это возможно, иначе оставляем строкой
                const productId = isNaN(doc.id) ? doc.id : Number(doc.id);
                products.push({ id: productId, ...data });
            });
            
            console.log(`✅ Загружено ${products.length} товаров из Firestore`);
            
            // Сохраняем в localStorage для быстрого доступа
            localStorage.setItem('techstore_products', JSON.stringify(products));
            
            // Отправляем событие о загрузке товаров
            window.dispatchEvent(new CustomEvent('productsLoadedFromFirestore', {
                detail: { products }
            }));
            
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров из Firestore:', error);
        }
    }
    
    /**
     * Сохранение товаров в Firestore
     */
    async function saveProductsToFirestore(products) {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован, сохраняем только в localStorage');
            localStorage.setItem('techstore_products', JSON.stringify(products));
            return;
        }
        
        try {
            console.log('💾 Сохранение товаров в Firestore...');
            
            // Получаем все существующие товары
            const snapshot = await db.collection('products').get();
            const batch = db.batch();
            
            // Удаляем старые товары
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Добавляем новые товары
            products.forEach(product => {
                const docRef = db.collection('products').doc(String(product.id));
                const productData = {
                    name: product.name,
                    price: product.price,
                    category: product.category || '',
                    stock: product.stock || 0,
                    description: product.description || '',
                    image: product.image || ''
                };
                batch.set(docRef, productData);
            });
            
            await batch.commit();
            console.log(`✅ Сохранено ${products.length} товаров в Firestore`);
            
            // Также сохраняем в localStorage для быстрого доступа
            localStorage.setItem('techstore_products', JSON.stringify(products));
            
        } catch (error) {
            console.error('❌ Ошибка сохранения товаров в Firestore:', error);
            // Fallback на localStorage
            localStorage.setItem('techstore_products', JSON.stringify(products));
        }
    }
    
    /**
     * Сохранение одного товара в Firestore
     */
    async function saveProductToFirestore(product) {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован, сохраняем только в localStorage');
            return;
        }
        
        try {
            const docRef = db.collection('products').doc(String(product.id));
            await docRef.set({
                name: product.name,
                price: product.price,
                category: product.category || '',
                stock: product.stock || 0,
                description: product.description || '',
                image: product.image || ''
            });
            
            console.log(`✅ Товар ${product.id} сохранен в Firestore`);
            
            // Обновляем localStorage
            const products = JSON.parse(localStorage.getItem('techstore_products') || '[]');
            const index = products.findIndex(p => p.id === product.id);
            if (index >= 0) {
                products[index] = product;
            } else {
                products.push(product);
            }
            localStorage.setItem('techstore_products', JSON.stringify(products));
            
        } catch (error) {
            console.error('❌ Ошибка сохранения товара в Firestore:', error);
        }
    }
    
    /**
     * Удаление товара из Firestore
     */
    async function deleteProductFromFirestore(productId) {
        if (!db) {
            console.warn('⚠️ Firestore не инициализирован');
            return;
        }
        
        try {
            await db.collection('products').doc(String(productId)).delete();
            console.log(`✅ Товар ${productId} удален из Firestore`);
            
            // Обновляем localStorage
            const products = JSON.parse(localStorage.getItem('techstore_products') || '[]');
            const filtered = products.filter(p => p.id !== productId);
            localStorage.setItem('techstore_products', JSON.stringify(filtered));
            
        } catch (error) {
            console.error('❌ Ошибка удаления товара из Firestore:', error);
        }
    }
    
    // Экспортируем функции глобально
    window.loadProductsFromFirestore = loadProductsFromFirestore;
    window.saveProductsToFirestore = saveProductsToFirestore;
    window.saveProductToFirestore = saveProductToFirestore;
    window.deleteProductFromFirestore = deleteProductFromFirestore;
    
})();

