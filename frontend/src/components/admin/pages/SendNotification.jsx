// src/components/Admin/Pages/SendNotification.jsx
import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import NotificationApi from "../../../services/api/NotificationApi";
import DegreeApi from "../../../services/api/admin/DegreeApi";
import UserApi from "../../../services/api/UserApi";

import { Card, CardContent } from "../../ui/card";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "../../ui/select";
import { useToast } from "../../ui/use-toast";

// If you have it, use your auth context to detect admin
import { useAuth } from "../../../context/AuthContext.jsx";

// --------------------------- Validation ---------------------------
const schema = z.object({
  title: z.string().min(1, "Titre requis"),
  message: z.string().min(1, "Message requis"),
  audience: z.enum([
    "all_students", "all_teachers", "all_parents",
    "degree_students", "user", "users"
  ]),
  degree_id: z.string().optional(),
  user_id: z.string().optional(),
  user_ids: z.array(z.string()).optional(),
})
.refine(v => v.audience !== "degree_students" || !!v.degree_id, {
  path: ["degree_id"], message: "Sélectionnez un niveau"
})
.refine(v => v.audience !== "user" || !!v.user_id, {
  path: ["user_id"], message: "Sélectionnez un utilisateur"
})
.refine(v => v.audience !== "users" || ((v.user_ids?.length ?? 0) > 0), {
  path: ["user_ids"], message: "Sélectionnez au moins un utilisateur"
});

// --------------------------- Helpers ---------------------------
const fmt = (s) => {
  if (!s) return "";
  try { return new Date(s).toLocaleString(); } catch { return String(s); }
};
const audienceLabel = (a) => ({
  all_students: "Tous les élèves",
  all_teachers: "Tous les enseignants",
  all_parents: "Tous les parents",
  degree_students: "Élèves d’un niveau",
  user: "Un utilisateur",
  users: "Utilisateurs multiples",
}[a] ?? a);

// --------------------------- Component ---------------------------
export default function SendNotification() {
  const { toast } = useToast();
  const { user } = useAuth?.() ?? {};
  const isAdmin = useMemo(() => {
    const col = (user?.role || "").toString().toLowerCase();
    const spatie = Array.isArray(user?.roles)
      ? user.roles.some((r) => (r?.name || r).toString().toLowerCase() === "admin")
      : false;
    return col === "admin" || spatie;
  }, [user]);

  // form states
  const [degrees, setDegrees] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // list states (admin table)
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { audience: "all_students", title: "", message: "" }
  });

  const audience = form.watch("audience");

  // bootstrap degrees & users
  useEffect(() => {
    DegreeApi.all()
      .then(({ data }) => setDegrees(data?.data || data || []))
      .catch(() => setDegrees([]));
    UserApi.all()
      .then(({ data }) => setUsers(data?.data || data || []))
      .catch(() => setUsers([]));
  }, []);

  // reset dependent fields when audience changes
  useEffect(() => {
    if (audience !== "degree_students") form.setValue("degree_id", undefined);
    if (audience !== "user") form.setValue("user_id", undefined);
    if (audience !== "users") form.setValue("user_ids", []);
  }, [audience]); // eslint-disable-line

  // --------------------------- Admin list fetch ---------------------------
  const fetchList = async (opts = {}) => {
    if (!isAdmin) return; // prevent 403 spam for non-admins
    setLoadingList(true);
    try {
      const params = { page: opts.page ?? page, per_page: perPage };
      const res = await NotificationApi.list(params);
      const data = res?.data ?? {};

      // Accept different shapes:
      const rows = Array.isArray(data) ? data
                : Array.isArray(data.data) ? data.data
                : Array.isArray(data.notifications) ? data.notifications
                : [];

      const metaTotal = data?.meta?.total ?? data?.total ?? rows.length;
      setItems(rows);
      setTotal(Number(metaTotal) || rows.length);
      if (opts.page) setPage(opts.page);
    } catch (e) {
      const code = e?.response?.status;
      // If unauthorized (401/403), ignore silently for non-admins
      if (code !== 401 && code !== 403) {
        const msg =
          e?.response?.data?.message ||
          (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
          e?.message || "Erreur lors du chargement.";
        toast({ title: "Liste", description: msg, variant: "destructive" });
      }
      setItems([]);
      setTotal(0);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // --------------------------- Delete one (admin) ---------------------------
  const deleteItem = async (id) => {
    if (!isAdmin || !id) return;
    const ok = window.confirm("Supprimer cette notification ?");
    if (!ok) return;

    const prev = items;
    setItems((cur) => cur.filter((n) => n.id !== id));
    setTotal((t) => Math.max(0, t - 1));

    try {
      await NotificationApi.destroy?.(id);
      toast({ title: "Supprimée", description: "Notification supprimée." });
    } catch (e) {
      setItems(prev);
      setTotal(prev.length);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
        e?.message || "Suppression impossible.";
      toast({ title: "Échec", description: msg, variant: "destructive" });
    }
  };

  // --------------------------- Submit (send) ---------------------------
  const onSubmit = async (values) => {
    const normalized = {
      audience: values.audience,
      title: values.title,
      message: values.message,
      degree_id: values.degree_id ? Number(values.degree_id) : undefined,
      user_id: values.user_id ? Number(values.user_id) : undefined,
      user_ids: Array.isArray(values.user_ids)
        ? values.user_ids.map((v) => Number(v))
        : undefined,
    };

    try {
      setSubmitting(true);
      await NotificationApi.broadcast(normalized);
      toast({ title: "Envoyée", description: "Notification diffusée avec succès." });
      form.reset({ audience: "all_students", title: "", message: "", degree_id: undefined, user_id: undefined, user_ids: [] });

      if (isAdmin) fetchList({ page: 1 });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
        e?.message || "Erreur lors de l’envoi.";
      toast({ title: "Échec", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------- Render ---------------------------
  return (
    <div className="space-y-6">
      {/* === Send form === */}
      <Card className="shadow">
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-3">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => form.setValue("audience", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Choisir l’audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_students">Tous les élèves</SelectItem>
                <SelectItem value="all_teachers">Tous les enseignants</SelectItem>
                <SelectItem value="all_parents">Tous les parents</SelectItem>
                <SelectItem value="degree_students">Élèves d’un niveau</SelectItem>
                <SelectItem value="user">Un utilisateur</SelectItem>
                <SelectItem value="users">Utilisateurs multiples</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audience === "degree_students" && (
            <div className="grid gap-2">
              <Label>Niveau</Label>
              <Select onValueChange={(v) => form.setValue("degree_id", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(degrees) ? degrees : []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.title || d.name || `Niveau #${d.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.degree_id && (
                <span className="text-xs text-red-500">{form.formState.errors.degree_id.message}</span>
              )}
            </div>
          )}

          {audience === "user" && (
            <div className="grid gap-2">
              <Label>Utilisateur</Label>
              <Select onValueChange={(v) => form.setValue("user_id", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(users) ? users : []).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {(u.firstname || u.first_name || u.name) ?? ""} {(u.lastname || u.last_name) ?? ""} — {u.role ?? u.roles?.[0]?.name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.user_id && (
                <span className="text-xs text-red-500">{form.formState.errors.user_id.message}</span>
              )}
            </div>
          )}

          {audience === "users" && (
            <div className="grid gap-2">
              <Label>Utilisateurs (multiple)</Label>
              <div className="max-h-56 overflow-auto border rounded p-2">
                {(Array.isArray(users) ? users : []).map((u) => (
                  <label key={u.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        const set = new Set(form.getValues("user_ids") || []);
                        if (e.target.checked) set.add(String(u.id));
                        else set.delete(String(u.id));
                        form.setValue("user_ids", Array.from(set), { shouldValidate: true });
                      }}
                    />
                    <span>
                      {(u.firstname || u.first_name || u.name) ?? ""} {(u.lastname || u.last_name) ?? ""} — {u.role ?? u.roles?.[0]?.name ?? ""}
                    </span>
                  </label>
                ))}
              </div>
              {form.formState.errors.user_ids && (
                <span className="text-xs text-red-500">{form.formState.errors.user_ids.message}</span>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Titre</Label>
            <Input {...form.register("title")} placeholder="Titre court" />
            {form.formState.errors.title && (
              <span className="text-xs text-red-500">{form.formState.errors.title.message}</span>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea rows={6} {...form.register("message")} placeholder="Votre annonce…" />
            {form.formState.errors.message && (
              <span className="text-xs text-red-500">{form.formState.errors.message.message}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button disabled={submitting} onClick={form.handleSubmit(onSubmit)}>
              {submitting ? "Envoi…" : "Envoyer"}
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => fetchList({ page: 1 })} disabled={loadingList}>
                {loadingList ? "Chargement…" : "Actualiser la liste"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* === Notifications list (admin only) === */}
      {isAdmin && (
        <Card className="shadow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Notifications ({total})</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => fetchList({ page: 1 })} disabled={loadingList}>
                  {loadingList ? "…" : "Rafraîchir"}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left border-b">
                  <tr className="[&>th]:py-2 [&>th]:px-2">
                    <th>ID</th>
                    <th>Titre</th>
                    <th>Audience</th>
                    <th>Niveau / Cible</th>
                    <th>Créée</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(items || []).length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {loadingList ? "Chargement…" : "Aucune notification"}
                    </td></tr>
                  )}
                  {(items || []).map((n) => (
                    <tr key={n.id} className="border-b align-top hover:bg-muted/30">
                      <td className="py-2 px-2">{n.id}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                      </td>
                      <td className="py-2 px-2">{audienceLabel(n.audience)}</td>
                      <td className="py-2 px-2">
                        {n.degree?.name || n.degree_name || (n.degree_id ? `#${n.degree_id}` : "")}
                        {Array.isArray(n.user_ids) && n.user_ids?.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {n.user_ids.length} utilisateur(s)
                          </div>
                        )}
                        {n.user_id && (
                          <div className="text-xs text-muted-foreground">
                            utilisateur #{n.user_id}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">{fmt(n.created_at)}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => deleteItem(n.id)}>
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
