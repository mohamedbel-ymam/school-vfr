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
        if (!$this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            $url = $this->image_path;
        } else {
            $url = Storage::url($this->image_path);
        }

        // Sanitize legacy or misconfigured api.school-vfr.onrender.com domain which has no SSL certificate
        return str_replace(
            ['https://api.school-vfr.onrender.com', 'http://api.school-vfr.onrender.com'],
            'https://school-vfr.onrender.com',
            $url
        );
    }
}