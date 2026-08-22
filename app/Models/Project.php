<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

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
        'type',
        'description',
        'deadline',
        'fetched_at',
        'job_type',
        'location',
        'remote_type',
        'employment_type',
        'contract_type',
        'delivery_date',
    ];

    protected $casts = [
        'applied_date' => 'date',
        'next_action_date' => 'date',
        'is_favorite' => 'boolean',
        'reward' => 'integer',
        'applicant_count' => 'integer',
        'recruitment_count' => 'integer',
        'deadline' => 'date',
        'fetched_at' => 'datetime',
        'delivery_date' => 'date',
    ];
}
