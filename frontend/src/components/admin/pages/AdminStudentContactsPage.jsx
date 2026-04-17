import { useEffect, useMemo, useState } from "react";
import { getAdminStudentContacts } from "../../../services/adminStudentContactsService";

export default function AdminStudentContactsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAdminStudentContacts();
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les contacts des étudiants.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;

    return students.filter((student) =>
      [
        student.full_name,
        student.email,
        student.phone,
        student.degree,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [students, search]);

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts des étudiants</h1>
          <p className="text-sm text-gray-500">
            Consultation rapide des informations administratives.
          </p>
        </div>

        <input
          type="text"
          placeholder="Rechercher nom, email, téléphone, niveau..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border px-4 py-2 md:w-96"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Nom complet</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Téléphone</th>
              <th className="px-4 py-3 font-semibold">Niveau</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                  Aucun résultat.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="border-t">
                  <td className="px-4 py-3">{student.full_name || "-"}</td>
                  <td className="px-4 py-3">{student.email || "-"}</td>
                  <td className="px-4 py-3">{student.phone || "-"}</td>
                  <td className="px-4 py-3">{student.degree || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}