import React, { useState, useEffect } from "react";
import { DataTable } from "../data-table/DataTable";
import UserApi from "../../../services/api/UserApi";
import { parentColumns } from "../../../config/columns";

export default function AdminParentList({ onEdit }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all parents on mount
  useEffect(() => {
    setLoading(true);
    UserApi.parents()
      .then(response => {
        // Payload shape: either {data: [...]}, or {data: {data: [...]}}
        let list = Array.isArray(response.data)
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

  // Handle parent delete
  const handleDelete = async id => {
    if (window.confirm("Are you sure you want to delete this parent?")) {
      try {
        await UserApi.delete(id);
        setData(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        alert("Error deleting parent: " + (err.response?.data?.message || err.message));
      }
    }
  };

  if (loading) {
    return <div className="p-4 text-center">🔄 Loading parents…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        ❌ Error loading parents: {error.message}
      </div>
    );
  }

  if (!data.length) {
    return <div className="p-4 text-gray-500">No parents found.</div>;
  }

  return (
    <div className="p-4">
      {/* Pass onEdit and handleDelete to the DataTable through columns */}
      <DataTable columns={parentColumns(onEdit, handleDelete)} data={data} />
    </div>
  );
}