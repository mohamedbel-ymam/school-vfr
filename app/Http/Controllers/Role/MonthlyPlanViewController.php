<?php

namespace App\Http\Controllers\Role;

use App\Http\Controllers\Controller;
use App\Models\MonthlySubjectPlan;
use Illuminate\Http\Request;

class MonthlyPlanViewController extends Controller
{
    public function student(Request $r)
    {
        $user = $r->user();
        $month = $r->query('month') ?? date('Y-m');
        $degreeId = $user->degree_id;

        if (!$degreeId) {
            return response()->json([]);
        }

        return MonthlySubjectPlan::with(['subject:id,name', 'enseignant:id,firstname,lastname'])
            ->where('degree_id', $degreeId)
            ->whereBetween('plan_date', [
                "{$month}-01",
                date('Y-m-t', strtotime("{$month}-01")),
            ])
            ->orderBy('plan_date')
            ->get();
    }

    public function teacher(Request $r)
    {
        $user = $r->user();
        $month = $r->query('month') ?? date('Y-m');

        return MonthlySubjectPlan::with(['subject:id,name', 'degree:id,name'])
            ->where('teacher_id', $user->id)
            ->whereBetween('plan_date', [
                "{$month}-01",
                date('Y-m-t', strtotime("{$month}-01")),
            ])
            ->orderBy('plan_date')
            ->get();
    }

    public function parent(Request $r)
    {
        $month = $r->query('month') ?? date('Y-m');
        $childId = $r->query('child_id');
        $parent = $r->user();

        $child = $childId
            ? $parent->children()->find($childId)
            : $parent->children()->first();

        if (!$child || !$child->degree_id) {
            return response()->json([]);
        }

        $degreeId = $child->degree_id;

        return MonthlySubjectPlan::with(['subject:id,name', 'enseignant:id,firstname,lastname'])
            ->where('degree_id', $degreeId)
            ->whereBetween('plan_date', [
                "{$month}-01",
                date('Y-m-t', strtotime("{$month}-01")),
            ])
            ->orderBy('plan_date')
            ->get();
    }
}
