import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

export function DataTable({
  columns,
  data,
  searchKey,                // optional column id/accessor to search on
  tableId = "admin.table",  // unique per table instance
}) {
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility, columnFilters },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Determine which column to search:
  const effectiveSearchKey = useMemo(() => {
    if (searchKey && columns.some(c => (c.id ?? c.accessorKey) === searchKey)) {
      return searchKey;
    }
    const first = columns.find(c => typeof (c.accessorKey ?? c.id) === "string");
    return first ? (first.accessorKey ?? first.id) : undefined;
  }, [searchKey, columns]);

  const searchColumn = effectiveSearchKey ? table.getColumn(effectiveSearchKey) : null;

  // Restore column visibility safely from localStorage (run once per tableId)
  useEffect(() => {
    const key = `dt:${tableId}:visibility`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      // Only apply keys that exist in this table
      const valid = Object.fromEntries(
        Object.keys(saved)
          .filter(k => !!table.getColumn(k))
          .map(k => [k, !!saved[k]])
      );
      // Use our React state setter (avoids internal loops)
      setColumnVisibility(prev => ({ ...prev, ...valid }));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Persist column visibility
  useEffect(() => {
    const key = `dt:${tableId}:visibility`;
    localStorage.setItem(key, JSON.stringify(columnVisibility));
  }, [columnVisibility, tableId]);

  return (
    <div className="space-y-3">
      {/* Recherche */}
      {searchColumn && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Rechercher ${effectiveSearchKey}…`}
            value={(searchColumn.getFilterValue() ?? "")}
            onChange={(e) => searchColumn.setFilterValue(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-3 py-2 text-left">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-t">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                  Aucun résultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Précédent
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Suivant
        </Button>
      </div>
    </div>
  );
}
