// js/mobile-menu.js - Управление мобильным меню

(function() {
    'use strict';
    
    function initMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.nav');
        
        if (!menuToggle || !nav) return;
        
        // Создаем оверлей, если его нет
        let overlay = document.querySelector('.mobile-menu-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-menu-overlay';
            document.body.appendChild(overlay);
        }
        
        // Открытие/закрытие меню
        function toggleMenu() {
            const isActive = nav.classList.contains('active');
            
            if (isActive) {
                closeMenu();
            } else {
                openMenu();
            }
        }
        
        function openMenu() {
            menuToggle.classList.add('active');
            nav.classList.add('active');
            // Добавляем класс с небольшой задержкой для плавной анимации
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('active');
                });
            });
            document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы
        }
        
        function closeMenu() {
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = ''; // Возвращаем прокрутку
            
            // Закрываем все открытые dropdown
            const openDropdowns = nav.querySelectorAll('.nav-dropdown.active');
            openDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
            
            // Сбрасываем прокрутку меню после закрытия
            setTimeout(() => {
                nav.scrollTop = 0;
            }, 400);
        }
        
        // Обработчики событий
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
        
        overlay.addEventListener('click', closeMenu);
        
        // Закрытие меню при клике на обычные ссылки (не dropdown)
        const navLinks = nav.querySelectorAll('a:not(.nav-dropdown > a)');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    closeMenu();
                }
            });
        });
        
        // Закрытие меню при изменении размера экрана
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 768 && nav.classList.contains('active')) {
                    closeMenu();
                }
            }, 250);
        });
    }
    
    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }
})();

