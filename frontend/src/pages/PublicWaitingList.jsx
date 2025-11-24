import { useEffect, useState } from "react";
import { axiosClient } from "../api/axios";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Loader2 } from "lucide-react";

export default function PublicWaitingList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadList = async () => {
      try {
        const res = await axiosClient.get("/waiting-list");
        setList(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Liste d'Attente (Ordre Officiel)
      </h1>

      {/* RESPONSIVE WRAPPER */}
      <div className="overflow-x-auto rounded-md border shadow-sm">
        <Table className="min-w-[600px]">
          <TableCaption className="text-sm">
            Liste publique d'attente mise à jour automatiquement.
          </TableCaption>

          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Ordre</TableHead>
              <TableHead>Nom Complet</TableHead>
              <TableHead>Filière</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {list.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-6 text-gray-500"
                >
                  Aucune donnée pour le moment.
                </TableCell>
              </TableRow>
            )}

            {list.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.order_index}</TableCell>
                <TableCell>
                  <span className="block text-sm sm:text-base font-semibold">
                    {item.first_name} {item.last_name}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 text-xs sm:text-sm rounded bg-blue-100 text-blue-700">
                    {item.degree}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
