import React from "react";

interface FunnelSvgProps {
  className?: string;
}

const FunnelSvg: React.FC<FunnelSvgProps> = ({ className = "" }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 6h18M6 12h12M9 18h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default FunnelSvg;
