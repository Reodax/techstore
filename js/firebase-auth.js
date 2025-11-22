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

        // Отправляем письмо для верификации email
        await user.sendEmailVerification();

        // Создаем документ пользователя в Firestore
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: email,
            name: name,
            cart: [],
            emailVerified: false,
            registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, user: user, message: 'Регистрация успешна! Проверьте почту для подтверждения email' };
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
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Автоматически создаем профиль с именем из Google
            const userName = user.displayName || 'Пользователь';
            await window.db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                name: userName,
                cart: [],
                registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

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
 * Создание профиля пользователя Google с указанным именем
 */
async function createGoogleUserProfile(userId, email, name) {
    try {
        await db.collection('users').doc(userId).set({
            uid: userId,
            email: email,
            name: name,
            cart: [],
            registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка создания профиля:', error);
        return { success: false, message: 'Ошибка создания профиля' };
    }
}

/**
 * Выход пользователя
 */
async function logoutFromFirebase() {
    try {
        await firebase.auth().signOut();
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

        // Проверяем, изменился ли email
        const emailChanged = email !== user.email;
        
        // Обновляем email если изменился
        if (emailChanged) {
            await user.updateEmail(email);
            
            // Отправляем письмо для подтверждения нового email
            await user.sendEmailVerification();
            console.log('📧 Письмо верификации отправлено на новый email:', email);
        }

        // Обновляем пароль если указан
        if (newPassword && newPassword.trim() !== '') {
            await user.updatePassword(newPassword);
        }

        // Обновляем данные в Firestore
        const updateData = {
            name: name,
            email: email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Если email изменился, сбрасываем статус верификации
        if (emailChanged) {
            updateData.emailVerified = false;
        }
        
        await db.collection('users').doc(user.uid).update(updateData);

        // Возвращаем сообщение с информацией о верификации
        let message = 'Данные успешно обновлены';
        if (emailChanged) {
            message = 'Данные обновлены! Письмо для подтверждения нового email отправлено на вашу почту.';
        }
        
        return { success: true, message: message, emailChanged: emailChanged };
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
        
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка удаления пользователя:', error);
        return { success: false, message: 'Ошибка удаления пользователя' };
    }
}

/**
 * Отправка письма для восстановления пароля
 */
async function sendPasswordResetEmailToUser(email) {
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        return { success: true, message: 'Письмо для восстановления пароля отправлено на вашу почту' };
    } catch (error) {
        console.error('❌ Ошибка отправки письма:', error);
        
        let message = 'Ошибка отправки письма';
        if (error.code === 'auth/user-not-found') {
            message = 'Пользователь с таким email не найден';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Неверный формат email';
        }
        
        return { success: false, message: message };
    }
}

/**
 * Повторная отправка письма для верификации email
 */
async function resendVerificationEmail() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            return { success: false, message: 'Пользователь не авторизован' };
        }

        if (user.emailVerified) {
            return { success: false, message: 'Email уже подтвержден' };
        }

        await user.sendEmailVerification();
        return { success: true, message: 'Письмо для подтверждения отправлено на вашу почту' };
    } catch (error) {
        console.error('❌ Ошибка отправки письма:', error);
        return { success: false, message: 'Ошибка отправки письма' };
    }
}

