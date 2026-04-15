<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Only minimal web routes.
| NO API logic here.
| NO auth / NO CSRF-sensitive endpoints.
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => response()->json([
    'app' => 'TakwaEtablissement API',
    'status' => 'ok',
]));
