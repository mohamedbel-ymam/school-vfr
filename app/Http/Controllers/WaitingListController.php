<?php

namespace App\Http\Controllers;

use App\Imports\WaitingListImport;
use App\Models\WaitingListEntry;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class WaitingListController extends Controller
{
    /**
     * Admin uploads Excel file and refreshes the list
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls'
        ]);

        // Clear old list
        WaitingListEntry::truncate();

        // Import new list
        Excel::import(new WaitingListImport, $request->file('file'));

        return response()->json([
            'message' => 'Waiting list imported successfully.'
        ]);
    }

    /**
     * Public API: Return the ordered waiting list
     */
    public function publicList()
    {
        $list = WaitingListEntry::orderBy('order_index')->get();

        return response()->json($list);
    }

    /**
     * Admin API: Fetch waiting list
     */
    public function index()
    {
        return WaitingListEntry::orderBy('order_index')->get();
    }
	public function clear()
	{
    WaitingListEntry::truncate();

    return response()->json([
        'message' => 'Liste d’attente supprimée avec succès.'
    ]);
}
}

