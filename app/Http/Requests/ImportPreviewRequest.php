<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportPreviewRequest extends FormRequest
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'url' => ['required', 'string', 'max:2048'],
            'type' => ['nullable', 'string', 'in:career,side_job'],
        ];
    }

    /**
     * typeが未指定の場合は既存Web版互換のためside_jobとして扱う。
     */
    public function resolvedType(): string
    {
        $type = $this->input('type');

        return in_array($type, ['career', 'side_job'], true) ? $type : 'side_job';
    }
}
