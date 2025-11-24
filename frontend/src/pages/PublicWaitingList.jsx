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
const degreeLabels = {
  "6ème": "6ème Année Collège",
  "5ème": "5ème Année Collège",
  "4ème": "4ème Année Collège",
  "3ème": "3ème Année Collège",
  "TC": "Tronc Commun",
  "1BAC SM": "1ère Bac Sciences Mathématiques",
  "1BAC SE": "1ère Bac Sciences Expérimentales",
  "2BAC": "2ème Bac – Filière Générale"
};

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

  // GROUP BY DEGREE
  const groups = list.reduce((acc, item) => {
    if (!acc[item.degree]) acc[item.degree] = [];
    acc[item.degree].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Liste d'Attente par Filière
      </h1>

      {/* For each degree */}
      {Object.keys(groups).map((degree) => (
        <div key={degree} className="mb-10">
          {/* Degree Title */}
          <h2 className="text-xl font-semibold mb-3 text-blue-700">
            {degree}
          </h2>

          <div className="overflow-x-auto rounded-md border shadow-sm">
            <Table className="min-w-[600px]">
              <TableCaption className="text-sm">
                Liste d'attente officielle pour: {degreeLabels[degree] ?? degree}

              </TableCaption>

              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Ordre</TableHead>
                  <TableHead>Nom Complet</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {groups[degree].map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.order_index}</TableCell>
                    <TableCell className="font-semibold">
                      {item.first_name} {item.last_name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
