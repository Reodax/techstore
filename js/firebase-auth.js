// js/firebase-auth.js
// Функции для работы с Firebase Authentication и пользователями

/**
 * Регистрация нового пользователя
 */
async function registerWithFirebase(email, password, name) {
    try {
        // Создаем пользователя в Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Обновляем профиль пользователя
        await user.updateProfile({
            displayName: name
        });

        // Создаем документ пользователя в Firestore
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: email,
            name: name,
            cart: [],
            registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Пользователь зарегистрирован:', user.uid);
        return { success: true, user: user, message: 'Регистрация успешна' };
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        
        let message = 'Ошибка регистрации';
        if (error.code === 'auth/email-already-in-use') {
            message = 'Пользователь с таким email уже существует';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Неверный формат email';
        } else if (error.code === 'auth/weak-password') {
            message = 'Пароль слишком слабый. Используйте минимум 6 символов';
        }
        
        return { success: false, message: message };
    }
}

/**
 * Вход пользователя
 */
async function loginWithFirebase(email, password) {
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('✅ Пользователь вошел:', user.uid);
        return { success: true, user: user, message: 'Вход выполнен успешно' };
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        
        let message = 'Неверный email или пароль';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Неверный email или пароль';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Неверный формат email';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Слишком много попыток входа. Попробуйте позже';
        }
        
        return { success: false, message: message };
    }
}

/**
 * Вход через Google
 */
async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;

        // Проверяем, есть ли пользователь в Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Создаем профиль для нового пользователя из Google
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'Пользователь',
                cart: [],
                registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('✅ Вход через Google выполнен:', user.uid);
        return { success: true, user: user, message: 'Вход выполнен успешно' };
    } catch (error) {
        console.error('❌ Ошибка входа через Google:', error);
        
        let message = 'Ошибка входа через Google';
        if (error.code === 'auth/popup-closed-by-user') {
            message = 'Окно входа было закрыто';
        } else if (error.code === 'auth/cancelled-popup-request') {
            message = 'Запрос был отменен';
        }
        
        return { success: false, message: message };
    }
}

/**
 * Выход пользователя
 */
async function logoutFromFirebase() {
    try {
        await firebase.auth().signOut();
        console.log('✅ Пользователь вышел');
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
        return { success: false, message: 'Ошибка при выходе' };
    }
}

/**
 * Получение данных текущего пользователя из Firestore
 */
async function getCurrentUserData() {
    const user = firebase.auth().currentUser;
    if (!user) {
        return null;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            return { uid: user.uid, ...userDoc.data() };
        } else {
            // Если документа нет, создаем его
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'Пользователь',
                cart: [],
                registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const newUserDoc = await db.collection('users').doc(user.uid).get();
            return { uid: user.uid, ...newUserDoc.data() };
        }
    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error);
        return null;
    }
}

/**
 * Обновление данных пользователя
 */
async function updateFirebaseUserData(name, email, newPassword = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        return { success: false, message: 'Пользователь не авторизован' };
    }

    try {
        // Обновляем профиль в Firebase Auth
        await user.updateProfile({
            displayName: name
        });

        // Обновляем email если изменился
        if (email !== user.email) {
            await user.updateEmail(email);
        }

        // Обновляем пароль если указан
        if (newPassword && newPassword.trim() !== '') {
            await user.updatePassword(newPassword);
        }

        // Обновляем данные в Firestore
        await db.collection('users').doc(user.uid).update({
            name: name,
            email: email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Данные пользователя обновлены');
        return { success: true, message: 'Данные успешно обновлены' };
    } catch (error) {
        console.error('❌ Ошибка обновления данных:', error);
        
        let message = 'Ошибка обновления данных';
        if (error.code === 'auth/email-already-in-use') {
            message = 'Пользователь с таким email уже существует';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Неверный формат email';
        } else if (error.code === 'auth/requires-recent-login') {
            message = 'Для изменения email или пароля требуется повторный вход';
        } else if (error.code === 'auth/weak-password') {
            message = 'Пароль слишком слабый. Используйте минимум 6 символов';
        }
        
        return { success: false, message: message };
    }
}

/**
 * Сохранение корзины пользователя в Firestore
 */
async function saveUserCartToFirebase(cartItems) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn('⚠️ Пользователь не авторизован, корзина не сохранена');
        return;
    }

    try {
        await db.collection('users').doc(user.uid).update({
            cart: cartItems,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Корзина сохранена в Firebase');
    } catch (error) {
        console.error('❌ Ошибка сохранения корзины:', error);
    }
}

/**
 * Загрузка корзины пользователя из Firestore
 */
async function loadUserCartFromFirebase() {
    const user = firebase.auth().currentUser;
    if (!user) {
        return [];
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.cart || [];
        }
        return [];
    } catch (error) {
        console.error('❌ Ошибка загрузки корзины:', error);
        return [];
    }
}

/**
 * Получение всех пользователей (для админ панели)
 */
async function getAllFirebaseUsers() {
    try {
        const usersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .get();
        
        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Загружено пользователей: ${users.length}`);
        return users;
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        return [];
    }
}

/**
 * Удаление пользователя (для админ панели)
 */
async function deleteFirebaseUser(userId) {
    try {
        // Удаляем документ пользователя из Firestore
        await db.collection('users').doc(userId).delete();
        
        // Примечание: Удаление из Firebase Auth требует Admin SDK на сервере
        // Здесь мы удаляем только данные из Firestore
        
        console.log('✅ Пользователь удален из Firestore');
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка удаления пользователя:', error);
        return { success: false, message: 'Ошибка удаления пользователя' };
    }
}

