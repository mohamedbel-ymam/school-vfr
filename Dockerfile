# Stage 1: Build React Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

# Copie uniquement les fichiers de dépendances d'abord pour optimiser le cache
COPY frontend/package*.json ./
RUN npm install

# Copie tout le reste du code frontend
COPY frontend/ ./

# Exécute le build Vite
RUN npx vite build


# Stage 2: PHP 8.2 + Apache Runtime for Laravel
FROM php:8.2-apache

# Installation des dépendances système nécessaires pour Laravel et les extensions PHP
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql

# Activation de mod_rewrite pour Apache (nécessaire pour les routes Laravel)
RUN a2enmod rewrite

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définition du répertoire de travail de l'application Laravel
WORKDIR /var/www/html

# Copie de tout le projet Laravel à la racine
COPY . .

# Copie des fichiers compilés du React frontend (provenant du stage 1) vers le dossier public de Laravel
COPY --from=frontend-builder /app/frontend/dist ./public/build

# Installation des dépendances PHP de production
RUN composer install --no-dev --optimize-autoloader

# Permissions correctes pour Laravel
RUN chown -R www-data:www-data storage bootstrap/cache

# Redirection du DocumentRoot d'Apache vers le dossier public de Laravel
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

EXPOSE 80
CMD ["apache2-foreground"]