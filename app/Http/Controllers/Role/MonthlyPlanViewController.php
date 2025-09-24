<?php


namespace App\Http\Controllers\Role;

use App\Http\Controllers\Controller;
use App\Models\MonthlySubjectPlan;
use Illuminate\Http\Request;

class MonthlyPlanViewController extends Controller
{
  public function student(Request $r) {
    $user = $r->user();
    $month = $r->query('month') ?? date('Y-m');
    $degreeId = $user->degree_id; // student degree

    return MonthlySubjectPlan::with(['subject:id,name','enseignant:id,firstname,lastname'])
      ->where('degree_id', $degreeId)
      ->whereBetween('plan_date', [
        "{$month}-01",
        date('Y-m-t', strtotime("{$month}-01")),
      ])
      ->orderBy('plan_date')
      ->get();
  }

  public function teacher(Request $r) {
    $user = $r->user();
    $month = $r->query('month') ?? date('Y-m');

    return MonthlySubjectPlan::with(['subject:id,name','degree:id,name'])
      ->where('teacher_id', $user->id)
      ->whereBetween('plan_date', [
        "{$month}-01",
        date('Y-m-t', strtotime("{$month}-01")),
      ])
      ->orderBy('plan_date')
      ->get();
  }

  public function parent(Request $r) {
    $month = $r->query('month') ?? date('Y-m');
    $childId = $r->query('child_id'); // required in your parent UX
    // lookup child degree
    $degreeId = \App\Models\User::findOrFail($childId)->degree_id;

    return MonthlySubjectPlan::with(['subject:id,name','enseignant:id,firstname,lastname'])
      ->where('degree_id', $degreeId)
      ->whereBetween('plan_date', [
        "{$month}-01",
        date('Y-m-t', strtotime("{$month}-01")),
      ])
      ->orderBy('plan_date')
      ->get();
  }
}
