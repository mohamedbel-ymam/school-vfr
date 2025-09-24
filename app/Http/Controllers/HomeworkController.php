<?php

namespace App\Http\Controllers;

use App\Models\Homework;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Notifications\HomeworkAssigned;
use Carbon\Carbon;

class HomeworkController extends Controller
{
    // Admin: list all (+filters)
    public function adminIndex(Request $r)
    {
        $q = Homework::query()->latest('id');

        if ($r->filled('degree_id')) $q->where('degree_id', $r->integer('degree_id'));
        if ($r->filled('teacher_id')) $q->where('teacher_id', $r->integer('teacher_id'));

        if ($s = trim((string)$r->query('search',''))) {
            $q->where(function($w) use ($s){
                $w->where('title','like',"%$s%")
                  ->orWhere('teacher_name','like',"%$s%")
                  ->orWhere('subject_name','like',"%$s%");
            });
        }

        // Optional due filter: ?due=upcoming|past
        if ($due = $r->query('due')) {
            if ($due === 'upcoming') $q->where(function($w){ $w->whereNull('due_at')->orWhere('due_at','>=',now()); });
            if ($due === 'past')     $q->where('due_at','<',now());
        }

        return response()->json(['data' => $q->with(['degree'])->paginate(20)]);
    }

    // Teacher: list own
    public function teacherIndex(Request $r)
    {
        $t = $r->user();
        $items = Homework::where('teacher_id', $t->id)->latest('id')->with(['degree'])->paginate(20);
        return response()->json(['data' => $items]);
    }

    // Student: list by student's degree
    public function studentIndex(Request $r)
    {
        $s = $r->user();
        $degreeId = $s->degree_id;
        $items = Homework::where('degree_id', $degreeId)->latest('id')->paginate(20);
        return response()->json(['data' => $items]);
    }

    // Parent: aggregate all children degrees
    public function parentIndex(Request $r)
    {
        $p = $r->user();
        $degreeIds = $p->children()->pluck('degree_id')->filter()->unique()->values();
        $items = Homework::whereIn('degree_id', $degreeIds)->latest('id')->paginate(20);
        return response()->json(['data' => $items]);
    }

    // Teacher: create
    public function store(Request $r)
    {
        $t = $r->user();

        $data = $r->validate([
            'title'       => ['required','string','max:200'],
            'description' => ['nullable','string'],
            'degree_id'   => ['required','integer','exists:degrees,id'],
            'due_at'      => ['nullable','date'], // "YYYY-MM-DDThh:mm" from <input type="datetime-local">
            'file'        => ['required','file','max:51200'], // 50 MB
        ]);

        $file = $r->file('file');
        $path = $file->store("homeworks/{$data['degree_id']}/".date('Y/m'), 'public');

        $subject = $t->subject; // may be null
        $hw = Homework::create([
            'title'         => $data['title'],
            'description'   => $data['description'] ?? null,
            'due_at'        => $data['due_at'] ? Carbon::parse($data['due_at']) : null,
            'file_path'     => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type'     => $file->getClientMimeType(),
            'size'          => $file->getSize(),
            'teacher_id'    => $t->id,
            'teacher_name'  => trim("{$t->firstname} {$t->lastname}"),
            'subject_id'    => $subject?->id,
            'subject_name'  => $subject?->name,
            'degree_id'     => (int)$data['degree_id'],
        ]);

        // Notify all admins
        $admins = User::where('role','admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new HomeworkAssigned([
                'title'   => 'Nouveau devoir',
                'message' => "{$hw->teacher_name} a donné « {$hw->title} »"
                             .($hw->due_at ? " (échéance: ".$hw->due_at->format('Y-m-d H:i').")" : "")
                             ." pour le niveau sélectionné.",
                'meta'    => [
                    'homework_id' => $hw->id,
                    'degree_id'   => $hw->degree_id,
                    'subject'     => $hw->subject_name,
                    'teacher'     => $hw->teacher_name,
                    'due_at'      => $hw->due_at?->toIso8601String(),
                ],
            ]));
        }
        User::where('role', 'student')
    ->where('degree_id', $hw->degree_id)
    ->orderBy('id')
    ->chunkById(200, function ($students) use ($hw) {
        foreach ($students as $student) {
            $student->notify(new HomeworkAssigned([
                'title'   => 'Nouveau devoir',
                'message' => "{$hw->teacher_name} a donné « {$hw->title} »"
                            .($hw->subject_name ? " (".$hw->subject_name.")" : "")
                            .($hw->due_at ? " · Échéance: ".$hw->due_at->format('Y-m-d H:i') : "")
                            ." pour votre niveau.",
                'meta'    => [
                    'homework_id' => $hw->id,
                    'degree_id'   => $hw->degree_id,
                    'subject'     => $hw->subject_name,
                    'teacher'     => $hw->teacher_name,
                    'due_at'      => $hw->due_at?->toIso8601String(),
                    'file_url'    => $hw->file_url,
                ],
            ]));
        }
    });
        

        return response()->json(['data' => $hw], 201);
    }

    // Delete — admin or owner teacher
    public function destroy(Request $r, Homework $homework)
    {
        $user = $r->user();
        if (!($user->role === 'admin' || $user->id === $homework->teacher_id)) {
            abort(403);
        }

        Storage::disk('public')->delete($homework->file_path);
        $homework->delete();

        return response()->json(['message' => 'Devoir supprimé']);
    }
}
