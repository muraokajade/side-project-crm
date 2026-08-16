<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'name',
        'project_url',
        'client_name',
        'media',
        'category',
        'applied_date',
        'status',
        'reward',
        'working_hours',
        'applicant_count',
        'recruitment_count',
        'application_text',
        'next_action',
        'next_action_date',
        'memo',
        'priority',
        'is_favorite',
    ];

    protected $casts = [
        'applied_date' => 'date',
        'next_action_date' => 'date',
        'is_favorite' => 'boolean',
        'reward' => 'integer',
        'applicant_count' => 'integer',
        'recruitment_count' => 'integer',
    ];
}
