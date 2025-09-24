// frontend/src/pages/admin/AdminsPage.jsx
import { useEffect, useState } from "react";
import AdminApi from "../../../services/api/AdminApi";
import ManageAdmin from "./ManageAdmin";

const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? [];

export default function AdminsPage() {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [candidates, setCandidates] = useState([]);

  async function refresh() {
    const [a, c] = await Promise.all([
      AdminApi.listAdmins({ per_page: 50 }),
      AdminApi.listCandidates({ per_page: 50 }),
    ]);
    setAdmins(unwrap(a));
    setCandidates(unwrap(c));
  }

  useEffect(() => {
    (async () => { try { await refresh(); } finally { setLoading(false); } })();
  }, []);

  return (
    <ManageAdmin
      loading={loading}
      admins={admins}
      candidates={candidates}
      onAssign={async (userId) => { await AdminApi.assign(userId); await refresh(); }}
      onRevoke={async (userId) => {
        try { await AdminApi.revoke(userId); await refresh(); }
        catch (e) { alert(e?.response?.data?.message ?? "Action impossible."); }
      }}
      onCreated={async (payload) => { await AdminApi.createAdmin(payload); await refresh(); }}
      onUpdated={async (userId, payload) => { await AdminApi.updateAdmin(userId, payload); await refresh(); }}
    />
  );
}
