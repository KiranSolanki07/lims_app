import React from "react";

interface AttendanceSvgProps {
  className?: string;
}

const AttendanceSvg: React.FC<AttendanceSvgProps> = ({ className = "" }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 3v18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 13h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6h2v2H6V6z" fill="currentColor" />
      <path d="M12 6h2v2h-2V6z" fill="currentColor" />
      <path d="M18 6h2v2h-2V6z" fill="currentColor" />
    </svg>
  );
};

export default AttendanceSvg;
