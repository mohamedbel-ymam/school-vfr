<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlySubjectPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class MonthlySubjectPlanController extends Controller
{
    public function index(Request $r)
    {
        $month = $r->query('month'); // e.g. '2025-09'

        $q = MonthlySubjectPlan::with([
            'degree:id,name',
            'subject:id,name',
            'enseignant:id,firstname,lastname',
        ]);

        if ($month) {
            $q->whereBetween('plan_date', [
                "{$month}-01",
                date('Y-m-t', strtotime("{$month}-01")),
            ]);
        }

        if ($d = $r->query('degree_id')) $q->where('degree_id', $d);

        return $q->orderBy('plan_date')->paginate(200);
    }

   public function store(Request $r)
{
    // normalize FE keys -> teacher_id
    $r->merge([
        'teacher_id' => $r->input('teacher_id') ?? $r->input('enseignant_id'),
    ]);

    $rules = [
        'plan_date'  => ['required','date'],
        'degree_id'  => ['required','exists:degrees,id'],
        'subject_id' => ['required','exists:subjects,id'],
        'teacher_id' => ['nullable','exists:users,id'],
        'title'      => ['nullable','string','max:255'],
        'notes'      => ['nullable','string'],
    ];
    $hasSequence = Schema::hasColumn('monthly_subject_plans', 'sequence');
    if ($hasSequence) $rules['sequence'] = ['sometimes','integer','min:1'];

    $data = $r->validate($rules);

    // if sequence exists and not provided, auto-pick next one
    if ($hasSequence && empty($data['sequence'])) {
        $next = (int) \App\Models\MonthlySubjectPlan::where([
            'plan_date'  => $data['plan_date'],
            'degree_id'  => $data['degree_id'],
            'subject_id' => $data['subject_id'],
            'teacher_id' => $data['teacher_id'] ?? null,
        ])->max('sequence');
        $data['sequence'] = $next ? $next + 1 : 1;
    }

    $uniqueBy = ['plan_date','degree_id','subject_id','teacher_id'];
    if ($hasSequence) $uniqueBy[] = 'sequence';

    // ATOMIC write
    \App\Models\MonthlySubjectPlan::query()->upsert(
        [ array_merge($data, ['created_at'=>now(), 'updated_at'=>now()]) ],
        $uniqueBy,
        ['title','notes','updated_at'] // columns to update on conflict
    );

    // Return the row
    $where = [
        'plan_date'  => $data['plan_date'],
        'degree_id'  => $data['degree_id'],
        'subject_id' => $data['subject_id'],
        'teacher_id' => $data['teacher_id'] ?? null,
    ];
    if ($hasSequence) $where['sequence'] = $data['sequence'];

    $row = \App\Models\MonthlySubjectPlan::with(['degree','subject','enseignant'])
            ->where($where)->first();

    return response()->json(['data' => $row], 200);
}

    public function update(Request $r, MonthlySubjectPlan $plan)
    {
        $r->merge([
            'teacher_id' => $r->input('teacher_id') ?? $r->input('enseignant_id'),
        ]);

        $rules = [
            'plan_date'  => ['sometimes','date'],
            'degree_id'  => ['sometimes','exists:degrees,id'],
            'subject_id' => ['sometimes','exists:subjects,id'],
            'teacher_id' => ['sometimes','nullable','exists:users,id'],
            'title'      => ['sometimes','nullable','string','max:255'],
            'notes'      => ['sometimes','nullable','string'],
        ];

        if (Schema::hasColumn('monthly_subject_plans', 'sequence')) {
            $rules['sequence'] = ['sometimes','integer','min:1'];
        }

        $data = $r->validate($rules);

        // Simple update (if you change keys to a combo that already exists, MySQL will throw 1062)
        // If you prefer "move/merge" semantics, tell me and I’ll wire a safe merge here.
        $plan->update($data);

        return [
            'data' => $plan->fresh()->load(['degree','subject','enseignant'])
        ];
    }

    public function destroy(MonthlySubjectPlan $plan)
    {
        $plan->delete();
        return response()->noContent();
    }
}
