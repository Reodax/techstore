// js/firebase-admin.js
// Функции для работы с администраторами и проверки прав доступа

/**
 * Список email адресов администраторов
 * Можно расширить, добавив больше email адресов
 */
const ADMIN_EMAILS = [
    'seriy22832@gmail.com',
    // Добавьте сюда другие email адреса администраторов
    // 'admin2@example.com',
    // 'admin3@example.com',
];

/**
 * Проверяет, является ли текущий пользователь администратором
 * @returns {Promise<boolean>} true если пользователь является админом, false в противном случае
 */
async function isCurrentUserAdmin() {
    try {
        const user = firebase.auth().currentUser;
        
        if (!user || !user.email) {
            return false;
        }
        
        const userEmail = user.email.toLowerCase();
        
        // Сначала проверяем базовый список (для обратной совместимости)
        if (ADMIN_EMAILS.includes(userEmail)) {
            return true;
        }
        
        // Проверяем в Firestore (основной источник данных)
        try {
            // Проверяем по email в коллекции admins
            const adminsSnapshot = await db.collection('admins')
                .where('email', '==', userEmail)
                .where('isAdmin', '==', true)
                .limit(1)
                .get();
            
            if (!adminsSnapshot.empty) {
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Не удалось проверить админские права в Firestore:', error);
        }
        
        return false;
    } catch (error) {
        console.error('❌ Ошибка проверки прав администратора:', error);
        return false;
    }
}

/**
 * Проверяет, является ли указанный email администратором
 * @param {string} email - Email адрес для проверки
 * @returns {Promise<boolean>} true если email является админом, false в противном случае
 */
async function isEmailAdmin(email) {
    if (!email) {
        return false;
    }
    
    const emailLower = email.toLowerCase();
    
    // Проверяем базовый список
    if (ADMIN_EMAILS.includes(emailLower)) {
        return true;
    }
    
    // Проверяем в Firestore
    try {
        const adminsSnapshot = await db.collection('admins')
            .where('email', '==', emailLower)
            .where('isAdmin', '==', true)
            .limit(1)
            .get();
        
        return !adminsSnapshot.empty;
    } catch (error) {
        console.warn('⚠️ Ошибка проверки email администратора:', error);
        return false;
    }
}

/**
 * Получает список всех администраторов
 * @returns {Promise<Array>} Массив объектов с информацией об администраторах
 */
async function getAllAdmins() {
    try {
        const admins = [];
        const adminEmails = new Set();
        
        // Получаем админов из Firestore
        const adminsSnapshot = await db.collection('admins')
            .where('isAdmin', '==', true)
            .orderBy('addedAt', 'desc')
            .get();
        
        adminsSnapshot.forEach(doc => {
            const data = doc.data();
            admins.push({ 
                id: doc.id,
                email: data.email,
                addedAt: data.addedAt,
                addedBy: data.addedBy,
                source: 'firestore'
            });
            adminEmails.add(data.email.toLowerCase());
        });
        
        // Добавляем админов из базового списка (если их нет в Firestore)
        for (const email of ADMIN_EMAILS) {
            const emailLower = email.toLowerCase();
            if (!adminEmails.has(emailLower)) {
                admins.push({ 
                    email: emailLower, 
                    source: 'config',
                    isDefault: true
                });
            }
        }
        
        return admins;
    } catch (error) {
        console.error('❌ Ошибка получения списка администраторов:', error);
        // В случае ошибки возвращаем хотя бы базовый список
        return ADMIN_EMAILS.map(email => ({ 
            email: email.toLowerCase(), 
            source: 'config',
            isDefault: true
        }));
    }
}

/**
 * Добавляет администратора в Firestore
 * @param {string} email - Email адрес нового администратора
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function addAdminToFirestore(email) {
    try {
        if (!email || !email.includes('@')) {
            return { success: false, message: 'Неверный формат email' };
        }
        
        const emailLower = email.toLowerCase().trim();
        const currentUser = firebase.auth().currentUser;
        
        // Проверяем, не является ли уже администратором
        const isAdmin = await isEmailAdmin(emailLower);
        if (isAdmin) {
            return { success: false, message: 'Этот email уже является администратором' };
        }
        
        // Проверяем, нет ли уже такого email в Firestore
        const existingSnapshot = await db.collection('admins')
            .where('email', '==', emailLower)
            .limit(1)
            .get();
        
        if (!existingSnapshot.empty) {
            // Обновляем существующий документ
            const doc = existingSnapshot.docs[0];
            await doc.ref.update({
                isAdmin: true,
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: currentUser?.uid || 'system'
            });
        } else {
            // Создаем новый документ
            await db.collection('admins').add({
                email: emailLower,
                isAdmin: true,
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: currentUser?.uid || 'system'
            });
        }
        
        // Обновляем видимость ссылок на админ-панель
        await updateAdminLinkVisibility();
        
        return { success: true, message: 'Администратор успешно добавлен' };
    } catch (error) {
        console.error('❌ Ошибка добавления администратора:', error);
        return { success: false, message: 'Ошибка добавления администратора: ' + error.message };
    }
}

/**
 * Удаляет администратора из Firestore
 * @param {string} adminId - ID документа администратора в Firestore или email
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function removeAdminFromFirestore(adminId) {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            return { success: false, message: 'Пользователь не авторизован' };
        }
        
        // Если это email, ищем документ
        if (adminId.includes('@')) {
            const emailLower = adminId.toLowerCase();
            
            // Нельзя удалить себя
            if (emailLower === currentUser.email.toLowerCase()) {
                return { success: false, message: 'Нельзя удалить самого себя из администраторов' };
            }
            
            // Нельзя удалить из базового списка
            if (ADMIN_EMAILS.includes(emailLower)) {
                return { success: false, message: 'Нельзя удалить администратора из базового списка' };
            }
            
            const snapshot = await db.collection('admins')
                .where('email', '==', emailLower)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return { success: false, message: 'Администратор не найден' };
            }
            
            await snapshot.docs[0].ref.delete();
        } else {
            // Если это ID документа
            const adminDoc = await db.collection('admins').doc(adminId).get();
            if (!adminDoc.exists) {
                return { success: false, message: 'Администратор не найден' };
            }
            
            const adminData = adminDoc.data();
            
            // Нельзя удалить себя
            if (adminData.email === currentUser.email.toLowerCase()) {
                return { success: false, message: 'Нельзя удалить самого себя из администраторов' };
            }
            
            // Нельзя удалить из базового списка
            if (ADMIN_EMAILS.includes(adminData.email)) {
                return { success: false, message: 'Нельзя удалить администратора из базового списка' };
            }
            
            await adminDoc.ref.delete();
        }
        
        // Обновляем видимость ссылок на админ-панель
        await updateAdminLinkVisibility();
        
        return { success: true, message: 'Администратор успешно удален' };
    } catch (error) {
        console.error('❌ Ошибка удаления администратора:', error);
        return { success: false, message: 'Ошибка удаления администратора: ' + error.message };
    }
}

/**
 * Управляет видимостью ссылки на админ-панель в навигации
 * Скрывает ссылку для не-админов и показывает для админов
 */
async function updateAdminLinkVisibility() {
    try {
        const adminLinks = document.querySelectorAll('.admin-link');
        const isAdmin = await isCurrentUserAdmin();
        
        adminLinks.forEach(link => {
            if (isAdmin) {
                link.style.display = 'block';
            } else {
                link.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('❌ Ошибка обновления видимости ссылки на админ-панель:', error);
        // В случае ошибки скрываем ссылку для безопасности
        const adminLinks = document.querySelectorAll('.admin-link');
        adminLinks.forEach(link => {
            link.style.display = 'none';
        });
    }
}

// Автоматически обновляем видимость ссылки при изменении состояния авторизации
// Ждем загрузки DOM и Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, загружен ли Firebase
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            await updateAdminLinkVisibility();
        });
        
        // Также обновляем сразу при загрузке страницы
        updateAdminLinkVisibility();
    } else {
        // Если Firebase еще не загружен, ждем немного и пробуем снова
        setTimeout(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(async (user) => {
                    await updateAdminLinkVisibility();
                });
                updateAdminLinkVisibility();
            }
        }, 500);
    }
});

