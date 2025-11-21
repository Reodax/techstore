// js/firebase-orders.js
// Функции для работы с заказами в Firebase Firestore

/**
 * Создание нового заказа в Firestore
 */
async function createFirebaseOrder(orderData) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        // Генерируем уникальный ID заказа
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = {
            id: orderId,
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || 'Пользователь',
            items: orderData.items,
            total: orderData.total,
            customer: orderData.customer,
            status: 'pending', // pending, processing, shipped, delivered, cancelled
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Сохраняем заказ в Firestore
        await db.collection('orders').doc(orderId).set(order);

        console.log('✅ Заказ создан:', orderId);
        return { success: true, orderId: orderId, order: order };
    } catch (error) {
        console.error('❌ Ошибка создания заказа:', error);
        return { success: false, message: error.message || 'Ошибка создания заказа' };
    }
}

/**
 * Получение всех заказов пользователя
 */
async function getUserFirebaseOrders() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            return [];
        }

        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        const orders = [];
        ordersSnapshot.forEach(doc => {
            const orderData = doc.data();
            // Конвертируем Timestamp в строку для совместимости
            orders.push({
                ...orderData,
                createdAt: orderData.createdAt ? orderData.createdAt.toDate().toISOString() : new Date().toISOString(),
                updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate().toISOString() : new Date().toISOString()
            });
        });

        console.log(`✅ Загружено заказов пользователя: ${orders.length}`);
        return orders;
    } catch (error) {
        console.error('❌ Ошибка загрузки заказов пользователя:', error);
        return [];
    }
}

/**
 * Получение всех заказов (для админ панели)
 */
async function getAllFirebaseOrders() {
    try {
        const ordersSnapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();

        const orders = [];
        ordersSnapshot.forEach(doc => {
            const orderData = doc.data();
            orders.push({
                ...orderData,
                createdAt: orderData.createdAt ? orderData.createdAt.toDate().toISOString() : new Date().toISOString(),
                updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate().toISOString() : new Date().toISOString()
            });
        });

        console.log(`✅ Загружено всех заказов: ${orders.length}`);
        return orders;
    } catch (error) {
        console.error('❌ Ошибка загрузки всех заказов:', error);
        return [];
    }
}

/**
 * Получение заказа по ID
 */
async function getFirebaseOrderById(orderId) {
    try {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        
        if (orderDoc.exists) {
            const orderData = orderDoc.data();
            return {
                ...orderData,
                createdAt: orderData.createdAt ? orderData.createdAt.toDate().toISOString() : new Date().toISOString(),
                updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate().toISOString() : new Date().toISOString()
            };
        } else {
            console.warn('⚠️ Заказ не найден:', orderId);
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка получения заказа:', error);
        return null;
    }
}

/**
 * Обновление статуса заказа (для админ панели)
 */
async function updateFirebaseOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Статус заказа обновлен:', orderId, '->', newStatus);
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка обновления статуса заказа:', error);
        return { success: false, message: 'Ошибка обновления статуса заказа' };
    }
}

/**
 * Удаление заказа (для админ панели)
 */
async function deleteFirebaseOrder(orderId) {
    try {
        await db.collection('orders').doc(orderId).delete();
        console.log('✅ Заказ удален:', orderId);
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка удаления заказа:', error);
        return { success: false, message: 'Ошибка удаления заказа' };
    }
}

/**
 * Получение статистики заказов (для админ панели)
 */
async function getOrdersStatistics() {
    try {
        const ordersSnapshot = await db.collection('orders').get();
        
        let totalOrders = 0;
        let totalRevenue = 0;
        const statusCounts = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            totalOrders++;
            totalRevenue += order.total || 0;
            if (statusCounts.hasOwnProperty(order.status)) {
                statusCounts[order.status]++;
            }
        });

        return {
            totalOrders,
            totalRevenue,
            statusCounts
        };
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        return {
            totalOrders: 0,
            totalRevenue: 0,
            statusCounts: {
                pending: 0,
                processing: 0,
                shipped: 0,
                delivered: 0,
                cancelled: 0
            }
        };
    }
}

