import { Button } from "../components/ui/button";

// STUDENT COLUMNS (with actions)
export function studentColumns(onEdit, onDelete) {
  return [
    {
      header: "First Nom",
      accessorKey: "firstname",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Last Nom",
      accessorKey: "lastname",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "E-mail",
      accessorKey: "email",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Niveau",
      id: "degree_name",
      accessorFn: (row) => row?.degree?.name ?? "—", // nested relation
      cell: ({ row }) => row.original?.degree?.name ?? "—",
    },
    {
      header: "Sexe",
      id: "gender_label",
      accessorFn: (row) =>
        row?.gender === "m" ? "Homme" : row?.gender === "f" ? "Femme" : "—",
    },
    {
      header: "Birth Date",
      accessorKey: "date_of_birth",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Blood Type",
      accessorKey: "blood_type",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "parent",
      id: "parent_name",
      // Prefer the eager-loaded relation if you added parentUser() on the model
      accessorFn: (row) => {
        const full =
          `${row?.parentUser?.firstname ?? ""} ${row?.parentUser?.lastname ?? ""}`.trim();
        if (full) return full;
        // fallback to ID if relation not loaded
        return row?.student_parent_id ? `#${row.student_parent_id}` : "—";
      },
      cell: ({ row }) => {
        const p = row.original?.parentUser;
        const full =
          `${p?.firstname ?? ""} ${p?.lastname ?? ""}`.trim();
        return full || (row.original?.student_parent_id ? `#${row.original.student_parent_id}` : "—");
      },
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button onClick={() => onEdit(row.original)}>Edit</Button>
          <Button onClick={() => onDelete(row.original.id)} variant="destructive">
            Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableFiltering: false,
    },
  ];
}

// TEACHER COLUMNS (with actions)
export function teacherColumns(onEdit, onDelete) {
  return [
    { header: "ID", accessorKey: "id", cell: (info) => info.getValue() },
    {
      header: "First Nom",
      accessorKey: "firstname",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Last Nom",
      accessorKey: "lastname",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "E-mail",
      accessorKey: "email",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Matière",
      id: "subject_name",
      accessorFn: (row) => row?.subject?.name ?? "—", // nested relation
      cell: ({ row }) => row.original?.subject?.name ?? "—",
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(row.original)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (window.confirm("Supprimer this enseignant?")) onDelete(row.original.id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableFiltering: false,
    },
  ];
}

// PARENT COLUMNS (with actions)
export function parentColumns(onEdit, onDelete) {
  return [
    {
      header: "Firstname",
      accessorKey: "firstname",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Lastname",
      accessorKey: "lastname",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "E-mail",
      accessorKey: "email",
      cell: (info) => info.getValue() || "—",
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(row.original)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (window.confirm("Supprimer this parent?")) onDelete(row.original.id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableFiltering: false,
    },
  ];
}
