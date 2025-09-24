import { useEffect, useState } from "react";
import DocumentApi from "../../services/api/DocumentApi";
import { Card, CardContent } from "../ui/card";

export default function StudentDocuments(){
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      const res = await DocumentApi.listStudent();
      setList(res.data?.data?.data ?? res.data?.data ?? []);
      setLoading(false);
    })();
  },[]);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Documents de votre niveau</h2>
        {loading ? "Chargement…" : (
          <div className="space-y-3">
            {list.length === 0 && <div className="text-sm text-muted-foreground">Aucun document.</div>}
            {list.map(d => (
              <div key={d.id} className="rounded-lg border p-3">
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-muted-foreground">
                  {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""} · {d.filesize_human}
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
