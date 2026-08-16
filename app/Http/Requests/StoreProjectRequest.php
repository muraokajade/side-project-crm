<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

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
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'in:未応募,応募済み,返信待ち,面談予定,選考中,契約済み,作業中,納品済み,検収待ち,完了,不採用,辞退'],
            'project_url' => ['nullable', 'url', 'max:2048'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'media' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'applied_date' => ['nullable', 'date'],
            'reward' => ['nullable', 'integer', 'min:0'],
            'working_hours' => ['nullable', 'string', 'max:255'],
            'applicant_count' => ['nullable', 'integer', 'min:0'],
            'recruitment_count' => ['nullable', 'integer', 'min:0'],
            'application_text' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string', 'max:255'],
            'next_action_date' => ['nullable', 'date'],
            'memo' => ['nullable', 'string'],
            'priority' => ['nullable', 'string', 'max:255'],
            'is_favorite' => ['nullable', 'boolean'],
        ];
    }
}
