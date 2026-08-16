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
        $query = Project::query();

        if ($keyword = $request->input('keyword')) {
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                  ->orWhere('memo', 'like', "%{$keyword}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($media = $request->input('media')) {
            $query->where('media', $media);
        }

        $projects = $query->orderBy('created_at', 'desc')->get();

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request)
    {
        $validated = $request->validated();
        $project = Project::create($validated);

        return (new ProjectResource($project))->response()->setStatusCode(201);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $validated = $request->validated();
        $project->update($validated);

        return new ProjectResource($project->fresh());
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->noContent();
    }
}
