// src/components/Admin/Pages/SendNotification.jsx
import { useEffect, useState } from "react";
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

export default function SendNotification() {
  const { toast } = useToast();
  const [degrees, setDegrees] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { audience: "all_students", title: "", message: "" }
  });

  useEffect(() => {
    // Unwrap safely: API may return { data: [...] } or [...]
    DegreeApi.all()
      .then(({ data }) => setDegrees(data?.data || data || []))
      .catch(() => setDegrees([]));
    UserApi.all()
      .then(({ data }) => setUsers(data?.data || data || []))
      .catch(() => setUsers([]));
  }, []);

  const audience = form.watch("audience");

  // Reset dependent fields when audience changes
  useEffect(() => {
    if (audience !== "degree_students") form.setValue("degree_id", undefined);
    if (audience !== "user") form.setValue("user_id", undefined);
    if (audience !== "users") form.setValue("user_ids", []);
  }, [audience]); // eslint-disable-line

  const onSubmit = async (values) => {
    // Keep audience in the payload and cast IDs to numbers
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
      await NotificationApi.broadcast(normalized); // Controller accepts flat body or { payload: ... }
      toast({ title: "Envoyée", description: "Notification diffusée avec succès." });
      form.reset({ audience: "all_students", title: "", message: "", degree_id: undefined, user_id: undefined, user_ids: [] });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors de l’envoi.";
      toast({ title: "Échec", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
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
                      {u.firstname} {u.lastname} — {u.role}
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
                    <span>{u.firstname} {u.lastname} — {u.role}</span>
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

          <Button disabled={submitting} onClick={form.handleSubmit(onSubmit)}>
            {submitting ? "Envoi…" : "Envoyer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
