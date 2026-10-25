# Stage 2: PHP 8.2 + Apache Runtime for Laravel
FROM php:8.2-apache

# Installation des dépendances système et extensions PHP nécessaires
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql bcmath mbstring xml curl zip

# Activation de mod_rewrite pour Apache
RUN a2enmod rewrite

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Définition du répertoire de travail à la racine de Laravel
WORKDIR /var/www/html

# Copie d'abord les fichiers de dépendances Composer pour profiter du cache Docker
COPY composer.json composer.lock ./

# Installation des dépendances PHP (sans les dev)
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-autoloader

# Copie du reste du code source du projet
COPY . .

# Copie des fichiers compilés du React frontend (provenant du stage 1) vers public/build
COPY --from=frontend-builder /app/frontend/dist ./public/build

# Finalisation de l'autoloader et des scripts Laravel
RUN composer dump-autoload --optimize

# Permissions correctes pour Laravel
RUN chown -R www-data:www-data storage bootstrap/cache

# Redirection du DocumentRoot d'Apache vers le dossier public de Laravel
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

EXPOSE 80
CMD ["apache2-foreground"]