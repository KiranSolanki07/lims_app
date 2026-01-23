import React from "react";

interface HolidaysSvgProps {
  className?: string;
}

const HolidaysSvg: React.FC<HolidaysSvgProps> = ({ className = "" }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"
        fill="currentColor"
      />
      <circle cx="12" cy="14" r="2" fill="currentColor" />
    </svg>
  );
};

export default HolidaysSvg;
