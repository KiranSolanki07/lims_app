import EmployeeLayout from "./employee/EmployeeLayout";

type Props = {
  profile: {
    first_name?: string;
    last_name?: string;
  };
};

export default function EmployeeDashboard({ profile }: Props) {
  return (
    <EmployeeLayout />
  );
}