// pages/TeacherAttendanceDegrees.jsx
import { useNavigate } from "react-router-dom";
import { useLoaderData } from "react-router-dom";


export default function TeacherAttendanceDegrees() {
  const navigate = useNavigate();
  const degrees = useLoaderData();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Choisir une classe</h1>

      <div className="grid grid-cols-2 gap-3">
        {degrees.map((d) => (
          <button
            key={d.id}
            className="rounded-2xl border p-4 text-left active:scale-[0.99]"
            onClick={() => navigate(`/enseinant/attendance/${d.id}`)}
          >
            <div className="text-sm opacity-70">Classe</div>
            <div className="text-lg font-semibold">{d.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
