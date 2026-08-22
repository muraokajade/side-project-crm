<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ImportPreviewController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectTrashController;

// apiResource('projects', ...)の`{project}`より先に解決させるため、静的パス(trash)と
// 追加セグメント付きパス(restore/force)を先に登録する。
Route::get('/projects/trash', [ProjectTrashController::class, 'index']);
Route::post('/projects/{id}/restore', [ProjectTrashController::class, 'restore'])->whereNumber('id');
Route::delete('/projects/{id}/force', [ProjectTrashController::class, 'forceDelete'])->whereNumber('id');

Route::apiResource('projects', ProjectController::class)->only(['index', 'store', 'update', 'destroy']);

Route::post('/import/preview', ImportPreviewController::class);
