<?php

return [
    'paths' => [ 'api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'connexion', 'deconnexion', 'déconnexion'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['https://takwaetablissement.com', 'https://www.takwaetablissement.com'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,  
];


