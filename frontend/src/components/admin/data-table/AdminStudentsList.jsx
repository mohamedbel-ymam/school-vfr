import React, { useState, useEffect } from 'react';
import { DataTable } from './DataTable';
import UserApi from '../../../services/api/UserApi';
import { studentColumns } from '../../../config/columns';

export default function AdminStudentsList({ onEdit }) {
  const [data, setData] = useState([]); // always array!
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete handler
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this élève?")) {
      try {
        await UserApi.delete(id);
        setData(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        alert("Error deleting élève: " + (err.response?.data?.message || err.message));
      }
    }
  };

  // Load students on mount
  useEffect(() => {
    setLoading(true);
    UserApi.students()
      .then(response => {
        // Handles both {data: []} or {data: {data: []}}
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
    return <div className="p-4 text-center">🔄 Loading students…</div>;
  }
  if (error) {
    return (
      <div className="p-4 text-red-600">
        ❌ Error loading students: {error.message}
      </div>
    );
  }
  if (!data.length) {
    return <div className="p-4 text-gray-500">No students found.</div>;
  }

  return (
    <div className="p-4">
      <DataTable columns={studentColumns(onEdit, handleDelete)} data={data} />
    </div>
  );
}