import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AccountApi from "../../services/api/AccountApi.js";
import StudentAvatarApi from "../../services/api/Student/StudentAvatarApi.js";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import { Card, CardContent } from "../../components/ui/card.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../../components/ui/form.tsx";
import { useToast } from "../../components/ui/use-toast.js";

// ------------------- Password schema -------------------
const schema = z
  .object({
    current_password: z.string().min(1, "Le mot de passe actuel est requis"),
    password: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
    password_confirmation: z.string().min(1, "Veuillez confirmer votre nouveau mot de passe"),
  })
  .refine((vals) => vals.password === vals.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  });

// ------------------- Avatar helpers -------------------
// function badgeForAvatarStatus(status) {
//   switch (status) {
//     case "approved":
//       return { text: "Validée ✅", cls: "border-green-300 bg-green-50 text-green-800" };
//     case "pending":
//       return { text: "En attente de validation ⏳", cls: "border-amber-300 bg-amber-50 text-amber-800" };
//     case "rejected":
//       return { text: "Refusée ❌ (vous pouvez renvoyer une photo)", cls: "border-red-300 bg-red-50 text-red-800" };
//     default:
//       return { text: "Aucune photo", cls: "border-slate-200 bg-slate-50 text-slate-700" };
//   }
// }

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ------------------- banners -------------------
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ------------------- Avatar state -------------------
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState("none");
  const [avatarUrl, setAvatarUrl] = useState(null);          // approved
  const [avatarPendingUrl, setAvatarPendingUrl] = useState(null); // pending
  const [selectedFile, setSelectedFile] = useState(null);
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);

  // cleanup preview URL
  // useEffect(() => {
  //   return () => {
  //     if (previewUrl) URL.revokeObjectURL(previewUrl);
  //   };
  // }, [previewUrl]);

  // const loadAvatarStatus = async () => {
  //   // only for students (optional guard)
  //   if (user?.role !== "student") return;

  //   setAvatarLoading(true);
  //   try {
  //     const res = await StudentAvatarApi.status();
  //     const d = res?.data?.data ?? {};
  //     setAvatarStatus(d.status ?? "none");
  //     setAvatarUrl(d.avatar_url ?? null);
  //     setAvatarPendingUrl(d.avatar_pending_url ?? null);
  //   } catch (e) {
  //     // silent but log
  //     console.error(e);
  //   } finally {
  //     setAvatarLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   loadAvatarStatus();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [user?.id]);

  // const onUploadAvatar = async () => {
  //   if (!selectedFile) return;

  //   setSavedMsg("");
  //   setErrorMsg("");
  //   setAvatarLoading(true);

  //   try {
  //     const res = await StudentAvatarApi.upload(selectedFile);
  //     const msg = res?.data?.message || "Photo envoyée. En attente de validation.";
  //     setSavedMsg(msg);
  //     toast({ title: msg });
  //     setSelectedFile(null);
  //     await loadAvatarStatus();
  //     setTimeout(() => setSavedMsg(""), 3000);
  //   } catch (err) {
  //     const status = err?.response?.status;
  //     const data = err?.response?.data;

  //     if (status === 422) {
  //       const msg =
  //         data?.message ||
  //         (data?.errors?.avatar?.[0] ?? "Fichier invalide. Utilisez JPG/PNG/WEBP (max 4MB).");
  //       setErrorMsg(msg);
  //       toast({ title: "Erreur", description: msg });
  //     } else {
  //       const msg = data?.message || "Impossible d’envoyer la photo.";
  //       setErrorMsg(msg);
  //       toast({ title: "Erreur", description: msg });
  //     }
  //   } finally {
  //     setAvatarLoading(false);
  //   }
  // };

  // ------------------- Password form -------------------
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    setSavedMsg("");
    setErrorMsg("");

    try {
      const res = await AccountApi.changePassword(values);
      const msg = res?.data?.message || "Mot de passe mis à jour ✅";
      setSavedMsg(msg);
      toast({ title: msg });
      form.reset();
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 422 && data?.errors) {
        Object.entries(data.errors).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : String(messages);
          form.setError(field, { message });
        });
        setErrorMsg("Veuillez corriger les champs en rouge.");
        toast({ title: "Erreur de validation", description: "Vérifiez vos saisies." });
      } else {
        const msg = data?.message || "Impossible de changer le mot de passe";
        setErrorMsg(msg);
        toast({ title: "Erreur", description: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // const badge = badgeForAvatarStatus(avatarStatus);

  // Decide which image to show:
  // priority: preview > pending > approved > placeholder
  // const shownImg = previewUrl || avatarPendingUrl || avatarUrl || null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Paramètres du compte</h1>

      {/* Inline success / error banners */}
      {savedMsg ? (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {savedMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMsg}
        </div>
      ) : null}

      {/* ---------------- Avatar (Student only) ---------------- */}
      {/* Instructions photo (visible uniquement pour les élèves) */}
{/* {user?.role === "student" && (
  <div className="mt-4 rounded-2xl border bg-slate-50/70 p-4 text-sm leading-relaxed">
    <p className="font-semibold">📸 Photo de profil — règles de validation</p>

    <p className="mt-2 text-muted-foreground">
      Pour que votre photo soit <span className="font-medium text-foreground">approuvée par l’administration</span>,
      veuillez respecter ces consignes. Une fois envoyée, la photo restera{" "}
      <span className="font-medium text-foreground">en attente de validation</span>.  
      Si elle est refusée, vous pourrez en envoyer une nouvelle.
    </p>

    <ul className="mt-3 space-y-1 text-muted-foreground list-disc pl-5">
      <li>
        Photo <span className="font-medium text-foreground">récente</span>, nette, bien éclairée, visage visible.
      </li>
      <li>
        <span className="font-medium text-foreground">Une seule personne</span> sur la photo (vous uniquement).
      </li>
      <li>
        <span className="font-medium text-foreground">Sans filtres</span> excessifs, sans lunettes qui cachent le visage,
        sans masque.
      </li>
      <li>
        Fond neutre de préférence, tenue correcte (photo de type “identité” recommandée).
      </li>
      <li>
        Formats acceptés : <span className="font-medium text-foreground">JPG / PNG / WEBP</span> — taille max :{" "}
        <span className="font-medium text-foreground">4 Mo</span>.
      </li>
    </ul>

    <p className="mt-3 text-xs text-muted-foreground">
      ✅ Après validation, votre photo apparaîtra partout dans l’application (tableaux, listes, cartes). <br />
      🔁 Toute modification ultérieure devra aussi être revalidée par l’administration.
    </p>
  </div>
)}

      {user?.role === "student" && (
        <Card className="rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Photo de profil</div>
                <div className="text-sm text-muted-foreground">
                  Envoyez une photo (selfie). Elle sera validée par l’administration.
                </div>
              </div>

              <div className={`text-xs px-2 py-1 rounded-md border ${badge.cls}`}>
                {badge.text}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl border overflow-hidden bg-slate-50 grid place-items-center">
                {shownImg ? (
                  <img src={shownImg} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-xs text-muted-foreground">Aucune</div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Label>Choisir une image</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  disabled={avatarLoading}
                />
                <div className="text-xs text-muted-foreground">
                  Formats: JPG/PNG/WEBP — max 4MB.
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={onUploadAvatar}
              disabled={avatarLoading || !selectedFile}
              className="w-full"
            >
              {avatarLoading ? "Envoi…" : "Envoyer la photo"}
            </Button>
          </CardContent>
        </Card>
      )} */}

      {/* ---------------- Password ---------------- */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Utilisateur</Label>
                <div className="text-sm text-muted-foreground">
                  {user?.firstname} {user?.lastname} ({user?.role})
                </div>
              </div>

              <FormField
                name="current_password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="password_confirmation"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
