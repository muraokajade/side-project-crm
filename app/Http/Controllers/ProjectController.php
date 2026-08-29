<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'type' => ['sometimes', 'string', 'in:career,side_job'],
        ]);

        // ログインユーザー所有のProjectだけを対象にする(他ユーザーのデータは混ざらない)。
        $query = Project::query()->ownedBy($request->user()->id);

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($keyword = $request->input('keyword')) {
            $query->searchText($keyword);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($media = $request->input('media')) {
            $query->where('media', $media);
        }

        // 論理削除済みは既定(SoftDeletesのグローバルスコープ)で除外される。

        $projects = $query->orderBy('created_at', 'desc')->get();

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request)
    {
        $validated = $request->validated();

        // user_idはリクエスト値ではなくログインユーザーから決定する(所有者の偽装を防ぐ)。
        $project = $request->user()->projects()->create($validated);

        // typeなど省略可能な項目はDB側のデフォルト値が適用されるが、
        // create()直後のインメモリなモデルにはその値が反映されていないため再取得する。
        return (new ProjectResource($project->fresh()))->response()->setStatusCode(201);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $this->authorizeOwner($request, $project);

        $validated = $request->validated();
        $project->update($validated);

        return new ProjectResource($project->fresh());
    }

    public function destroy(Request $request, Project $project)
    {
        $this->authorizeOwner($request, $project);

        $project->delete();

        return response()->noContent();
    }

    /**
     * 他ユーザーのProjectには404を返す。403にすると「そのIDのProjectは存在する」ことが
     * 伝わってしまうため、存在自体を秘匿する。
     */
    private function authorizeOwner(Request $request, Project $project): void
    {
        if ($project->user_id !== $request->user()->id) {
            abort(404);
        }
    }
}
