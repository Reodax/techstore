# Исправление CORS ошибки для Firebase Storage

## Проблема
При загрузке файлов с GitHub Pages (reodax.github.io) возникает ошибка CORS, блокирующая запросы к Firebase Storage.

**Важно:** Firebase Storage ОТЛИЧНО подходит для хранения изображений! Это его основная функция. Нужно только настроить CORS правила.

## Решение 1: Настройка CORS через Firebase Console (САМЫЙ ПРОСТОЙ СПОСОБ)

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект `techstore-reodax`
3. Перейдите в **Storage** → **Files**
4. Нажмите на три точки (⋮) в правом верхнем углу
5. Выберите **Settings** или **Настройки**
6. Найдите раздел **CORS configuration** или **Настройки CORS**
7. Добавьте ваш домен: `https://reodax.github.io`
8. Сохраните изменения

**Если в Firebase Console нет опции CORS**, используйте Решение 2.

## Решение 2: Настройка CORS через gsutil (Альтернативный способ)

1. Установите Google Cloud SDK (если еще не установлен):
   - Скачайте с https://cloud.google.com/sdk/docs/install
   - Или используйте: `npm install -g @google-cloud/storage`

2. Создайте файл `cors.json`:
```json
[
  {
    "origin": ["https://reodax.github.io", "http://localhost:*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

3. Примените CORS правила:
```bash
gsutil cors set cors.json gs://techstore-reodax.firebasestorage.app
```

4. Проверьте настройки:
```bash
gsutil cors get gs://techstore-reodax.firebasestorage.app
```

## Решение 2: Через Firebase Console (если доступно)

1. Откройте Firebase Console
2. Перейдите в Storage → Settings
3. Найдите раздел "CORS configuration"
4. Добавьте домен: `https://reodax.github.io`

## Решение 3: Временное решение - загрузка через URL

Пока CORS не настроен, можно:
1. Загрузить изображение на другой хостинг (imgur, cloudinary и т.д.)
2. Использовать полученный URL в поле "URL изображения"

## После настройки CORS

После применения CORS правил:
1. Обновите страницу
2. Попробуйте загрузить файл снова
3. Проверьте консоль браузера - ошибки CORS должны исчезнуть

