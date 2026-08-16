<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProjectController;

Route::apiResource('projects', ProjectController::class)->only(['index', 'store', 'update', 'destroy']);
