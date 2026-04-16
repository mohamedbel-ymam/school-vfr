<?php
namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Degree;

class TeacherDegreeController extends Controller
{
    public function __invoke()
    {
        return response()->json([
        'data' => Degree::query()->select('id','name')->orderBy('name')->get()
  ]); 
 }
}
