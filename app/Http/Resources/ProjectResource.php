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
            'type' => $this->type,
            'name' => $this->name,
            'project_url' => $this->project_url,
            'client_name' => $this->client_name,
            'media' => $this->media,
            'category' => $this->category,
            'description' => $this->description,
            'applied_date' => $this->applied_date,
            'deadline' => $this->deadline,
            'status' => $this->status,
            'reward' => $this->reward,
            'reward_text' => $this->reward_text,
            'working_hours' => $this->working_hours,
            'applicant_count' => $this->applicant_count,
            'recruitment_count' => $this->recruitment_count,
            'application_text' => $this->application_text,
            'next_action' => $this->next_action,
            'next_action_date' => $this->next_action_date,
            'memo' => $this->memo,
            'priority' => $this->priority,
            'is_favorite' => $this->is_favorite,
            'job_type' => $this->job_type,
            'location' => $this->location,
            'remote_type' => $this->remote_type,
            'employment_type' => $this->employment_type,
            'contract_type' => $this->contract_type,
            'delivery_date' => $this->delivery_date,
            'fetched_at' => $this->fetched_at,
            'deleted_at' => $this->deleted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
