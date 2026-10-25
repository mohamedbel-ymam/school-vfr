# Stage 1: Build React Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN node node_modules/vite/bin/vite.js build


# Stage 2: PHP 8.2 + Apache Runtime for Laravel
FROM php:8.2-apache

# Stage 2: PHP 8.2 + Apache Runtime for Laravel
FROM php:8.2-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_mysql bcmath mbstring xml curl zip \
    && rm -rf /var/lib/apt/lists/*
RUN a2enmod rewrite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copie des fichiers composer pour optimiser le cache Docker
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-autoloader

# Copie du reste du code source Laravel
COPY . .

# Récupération des fichiers React compilés depuis le stage "frontend-builder"
COPY --from=frontend-builder /app/frontend/dist ./public/build

RUN composer dump-autoload --optimize
RUN chown -R www-data:www-data storage bootstrap/cache

ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

EXPOSE 80
CMD ["apache2-foreground"]