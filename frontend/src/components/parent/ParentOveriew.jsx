import React from "react";

export default function ParentOverview() {
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-semibold">Parent Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome! Use the sidebar to open Settings or Events. This is your overview.
      </p>
    </div>
  );
}