<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;

/**
 * ゴミ箱(論理削除済みProject)の一覧・復元・完全削除。
 *
 * restore/forceDeleteは、SoftDeletesのグローバルスコープにより通常のroute model binding
 * (`Project $project`)では削除済みモデルを取得できないため、`withTrashed()`で明示的に取得する。
 */
class ProjectTrashController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'type' => ['sometimes', 'string', 'in:career,side_job'],
        ]);

        // ログインユーザー所有のProjectだけを対象にする。
        $query = Project::onlyTrashed()->ownedBy($request->user()->id);

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->searchText($search);
        }

        $projects = $query->orderBy('deleted_at', 'desc')->get();

        return ProjectResource::collection($projects);
    }

    public function restore(Request $request, int $id)
    {
        $project = $this->findOwnedTrashable($request, $id);

        if (! $project->trashed()) {
            return response()->json([
                'message' => '削除済みでないProjectは復元できません。',
                'error_code' => 'not_trashed',
            ], 409);
        }

        $project->restore();

        return new ProjectResource($project);
    }

    public function forceDelete(Request $request, int $id)
    {
        $project = $this->findOwnedTrashable($request, $id);

        if (! $project->trashed()) {
            return response()->json([
                'message' => '削除済みでないProjectは完全削除できません。',
                'error_code' => 'not_trashed',
            ], 409);
        }

        $project->forceDelete();

        return response()->noContent();
    }

    /**
     * 論理削除済みを含めて取得しつつ、所有者がログインユーザーでなければ404にする
     * (他ユーザーのProject IDを直接指定しても復元・完全削除できない)。
     */
    private function findOwnedTrashable(Request $request, int $id): Project
    {
        $project = Project::withTrashed()->ownedBy($request->user()->id)->find($id);

        if ($project === null) {
            abort(404);
        }

        return $project;
    }
}
