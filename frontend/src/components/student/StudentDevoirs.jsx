import { useEffect, useState } from "react";
import HomeworkApi from "../../services/api/HomeworkApi";
import { Card, CardContent } from "../ui/card";

export default function StudentDevoirs(){
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      const res = await HomeworkApi.listStudent();
      setList(res.data?.data?.data ?? res.data?.data ?? []);
      setLoading(false);
    })();
  },[]);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Devoirs de votre niveau</h2>
        {loading ? "Chargement…" : (
          <div className="space-y-3">
            {list.length === 0 && <div className="text-sm text-muted-foreground">Aucun devoir.</div>}
            {list.map(d => (
              <div key={d.id} className="rounded-lg border p-3">
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-muted-foreground">
                  {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""} · {d.filesize_human}
                  {d.due_at ? ` · Échéance: ${new Date(d.due_at).toLocaleString()}` : ""}
                </div>
                <a className="text-sm underline" href={d.file_url} target="_blank" rel="noreferrer">Télécharger</a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
