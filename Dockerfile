# Stage 1: Build React Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN node node_modules/vite/bin/vite.js build


# Stage 2: PHP 8.2 + Apache Runtime for Laravel
FROM php:8.2-apache

# Installation de l'installateur d'extensions PHP
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions

# Installation des extensions requises pour Laravel
RUN install-php-extensions gd pdo_mysql bcmath mbstring xml curl zip

# Installation des outils système de base
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copie des fichiers composer pour optimiser le cache
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-autoloader

# Copie du reste du code source Laravel
COPY . .

# Copie du build React DIRECTEMENT dans le dossier public/ de Laravel
COPY --from=frontend-builder /app/frontend/dist/. ./public/

# 1. Forcer Apache à lire index.html en priorité sur index.php
RUN echo 'DirectoryIndex index.html index.php' > ./public/.htaccess \
    && echo '<IfModule mod_rewrite.c>' >> ./public/.htaccess \
    && echo '    RewriteEngine On' >> ./public/.htaccess \
    && echo '    RewriteBase /' >> ./public/.htaccess \
    && echo '' >> ./public/.htaccess \
    # 2. Si l'URL commence par /api, on l'envoie à index.php (Laravel)
    && echo '    RewriteRule ^api(/.*)?$ index.php [QSA,L]' >> ./public/.htaccess \
    && echo '' >> ./public/.htaccess \
    # 3. Si le fichier ou dossier physique existe (assets JS, CSS, images), on le sert directement
    && echo '    RewriteCond %{REQUEST_FILENAME} -f [OR]' >> ./public/.htaccess \
    && echo '    RewriteCond %{REQUEST_FILENAME} -d' >> ./public/.htaccess \
    && echo '    RewriteRule ^ - [L]' >> ./public/.htaccess \
    && echo '' >> ./public/.htaccess \
    # 4. Pour tout le reste (routes de React Router), on renvoie vers index.html
    && echo '    RewriteRule ^ /index.html [L]' >> ./public/.htaccess \
    && echo '</IfModule>' >> ./public/.htaccess

RUN composer dump-autoload --optimize
RUN chown -R www-data:www-data storage bootstrap/cache public

ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

EXPOSE 80
CMD ["apache2-foreground"]