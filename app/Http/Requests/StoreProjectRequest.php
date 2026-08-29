<?php

namespace App\Http\Requests;

use App\Support\ProjectStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * typeが未指定の場合は既存Web版互換のためside_jobとして扱う。
     * statusが指定されている場合、side_job扱い時のみ旧ステータス名を新名称へ正規化する。
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('status')) {
            $this->merge([
                'status' => ProjectStatus::normalize($this->resolvedType(), $this->input('status')),
            ]);
        }
    }

    protected function resolvedType(): string
    {
        $type = $this->input('type');

        return in_array($type, [ProjectStatus::CAREER, ProjectStatus::SIDE_JOB], true)
            ? $type
            : ProjectStatus::SIDE_JOB;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', 'in:career,side_job'],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(ProjectStatus::optionsForType($this->resolvedType()))],
            'project_url' => ['nullable', 'url', 'max:2048'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'media' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'applied_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
            'fetched_at' => ['nullable', 'date'],
            'reward' => ['nullable', 'integer', 'min:0'],
            'reward_text' => ['nullable', 'string', 'max:255'],
            'working_hours' => ['nullable', 'string', 'max:255'],
            'applicant_count' => ['nullable', 'integer', 'min:0'],
            'recruitment_count' => ['nullable', 'integer', 'min:0'],
            'application_text' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string', 'max:255'],
            'next_action_date' => ['nullable', 'date'],
            'memo' => ['nullable', 'string'],
            'priority' => ['nullable', 'string', 'max:255'],
            'is_favorite' => ['nullable', 'boolean'],
            'job_type' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'remote_type' => ['nullable', 'string', 'max:255'],
            'employment_type' => ['nullable', 'string', 'max:255'],
            'contract_type' => ['nullable', 'string', 'max:255'],
            'delivery_date' => ['nullable', 'date'],
        ];
    }
}
