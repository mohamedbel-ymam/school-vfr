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

const TEMPLATES = ["GENERAL","EXAM","MEETING","HOLIDAY","WORKSHOP","ANNOUNCEMENT","EMERGENCY"];
const MAX_IMAGE_MB = 4;

const schema = z.object({
  title: z.string().min(3, "Title is required"),
  template: z.enum(TEMPLATES),
  starts_at: z.string().min(1, "Start date/time is required"),
  ends_at: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  data: z.any().optional(),
  image: z.any().optional(),          // File | undefined
  remove_image: z.boolean().optional()
}).refine(
  (v) => !v.ends_at || !v.starts_at || v.ends_at >= v.starts_at,
  { message: "End must be after start", path: ["ends_at"] }
);

function formatDateForApi(v) {
  if (!v) return v; // keep null/undefined/empty
  // HTML datetime-local gives "YYYY-MM-DDTHH:MM"
  // Server accepts "YYYY-MM-DD HH:MM:SS"
  const withSpace = v.replace("T", " ");
  return withSpace.length === 16 ? `${withSpace}:00` : withSpace;
}

export default function EventUpsertForm({ initial, onDone }) {
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      ...initial,
      starts_at: initial.starts_at ? initial.starts_at.slice(0, 16) : "",
      ends_at: initial.ends_at ? initial.ends_at.slice(0, 16) : "",
      data: initial.data ?? {},
      remove_image: false,
    } : {
      template: "GENERAL",
      title: "",
      starts_at: "",
      ends_at: "",
      location: "",
      description: "",
      data: {},
      remove_image: false,
    }
  });

  // Better preview: react to field value and cleanup URL
  const watchedImage = form.watch("image");
  useEffect(() => {
    let url;
    const file = Array.isArray(watchedImage) ? watchedImage[0] : undefined;
    if (file instanceof File) {
      url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [watchedImage]);

  const onDropFiles = useCallback((files) => {
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
    form.setValue("image", [f], { shouldDirty: true, shouldValidate: true });
    form.clearErrors("image");
  }, [form]);

  const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const onDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    onDropFiles(e.dataTransfer.files);
  };

  const t = form.watch("template");

  const onSubmit = async (vals) => {
    const loader = toast.loading(initial?.id ? "Updating event..." : "Creating event...");
    try {
      const base = {
        title: vals.title,
        template: vals.template,
        starts_at: formatDateForApi(vals.starts_at),
        ends_at: vals.ends_at ? formatDateForApi(vals.ends_at) : null,
        location: vals.location || null,
        description: vals.description || null,
        data: templateSpecificData(vals.template, vals),
        remove_image: !!vals.remove_image,
      };

      const hasNewImage = Array.isArray(vals.image) && vals.image[0] instanceof File;

      if (hasNewImage || base.remove_image) {
        // multipart — let axios/browser set the Content-Type (do NOT set it manually)
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => {
          if (k === "data") {
            fd.append("data", JSON.stringify(v ?? {}));
          } else if (v !== null && v !== undefined) {
            fd.append(k, String(v));
          }
        });
        if (hasNewImage) fd.append("image", vals.image[0]);

        if (initial?.id) {
          await AdminEventApi.update(initial.id, fd);
        } else {
          await AdminEventApi.create(fd);
        }
      } else {
        // JSON
        if (initial?.id) {
          await AdminEventApi.update(initial.id, base);
        } else {
          await AdminEventApi.create(base);
        }
      }

      toast.success("Saved!");
      onDone && onDone();
    } catch (e) {
      // Map backend validation errors to fields if any
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
    // Scrollable shell + sticky footer so Save is always reachable
    <div className="flex flex-col max-h-[85vh]">
      <form
        className="flex-1 overflow-y-auto space-y-6 pr-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
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
              {TEMPLATES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {form.formState.errors.template && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.template.message}</p>
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
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
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
              accept="image/*"
              className="hidden"
              onChange={(e) => onDropFiles(e.target.files)}
            />
          </div>

          {/* Current or new preview */}
          <div className="flex items-center gap-3">
            {(preview || initial?.image_url) && (
              <img
                src={preview || initial?.image_url}
                alt="event"
                className="h-20 w-32 object-cover rounded border"
              />
            )}
            {initial?.image_url && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("remove_image")} />
                Remove current image
              </label>
            )}
          </div>
        </div>

        {/* Template-specific fields */}
        <TemplateFields template={t} register={form.register} />
      </form>

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 mt-4 -mx-3 px-3 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-end gap-2">
          <Button type="submit" form={form.formId || undefined} onClick={form.handleSubmit(onSubmit)}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function templateSpecificData(template, values) {
  const d = values?.data ?? {};
  switch (template) {
    case "EXAM":
      return {
        subject: (d.subject ?? "").trim() || null,
        degree: (d.degree ?? "").trim() || null,
        room: (d.room ?? "").trim() || null,
      };
    case "MEETING":
      return {
        attendees: (d.attendees ?? "").trim() || null,
        meet_url: (d.meet_url ?? "").trim() || null,
      };
    case "HOLIDAY": {
      const raw = String(d.all_day ?? "true");
      const allDay = raw === "true" || raw === "1" || raw === "yes";
      return { all_day: allDay, region: (d.region ?? "").trim() || null };
    }
    case "WORKSHOP":
      return {
        speaker: (d.speaker ?? "").trim() || null,
        capacity: Number.isFinite(Number(d.capacity)) ? Number(d.capacity) : null,
      };
    case "ANNOUNCEMENT":
      return {
        severity: ["info","warning","critical"].includes(d.severity) ? d.severity : "info",
        cta_text: (d.cta_text ?? "").trim() || null,
        cta_url: (d.cta_url ?? "").trim() || null,
      };
    case "EMERGENCY":
      return {
        severity: ["high","medium","low"].includes(d.severity) ? d.severity : "high",
        instructions: (d.instructions ?? "").trim() || null,
      };
    default:
      return {};
  }
}

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
