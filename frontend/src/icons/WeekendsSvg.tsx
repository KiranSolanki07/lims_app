import React from "react";

interface WeekendsSvgProps {
  className?: string;
}

const WeekendsSvg: React.FC<WeekendsSvgProps> = ({ className = "" }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="3" y="4" width="18" height="17" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export default WeekendsSvg;
