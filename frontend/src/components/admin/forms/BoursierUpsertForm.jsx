import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "../../../components/ui/form";

// 🧠 Validation schema
const boursierSchema = z.object({
  firstName: z.string().min(2, "Prénom trop court"),
  lastName: z.string().min(2, "Nom trop court"),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Veuillez choisir un genre",
  }),
  finalSchoolYear: z
    .string()
    .regex(/^\d{4}$/, "Année scolaire finale invalide (ex: 2024)")
    .optional()
    .nullable(),
  phone: z.string().min(6, "Numéro de téléphone trop court").optional().nullable(),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
});

const CURRENT_YEAR = new Date().getFullYear();

/**
 * BoursierUpsertForm
 *
 * Props:
 * - initialData?: {
 *     firstName, lastName, dateOfBirth, gender,
 *     finalSchoolYear, phone, email, password
 *   }
 * - mode?: "create" | "edit"
 * - onSubmit: (payloadWithDerived) => Promise<void> | void
 * - onCancel?: () => void
 * - submitting?: boolean
 */
export default function BoursierUpsertForm({
  initialData = {},
  mode = "create",
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const form = useForm({
    resolver: zodResolver(boursierSchema),
    defaultValues: {
      firstName: initialData.firstName ?? "",
      lastName: initialData.lastName ?? "",
      dateOfBirth: initialData.dateOfBirth ?? "",
      gender: initialData.gender ?? "male",
      finalSchoolYear: initialData.finalSchoolYear
        ? String(initialData.finalSchoolYear)
        : "",
      phone: initialData.phone ?? "",
      email: initialData.email ?? "",
      password: initialData.password ?? "",
    },
  });

  const watchFinalYear = form.watch("finalSchoolYear");

  // 🔢 Auto-compute post-school years and scholarship slices (3 per year)
  const { postSchoolYears, scholarshipSlices } = useMemo(() => {
    const y = Number(watchFinalYear);
    if (!Number.isFinite(y) || y <= 0) {
      return { postSchoolYears: 0, scholarshipSlices: 0 };
    }
    const delta = Math.max(0, CURRENT_YEAR - y);
    return {
      postSchoolYears: delta,
      scholarshipSlices: delta * 3,
    };
  }, [watchFinalYear]);

  const handleSubmit = form.handleSubmit((values) => {
    // Build a clean payload for parent (API layer decides exact shape)
    const payload = {
      ...values,
      finalSchoolYear: values.finalSchoolYear ? Number(values.finalSchoolYear) : null,
      postSchoolYears,
      scholarshipSlices,
      fullName: `${values.firstName} ${values.lastName}`.trim(),
    };

    if (onSubmit) {
      return onSubmit(payload);
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Name block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Ahmed" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: El Mansouri" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date de naissance + genre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>Optionnel mais recommandé.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genre</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculin</SelectItem>
                      <SelectItem value="female">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Final school year + computed fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="finalSchoolYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Année finale au lycée</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 2024"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  L&apos;année scolaire où l&apos;élève a quitté l&apos;établissement.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Derived: post-school years */}
          <FormItem>
            <FormLabel>Années post-scolaires (calculées)</FormLabel>
            <FormControl>
              <Input
                value={postSchoolYears || ""}
                readOnly
                className="bg-muted"
              />
            </FormControl>
            <FormDescription>
              Calculé à partir de l&apos;année finale et l&apos;année courante ({CURRENT_YEAR}).
            </FormDescription>
          </FormItem>

          {/* Derived: number of scholarship slices */}
          <FormItem>
            <FormLabel>Tranches de bourse (3 / an)</FormLabel>
            <FormControl>
              <Input
                value={scholarshipSlices || ""}
                readOnly
                className="bg-muted"
              />
            </FormControl>
            <FormDescription>
              Nombre théorique de tranches de bourse depuis la fin du lycée.
            </FormDescription>
          </FormItem>
        </div>

        {/* Contact + auth */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 0612345678"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@exemple.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                <FormLabel>Mot de passe</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={mode === "edit" ? "Laisser vide pour ne pas changer" : "Min. 8 caractères"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Annuler
            </Button>
          )}

          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Enregistrement…"
              : mode === "edit"
              ? "Mettre à jour le boursier"
              : "Créer le boursier"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
