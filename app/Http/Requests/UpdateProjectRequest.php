<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

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
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', 'in:未応募,応募済み,返信待ち,面談予定,選考中,契約済み,作業中,納品済み,検収待ち,完了,不採用,辞退'],
            'project_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'client_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'media' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'applied_date' => ['sometimes', 'nullable', 'date'],
            'reward' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'working_hours' => ['sometimes', 'nullable', 'string', 'max:255'],
            'applicant_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'recruitment_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'application_text' => ['sometimes', 'nullable', 'string'],
            'next_action' => ['sometimes', 'nullable', 'string', 'max:255'],
            'next_action_date' => ['sometimes', 'nullable', 'date'],
            'memo' => ['sometimes', 'nullable', 'string'],
            'priority' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_favorite' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
