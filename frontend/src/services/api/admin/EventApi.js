import { axiosClient, ensureCsrf } from "../../../api/axios";

function toFormData(values) {
  const fd = new FormData();
  // Plain scalars
  fd.append("title", values.title);
  fd.append("template", values.template);
  fd.append("starts_at", values.starts_at);
  if (values.ends_at) fd.append("ends_at", values.ends_at);
  if (values.location) fd.append("location", values.location);
  if (values.description) fd.append("description", values.description);

  // data object -> JSON string (backend accepts string or array)
  const dataPayload = values.data ?? {};
  fd.append("data", JSON.stringify(dataPayload));

  // file
  if (values.image && values.image[0]) {
    fd.append("image", values.image[0]); // FileList -> File
  }
  // remove flag
  if (values.remove_image) {
    fd.append("remove_image", values.remove_image ? "1" : "0");
  }
  return fd;
}

export const AdminEventApi = {
  list(params = {}) {
    return axiosClient.get("/admin/evenements", { params }).then(r => r.data);
  },

  create(values) {
    const fd = toFormData(values);
    return ensureCsrf()
      .then(() => axiosClient.post("/admin/evenements", fd))
      .then(r => r.data);
  },

  update(id, values) {
    const fd = toFormData(values);
    // Use POST + _method override to be Laravel-friendly with multipart
    fd.append("_method", "PUT");
    return ensureCsrf()
      .then(() => axiosClient.post(`/admin/evenements/${id}`, fd))
      .then(r => r.data);
  },

  remove(id) {
    return ensureCsrf()
      .then(() => axiosClient.delete(`/admin/evenements/${id}`))
      .then(r => r.data);
  },

  show(id) {
    return axiosClient.get(`/admin/evenements/${id}`).then(r => r.data);
  }
};

export default AdminEventApi;
