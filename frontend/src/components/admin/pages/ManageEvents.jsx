// src/components/admin/events/ManageEvents.jsx
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../data-table/DataTable";
import { Button } from "../../ui/button";
import EventUpsertForm from "../forms/EventUpsertForm";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { AdminEventApi } from "../../../services/api/admin/EventApi";
import { renderEventImage } from "../../../services/media/EventImage";

export default function ManageEvents(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await AdminEventApi.list();
      const arr = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
      setRows(arr || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const columns = useMemo(() => ([
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'template', header: 'Template' },
    { accessorKey: 'starts_at', header: 'Starts', cell: ({row}) => new Date(row.original.starts_at).toLocaleString() },
    { accessorKey: 'ends_at', header: 'Ends', cell: ({row}) => row.original.ends_at ? new Date(row.original.ends_at).toLocaleString() : '—' },
    { accessorKey: 'location', header: 'Location' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const ev = row.original;
        return (
          <div className="flex gap-2 justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing(ev)}>Edit</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <EventUpsertForm initial={ev} onDone={() => { setEditing(null); fetchAll(); }} />
              </DialogContent>
            </Dialog>

            {/* Generate preview and download */}
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const dataUrl = await renderEventImage(ev, { force: true });
                // download
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `event-${ev.id}.png`;
                a.click();
              }}
            >
              Generate
            </Button>

            {/* Save to server (if endpoint exists; silently no-op if not) */}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const dataUrl = await renderEventImage(ev, { force: true });
                try {
                  await AdminEventApi.setImage(ev.id, dataUrl);
                  await fetchAll();
                } catch (e) {
                  console.warn("Persisting image failed (endpoint missing?)", e);
                }
              }}
            >
              Save to server
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                await AdminEventApi.remove(ev.id);
                fetchAll();
              }}
            >
              Delete
            </Button>
          </div>
        );
      }
    }
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

      <DataTable columns={columns} data={rows} searchKey="title" tableId="admin.événements" />
      {loading && <div>Loading…</div>}
    </div>
  );
}
