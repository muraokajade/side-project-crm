<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'project_url' => $this->project_url,
            'client_name' => $this->client_name,
            'media' => $this->media,
            'category' => $this->category,
            'applied_date' => $this->applied_date,
            'status' => $this->status,
            'reward' => $this->reward,
            'working_hours' => $this->working_hours,
            'applicant_count' => $this->applicant_count,
            'recruitment_count' => $this->recruitment_count,
            'application_text' => $this->application_text,
            'next_action' => $this->next_action,
            'next_action_date' => $this->next_action_date,
            'memo' => $this->memo,
            'priority' => $this->priority,
            'is_favorite' => $this->is_favorite,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
