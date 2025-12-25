import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { Trash2, RefreshCw } from "lucide-react";
import { axiosClient } from "../../../api/axios";

/**
 * Admin – Manage all boursier contributions
 */
export default function ManageBoursierContributions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const notify = (msg) => alert(msg);

  /* ---------------- Load contributions ---------------- */
  const loadContributions = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(
        "/admin/boursier-contributions"
      );
      setItems(data || []);
    } catch (e) {
      console.error(e);
      notify("Erreur lors du chargement des contributions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContributions();
  }, []);

  /* ---------------- Update status ---------------- */
  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await axiosClient.put(
        `/admin/boursier-contributions/${id}`,
        { status }
      );
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status } : c
        )
      );
    } catch (e) {
      console.error(e);
      notify("Erreur lors de la mise à jour");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------------- Delete ---------------- */
  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Supprimer la contribution de ${item.user?.firstname} ${item.user?.lastname} ?`
      )
    )
      return;

    try {
      await axiosClient.delete(
        `/admin/boursier-contributions/${item.id}`
      );
      setItems((prev) => prev.filter((c) => c.id !== item.id));
      notify("Contribution supprimée");
    } catch (e) {
      console.error(e);
      notify("Erreur lors de la suppression");
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contributions des boursiers</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={loadContributions}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Boursier</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Promo</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Titre</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      Chargement…
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      Aucune contribution trouvée.
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/40"
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.user
                          ? `${item.user.firstname} ${item.user.lastname}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {item.user?.email ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {item.user?.boursier_profile
                          ?.final_school_year ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {item.type}
                      </td>
                      <td className="px-3 py-2">
                        {item.title || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={item.status}
                          onValueChange={(v) =>
                            handleStatusChange(item.id, v)
                          }
                          disabled={updatingId === item.id}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              En attente
                            </SelectItem>
                            <SelectItem value="approved">
                              Approuvée
                            </SelectItem>
                            <SelectItem value="done">
                              Réalisée
                            </SelectItem>
                            <SelectItem value="rejected">
                              Rejetée
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
