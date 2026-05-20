import React from "react";

export default function StatusBadge({ value, type = "status" }) {
  const cls = `badge badge-${value?.replace(" ", "_")}`;
  return <span className={cls}>{value}</span>;
}
