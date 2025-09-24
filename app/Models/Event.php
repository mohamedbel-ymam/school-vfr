<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title','template','starts_at','ends_at','location','description','data','created_by','image_path',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
        'data'      => 'array',
    ];

    protected $appends = ['image_url'];

    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getImageUrlAttribute() {
        return $this->image_path ? Storage::url($this->image_path) : null;
    }
}