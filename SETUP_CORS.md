# Быстрая настройка CORS для Firebase Storage

## Шаг 1: Установка Google Cloud SDK

### Для Windows:
1. Скачайте установщик: https://cloud.google.com/sdk/docs/install-sdk#windows
2. Запустите установщик и следуйте инструкциям
3. После установки откройте новое окно PowerShell/CMD

### Альтернатива через npm (проще):
```bash
npm install -g @google-cloud/storage
```

## Шаг 2: Авторизация

```bash
gcloud auth login
```

## Шаг 3: Настройка проекта

```bash
gcloud config set project techstore-reodax
```

## Шаг 4: Применение CORS правил

В папке проекта выполните:
```bash
gsutil cors set cors.json gs://techstore-reodax.firebasestorage.app
```

## Шаг 5: Проверка

```bash
gsutil cors get gs://techstore-reodax.firebasestorage.app
```

Должно показать настройки CORS с вашим доменом.

## Готово!

После этого обновите страницу и попробуйте загрузить файл снова.

