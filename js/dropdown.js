// js/dropdown.js - Стабильная работа выпадающих меню

(function() {
    'use strict';
    
    function initDropdowns() {
        const navDropdowns = document.querySelectorAll('.nav-dropdown');
        
        navDropdowns.forEach(dropdown => {
            const dropdownLink = dropdown.querySelector(':scope > a');
            const dropdownMenu = dropdown.querySelector('.dropdown-menu');
            
            if (!dropdownLink || !dropdownMenu) return;
            
            // Убираем старые обработчики, если они есть
            const newDropdownLink = dropdownLink.cloneNode(true);
            dropdownLink.parentNode.replaceChild(newDropdownLink, dropdownLink);
            
            // Обработчик для открытия/закрытия меню
            let hoverTimeout;
            let isOpen = false;
            
            // При наведении мыши
            dropdown.addEventListener('mouseenter', function() {
                clearTimeout(hoverTimeout);
                if (window.innerWidth > 768) { // Только для десктопа
                    dropdown.classList.add('active');
                    isOpen = true;
                }
            });
            
            // При уходе мыши
            dropdown.addEventListener('mouseleave', function() {
                if (window.innerWidth > 768) { // Только для десктопа
                    hoverTimeout = setTimeout(function() {
                        dropdown.classList.remove('active');
                        isOpen = false;
                    }, 300); // Увеличена задержка для более стабильной работы
                }
            });
            
            // При клике на ссылку (для мобильных устройств)
            const link = dropdown.querySelector(':scope > a');
            if (link) {
                link.addEventListener('click', function(e) {
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Закрываем другие открытые меню
                        navDropdowns.forEach(otherDropdown => {
                            if (otherDropdown !== dropdown && otherDropdown.classList.contains('active')) {
                                otherDropdown.classList.remove('active');
                            }
                        });
                        
                        // Переключаем текущее меню
                        dropdown.classList.toggle('active');
                        isOpen = dropdown.classList.contains('active');
                    }
                });
            }
            
            // Предотвращаем закрытие при наведении на само меню
            dropdownMenu.addEventListener('mouseenter', function() {
                if (window.innerWidth > 768) {
                    clearTimeout(hoverTimeout);
                    dropdown.classList.add('active');
                    isOpen = true;
                }
            });
            
            dropdownMenu.addEventListener('mouseleave', function() {
                if (window.innerWidth > 768) {
                    hoverTimeout = setTimeout(function() {
                        dropdown.classList.remove('active');
                        isOpen = false;
                    }, 300);
                }
            });
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const clickedDropdown = e.target.closest('.nav-dropdown');
                navDropdowns.forEach(dropdown => {
                    if (dropdown !== clickedDropdown) {
                        dropdown.classList.remove('active');
                    }
                });
            }
        });
    }
    
    // Делаем функцию доступной глобально
    window.initDropdowns = initDropdowns;
    
    // Инициализация при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initDropdowns, 200); // Небольшая задержка для загрузки категорий
        });
    } else {
        setTimeout(initDropdowns, 200);
    }
    
    // Повторная инициализация после загрузки категорий
    window.addEventListener('load', function() {
        setTimeout(initDropdowns, 300);
    });
    
    // Также инициализируем при обновлении меню категорий
    const originalUpdateCategoriesMenu = window.updateCategoriesMenu;
    if (originalUpdateCategoriesMenu) {
        window.updateCategoriesMenu = function() {
            originalUpdateCategoriesMenu();
            setTimeout(initDropdowns, 150);
        };
    }
    
    // Инициализация после загрузки категорий через событие
    window.addEventListener('categoriesLoaded', function() {
        setTimeout(initDropdowns, 100);
    });
})();

