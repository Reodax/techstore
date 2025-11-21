// Управление темной темой
const toggleButton = document.getElementById('theme-toggle');
const body = document.body;

// Функция создания кнопки переключения темы
function createThemeToggle() {
    const nav = document.querySelector('.nav');
    if (!nav) {
        setTimeout(createThemeToggle, 50);
        return;
    }
    
    // Проверяем, не создана ли уже кнопка
    if (document.getElementById('theme-toggle')) {
        return;
    }
    
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle-btn';
    btn.innerHTML = '🌙';
    btn.title = 'Темная тема';
    
    // Проверяем localStorage при загрузке страницы
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
        btn.innerHTML = '☀️';
        btn.title = 'Светлая тема';
    }
    
    // Обработчик клика
    btn.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        const theme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        
        // Обновляем иконку
        btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Светлая тема' : 'Темная тема';
    });
    
    // Вставляем кнопку перед админ панелью
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
        nav.insertBefore(btn, adminLink);
    } else {
        nav.appendChild(btn);
    }
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    // Проверяем localStorage сразу
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
    }
    document.addEventListener('DOMContentLoaded', createThemeToggle);
} else {
    // Проверяем localStorage сразу
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
    }
    createThemeToggle();
}

