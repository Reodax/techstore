# Настройка правил Firestore для работы с администраторами

Для того, чтобы добавление и удаление администраторов работало через админ-панель, нужно настроить правила безопасности Firestore.

## Инструкция:

1. **Откройте консоль Firebase:**
   - Перейдите на [https://console.firebase.google.com](https://console.firebase.google.com)
   - Выберите ваш проект `techstore-reodax`

2. **Перейдите в Firestore Database:**
   - В левом меню выберите **Firestore Database**
   - Перейдите на вкладку **Rules** (Правила)

3. **Добавьте правила для коллекции `config`:**
   
   Замените существующие правила на следующие:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Правила для коллекции config (администраторы)
    match /config/{document} {
      // Разрешаем чтение всем авторизованным пользователям
      allow read: if request.auth != null;
      
      // Разрешаем запись только администраторам
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/config/admins) &&
        request.auth.token.email in get(/databases/$(database)/documents/config/admins).data.emails ||
        request.auth.token.email.matches('.*@.*') && 
        request.auth.token.email in ['seriy22832@gmail.com'];
    }
    
    // Правила для коллекции users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Администраторы могут читать и писать все
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/config/admins) &&
        request.auth.token.email in get(/databases/$(database)/documents/config/admins).data.emails ||
        request.auth.token.email in ['seriy22832@gmail.com'];
    }
    
    // Правила для других коллекций (orders, products, categories и т.д.)
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/config/admins) &&
        request.auth.token.email in get(/databases/$(database)/documents/config/admins).data.emails ||
        request.auth.token.email in ['seriy22832@gmail.com'];
    }
  }
}
```

4. **Нажмите "Publish" (Опубликовать)**

## Альтернативный вариант (более простой, но менее безопасный):

Если первый вариант не работает, используйте временные правила для тестирования:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ВНИМАНИЕ: Эти правила разрешают доступ всем авторизованным пользователям
    // Используйте только для тестирования!
    match /config/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ ВАЖНО:** Второй вариант менее безопасен, используйте его только для тестирования!

## После настройки правил:

1. Обновите страницу админ-панели
2. Попробуйте добавить администратора снова
3. Если ошибка сохраняется, проверьте консоль браузера (F12) для подробностей

## Проверка работы:

После настройки правил вы должны иметь возможность:
- ✅ Добавлять новых администраторов
- ✅ Удалять администраторов (кроме базовых и себя)
- ✅ Просматривать список всех администраторов

