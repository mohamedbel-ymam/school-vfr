<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Degree extends Model
{
     protected $fillable = ['name','slug','position'];

    // N’affiche que les 5 degrés canoniques (slug non nul)
    public function scopeCanonical($q) { return $q->whereNotNull('slug'); }
}
