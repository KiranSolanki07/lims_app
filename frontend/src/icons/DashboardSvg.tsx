import React from "react";

interface DashboardSvgProps {
  active?: boolean;
  className?: string;
}

const DashboardSvg: React.FC<DashboardSvgProps> = ({ active = false, className = "" }) => {
  return !active ? (
    <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <path d="M5.5 3.25C4.25736 3.25..." fill="#323544" />
          <path d="M15 12.75C13.7574 12.75..." fill="#323544" />
          <g opacity="0.4">
            <path d="M5.5 12.75C4.25736 12.75..." fill="#323544" />
            <path d="M12.75 5.5C12.75 4.25736..." fill="#323544" />
          </g>
        </svg>
  ) : (
    <svg
          width="24"
          height="25"
          viewBox="0 0 24 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <path d="M3.25 15.5C3.25 14.2574..." fill="#323544" />
          <path d="M12.75 6C12.75 4.75736..." fill="#323544" />
          <g opacity="0.4">
            <path d="M3.25 6C3.25 4.75736..." fill="#323544" />
            <path d="M12.75 15.5C12.75 14.2574..." fill="#323544" />
          </g>
        </svg>
  );
};

export default DashboardSvg;
