<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Notifications\DocumentUploaded;

class DocumentController extends Controller
{
    // Admin: list all (+filters)
    public function adminIndex(Request $r)
    {
        $q = Document::query()->latest('id');

        if ($r->filled('degree_id')) $q->where('degree_id', $r->integer('degree_id'));
        if ($r->filled('teacher_id')) $q->where('teacher_id', $r->integer('teacher_id'));
        if ($s = trim((string)$r->query('search',''))) {
            $q->where(function($w) use ($s){
                $w->where('title','like',"%$s%")
                  ->orWhere('teacher_name','like',"%$s%")
                  ->orWhere('subject_name','like',"%$s%");
            });
        }

        return response()->json(['data' => $q->paginate(20)]);
    }

    // Teacher: list own
    public function teacherIndex(Request $r)
    {
        $t = $r->user();
        $items = Document::where('teacher_id', $t->id)->latest('id')->paginate(20);
        return response()->json(['data' => $items]);
    }

    // Student: list by student's degree
    public function studentIndex(Request $r)
    {
        $s = $r->user();
        $degreeId = $s->degree_id;
        $items = Document::where('degree_id', $degreeId)->latest('id')->paginate(20);
        return response()->json(['data' => $items]);
    }

    // Parent: gather all children degrees
    public function parentIndex(Request $r)
    {
        $p = $r->user();
        $degreeIds = $p->children()->pluck('degree_id')->filter()->unique()->values();
        $items = Document::whereIn('degree_id', $degreeIds)->latest('id')->paginate(20);
        return response()->json(['data' => $items]);
    }

    // Teacher: upload
    public function store(Request $r)
    {
        $t = $r->user(); // teacher
        $data = $r->validate([
            'title'       => ['required','string','max:200'],
            'description' => ['nullable','string'],
            'degree_id'   => ['required','integer','exists:degrees,id'],
            'file'        => ['required','file', 'max:51200'], // 50 MB
        ]);

        $file = $r->file('file');
        $path = $file->store("documents/{$data['degree_id']}/".date('Y/m'), 'public');

        $subject = $t->subject; // may be null
        $doc = Document::create([
            'title'         => $data['title'],
            'description'   => $data['description'] ?? null,
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

        // Notify all admins (so they "receive" it)
        $admins = User::where('role','admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new DocumentUploaded([
                'title'   => 'Nouveau document',
                'message' => "{$doc->teacher_name} a partagé « {$doc->title} » pour le niveau sélectionné.",
                'meta'    => [
                    'document_id' => $doc->id,
                    'degree_id'   => $doc->degree_id,
                    'subject'     => $doc->subject_name,
                    'teacher'     => $doc->teacher_name,
                ],
            ]));
        }
        User::where('role', 'student')
    ->where('degree_id', $doc->degree_id)
    ->orderBy('id')
    ->chunkById(200, function ($students) use ($doc) {
        foreach ($students as $student) {
            $student->notify(new DocumentUploaded([
                'title'   => 'Nouveau document',
                'message' => "{$doc->teacher_name} a partagé « {$doc->title} »"
                            .($doc->subject_name ? " (".$doc->subject_name.")" : "")
                            ." pour votre niveau.",
                'meta'    => [
                    'document_id' => $doc->id,
                    'degree_id'   => $doc->degree_id,
                    'subject'     => $doc->subject_name,
                    'teacher'     => $doc->teacher_name,
                    'file_url'    => $doc->file_url,
                ],
            ]));
        }
    });

        return response()->json(['data' => $doc], 201);
    }

    // Delete — admin or owner teacher
    public function destroy(Request $r, Document $document)
    {
        $user = $r->user();
        if (!($user->role === 'admin' || $user->id === $document->teacher_id)) {
            abort(403);
        }

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return response()->json(['message' => 'Document supprimé']);
    }
}
