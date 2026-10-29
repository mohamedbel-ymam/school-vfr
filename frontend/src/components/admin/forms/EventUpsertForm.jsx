// src/components/admin/forms/EventUpsertForm.jsx
import * as z from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminEventApi } from "../../../services/api/admin/EventApi";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { toast } from "sonner";
import { X } from "lucide-react";
import { resolveMediaUrl } from "../../../api/axios";

const TEMPLATES = [
  "GENERAL",
  "EXAM",
  "MEETING",
  "HOLIDAY",
  "WORKSHOP",
  "ANNOUNCEMENT",
  "EMERGENCY",
];
const MAX_IMAGE_MB = 4;

const schema = z.object({
  title: z.string().min(3, "Title is required"),
  template: z.enum(TEMPLATES),
  starts_at: z.string().min(1, "Start date/time is required"),
  ends_at: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  data: z.any().optional(),
  image: z.any().optional(), // File | FileList | undefined
  remove_image: z.boolean().optional(),
}).refine(
  (v) => !v.ends_at || !v.starts_at || v.ends_at >= v.starts_at,
  { message: "End must be after start", path: ["ends_at"] }
);

export default function EventUpsertForm({ initial, onDone }) {
  const [preview, setPreview] = useState(null); // blob preview for newly picked file
  const [showExisting, setShowExisting] = useState(!!initial?.image_url); // toggle for existing image
  const fileInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          ...initial,
          // ensure datetime-local compatible values (slice to yyyy-mm-ddThh:mm)
          starts_at: initial.starts_at ? String(initial.starts_at).slice(0, 16) : "",
          ends_at: initial.ends_at ? String(initial.ends_at).slice(0, 16) : "",
          data: initial.data ?? {},
          remove_image: false,
          image: undefined,
        }
      : {
          template: "GENERAL",
          title: "",
          starts_at: "",
          ends_at: "",
          location: "",
          description: "",
          data: {},
          remove_image: false,
          image: undefined,
        },
  });

  // Watchers
  const watchedImage = form.watch("image");
  const removeExisting = form.watch("remove_image");

  // Build preview when a new file is chosen
  useEffect(() => {
    let url;
    const file =
      (Array.isArray(watchedImage) && watchedImage[0]) ||
      (watchedImage instanceof File ? watchedImage : undefined);
    if (file instanceof File) {
      url = URL.createObjectURL(file);
      setPreview(url);
      // if we show a new preview, we don't show the existing one
      setShowExisting(false);
      // uncheck remove_image when picking a new file
      if (removeExisting) form.setValue("remove_image", false, { shouldDirty: true });
    } else {
      // no new file selected
      setPreview(null);
      // if there was an existing image and not removed, keep showing it
      if (initial?.image_url && !removeExisting) setShowExisting(true);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedImage, removeExisting]);

  const onDropFiles = useCallback(
    (files) => {
      if (!files?.length) return;
      const f = files[0];
      if (!f.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast.error(`Max ${MAX_IMAGE_MB}MB`);
        return;
      }
      // Accept File or wrap in FileList-like array for compatibility with previous code
      form.setValue("image", f, { shouldDirty: true, shouldValidate: true });
      form.clearErrors("image");
    },
    [form]
  );

  // DnD
  const [dragActive, setDragActive] = useState(false);
  const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const onDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    onDropFiles(e.dataTransfer.files);
  };

  // Click X on preview:
  const removeNewImage = () => {
    form.setValue("image", undefined, { shouldDirty: true });
    setPreview(null);
    // If there is an existing image on the record and we removed the new one,
    // decide whether to show the existing again:
    if (initial?.image_url && !form.getValues("remove_image")) {
      setShowExisting(true);
    }
  };

  // Click X on existing image (before saving): mark to remove
  const removeExistingImage = () => {
    form.setValue("remove_image", true, { shouldDirty: true });
    setShowExisting(false);
  };

  // Undo removing the existing image
  const undoRemoveExistingImage = () => {
    form.setValue("remove_image", false, { shouldDirty: true });
    setShowExisting(true);
  };

  const onSubmit = async (vals) => {
    const loader = toast.loading(initial?.id ? "Updating event..." : "Creating event...");
    try {
      // Build values for API. We pass raw form values; AdminEventApi will:
      // - coerce template to UPPERCASE enum
      // - format dates into "YYYY-MM-DDTHH:MM"
      // - build multipart with the "image" if present
      const payload = {
        title: vals.title,
        template: vals.template,
        starts_at: vals.starts_at,
        ends_at: vals.ends_at || "",
        location: vals.location || "",
        description: vals.description || "",
        data: vals.data || {},
        remove_image: !!vals.remove_image,
        image: vals.image, // can be File or undefined; AdminEventApi handles it
      };

      if (initial?.id) {
        await AdminEventApi.update(initial.id, payload);
      } else {
        await AdminEventApi.create(payload);
      }

      toast.success("Saved!");
      onDone && onDone();
    } catch (e) {
      const errors = e?.response?.data?.errors;
      if (errors && typeof errors === "object") {
        Object.entries(errors).forEach(([field, msgs]) => {
          form.setError(field, { message: Array.isArray(msgs) ? msgs.join(", ") : String(msgs) });
        });
      }
      toast.error(e?.response?.data?.message || "Failed to save the event.");
    } finally {
      toast.dismiss(loader);
    }
  };

  return (
    <div className="flex flex-col max-h-[85vh]">
      <form className="flex-1 overflow-y-auto space-y-6 pr-2" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <Label>Title</Label>
            <Input
              {...form.register("title")}
              placeholder="e.g. Midterm Exam"
              aria-invalid={!!form.formState.errors.title}
            />
            {form.formState.errors.title && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Template */}
          <div>
            <Label>Template</Label>
            <select
              className="w-full border rounded h-9 px-2"
              {...form.register("template")}
              aria-invalid={!!form.formState.errors.template}
            >
              {TEMPLATES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {form.formState.errors.template && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.template.message}
              </p>
            )}
          </div>

          {/* Starts */}
          <div>
            <Label>Starts at</Label>
            <Input
              type="datetime-local"
              {...form.register("starts_at")}
              aria-invalid={!!form.formState.errors.starts_at}
            />
            {form.formState.errors.starts_at && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.starts_at.message}</p>
            )}
          </div>

          {/* Ends */}
          <div>
            <Label>Ends at</Label>
            <Input
              type="datetime-local"
              {...form.register("ends_at")}
              aria-invalid={!!form.formState.errors.ends_at}
            />
            {form.formState.errors.ends_at && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.ends_at.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <Label>Location</Label>
            <Input {...form.register("location")} placeholder="Room A1, online link…" />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} {...form.register("description")} placeholder="Details, instructions, etc." />
          </div>
        </div>

        {/* Image uploader */}
        <div className="space-y-2">
          <Label>Cover image</Label>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDrop={onDrop}
            className={[
              "rounded-xl border border-dashed p-4 flex items-center justify-center text-sm cursor-pointer transition",
              dragActive ? "bg-muted/60" : "bg-muted/30",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="font-medium">Drag & drop an image here, or click to choose</div>
              <div className="text-muted-foreground">PNG, JPG, JPEG — max {MAX_IMAGE_MB}MB</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,.avif"
              className="hidden"
              onChange={(e) => onDropFiles(e.target.files)}
            />
          </div>

          {/* Preview container with X remove */}
          {(preview || (showExisting && initial?.image_url)) && (
            <div className="relative inline-block">
              <img
                src={preview || resolveMediaUrl(initial.image_url)}
                alt="event"
                className="h-28 w-48 object-cover rounded-lg border"
              />
              <button
                type="button"
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"
                title="Remove image"
                onClick={() => {
                  if (preview) {
                    // removing a newly picked file
                    removeNewImage();
                  } else {
                    // removing existing image on the record
                    removeExistingImage();
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Undo remove existing */}
          {!showExisting && initial?.image_url && form.getValues("remove_image") && (
            <div className="pt-1">
              <Button type="button" size="sm" variant="outline" onClick={undoRemoveExistingImage}>
                Undo remove image
              </Button>
            </div>
          )}
        </div>

        {/* Template-specific extras */}
        <TemplateFields template={form.watch("template")} register={form.register} />
      </form>

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 mt-4 -mx-3 px-3 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-end gap-2">
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- template-specific extras ---------------- */

function TemplateFields({ template, register }) {
  switch (template) {
    case "EXAM":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Subject</Label><Input {...register("data.subject")} placeholder="Math" /></div>
          <div><Label>Degree</Label><Input {...register("data.degree")} placeholder="1er année Bac (SE)" /></div>
          <div><Label>Room</Label><Input {...register("data.room")} placeholder="B-12" /></div>
        </div>
      );
    case "MEETING":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Attendees</Label><Input {...register("data.attendees")} placeholder="Enseignants, parents, …" /></div>
          <div><Label>Meet link</Label><Input type="url" {...register("data.meet_url")} placeholder="https://…" /></div>
        </div>
      );
    case "HOLIDAY":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>All-day</Label>
            <select className="w-full border rounded h-9 px-2" {...register("data.all_day")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div><Label>Region</Label><Input {...register("data.region")} placeholder="All school / City" /></div>
        </div>
      );
    case "WORKSHOP":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Speaker</Label><Input {...register("data.speaker")} placeholder="Nom" /></div>
          <div><Label>Capacity</Label><Input type="number" {...register("data.capacity", { valueAsNumber: true })} placeholder="30" /></div>
        </div>
      );
    case "ANNOUNCEMENT":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Severity</Label>
            <select className="w-full border rounded h-9 px-2" {...register("data.severity")}>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <div><Label>CTA Text</Label><Input {...register("data.cta_text")} placeholder="Open details" /></div>
          <div><Label>CTA URL</Label><Input type="url" {...register("data.cta_url")} placeholder="https://…" /></div>
        </div>
      );
    case "EMERGENCY":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Severity</Label>
            <select className="w-full border rounded h-9 px-2" {...register("data.severity")}>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <div><Label>Instructions</Label><Input {...register("data.instructions")} placeholder="Evacuate via…" /></div>
        </div>
      );
    default:
      return null;
  }
}
