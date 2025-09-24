import * as z from "zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import SubjectApi from "../../../services/api/admin/SubjectApi.js";
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
  subject_id: z.string().min(1, "Please select a subject."),
  address: z.string().min(3, "Adresse is required"),
  phone: z.string().min(3, "Téléphone is required"),
  email: z.string().email().min(2).max(50),
  password: z.string().min(8).max(30).optional(),
});

// helper: remove unwanted english duplicate(s)
function filterSubjects(list) {
  if (!Array.isArray(list)) return [];
  const UNWANTED = new Set(["physic", "physics"]);
  return list.filter(s => !UNWANTED.has(String(s?.name || "").trim().toLowerCase()));
}

export default function TeacherUpsertForm({ handleSubmit, values, onCancel }) {
  const isUpdate = Boolean(values?.id);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  useEffect(() => {
    setSubjectsLoading(true);
    SubjectApi.list()
      .then((res) => {
        const raw = res?.data?.data || [];
        setSubjects(filterSubjects(raw));
      })
      .catch(() => setSubjects([]))
      .finally(() => setSubjectsLoading(false));
  }, []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstname: values?.firstname || "",
      lastname: values?.lastname || "",
      date_of_birth: values?.date_of_birth || "",
      gender: values?.gender || "m",
      blood_type: values?.blood_type || BLOOD_TYPES[0],
      subject_id: values?.subject_id?.toString() || "",
      address: values?.address || "",
      phone: values?.phone || "",
      email: values?.email || "",
      password: "",
      id: values?.id || undefined,
    },
  });

  useEffect(() => {
    form.reset({
      firstname: values?.firstname || "",
      lastname: values?.lastname || "",
      date_of_birth: values?.date_of_birth || "",
      gender: values?.gender || "m",
      blood_type: values?.blood_type || BLOOD_TYPES[0],
      subject_id: values?.subject_id?.toString() || "",
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
    const loader = toast.loading(isUpdate ? "Mise à jour de l’enseignant..." : "Création de l’enseignant...");
    try {
      formData.role = "teacher";
      if (isUpdate && !formData.password) delete formData.password;
      if (isUpdate) formData.id = values.id;
      formData.subject_id = parseInt(formData.subject_id, 10);

      const { status, data } = await handleSubmit(formData);
      if (status === 200 || status === 201) {
        toast.success(data?.message || "Enregistré !");
        form.reset();
        onCancel?.();
      }
    } catch (error) {
      const responseErrors = error?.response?.data?.errors;
      if (responseErrors) {
        Object.entries(responseErrors).forEach(([field, messages]) =>
          setError(field, { message: (messages || []).join(", ") })
        );
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
          <FormField control={form.control} name="firstname" render={({ field }) => (
            <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastname" render={({ field }) => (
            <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* date + gender + blood */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="date_of_birth" render={({ field }) => (
            <FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Sexe</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                  <label className="flex items-center gap-2"><RadioGroupItem value="m" /> Masculin</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="f" /> Féminin</label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="blood_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Groupe sanguin</FormLabel>
              <Select disabled={isSubmitting} onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* subject */}
        <FormField control={form.control} name="subject_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Matière</FormLabel>
            <Select disabled={subjectsLoading || isSubmitting} onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder={subjectsLoading ? "Chargement…" : "Sélectionner"}/></SelectTrigger></FormControl>
              <SelectContent>
                {subjectsLoading && <SelectItem value="loading" disabled>Chargement…</SelectItem>}
                {!subjectsLoading && subjects.length === 0 && <SelectItem value="none" disabled>Aucune matière</SelectItem>}
                {!subjectsLoading && subjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* account */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          {!isUpdate ? (
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          ) : (
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Nouveau mot de passe (optionnel)</FormLabel><FormControl><Input type="password" {...field} placeholder="Laisser vide" /></FormControl><FormMessage /></FormItem>
            )} />
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
