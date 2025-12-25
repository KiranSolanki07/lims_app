export interface User {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "Admin" | "Employee" | "Intern" | null;
  gender: string | null;
  dob: string | null;
  phone: string | null;
  joiningDate: string | null;
  exitDate: string | null;
  position: string | null;
  technologies: string[] | null;
  avatarUrl: string | null;
}
