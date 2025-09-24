// frontend/src/components/admin/AdminUpsert.jsx
import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export default function AdminUpsertForm({

  mode = "create",          // "create" | "edit"
  initial = null,           // { id, firstname, lastname, email }
  submitting = false,
  onSubmit,                 // (values) => Promise|void
  onCancel,                 // () => void
}) {
  const [values, setValues] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",          // optional when edit
  });
const [errors, setErrors] = useState(null);

  useEffect(() => {
    if (initial && mode === "edit") {
      setValues(v => ({
        ...v,
        firstname: initial.firstname || "",
        lastname: initial.lastname || "",
        email: initial.email || "",
        password: "",
      }));
    }
  }, [initial, mode]);

  function setField(k, v) {
    setValues(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e) {
        e.preventDefault();
        setErrors(null);
        try {
            if (!values.firstname || !values.lastname || !values.email) return;
            if (mode === "create" && !values.password) return;
            await onSubmit?.(values);
        } catch (err) {
            const data = err?.response?.data;
    // Laravel renvoie { message, errors: { field: [msg] } }
            setErrors(data?.errors || { _error: [data?.message || "Erreur inconnue."] });
        }
    }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Prénom</Label>
          <Input
            value={values.firstname}
            onChange={(e) => setField("firstname", e.target.value)}
            placeholder="Ex. Amine"
            required
          />
        </div>
        <div>
          <Label>Nom</Label>
          <Input
            value={values.lastname}
            onChange={(e) => setField("lastname", e.target.value)}
            placeholder="Ex. Ben Ali"
            required
          />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="exemple@domaine.com"
          required
        />
      </div>

      {mode === "create" && (
        <div>
          <Label>Mot de passe</Label>
          <Input
            type="password"
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>
      )}

      {mode === "edit" && (
        <div>
          <Label>Nouveau mot de passe (optionnel)</Label>
          <Input
            type="password"
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="Laisser vide pour ne pas changer"
            minLength={6}
          />
        </div>
      )}
      {errors && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <ul className="list-disc ml-4">
            {Object.entries(errors).map(([k, arr], i) => (
              <li key={i}>{Array.isArray(arr) ? arr[0] : String(arr)}</li>
            ))}
          </ul>
        </div>
        )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement..." : mode === "create" ? "Créer" : "Mettre à jour"}
        </Button>
      </div>
    </form>
  );
}
