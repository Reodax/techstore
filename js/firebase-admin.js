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
        
        // Проверяем, есть ли email в списке администраторов
        const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        
        // Также проверяем в Firestore (если там хранится список админов)
        try {
            const adminDoc = await db.collection('admins').doc(user.uid).get();
            if (adminDoc.exists && adminDoc.data().isAdmin === true) {
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Не удалось проверить админские права в Firestore:', error);
        }
        
        return isAdmin;
    } catch (error) {
        console.error('❌ Ошибка проверки прав администратора:', error);
        return false;
    }
}

/**
 * Проверяет, является ли указанный email администратором
 * @param {string} email - Email адрес для проверки
 * @returns {boolean} true если email является админом, false в противном случае
 */
function isEmailAdmin(email) {
    if (!email) {
        return false;
    }
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Получает список всех администраторов
 * @returns {Promise<Array>} Массив объектов с информацией об администраторах
 */
async function getAllAdmins() {
    try {
        const admins = [];
        
        // Получаем админов из Firestore
        const adminsSnapshot = await db.collection('admins')
            .where('isAdmin', '==', true)
            .get();
        
        adminsSnapshot.forEach(doc => {
            admins.push({ uid: doc.id, ...doc.data() });
        });
        
        // Добавляем админов из списка ADMIN_EMAILS
        for (const email of ADMIN_EMAILS) {
            // Проверяем, нет ли уже этого админа в списке
            const exists = admins.some(admin => admin.email === email);
            if (!exists) {
                admins.push({ email: email, source: 'config' });
            }
        }
        
        return admins;
    } catch (error) {
        console.error('❌ Ошибка получения списка администраторов:', error);
        return ADMIN_EMAILS.map(email => ({ email: email, source: 'config' }));
    }
}

/**
 * Добавляет администратора в Firestore (для расширенного управления)
 * @param {string} email - Email адрес нового администратора
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function addAdminToFirestore(email) {
    try {
        // Находим пользователя по email
        // Примечание: В клиентском SDK нет прямого способа найти пользователя по email
        // Это нужно делать через Admin SDK на сервере
        // Здесь мы просто сохраняем email в коллекцию admins
        
        await db.collection('admins').add({
            email: email.toLowerCase(),
            isAdmin: true,
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: firebase.auth().currentUser?.uid || 'system'
        });
        
        return { success: true, message: 'Администратор добавлен' };
    } catch (error) {
        console.error('❌ Ошибка добавления администратора:', error);
        return { success: false, message: 'Ошибка добавления администратора' };
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

