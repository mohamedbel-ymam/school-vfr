<?php
// app/Exceptions/Handler.php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Auth\AuthenticationException;
use Throwable;

class Handler extends ExceptionHandler
{
    // … your existing dontReport, dontFlash, register() …

    protected function unauthenticated($request, AuthenticationException $e)
    {
        if ($request->expectsJson()) {
            return response()->json(['message'=>'Unauthenticated.'], 401);
        }
        return redirect()->guest(route('connexion'));
    }
}
