import { useEffect, useMemo, useState } from "react";
import { AdminEventApi } from "../../../services/api/admin/EventApi";
import { DataTable } from "../data-table/DataTable";
import { Button } from "../../ui/button";
import EventUpsertForm from "../forms/EventUpsertForm";
import { Dialog, DialogContent, DialogTrigger,DialogHeader, DialogTitle, DialogDescription,} from "../../ui/dialog";


export default function ManageEvents(){
const [rows, setRows] = useState([]);
const [loading, setLoading] = useState(true);
const [editing, setEditing] = useState(null);


const fetchAll = async () => {
setLoading(true);
try{
const res = await AdminEventApi.list();
setRows(res.data || []);
} finally { setLoading(false); }
};
useEffect(() => { fetchAll(); }, []);


const columns = useMemo(() => ([
{ accessorKey: 'title', header: 'Title' },
{ accessorKey: 'template', header: 'Template' },
{ accessorKey: 'starts_at', header: 'Starts', cell: ({row}) => new Date(row.original.starts_at).toLocaleString() },
{ accessorKey: 'ends_at', header: 'Ends', cell: ({row}) => row.original.ends_at ? new Date(row.original.ends_at).toLocaleString() : '—' },
{ accessorKey: 'location', header: 'Location' },
{ id: 'actions', header: '', cell: ({row}) => (
<div className="flex gap-2 justify-end">
<Dialog>
<DialogTrigger asChild>
<Button size="sm" onClick={() => setEditing(row.original)}>Edit</Button>
</DialogTrigger>
<DialogContent className="max-w-2xl">
<EventUpsertForm initial={row.original} onDone={() => { setEditing(null); fetchAll(); }} />
</DialogContent>
</Dialog>
<Button
  size="sm"
  variant="destructive"
  onClick={async () => {
    await AdminEventApi.remove(row.original.id); // may return empty (204)
    fetchAll();
  }}
>
  Delete
</Button>
</div>
) }
]), []);


return (
<div className="p-4 space-y-4">
<div className="flex items-center justify-between">
<h2 className="text-xl font-semibold">Events</h2>
<Dialog>
  <DialogTrigger asChild>
    <Button>➕ New event</Button>
  </DialogTrigger>

  <DialogContent className="max-w-2xl" aria-describedby="create-event-desc">
    <DialogHeader>
      <DialogTitle>Create event</DialogTitle>
      <DialogDescription id="create-event-desc">
        Fill the form and click Save.
      </DialogDescription>
    </DialogHeader>

    <EventUpsertForm onDone={() => { fetchAll(); }} />
  </DialogContent>
</Dialog>

</div>
<DataTable columns={columns} 
data={rows} 
 searchKey="title"      
  tableId="admin.événements"  />
{loading && <div>Loading…</div>}
</div>
);
}