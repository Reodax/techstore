// js/categories.js - Динамическая загрузка категорий

(function() {
    'use strict';
    
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
    
    function getCategories() {
        console.log('=== getCategories вызвана ===');
        let categories = JSON.parse(localStorage.getItem('techstore_categories') || '[]');
        
        console.log('Из localStorage загружено:', categories.length, 'категорий');
        
        // Если нет сохраненных категорий, используем дефолтные
        if (categories.length === 0) {
            console.log('Категории пусты, загружаем дефолтные...');
            categories = getDefaultCategories();
            // Сохраняем дефолтные категории в localStorage
            localStorage.setItem('techstore_categories', JSON.stringify(categories));
            console.log('✓ Сохранены дефолтные категории в localStorage:', categories.length);
        }
        
        // Отладочная информация
        console.log('getCategories: итого', categories.length, 'категорий:');
        categories.forEach(cat => {
            console.log('  -', cat.name, 'showInMenu =', cat.showInMenu, typeof cat.showInMenu);
        });
        
        return categories;
    }
    
    function loadCategories() {
        const categories = getCategories();
        
        // Находим все контейнеры с категориями
        const categoryContainers = document.querySelectorAll('.categories-grid');
        
        categoryContainers.forEach(container => {
            // Проверяем, не является ли это контейнером на странице components.html
            const parentSection = container.closest('section');
            if (parentSection && (parentSection.id === 'main' || parentSection.id === 'new')) {
                // Это секции на components.html, пропускаем их
                return;
            }
            
            // Очищаем контейнер
            container.innerHTML = '';
            
            // Фильтруем категории - показываем только те, у которых showOnMainPage !== false
            const categoriesToShow = categories.filter(category => category.showOnMainPage !== false);
            
            console.log('loadCategories: фильтрация для главной страницы, показываем', categoriesToShow.length, 'из', categories.length);
            
            // Добавляем категории
            categoriesToShow.forEach(category => {
                const categoryCard = document.createElement('a');
                categoryCard.className = 'category-card';
                categoryCard.href = category.url || '#';
                
                categoryCard.innerHTML = `
                    <div class="category-icon">${category.icon}</div>
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                `;
                
                container.appendChild(categoryCard);
            });
        });
    }
    
    function loadNavigationMenu() {
        const categories = getCategories();
        
        console.log('=== НАЧАЛО ЗАГРУЗКИ МЕНЮ НАВИГАЦИИ ===');
        console.log('Загружено категорий:', categories.length);
        
        // Находим выпадающее меню "Комплектующие"
        const navDropdowns = document.querySelectorAll('.nav-dropdown');
        
        console.log('Найдено nav-dropdown элементов:', navDropdowns.length);
        
        if (navDropdowns.length === 0) {
            console.error('Категории: меню .nav-dropdown не найдено!');
            return;
        }
        
        navDropdowns.forEach(dropdown => {
            const dropdownLink = dropdown.querySelector(':scope > a');
            if (!dropdownLink) {
                console.log('dropdownLink не найден для dropdown');
                return;
            }
            
            // Проверяем, это ли меню "Комплектующие" (может быть с классом nav-active)
            // Проверяем текст ссылки и наличие меню с категориями
            const linkText = dropdownLink.textContent.trim();
            const hasComponentsMenu = dropdown.querySelector('.dropdown-menu a[href*="components.html"]');
            
            console.log(`Проверка dropdown: "${linkText}", hasComponentsMenu: ${!!hasComponentsMenu}`);
            
            if ((linkText === 'Комплектующие' || linkText.includes('Комплектующие')) || hasComponentsMenu) {
                console.log('✓ Найдено меню "Комплектующие"', linkText);
                
                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                if (!dropdownMenu) {
                    console.error('✗ dropdown-menu не найдено внутри nav-dropdown!');
                    return;
                }
                
                console.log('✓ dropdownMenu найдено');
                console.log('✓ Категорий для загрузки:', categories.length);
                console.log('✓ Список категорий:', categories.map(c => `${c.name} (showInMenu: ${c.showInMenu})`));
                
                // Сохраняем активную ссылку (если есть) для определения текущей страницы
                const activeLink = dropdownMenu.querySelector('a.nav-active');
                const activeHref = activeLink ? activeLink.href : null;
                
                // Очищаем меню
                dropdownMenu.innerHTML = '';
                
                // Добавляем категории из админ-панели (только те, у которых showInMenu !== false)
                const categoriesToShow = categories.filter(category => {
                    // Показываем категорию в меню, если showInMenu не установлен (undefined/null) или равен true
                    // Пропускаем только если явно установлено false
                    const shouldShow = category.showInMenu !== false;
                    console.log('Категории: проверка', category.name, 'showInMenu =', category.showInMenu, 'shouldShow =', shouldShow);
                    return shouldShow;
                });
                
                console.log('Категории: всего', categories.length, 'категорий, показываем', categoriesToShow.length);
                
                // Добавляем категории без дополнительного заголовка
                categoriesToShow.forEach(category => {
                    console.log('Категории: добавляем в меню', category.name);
                    
                    const link = document.createElement('a');
                    link.href = category.url || '#';
                    link.textContent = category.name;
                    
                    // Если это текущая страница, добавляем класс nav-active
                    if (activeHref && category.url && activeHref.includes(category.url)) {
                        link.classList.add('nav-active');
                    }
                    
                    // Если URL не указан, делаем ссылку неактивной
                    if (!category.url) {
                        link.style.opacity = '0.6';
                        link.style.cursor = 'not-allowed';
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                        });
                    }
                    
                    dropdownMenu.appendChild(link);
                    console.log('Категории: добавлена ссылка', category.name, 'в меню');
                });
                
                console.log('✓ Категории добавлены! Итоговое содержимое меню:');
                console.log('Всего элементов в меню:', dropdownMenu.children.length);
                console.log('HTML меню:', dropdownMenu.innerHTML.substring(0, 500));
            }
        });
        
        // Отправляем событие о загрузке категорий
        window.dispatchEvent(new CustomEvent('categoriesLoaded'));
    }
    
    function init() {
        console.log('=== CATEGORIES.JS: Запуск init() ===');
        console.log('Состояние документа:', document.readyState);
        loadCategories();
        loadNavigationMenu();
        console.log('=== CATEGORIES.JS: init() завершён ===');
    }
    
    // Делаем функции доступными глобально для обновления меню из админ-панели
    window.updateCategoriesMenu = function() {
        loadCategories();
        loadNavigationMenu();
        // Переинициализируем dropdown после обновления меню
        if (typeof window.initDropdowns === 'function') {
            setTimeout(window.initDropdowns, 100);
        }
    };
    
    // Также делаем loadNavigationMenu доступной напрямую
    window.loadNavigationMenu = loadNavigationMenu;
    
    // Применяем при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 200); // Даем время на загрузку всех элементов
        });
    } else {
        setTimeout(init, 200); // Даем время на загрузку всех элементов
    }
    
    // Также применяем после полной загрузки страницы
    window.addEventListener('load', function() {
        setTimeout(init, 300);
    });
    
    // Также применяем при изменении localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'techstore_categories') {
            init();
        }
    });
    
    // Слушаем изменения localStorage в той же вкладке (через кастомное событие)
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key === 'techstore_categories') {
            // Создаем кастомное событие для обновления меню
            window.dispatchEvent(new CustomEvent('localStorageChange', {
                detail: { key, value }
            }));
        }
    };
    
    window.addEventListener('localStorageChange', function(e) {
        if (e.detail.key === 'techstore_categories') {
            init();
        }
    });
})();

