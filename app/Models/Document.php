<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Document extends Model
{
    protected $fillable = [
        'title','description',
        'file_path','original_name','mime_type','size',
        'teacher_id','teacher_name',
        'subject_id','subject_name',
        'degree_id',
    ];

    protected $appends = ['file_url','filesize_human'];

    public function teacher() { return $this->belongsTo(User::class, 'teacher_id'); }
    public function subject() { return $this->belongsTo(Subject::class); }
    public function degree()  { return $this->belongsTo(Degree::class); }

    public function getFileUrlAttribute()
    {
        // file_path stored on "public" disk
        return Storage::disk('public')->url($this->file_path);
    }

    public function getFilesizeHumanAttribute()
    {
        $size = (int)$this->size;
        foreach (['B','KB','MB','GB'] as $unit) {
            if ($size < 1024) return $size.' '.$unit;
            $size = round($size / 1024, 1);
        }
        return $size.' TB';
    }
}
