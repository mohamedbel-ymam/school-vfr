import * as z from "zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { axiosClient } from "../../../api/axios.js";
import UserApi from "../../../services/api/UserApi.js";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "../../ui/form.js";
import { Input } from "../../ui/input.js";
import { Button } from "../../ui/button.js";
import { Loader } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.js";
import { toast } from "sonner";

const BLOOD_TYPES = ["O-","O+","A+","A-","B+","B-","AB+","AB-"];

const formSchema = z.object({
  firstname: z.string().min(2).max(50),
  lastname: z.string().min(2).max(50),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(["m","f"]),
  blood_type: z.string(),
  student_parent_id: z.string().min(1, "Please select a parent."),
  degree_id: z.string().min(1, "Please select a degree."),
  address: z.string().min(3, "Adresse is required"),
  phone: z.string().min(3, "Téléphone is required"),
  email: z.string().email().min(2).max(50),
  password: z.string().min(8).max(30).optional(),
});

export default function StudentUpsertForm({ handleSubmit, values, onCancel }) {
  const isUpdate = Boolean(values?.id);

  const [parents, setParents] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [degreesLoading, setDegreesLoading] = useState(true);

  // ---- Load parents
  useEffect(() => {
    setParentsLoading(true);
    UserApi.parents()
      .then((resp) => setParents(resp?.data?.data || []))
      .catch(() => setParents([]))
      .finally(() => setParentsLoading(false));
  }, []);

  // ---- Load canonical degrees (try /degrees then /admin/degrees)
  useEffect(() => {
    let cancelled = false;
    async function fetchDegrees() {
      setDegreesLoading(true);
      try {
        const try1 = await axiosClient.get("/admin/degrees");
        const payload1 = try1?.data?.data ?? try1?.data ?? [];
        if (!cancelled && Array.isArray(payload1) && payload1.length) {
          setDegrees(payload1);
          return;
        }
        throw new Error("empty");
      } catch {
        try {
          const try2 = await axiosClient.get("/admin/degrees", { params: { per_page: 1000 } });
          const payload2 = try2?.data?.data ?? try2?.data ?? [];
          if (!cancelled) setDegrees(Array.isArray(payload2) ? payload2 : []);
        } catch {
          if (!cancelled) setDegrees([]);
        } finally {
          if (!cancelled) setDegreesLoading(false);
        }
        return;
      } finally {
        if (!cancelled) setDegreesLoading(false);
      }
    }
    fetchDegrees();
    return () => { cancelled = true; };
  }, []);

  // Map id -> slug for sending both
  const degreeById = useMemo(() => {
    const m = new Map();
    for (const d of degrees) m.set(String(d.id), d);
    return m;
  }, [degrees]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstname: values?.firstname || "",
      lastname: values?.lastname || "",
      date_of_birth: values?.date_of_birth || "",
      gender: values?.gender || "m",
      blood_type: values?.blood_type || BLOOD_TYPES[0],
      student_parent_id: values?.student_parent_id?.toString() || "",
      degree_id: values?.degree_id?.toString() || "",
      address: values?.address || "",
      phone: values?.phone || "",
      email: values?.email || "",
      password: "",
      id: values?.id || undefined,
    },
  });

  // keep in sync when switching record
  useEffect(() => {
    form.reset({
      firstname: values?.firstname || "",
      lastname: values?.lastname || "",
      date_of_birth: values?.date_of_birth || "",
      gender: values?.gender || "m",
      blood_type: values?.blood_type || BLOOD_TYPES[0],
      student_parent_id: values?.student_parent_id?.toString() || "",
      degree_id: values?.degree_id?.toString() || "",
      address: values?.address || "",
      phone: values?.phone || "",
      email: values?.email || "",
      password: "",
      id: values?.id || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values?.id]);

  const { setError, formState: { isSubmitting } } = form;

  const onSubmit = async (formData) => {
    const loader = toast.loading(isUpdate ? "Mise à jour de l’élève..." : "Création de l’élève...");
    try {
      // Always tag role on client (backend also enforces)
      formData.role = "student";

      // Optional password handling
      if (isUpdate && !formData.password) delete formData.password;
      if (isUpdate) formData.id = values.id;

      // IDs come as strings
      const degreeIdStr = formData.degree_id;
      const parentIdStr = formData.student_parent_id;

      formData.degree_id = parseInt(degreeIdStr, 10);
      formData.student_parent_id = parseInt(parentIdStr, 10);

      // Also send degree slug for resolver (future-proof)
      const d = degreeById.get(String(degreeIdStr));
      if (d?.slug) formData.degree = d.slug;

      const { status, data } = await handleSubmit(formData);
      if (status === 200 || status === 201) {
        toast.success(data?.message || "Enregistré !");
        form.reset();
        onCancel?.();
      }
    } catch (error) {
      const responseErrors = error?.response?.data?.errors;
      if (responseErrors) {
        Object.entries(responseErrors).forEach(([field, messages]) => {
          form.setError(field, { message: (messages || []).join(", ") });
        });
      } else {
        toast.error(error?.response?.data?.message || "Unexpected error occurred.");
      }
    } finally {
      toast.dismiss(loader);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl><Input {...field} autoComplete="given-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl><Input {...field} autoComplete="family-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* dates + gender */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexe</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="m" /> Masculin
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="f" /> Féminin
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="blood_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Groupe sanguin</FormLabel>
                <Select disabled={isSubmitting} onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOOD_TYPES.map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* degree + parent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="degree_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Niveau</FormLabel>
                <Select disabled={degreesLoading || isSubmitting} onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={degreesLoading ? "Chargement…" : "Sélectionner un niveau"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {degreesLoading && <SelectItem value="loading" disabled>Chargement…</SelectItem>}
                    {!degreesLoading && degrees.length === 0 && (
                      <SelectItem value="none" disabled>Aucun niveau</SelectItem>
                    )}
                    {!degreesLoading && degrees.length > 0 && degrees.map((degree) => (
                      <SelectItem key={degree.id} value={String(degree.id)}>
                        {degree.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="student_parent_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent</FormLabel>
                <Select disabled={parentsLoading || isSubmitting} onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={parentsLoading ? "Chargement…" : "Sélectionner un parent"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parentsLoading && <SelectItem value="loading" disabled>Chargement…</SelectItem>}
                    {!parentsLoading && parents.length === 0 && (
                      <SelectItem value="none" disabled>Aucun parent</SelectItem>
                    )}
                    {!parentsLoading && parents.length > 0 && parents.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.firstname} {p.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adresse</FormLabel>
                <FormControl><Input {...field} autoComplete="street-address" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl><Input type="tel" {...field} autoComplete="tel" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* account */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} autoComplete="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isUpdate ? (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl><Input type="password" {...field} autoComplete="new-password" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe (optionnel)</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="Laisser vide pour conserver" autoComplete="new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader className="mr-2 animate-spin" />}
            {isUpdate ? "Mettre à jour" : "Créer"}
          </Button>
          {isUpdate && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
