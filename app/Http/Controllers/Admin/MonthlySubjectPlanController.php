<?php
// app/Http/Controllers/Admin/MonthlySubjectPlanController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlySubjectPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class MonthlySubjectPlanController extends Controller
{
    public function index(Request $r)
    {
        $month = $r->query('month'); // 'YYYY-MM'

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

        // Inside-day time ordering if you have times
        if (Schema::hasColumn('monthly_subject_plans', 'start_time')) {
            $q->orderBy('plan_date')
              ->orderByRaw('CASE WHEN start_time IS NULL THEN 1 ELSE 0 END')
              ->orderBy('start_time');
        } else {
            $q->orderBy('plan_date');
        }

        $per = (int) $r->query('per_page', 200);
        return $q->paginate(max(1, min($per, 1000)));
    }

    public function store(Request $r)
    {
        // normalize FE keys -> teacher_id
        $r->merge([
            'teacher_id' => $r->input('teacher_id') ?? $r->input('enseignant_id'),
        ]);

        $hasSequence = Schema::hasColumn('monthly_subject_plans', 'sequence');

        $rules = [
            'plan_date'  => ['required','date'],
            'degree_id'  => ['required','exists:degrees,id'],
            'subject_id' => ['required','exists:subjects,id'],
            'teacher_id' => ['nullable','exists:users,id'],
            'title'      => ['nullable','string','max:255'],
            'notes'      => ['nullable','string'],
            'start_time' => ['nullable','date_format:H:i'],                   // NEW
            'end_time'   => ['nullable','date_format:H:i','after:start_time'],// NEW
        ];
        if ($hasSequence) $rules['sequence'] = ['sometimes','integer','min:1'];

        $data = $r->validate($rules);

        // If sequence exists and not provided, auto-pick next one for same (date,degree,subject,teacher)
        if ($hasSequence && empty($data['sequence'])) {
            $next = (int) MonthlySubjectPlan::where([
                'plan_date'  => $data['plan_date'],
                'degree_id'  => $data['degree_id'],
                'subject_id' => $data['subject_id'],
                'teacher_id' => $data['teacher_id'] ?? null,
            ])->max('sequence');
            $data['sequence'] = $next ? $next + 1 : 1;
        }

        // Upsert key: if you have sequence, keep it; else use start_time to disambiguate rows in a day
        $uniqueBy = $hasSequence
            ? ['plan_date','degree_id','subject_id','teacher_id','sequence']
            : ['plan_date','degree_id','subject_id','teacher_id','start_time'];  // NEW

        MonthlySubjectPlan::query()->upsert(
            [ array_merge($data, ['created_at'=>now(), 'updated_at'=>now()]) ],
            $uniqueBy,
            ['title','notes','start_time','end_time','updated_at']               // NEW: update times too
        );

        // Return freshly inserted/updated row
        $where = [
            'plan_date'  => $data['plan_date'],
            'degree_id'  => $data['degree_id'],
            'subject_id' => $data['subject_id'],
            'teacher_id' => $data['teacher_id'] ?? null,
        ];
        if ($hasSequence) {
            $where['sequence'] = $data['sequence'];
        } else {
            $where['start_time'] = $data['start_time'] ?? null;
        }

        $row = MonthlySubjectPlan::with(['degree','subject','enseignant'])
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
            'start_time' => ['sometimes','nullable','date_format:H:i'],          // NEW
            'end_time'   => ['sometimes','nullable','date_format:H:i','after:start_time'], // NEW
            'sequence'   => [Schema::hasColumn('monthly_subject_plans','sequence') ? 'sometimes' : 'nullable','integer','min:1'],
        ];

        $data = $r->validate($rules);

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
