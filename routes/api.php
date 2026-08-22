<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ImportPreviewController;
use App\Http\Controllers\ProjectController;

Route::apiResource('projects', ProjectController::class)->only(['index', 'store', 'update', 'destroy']);

Route::post('/import/preview', ImportPreviewController::class);
