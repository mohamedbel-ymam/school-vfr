import { useEffect, useState } from "react";
import { getAdminStudentContacts } from "../../../services/adminStudentContactsService";

export default function AdminStudentContactsPage() {
  const [degrees, setDegrees] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedDegreeId, setSelectedDegreeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminStudentContacts();
      setDegrees(data.degrees || []);
      setStudents(data.students || []);
      setSelectedDegreeId(data.selected_degree_id || null);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les degrés.");
    } finally {
      setLoading(false);
    }
  };

  const handleDegreeClick = async (degree) => {
    try {
      setStudentsLoading(true);
      setError("");
      setSelectedDegreeId(degree.id);

      const data = await getAdminStudentContacts(degree.id);
      setStudents(data.students || []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les étudiants de ce niveau.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const selectedDegree = degrees.find((d) => d.id === selectedDegreeId);

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (error && degrees.length === 0) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contacts des étudiants</h1>
        <p className="text-sm text-gray-500">
          Sélectionnez un niveau pour afficher les étudiants correspondants.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Niveaux</h2>

        {degrees.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun niveau trouvé.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {degrees.map((degree) => {
              const isActive = selectedDegreeId === degree.id;

              return (
                <button
                  key={degree.id}
                  onClick={() => handleDegreeClick(degree)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold">{degree.name}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Voir les étudiants
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">
            {selectedDegree
              ? `Étudiants de ${selectedDegree.name}`
              : "Étudiants"}
          </h2>
          <p className="text-sm text-gray-500">
            {selectedDegree
              ? `${students.length} étudiant(s) trouvés`
              : "Choisissez un niveau pour afficher les étudiants"}
          </p>
        </div>

        {error && (
          <div className="px-5 pt-4 text-sm text-red-600">{error}</div>
        )}

        {studentsLoading ? (
          <div className="p-6">Chargement des étudiants...</div>
        ) : !selectedDegreeId ? (
          <div className="p-6 text-gray-500">
            Veuillez sélectionner un niveau.
          </div>
        ) : students.length === 0 ? (
          <div className="p-6 text-gray-500">
            Aucun étudiant trouvé pour ce niveau.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom complet</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Téléphone</th>
                  <th className="px-4 py-3 font-semibold">Niveau</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="px-4 py-3">{student.full_name || "-"}</td>
                    <td className="px-4 py-3">{student.email || "-"}</td>
                    <td className="px-4 py-3">{student.phone || "-"}</td>
                    <td className="px-4 py-3">{student.degree || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}