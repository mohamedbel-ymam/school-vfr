<?php

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        '*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        "https://school-vfr.onrender.com",
        "https://www.school-vfr.onrender.com"
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
