// js/customization.js - Применение кастомизации сайта

(function() {
    'use strict';
    
    function applyCustomization() {
        const settings = JSON.parse(localStorage.getItem('techstore_customization') || '{}');
        
        if (!settings || Object.keys(settings).length === 0) {
            return;
        }
        
        // Применяем цвета через CSS переменные
        if (settings.colors) {
            const root = document.documentElement;
            root.style.setProperty('--header-bg', settings.colors.headerBg || '#2c3e50');
            root.style.setProperty('--background-color', settings.colors.background || '#f8f9fa');
            root.style.setProperty('--card-bg', settings.colors.cardBg || '#ffffff');
            root.style.setProperty('--text-color', settings.colors.text || '#333333');
            root.style.setProperty('--price-color', settings.colors.price || '#e74c3c');
        }
        
        // Обновляем тексты на странице
        // Обновляем название сайта
        const logoElements = document.querySelectorAll('.logo h1');
        logoElements.forEach(el => {
            if (settings.siteName) {
                // Убираем иконку из текста, так как она добавляется через CSS ::before
                // Просто устанавливаем название сайта без иконки
                el.textContent = settings.siteName;
            }
            
            // Обновляем иконку через CSS переменную для ::before
            const root = document.documentElement;
            const icon = settings.siteIcon || '💻';
            root.style.setProperty('--logo-icon', `"${icon}"`);
        });
        
        // Обновляем заголовок на главной странице
        const heroTitle = document.querySelector('.hero h2');
        if (heroTitle && settings.heroTitle) {
            heroTitle.textContent = settings.heroTitle;
        }
        
        // Обновляем описание на главной странице
        const heroDesc = document.querySelector('.hero p');
        if (heroDesc && settings.heroDescription) {
            heroDesc.textContent = settings.heroDescription;
        }
        
        // Обновляем текст в подвале
        const footerText = document.querySelector('.footer p');
        if (footerText && settings.footerText) {
            footerText.textContent = settings.footerText;
        }
    }
    
    // Применяем кастомизацию при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyCustomization);
    } else {
        applyCustomization();
    }
    
    // Также применяем при изменении localStorage (для синхронизации между вкладками)
    window.addEventListener('storage', function(e) {
        if (e.key === 'techstore_customization') {
            applyCustomization();
        }
    });
})();

