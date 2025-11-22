// js/cart.js
class Auth {
    constructor() {
        this.currentUser = null;
        this.isFirebaseReady = false;
        this.initPromise = this.initializeAuth();
    }

    // Инициализация Firebase Auth
    async initializeAuth() {
        console.log('🔐 Auth: Начало инициализации...');
        return new Promise((resolve) => {
            // Подписываемся на изменения состояния авторизации один раз
            const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
                console.log('🔐 Auth: onAuthStateChanged вызван, пользователь:', user ? user.email : 'НЕТ');
                if (user) {
                    // Пользователь авторизован
                    console.log('🔐 Auth: Загрузка данных пользователя из Firestore...');
                    const userData = await getCurrentUserData();
                    this.currentUser = userData;
                    console.log('🔐 Auth: Данные пользователя загружены:', userData ? 'ДА' : 'НЕТ');
                } else {
                    // Пользователь не авторизован
                    this.currentUser = null;
                }
                this.isFirebaseReady = true;
                console.log('✅ Auth: Инициализация завершена');
                
                // ЗАЩИТА PROFILE.HTML: Если мы на странице профиля и пользователь не авторизован
                if (window.location.pathname.includes('profile.html') && !user) {
                    console.warn('🚨 Auth: На странице профиля без авторизации → редирект');
                    window.location.href = 'login.html';
                    return;
                }
                
                resolve();
                // Не отписываемся, чтобы отслеживать изменения в реальном времени
            });
        });
    }

    // Регистрация нового пользователя
    async register(email, password, name) {
        const result = await registerWithFirebase(email, password, name);
        if (result.success) {
            // Обновляем текущего пользователя
            this.currentUser = await getCurrentUserData();
        }
        return result;
    }

    // Вход пользователя
    async login(email, password) {
        const result = await loginWithFirebase(email, password);
        if (result.success) {
            // Данные обновятся через onAuthStateChanged
            await this.initPromise;
        }
        return result;
    }

    // Выход пользователя
    async logout() {
        // Сохраняем корзину перед выходом
        if (this.currentUser && cart) {
            await this.saveUserCart(cart.getItems());
        }
        
        await logoutFromFirebase();
        this.currentUser = null;
        
        // Очищаем корзину для гостя
        if (cart) {
            cart.clearCart();
        }
    }

    // Сохранение корзины пользователя
    async saveUserCart(cartItems) {
        if (this.currentUser) {
            await saveUserCartToFirebase(cartItems);
            // Обновляем локальные данные
            this.currentUser.cart = cartItems;
        }
    }

    // Загрузка корзины пользователя
    async loadUserCart() {
        if (!this.currentUser) {
            return [];
        }
        
        const cart = await loadUserCartFromFirebase();
        if (this.currentUser) {
            this.currentUser.cart = cart;
        }
        return cart;
    }

    // Проверка авторизации
    isLoggedIn() {
        return this.currentUser !== null && firebase.auth().currentUser !== null;
    }

    // Получение имени пользователя
    getUserName() {
        if (this.currentUser && this.currentUser.name) {
            return this.currentUser.name;
        }
        const firebaseUser = firebase.auth().currentUser;
        return firebaseUser && firebaseUser.displayName ? firebaseUser.displayName : 'Гость';
    }

    // Получение email пользователя
    getUserEmail() {
        if (this.currentUser && this.currentUser.email) {
            return this.currentUser.email;
        }
        const firebaseUser = firebase.auth().currentUser;
        return firebaseUser ? firebaseUser.email : '';
    }

    // Получение ID пользователя
    getUserId() {
        const firebaseUser = firebase.auth().currentUser;
        return firebaseUser ? firebaseUser.uid : null;
    }

    // Обновление данных пользователя
    async updateUser(name, email, newPassword = null) {
        if (!this.currentUser) {
            return { success: false, message: 'Пользователь не авторизован' };
        }

        const result = await updateFirebaseUserData(name, email, newPassword);
        
        if (result.success) {
            // Обновляем локальные данные
            this.currentUser.name = name;
            this.currentUser.email = email;
        }

        return result;
    }
}

class Cart {
    constructor(auth) {
        this.auth = auth;
        this.items = [];
        this.isInitialized = false;
        this.initCart();
    }

    // Инициализация корзины
    async initCart() {
        console.log('🛒 Cart: Начало инициализации корзины...');
        await this.auth.initPromise;
        console.log('🛒 Cart: Auth готов, загрузка товаров...');
        this.items = await this.loadCart();
        this.isInitialized = true;
        console.log('✅ Cart: Корзина инициализирована, товаров:', this.items.length);
        this.updateCartCount();
        this.updateUserInfo();
    }

    // Загрузка корзины
    async loadCart() {
        if (this.auth.isLoggedIn()) {
            // Загружаем корзину пользователя из Firebase
            return await this.auth.loadUserCart();
        } else {
            // Загружаем корзину гостя из localStorage
            const savedCart = localStorage.getItem('techstore_guest_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        }
    }

    // Сохранение корзины
    async saveCart() {
        if (this.auth.isLoggedIn()) {
            // Сохраняем корзину пользователя в Firebase
            await this.auth.saveUserCart(this.items);
        } else {
            // Сохраняем корзину гостя в localStorage
            localStorage.setItem('techstore_guest_cart', JSON.stringify(this.items));
        }
        
        this.updateCartCount();
        this.updateCartDisplay();
        this.updateUserInfo();
    }

    // Обновление счетчика в шапке
    updateCartCount() {
        const cartCountElements = document.querySelectorAll('#cart-count');
        cartCountElements.forEach(element => {
            element.textContent = this.getTotalCount();
        });
    }

    // Обновление информации о пользователе
    updateUserInfo() {
        const userInfoElements = document.querySelectorAll('.user-info');
        const loginButtons = document.querySelectorAll('.login-btn');
        const logoutButtons = document.querySelectorAll('.logout-btn');
        
        if (this.auth.isLoggedIn()) {
            // Показываем элементы для авторизованного пользователя
            userInfoElements.forEach(element => {
                element.textContent = this.auth.getUserName();
                element.style.display = 'inline';
            });
            loginButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            logoutButtons.forEach(btn => {
                btn.style.display = 'inline';
            });
        } else {
            // Показываем элементы для гостя
            userInfoElements.forEach(element => {
                element.style.display = 'none';
            });
            loginButtons.forEach(btn => {
                btn.style.display = 'inline';
            });
            logoutButtons.forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }

    // Получение общего количества товаров
    getTotalCount() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Получение общей суммы
    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Добавление товара в корзину
    async addItem(productId, name, price, image = '', quantity = 1) {
        // Ждем инициализации корзины
        if (!this.isInitialized) {
            await new Promise(resolve => {
                const checkInit = setInterval(() => {
                    if (this.isInitialized) {
                        clearInterval(checkInit);
                        resolve();
                    }
                }, 50);
            });
        }

        const existingItem = this.items.find(item => item.id == productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: productId,
                name: name,
                price: price,
                image: image,
                quantity: quantity
            });
        }

        await this.saveCart();
        this.showAddToCartNotification(name);
    }

    // Удаление товара из корзины
    async removeItem(productId) {
        this.items = this.items.filter(item => item.id != productId);
        await this.saveCart();
    }

    // Изменение количества товара
    async updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id == productId);
        if (item) {
            if (quantity <= 0) {
                await this.removeItem(productId);
            } else {
                item.quantity = quantity;
                await this.saveCart();
            }
        }
    }

    // Очистка корзины
    async clearCart() {
        this.items = [];
        await this.saveCart();
    }

    // Получение всех товаров
    getItems() {
        return this.items;
    }

    // Уведомление о добавлении в корзину
    showAddToCartNotification(productName) {
        // Удаляем старое уведомление если есть
        const oldNotification = document.querySelector('.cart-notification');
        if (oldNotification) {
            oldNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✓</span>
                <span class="notification-text">"${productName}" добавлен в корзину</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Обновление отображения корзины
    updateCartDisplay() {
        if (!window.location.pathname.includes('cart.html')) return;

        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalElement = document.getElementById('cart-total');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        
        if (!cartItemsContainer) return;

        const items = this.getItems();
        
        if (items.length === 0) {
            cartItemsContainer.innerHTML = '';
            if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            if (cartTotalElement) cartTotalElement.textContent = '0';
            return;
        }

        if (emptyCartMessage) emptyCartMessage.style.display = 'none';

        let total = 0;
        cartItemsContainer.innerHTML = items.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            return `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${item.name}</h3>
                        <div class="cart-item-price">${this.formatPrice(item.price)} ₽</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn minus" onclick="cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" onclick="cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="cart.removeItem('${item.id}')">×</button>
                    </div>
                    <div class="cart-item-total">${this.formatPrice(itemTotal)} ₽</div>
                </div>
            `;
        }).join('');

        if (cartTotalElement) cartTotalElement.textContent = this.formatPrice(total);
    }

    // Форматирование цены
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price);
    }

    // Перенос корзины гостя в аккаунт пользователя
    mergeGuestCart(userCart) {
        userCart.forEach(userItem => {
            const existingItem = this.items.find(item => item.id == userItem.id);
            if (existingItem) {
                existingItem.quantity += userItem.quantity;
            } else {
                this.items.push(userItem);
            }
        });
        this.saveCart();
    }

    // Создание заказа
    async createOrder(customerData) {
        if (this.items.length === 0) {
            throw new Error('Корзина пуста');
        }
        
        // Проверка авторизации
        if (!this.auth.isLoggedIn()) {
            throw new Error('Для оформления заказа необходимо авторизоваться. Пожалуйста, войдите в систему.');
        }

        const orderData = {
            items: this.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image
            })),
            total: this.getTotalPrice(),
            customer: {
                name: customerData.name,
                phone: customerData.phone,
                email: customerData.email,
                address: customerData.address,
                addressDetails: customerData.addressDetails || null,
                comment: customerData.comment || ''
            }
        };

        // Сохраняем заказ в Firebase
        const result = await createFirebaseOrder(orderData);
        
        if (!result.success) {
            throw new Error(result.message || 'Ошибка создания заказа');
        }

        return result.order;
    }

    // Загрузка всех заказов (используется в старом коде для совместимости)
    async loadOrders() {
        return await getAllFirebaseOrders();
    }

    // Получение заказов пользователя
    async getUserOrders() {
        if (!this.auth.isLoggedIn()) {
            return [];
        }
        return await getUserFirebaseOrders();
    }

    // Получение заказа по ID
    async getOrderById(orderId) {
        return await getFirebaseOrderById(orderId);
    }

    // Удаление товара из корзины (алиас для совместимости)
    removeProduct(productId) {
        this.removeItem(productId);
    }
}

// ====== ТОВАРЫ ======
const DEFAULT_PRODUCTS = [
    // Процессоры
    {
        id: 1001,
        name: 'AMD Ryzen 9 7950X',
        price: 64990,
        category: 'processors',
        stock: 10,
        description: '16 ядер, 32 потока, 4.5 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1002,
        name: 'Intel Core i9-14900K',
        price: 59990,
        category: 'processors',
        stock: 12,
        description: '24 ядра, 32 потока, 5.8 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1003,
        name: 'AMD Ryzen 7 7800X3D',
        price: 44990,
        category: 'processors',
        stock: 15,
        description: '8 ядер, 16 потоков, 3D V-Cache',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1004,
        name: 'Intel Core i7-14700K',
        price: 39990,
        category: 'processors',
        stock: 14,
        description: '20 ядер, 28 потоков, 5.6 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1005,
        name: 'AMD Ryzen 5 7600X',
        price: 24990,
        category: 'processors',
        stock: 20,
        description: '6 ядер, 12 потоков, 5.3 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1006,
        name: 'Intel Core i5-14600K',
        price: 27990,
        category: 'processors',
        stock: 18,
        description: '14 ядер, 20 потоков, 5.3 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1007,
        name: 'AMD Ryzen 9 7900X',
        price: 49990,
        category: 'processors',
        stock: 11,
        description: '12 ядер, 24 потока, 5.6 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1008,
        name: 'Intel Core i9-13900K',
        price: 54990,
        category: 'processors',
        stock: 9,
        description: '24 ядра, 32 потока, 5.8 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1009,
        name: 'AMD Ryzen 7 7700X',
        price: 32990,
        category: 'processors',
        stock: 16,
        description: '8 ядер, 16 потоков, 5.4 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1010,
        name: 'Intel Core i5-13400F',
        price: 19990,
        category: 'processors',
        stock: 25,
        description: '10 ядер, 16 потоков, 4.6 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1011,
        name: 'AMD Ryzen 5 5600X',
        price: 17990,
        category: 'processors',
        stock: 22,
        description: '6 ядер, 12 потоков, 4.6 ГГц',
        image: 'https://images.unsplash.com/photo-1616400619175-582698e47bc0?w=400&h=300&fit=crop&auto=format'
    },
    // Видеокарты
    {
        id: 1101,
        name: 'NVIDIA RTX 4090',
        price: 159990,
        category: 'video-cards',
        stock: 5,
        description: '24GB GDDR6X, DLSS 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1102,
        name: 'NVIDIA RTX 4080',
        price: 99990,
        category: 'video-cards',
        stock: 7,
        description: '16GB GDDR6X, DLSS 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1103,
        name: 'AMD RX 7900 XTX',
        price: 89990,
        category: 'video-cards',
        stock: 6,
        description: '24GB GDDR6, FSR 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1104,
        name: 'NVIDIA RTX 4070 Ti',
        price: 69990,
        category: 'video-cards',
        stock: 9,
        description: '12GB GDDR6X, DLSS 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1105,
        name: 'NVIDIA RTX 4070',
        price: 59990,
        category: 'video-cards',
        stock: 12,
        description: '12GB GDDR6X, DLSS 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1106,
        name: 'AMD RX 7800 XT',
        price: 54990,
        category: 'video-cards',
        stock: 10,
        description: '16GB GDDR6, FSR 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1107,
        name: 'NVIDIA RTX 4060 Ti',
        price: 44990,
        category: 'video-cards',
        stock: 15,
        description: '16GB GDDR6, DLSS 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1108,
        name: 'AMD RX 7700 XT',
        price: 39990,
        category: 'video-cards',
        stock: 13,
        description: '12GB GDDR6, FSR 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1109,
        name: 'NVIDIA RTX 4060',
        price: 34990,
        category: 'video-cards',
        stock: 18,
        description: '8GB GDDR6, DLSS 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1110,
        name: 'AMD RX 7600',
        price: 29990,
        category: 'video-cards',
        stock: 20,
        description: '8GB GDDR6, FSR 3',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1111,
        name: 'NVIDIA RTX 3060 Ti',
        price: 39990,
        category: 'video-cards',
        stock: 14,
        description: '8GB GDDR6X, DLSS 2',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1112,
        name: 'AMD RX 6700 XT',
        price: 32990,
        category: 'video-cards',
        stock: 11,
        description: '12GB GDDR6, FSR 2',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop&auto=format'
    },
    // Оперативная память
    {
        id: 1201,
        name: 'Kingston Fury 32GB DDR5',
        price: 18990,
        category: 'memory',
        stock: 25,
        description: 'DDR5 6000MHz, CL32',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1202,
        name: 'Corsair Vengeance 64GB',
        price: 34990,
        category: 'memory',
        stock: 18,
        description: 'DDR5 5600MHz, CL36',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1203,
        name: 'HyperX Fury 16GB DDR4',
        price: 6990,
        category: 'memory',
        stock: 40,
        description: 'DDR4 3200MHz, CL16',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1204,
        name: 'G.Skill Trident Z5 RGB',
        price: 24990,
        category: 'memory',
        stock: 22,
        description: 'DDR5 6400MHz, CL32 RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1205,
        name: 'Corsair Dominator 32GB DDR5',
        price: 21990,
        category: 'memory',
        stock: 19,
        description: 'DDR5 6000MHz, CL30 RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1206,
        name: 'TeamGroup T-Force 16GB DDR5',
        price: 8990,
        category: 'memory',
        stock: 35,
        description: 'DDR5 5600MHz, CL36',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1207,
        name: 'Patriot Viper 64GB DDR5',
        price: 39990,
        category: 'memory',
        stock: 12,
        description: 'DDR5 6000MHz, CL36',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1208,
        name: 'G.Skill Ripjaws 32GB DDR4',
        price: 8990,
        category: 'memory',
        stock: 45,
        description: 'DDR4 3600MHz, CL18',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1209,
        name: 'Corsair Vengeance LPX 16GB DDR4',
        price: 5990,
        category: 'memory',
        stock: 50,
        description: 'DDR4 3200MHz, CL16',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1210,
        name: 'Crucial Ballistix 32GB DDR4',
        price: 10990,
        category: 'memory',
        stock: 38,
        description: 'DDR4 3600MHz, CL16 RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1211,
        name: 'ADATA XPG 16GB DDR5',
        price: 7990,
        category: 'memory',
        stock: 42,
        description: 'DDR5 5200MHz, CL38',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1212,
        name: 'Kingston FURY Beast 64GB DDR5',
        price: 44990,
        category: 'memory',
        stock: 8,
        description: 'DDR5 6000MHz, CL32',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    // Материнские платы
    {
        id: 1301,
        name: 'ASUS ROG Crosshair X670E',
        price: 44990,
        category: 'motherboards',
        stock: 11,
        description: 'AMD X670E, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1302,
        name: 'Gigabyte Z790 AORUS Elite',
        price: 28990,
        category: 'motherboards',
        stock: 13,
        description: 'Intel Z790, LGA 1700',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1303,
        name: 'MSI B650 TOMAHAWK',
        price: 22990,
        category: 'motherboards',
        stock: 17,
        description: 'AMD B650, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1304,
        name: 'ASUS Prime Z790-P',
        price: 19990,
        category: 'motherboards',
        stock: 16,
        description: 'Intel Z790, LGA 1700',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1305,
        name: 'ASUS ROG Strix B650E-F',
        price: 24990,
        category: 'motherboards',
        stock: 14,
        description: 'AMD B650E, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1306,
        name: 'MSI MAG Z790 Tomahawk',
        price: 26990,
        category: 'motherboards',
        stock: 12,
        description: 'Intel Z790, LGA 1700',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1307,
        name: 'Gigabyte B650 AORUS Elite',
        price: 18990,
        category: 'motherboards',
        stock: 18,
        description: 'AMD B650, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1308,
        name: 'ASRock X670E Steel Legend',
        price: 31990,
        category: 'motherboards',
        stock: 10,
        description: 'AMD X670E, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1309,
        name: 'MSI PRO B650M-A',
        price: 14990,
        category: 'motherboards',
        stock: 22,
        description: 'AMD B650, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1310,
        name: 'ASUS TUF Gaming Z790-Plus',
        price: 23990,
        category: 'motherboards',
        stock: 15,
        description: 'Intel Z790, LGA 1700',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1311,
        name: 'Gigabyte X670 AORUS Elite AX',
        price: 34990,
        category: 'motherboards',
        stock: 9,
        description: 'AMD X670, Socket AM5',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1312,
        name: 'ASRock B550M Pro4',
        price: 9990,
        category: 'motherboards',
        stock: 28,
        description: 'AMD B550, Socket AM4',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    // Накопители
    {
        id: 1401,
        name: 'Samsung 980 Pro 2TB',
        price: 14990,
        category: 'storage',
        stock: 30,
        description: 'NVMe PCIe 4.0, 7000MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1402,
        name: 'WD Black SN850X 1TB',
        price: 8990,
        category: 'storage',
        stock: 28,
        description: 'NVMe PCIe 4.0, 7300MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1403,
        name: 'Crucial MX500 4TB',
        price: 18990,
        category: 'storage',
        stock: 20,
        description: 'SATA SSD, 560MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1404,
        name: 'Seagate Barracuda 8TB',
        price: 16990,
        category: 'storage',
        stock: 18,
        description: 'HDD 3.5", 7200 RPM',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1405,
        name: 'Samsung 990 Pro 1TB',
        price: 10990,
        category: 'storage',
        stock: 32,
        description: 'NVMe PCIe 4.0, 7450MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1406,
        name: 'Kingston NV2 2TB',
        price: 11990,
        category: 'storage',
        stock: 26,
        description: 'NVMe PCIe 4.0, 3500MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1407,
        name: 'Crucial P5 Plus 1TB',
        price: 8990,
        category: 'storage',
        stock: 35,
        description: 'NVMe PCIe 4.0, 6600MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1408,
        name: 'Western Digital Blue SN580 1TB',
        price: 7990,
        category: 'storage',
        stock: 40,
        description: 'NVMe PCIe 4.0, 4150MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1409,
        name: 'Samsung 970 EVO Plus 2TB',
        price: 12990,
        category: 'storage',
        stock: 24,
        description: 'NVMe PCIe 3.0, 3500MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1410,
        name: 'Seagate FireCuda 530 2TB',
        price: 18990,
        category: 'storage',
        stock: 16,
        description: 'NVMe PCIe 4.0, 7300MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1411,
        name: 'Toshiba P300 4TB',
        price: 9990,
        category: 'storage',
        stock: 22,
        description: 'HDD 3.5", 5400 RPM',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1412,
        name: 'ADATA XPG Gammix S70 Blade 1TB',
        price: 9490,
        category: 'storage',
        stock: 29,
        description: 'NVMe PCIe 4.0, 7400MB/s',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    // Блоки питания
    {
        id: 1501,
        name: 'Seasonic PRIME TX-1200',
        price: 24990,
        category: 'power-supplies',
        stock: 12,
        description: '1200W, 80+ Platinum',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1502,
        name: 'Corsair RM1000x SHIFT',
        price: 18990,
        category: 'power-supplies',
        stock: 15,
        description: '1000W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1503,
        name: 'Be Quiet! Straight Power 11',
        price: 12990,
        category: 'power-supplies',
        stock: 20,
        description: '850W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1504,
        name: 'Cooler Master MWE 750',
        price: 7990,
        category: 'power-supplies',
        stock: 25,
        description: '750W, 80+ Bronze',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1505,
        name: 'EVGA SuperNOVA 850 G6',
        price: 13990,
        category: 'power-supplies',
        stock: 17,
        description: '850W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1506,
        name: 'Thermaltake Toughpower GF3 1000W',
        price: 17990,
        category: 'power-supplies',
        stock: 13,
        description: '1000W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1507,
        name: 'FSP Hydro G Pro 850W',
        price: 11990,
        category: 'power-supplies',
        stock: 19,
        description: '850W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1508,
        name: 'ASUS ROG Thor 1200P',
        price: 29990,
        category: 'power-supplies',
        stock: 8,
        description: '1200W, 80+ Platinum',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1509,
        name: 'NZXT C850 850W',
        price: 12990,
        category: 'power-supplies',
        stock: 16,
        description: '850W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1510,
        name: 'Deepcool PQ850M 850W',
        price: 10990,
        category: 'power-supplies',
        stock: 21,
        description: '850W, 80+ Gold',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1511,
        name: 'Fractal Design Ion+ 760P',
        price: 11990,
        category: 'power-supplies',
        stock: 18,
        description: '760W, 80+ Platinum',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1512,
        name: 'Chieftec GPS-600S 600W',
        price: 5990,
        category: 'power-supplies',
        stock: 30,
        description: '600W, 80+ Bronze',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    // Охлаждение
    {
        id: 1601,
        name: 'NZXT Kraken 360 RGB',
        price: 16990,
        category: 'cooling',
        stock: 14,
        description: 'Жидкостное охлаждение, 360mm',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1602,
        name: 'Noctua NH-D15 chromax.black',
        price: 11990,
        category: 'cooling',
        stock: 18,
        description: 'Башенный кулер, 2 вентилятора',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1603,
        name: 'Corsair iCUE H100i RGB',
        price: 12990,
        category: 'cooling',
        stock: 16,
        description: 'Жидкостное охлаждение, 240mm',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1604,
        name: 'Lian Li UNI FAN SL-INF 120',
        price: 8990,
        category: 'cooling',
        stock: 30,
        description: '3x120mm вентилятора, RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1605,
        name: 'Arctic Liquid Freezer II 360',
        price: 11990,
        category: 'cooling',
        stock: 20,
        description: 'Жидкостное охлаждение, 360mm',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1606,
        name: 'Deepcool AK620',
        price: 6990,
        category: 'cooling',
        stock: 25,
        description: 'Башенный кулер, 2 вентилятора',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1607,
        name: 'be quiet! Dark Rock Pro 4',
        price: 9990,
        category: 'cooling',
        stock: 19,
        description: 'Башенный кулер, 2 вентилятора',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1608,
        name: 'Cooler Master MasterLiquid ML240L',
        price: 8990,
        category: 'cooling',
        stock: 22,
        description: 'Жидкостное охлаждение, 240mm RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1609,
        name: 'Thermalright Peerless Assassin 120',
        price: 5990,
        category: 'cooling',
        stock: 28,
        description: 'Башенный кулер, 2 вентилятора',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1610,
        name: 'EK AIO 280 D-RGB',
        price: 13990,
        category: 'cooling',
        stock: 15,
        description: 'Жидкостное охлаждение, 280mm RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1611,
        name: 'Scythe Fuma 2',
        price: 7990,
        category: 'cooling',
        stock: 23,
        description: 'Башенный кулер, 2 вентилятора',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1612,
        name: 'Arctic P12 PWM PST 5-Pack',
        price: 3990,
        category: 'cooling',
        stock: 35,
        description: '5x120mm вентиляторов, PWM',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1613,
        name: 'Corsair LL120 RGB 3-Pack',
        price: 7990,
        category: 'cooling',
        stock: 27,
        description: '3x120mm вентилятора, RGB',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    // Корпуса
    {
        id: 1701,
        name: 'Lian Li O11 Dynamic EVO',
        price: 14990,
        category: 'cases',
        stock: 12,
        description: 'Mid-Tower, стеклянные панели',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1702,
        name: 'NZXT H9 Flow',
        price: 16990,
        category: 'cases',
        stock: 10,
        description: 'Dual-Chamber, прозрачный',
        image: 'https://images.unsplash.com/photo-1593640408182-31c562922280?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1703,
        name: 'Fractal Design North',
        price: 12990,
        category: 'cases',
        stock: 14,
        description: 'Mid-Tower, деревянная отделка',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1704,
        name: 'Corsair 4000D Airflow',
        price: 9990,
        category: 'cases',
        stock: 18,
        description: 'Mid-Tower, отличная вентиляция',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1705,
        name: 'Fractal Design Meshify 2',
        price: 13990,
        category: 'cases',
        stock: 13,
        description: 'Mid-Tower, сетчатая передняя панель',
        image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1706,
        name: 'be quiet! Silent Base 802',
        price: 14990,
        category: 'cases',
        stock: 11,
        description: 'Mid-Tower, звукоизоляция',
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1707,
        name: 'Phanteks Eclipse P500A',
        price: 11990,
        category: 'cases',
        stock: 15,
        description: 'Mid-Tower, RGB подсветка',
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1708,
        name: 'Cooler Master MasterBox TD500',
        price: 10990,
        category: 'cases',
        stock: 16,
        description: 'Mid-Tower, RGB вентиляторы',
        image: 'https://images.unsplash.com/photo-1593640408182-31c562922280?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1709,
        name: 'Lian Li Lancool 216',
        price: 12990,
        category: 'cases',
        stock: 14,
        description: 'Mid-Tower, отличная вентиляция',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1709,
        name: 'Lian Li Lancool 216',
        price: 12990,
        category: 'cases',
        stock: 14,
        description: 'Mid-Tower, отличная вентиляция',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1710,
        name: 'NZXT H7 Flow',
        price: 14990,
        category: 'cases',
        stock: 12,
        description: 'Mid-Tower, прозрачная боковая панель',
        image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1711,
        name: 'Corsair 5000D Airflow',
        price: 16990,
        category: 'cases',
        stock: 10,
        description: 'Mid-Tower, расширенная вентиляция',
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1712,
        name: 'Thermaltake Core P3 TG',
        price: 11990,
        category: 'cases',
        stock: 9,
        description: 'Open Frame, стеклянная панель',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1713,
        name: 'Deepcool CK560',
        price: 8990,
        category: 'cases',
        stock: 20,
        description: 'Mid-Tower, RGB вентиляторы',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    },
    {
        id: 1714,
        name: 'ASUS TUF Gaming GT501',
        price: 13990,
        category: 'cases',
        stock: 11,
        description: 'Full-Tower, RGB подсветка',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format'
    }
];

function getStoredProducts() {
    return JSON.parse(localStorage.getItem('techstore_products') || '[]');
}

function saveProducts(products) {
    localStorage.setItem('techstore_products', JSON.stringify(products));
}

function ensureProductsInitialized() {
    const products = getStoredProducts();
    if (products.length === 0) {
        saveProducts(DEFAULT_PRODUCTS);
    } else {
        // Добавляем новые товары из DEFAULT_PRODUCTS, которых еще нет
        const existingIds = new Set(products.map(p => p.id));
        const newProducts = DEFAULT_PRODUCTS.filter(p => !existingIds.has(p.id));
        if (newProducts.length > 0) {
            const updatedProducts = [...products, ...newProducts];
            saveProducts(updatedProducts);
        }
    }
}

function renderDynamicProductSections() {
    const sections = document.querySelectorAll('[data-product-category]');
    if (!sections.length) return;

    const products = getStoredProducts();
    sections.forEach(section => {
        const category = section.getAttribute('data-product-category');
        const filtered = category === 'all'
            ? products
            : products.filter(product => product.category === category);

        if (filtered.length === 0) {
            section.innerHTML = '<p class="empty-products">Товары пока не добавлены</p>';
            return;
        }

        section.innerHTML = filtered.map(createProductCard).join('');
    });
}

function createProductCard(product) {
    const price = formatProductPrice(product.price);
    const image = product.image && product.image.trim()
        ? product.image.trim()
        : getPlaceholderImage(product.name);

    return `
        <div class="product-card">
            <img src="${image}" alt="${product.name}" class="product-image">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-price">${price} ₽</div>
            <button class="add-to-cart"
                data-id="${product.id}"
                data-name="${product.name}"
                data-price="${product.price}">
                В корзину
            </button>
        </div>
    `;
}

function getPlaceholderImage(name) {
    const encodedName = encodeURIComponent(name.replace(/\s+/g, '+'));
    return `https://via.placeholder.com/300x200/34495e/ffffff?text=${encodedName}`;
}

function formatProductPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

// Создаем глобальные экземпляры
const auth = new Auth();
const cart = new Cart(auth);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    ensureProductsInitialized();
    renderDynamicProductSections();
    initializeCartButtons();
    initializeAuthButtons();
    
    if (window.location.pathname.includes('cart.html')) {
        initializeCartPage();
    }
    
    if (window.location.pathname.includes('login.html')) {
        initializeLoginPage();
    }
    
    if (window.location.pathname.includes('profile.html')) {
        initializeProfilePage();
    }
});

// Инициализация кнопок корзины
function initializeCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        if (button.dataset.cartInit === 'true') {
            return;
        }

        button.addEventListener('click', async function() {
            const productId = this.getAttribute('data-id');
            const productName = this.getAttribute('data-name');
            const productPrice = parseInt(this.getAttribute('data-price'));
            const productCard = this.closest('.product-card');
            const productImage = productCard ? productCard.querySelector('.product-image').src : '';

            await cart.addItem(productId, productName, productPrice, productImage, 1);
            
            const originalText = this.textContent;
            this.textContent = 'Добавлено!';
            this.style.background = '#2ecc71';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.background = '';
            }, 2000);
        });

        button.dataset.cartInit = 'true';
    });
}

// Инициализация кнопок авторизации
function initializeAuthButtons() {
    document.querySelectorAll('.logout-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            await auth.logout();
            window.location.href = 'index.html';
        });
    });
}

// Инициализация страницы корзины
function initializeCartPage() {
    cart.updateCartDisplay();
    
    document.getElementById('clear-cart')?.addEventListener('click', async function() {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            await cart.clearCart();
        }
    });

    // Обработчик кнопки оформления заказа теперь в cart.html
    // Здесь оставляем только базовую проверку для других страниц
    document.querySelectorAll('.checkout-btn').forEach(btn => {
        if (!btn.hasAttribute('data-checkout-handled')) {
            btn.setAttribute('data-checkout-handled', 'true');
            btn.addEventListener('click', function() {
                if (cart.getItems().length === 0) {
                    alert('Корзина пуста!');
                    return;
                }
                // Если на странице cart.html, модальное окно откроется через обработчик в cart.html
                if (window.location.pathname.includes('cart.html')) {
                    return;
                }
                // Для других страниц можно добавить редирект на cart.html
                window.location.href = 'cart.html';
            });
        }
    });
}

// Инициализация страницы входа/регистрации
function initializeLoginPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    showRegister?.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLogin?.addEventListener('click', function(e) {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Обработчик формы входа
    document.getElementById('login-btn')?.addEventListener('click', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const result = await auth.login(email, password);
        
        if (result.success) {
            // Переносим корзину гостя в аккаунт пользователя
            const guestCart = JSON.parse(localStorage.getItem('techstore_guest_cart') || '[]');
            if (guestCart.length > 0) {
                cart.mergeGuestCart(guestCart);
                localStorage.removeItem('techstore_guest_cart');
            }
            
            alert('Вход выполнен успешно!');
            window.location.href = 'index.html';
        } else {
            alert(result.message);
        }
    });

    // Обработчик формы регистрации
    document.getElementById('register-btn')?.addEventListener('click', async function(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        if (password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }

        const result = await auth.register(email, password, name);
        
        if (result.success) {
            alert('Регистрация успешна! Теперь вы можете войти.');
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            // Очищаем форму регистрации
            document.getElementById('register-form').reset();
        } else {
            alert(result.message);
        }
    });
}

// Инициализация страницы профиля
function initializeProfilePage() {
    if (!auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('user-name').textContent = auth.getUserName();
    document.getElementById('user-email').textContent = auth.getUserEmail();
    document.getElementById('registration-date').textContent = new Date(auth.currentUser.registrationDate).toLocaleDateString('ru-RU');

    document.getElementById('logout-btn').addEventListener('click', function() {
        auth.logout();
        window.location.href = 'index.html';
    });
}

// Глобальные функции для вызова из HTML
window.updateCartQuantity = async function(productId, quantity) {
    await cart.updateQuantity(productId, quantity);
};

window.removeCartItem = async function(productId) {
    await cart.removeItem(productId);
};

// Проверка админ авторизации для страницы админ панели
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        // Добавляем кнопку выхода в админ панель
        const adminHeader = document.querySelector('.admin-header');
        if (adminHeader) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'admin-btn danger';
            logoutBtn.style.marginTop = '1rem';
            logoutBtn.textContent = 'Выйти из админ панели';
            logoutBtn.onclick = function() {
                localStorage.removeItem('techstore_admin');
                window.location.reload();
            };
            adminHeader.appendChild(logoutBtn);
        }
    });
}