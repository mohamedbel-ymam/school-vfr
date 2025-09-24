<?php

return [
    'paths' => [ 'api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'connexion', 'deconnexion', 'déconnexion'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:3000'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,  
];

