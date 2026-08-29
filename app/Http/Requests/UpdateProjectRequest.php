<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Support\ProjectStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * statusが指定されている場合、実効type(resolvedType)がside_jobのときのみ
     * 旧ステータス名を新名称へ正規化する。
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('status')) {
            $this->merge([
                'status' => ProjectStatus::normalize($this->resolvedType(), $this->input('status')),
            ]);
        }
    }

    /**
     * typeがリクエストに含まれていればそれを使う。
     * 含まれていない場合は、更新対象Projectの現在のtypeを使う
     * (無条件でside_jobへ上書きしない)。
     */
    protected function resolvedType(): string
    {
        $type = $this->input('type');

        if (in_array($type, [ProjectStatus::CAREER, ProjectStatus::SIDE_JOB], true)) {
            return $type;
        }

        $project = $this->route('project');

        return $project instanceof Project ? $project->type : ProjectStatus::SIDE_JOB;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'required', 'string', 'in:career,side_job'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', Rule::in(ProjectStatus::optionsForType($this->resolvedType()))],
            'project_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'client_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'media' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'applied_date' => ['sometimes', 'nullable', 'date'],
            'deadline' => ['sometimes', 'nullable', 'date'],
            'fetched_at' => ['sometimes', 'nullable', 'date'],
            'reward' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'reward_text' => ['sometimes', 'nullable', 'string', 'max:255'],
            'working_hours' => ['sometimes', 'nullable', 'string', 'max:255'],
            'applicant_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'recruitment_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'application_text' => ['sometimes', 'nullable', 'string'],
            'next_action' => ['sometimes', 'nullable', 'string', 'max:255'],
            'next_action_date' => ['sometimes', 'nullable', 'date'],
            'memo' => ['sometimes', 'nullable', 'string'],
            'priority' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_favorite' => ['sometimes', 'nullable', 'boolean'],
            'job_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'remote_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'employment_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contract_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'delivery_date' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
