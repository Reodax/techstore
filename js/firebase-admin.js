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

// Кэш для проверки прав администратора
let adminCheckCache = {
    email: null,
    isAdmin: false,
    timestamp: 0
};
const CACHE_DURATION = 30000; // 30 секунд

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
        
        // Проверяем кэш
        const now = Date.now();
        if (adminCheckCache.email === userEmail && (now - adminCheckCache.timestamp) < CACHE_DURATION) {
            return adminCheckCache.isAdmin;
        }
        
        // Сначала проверяем базовый список (быстрая проверка без запросов к БД)
        if (ADMIN_EMAILS.includes(userEmail)) {
            adminCheckCache = {
                email: userEmail,
                isAdmin: true,
                timestamp: now
            };
            return true;
        }
        
        // Проверяем в Firestore только если db доступна
        if (typeof db !== 'undefined' && db) {
            try {
                // Проверяем в документе конфигурации
                const configRef = db.collection('config').doc('admins');
                const configDoc = await configRef.get();
                
                if (configDoc.exists) {
                    const data = configDoc.data();
                    const adminEmails = data.emails || [];
                    const isAdmin = adminEmails.includes(userEmail);
                    
                    // Сохраняем в кэш
                    adminCheckCache = {
                        email: userEmail,
                        isAdmin: isAdmin,
                        timestamp: now
                    };
                    
                    return isAdmin;
                }
                
                // Также проверяем старую коллекцию admins (для обратной совместимости)
                try {
                    const adminsSnapshot = await db.collection('admins')
                        .where('email', '==', userEmail)
                        .where('isAdmin', '==', true)
                        .limit(1)
                        .get();
                    
                    const isAdmin = !adminsSnapshot.empty;
                    
                    // Сохраняем в кэш
                    adminCheckCache = {
                        email: userEmail,
                        isAdmin: isAdmin,
                        timestamp: now
                    };
                    
                    return isAdmin;
                } catch (error) {
                    // Игнорируем ошибки старой коллекции
                }
            } catch (error) {
                console.warn('⚠️ Не удалось проверить админские права в Firestore:', error);
                // В случае ошибки используем только базовый список
                return false;
            }
        }
        
        // Если db не доступна, используем только базовый список
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
    
    // Проверяем в Firestore (документ конфигурации)
    if (typeof db !== 'undefined' && db) {
        try {
            const configRef = db.collection('config').doc('admins');
            const configDoc = await configRef.get();
            
            if (configDoc.exists) {
                const data = configDoc.data();
                const adminEmails = data.emails || [];
                if (adminEmails.includes(emailLower)) {
                    return true;
                }
            }
            
            // Также проверяем старую коллекцию (для обратной совместимости)
            try {
                const adminsSnapshot = await db.collection('admins')
                    .where('email', '==', emailLower)
                    .where('isAdmin', '==', true)
                    .limit(1)
                    .get();
                
                return !adminsSnapshot.empty;
            } catch (error) {
                // Игнорируем ошибки старой коллекции
            }
        } catch (error) {
            console.warn('⚠️ Ошибка проверки email администратора:', error);
            return false;
        }
    }
    
    return false;
}

/**
 * Получает список всех администраторов
 * @returns {Promise<Array>} Массив объектов с информацией об администраторах
 */
async function getAllAdmins() {
    try {
        const admins = [];
        const adminEmails = new Set();
        
        // Получаем админов из документа конфигурации
        if (typeof db !== 'undefined' && db) {
            try {
                const configRef = db.collection('config').doc('admins');
                const configDoc = await configRef.get();
                
                if (configDoc.exists) {
                    const data = configDoc.data();
                    const emails = data.emails || [];
                    
                    emails.forEach(email => {
                        const emailLower = email.toLowerCase();
                        if (!adminEmails.has(emailLower)) {
                            admins.push({
                                email: emailLower,
                                addedAt: data.updatedAt,
                                source: 'firestore',
                                id: 'config'
                            });
                            adminEmails.add(emailLower);
                        }
                    });
                }
                
                // Также проверяем старую коллекцию admins (для обратной совместимости)
                try {
                    const adminsSnapshot = await db.collection('admins')
                        .where('isAdmin', '==', true)
                        .get();
                    
                    adminsSnapshot.forEach(doc => {
                        const data = doc.data();
                        const emailLower = data.email.toLowerCase();
                        if (!adminEmails.has(emailLower)) {
                            admins.push({ 
                                id: doc.id,
                                email: emailLower,
                                addedAt: data.addedAt,
                                addedBy: data.addedBy,
                                source: 'firestore'
                            });
                            adminEmails.add(emailLower);
                        }
                    });
                } catch (error) {
                    // Игнорируем ошибки старой коллекции
                }
            } catch (error) {
                console.warn('⚠️ Ошибка получения администраторов из Firestore:', error);
            }
        }
        
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
 * Использует документ конфигурации для хранения списка администраторов
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
        
        if (!currentUser) {
            return { success: false, message: 'Пользователь не авторизован' };
        }
        
        // Проверяем, не является ли уже администратором
        const isAdmin = await isEmailAdmin(emailLower);
        if (isAdmin) {
            return { success: false, message: 'Этот email уже является администратором' };
        }
        
        // Используем документ конфигурации для хранения списка администраторов
        // Это более безопасно и не требует специальных правил Firestore
        const configRef = db.collection('config').doc('admins');
        
        try {
            const configDoc = await configRef.get();
            let adminEmails = [];
            
            if (configDoc.exists) {
                const data = configDoc.data();
                adminEmails = data.emails || [];
            }
            
            // Проверяем, нет ли уже такого email
            if (adminEmails.includes(emailLower)) {
                return { success: false, message: 'Этот email уже является администратором' };
            }
            
            // Добавляем новый email
            adminEmails.push(emailLower);
            
            // Сохраняем обновленный список
            await configRef.set({
                emails: adminEmails,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            }, { merge: true });
            
            // Обновляем кэш
            adminCheckCache = {
                email: null,
                isAdmin: false,
                timestamp: 0
            };
            
            // Обновляем видимость ссылок на админ-панель
            await updateAdminLinkVisibility();
            
            return { success: true, message: 'Администратор успешно добавлен' };
        } catch (error) {
            console.error('❌ Ошибка записи в Firestore:', error);
            
            // Если ошибка прав доступа, предлагаем альтернативу
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
                return { 
                    success: false, 
                    message: 'Недостаточно прав доступа. Нужно настроить правила Firestore. См. инструкцию в консоли.' 
                };
            }
            
            throw error;
        }
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
        
        let emailToRemove = null;
        
        // Определяем email для удаления
        if (adminId.includes('@')) {
            emailToRemove = adminId.toLowerCase();
        } else if (adminId === 'config') {
            // Нельзя удалить из конфигурации напрямую
            return { success: false, message: 'Нельзя удалить администратора из конфигурации' };
        } else {
            // Если это ID документа из старой коллекции
            try {
                const adminDoc = await db.collection('admins').doc(adminId).get();
                if (adminDoc.exists) {
                    emailToRemove = adminDoc.data().email.toLowerCase();
                } else {
                    return { success: false, message: 'Администратор не найден' };
                }
            } catch (error) {
                return { success: false, message: 'Ошибка поиска администратора' };
            }
        }
        
        if (!emailToRemove) {
            return { success: false, message: 'Не удалось определить email администратора' };
        }
        
        // Нельзя удалить себя
        if (emailToRemove === currentUser.email.toLowerCase()) {
            return { success: false, message: 'Нельзя удалить самого себя из администраторов' };
        }
        
        // Нельзя удалить из базового списка
        if (ADMIN_EMAILS.includes(emailToRemove)) {
            return { success: false, message: 'Нельзя удалить администратора из базового списка' };
        }
        
        // Удаляем из документа конфигурации
        const configRef = db.collection('config').doc('admins');
        const configDoc = await configRef.get();
        
        if (configDoc.exists) {
            const data = configDoc.data();
            let adminEmails = data.emails || [];
            
            // Удаляем email из списка
            adminEmails = adminEmails.filter(email => email.toLowerCase() !== emailToRemove);
            
            // Сохраняем обновленный список
            await configRef.set({
                emails: adminEmails,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            }, { merge: true });
        }
        
        // Также пытаемся удалить из старой коллекции (если есть)
        try {
            const snapshot = await db.collection('admins')
                .where('email', '==', emailToRemove)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                await snapshot.docs[0].ref.delete();
            }
        } catch (error) {
            // Игнорируем ошибки старой коллекции
        }
        
        // Обновляем кэш
        adminCheckCache = {
            email: null,
            isAdmin: false,
            timestamp: 0
        };
        
        // Обновляем видимость ссылок на админ-панель
        await updateAdminLinkVisibility();
        
        return { success: true, message: 'Администратор успешно удален' };
    } catch (error) {
        console.error('❌ Ошибка удаления администратора:', error);
        
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
            return { 
                success: false, 
                message: 'Недостаточно прав доступа. Нужно настроить правила Firestore.' 
            };
        }
        
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
        
        // Если нет ссылок, ничего не делаем
        if (adminLinks.length === 0) {
            return;
        }
        
        const user = firebase.auth().currentUser;
        
        // Быстрая проверка по базовому списку (без запросов к БД)
        if (user && user.email) {
            const userEmail = user.email.toLowerCase();
            if (ADMIN_EMAILS.includes(userEmail)) {
                // Показываем сразу, если в базовом списке
                adminLinks.forEach(link => {
                    link.style.display = 'block';
                });
                return;
            }
        }
        
        // Если не в базовом списке, проверяем через функцию (может проверить Firestore)
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
let adminLinkVisibilityInitialized = false;

function initializeAdminLinkVisibility() {
    if (adminLinkVisibilityInitialized) {
        return; // Уже инициализировано
    }
    
    // Проверяем, загружен ли Firebase
    if (typeof firebase === 'undefined' || !firebase.auth) {
        // Если еще не загружено, пробуем позже
        setTimeout(initializeAdminLinkVisibility, 100);
        return;
    }
    
    adminLinkVisibilityInitialized = true;
    
    // Подписываемся на изменения состояния авторизации
    firebase.auth().onAuthStateChanged(async (user) => {
        // Сбрасываем кэш при изменении пользователя
        if (user) {
            adminCheckCache = {
                email: user.email.toLowerCase(),
                isAdmin: false,
                timestamp: 0
            };
        } else {
            adminCheckCache = {
                email: null,
                isAdmin: false,
                timestamp: 0
            };
        }
        
        // Обновляем видимость сразу (быстрая проверка по базовому списку)
        try {
            await updateAdminLinkVisibility();
        } catch (error) {
            console.warn('⚠️ Ошибка обновления видимости ссылки на админ-панель:', error);
        }
    });
    
    // Также обновляем сразу при загрузке страницы (без задержки)
    updateAdminLinkVisibility();
}

// Инициализируем при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminLinkVisibility);
} else {
    initializeAdminLinkVisibility();
}

