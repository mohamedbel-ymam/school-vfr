<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contribution extends Model {
    protected $fillable = ['user_id','type','title','details','status','proposed_at','scheduled_at'];
    protected $casts = ['proposed_at'=>'datetime','scheduled_at'=>'datetime'];
    public function user(){ return $this->belongsTo(User::class); }
}
