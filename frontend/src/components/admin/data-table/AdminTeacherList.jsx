import React, { useState, useEffect } from 'react';
import { DataTable } from '../data-table/DataTable';
import UserApi from '../../../services/api/UserApi';
import { teacherColumns } from '../../../config/columns';

export default function AdminTeacherList({ onEdit }) {
  const [data, setData] = useState([]); // always start as array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this enseignant?")) {
      try {
        await UserApi.delete(id);
        setData(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        alert("Error deleting enseignant: " + (err.response?.data?.message || err.message));
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    UserApi.teachers()
      .then(response => {
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.data)
            ? response.data.data
            : [];
        setData(list);
      })
      .catch(err => {
        console.error(err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 text-center">🔄 Loading teachers…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        ❌ Error loading teachers: {error.message}
      </div>
    );
  }

  if (!data.length) {
    return <div className="p-4 text-gray-500">No teachers found.</div>;
  }

  return (
    <div className="p-4">
      <DataTable columns={teacherColumns(onEdit, handleDelete)} data={data} />
    </div>
  );
}
