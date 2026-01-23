import React from "react";

interface EmployeesSvgProps {
  className?: string;
}

const EmployeesSvg: React.FC<EmployeesSvgProps> = ({ className = "" }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20c0-3.314 1.79-6 4-6s4 2.686 4 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 20c0-3.314 1.79-6 4-6s4 2.686 4 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default EmployeesSvg;
