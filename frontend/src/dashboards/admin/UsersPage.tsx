import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getUsersWithProfiles, createUser, updateUser } from "../../api";


type User = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
    email: string | null;
    avatar_url: string | null;
    gender: string | null;
    dob: string | null;
    phone: string | null;
    joiningDate: string | null;
    exitDate: string | null;
    position: string | null;
    technologies: string[] | null;
};

type NewUser = {
    firstName: string;
    lastName: string;
    email: string;
    gender: string;
    dob: string;
    phone: string;
    role: string;
    joiningDate: string;
    exitDate: string;
    position: string;
    technologies: string[];

    profileImage?: File;        // NEW image (optional)
    existingAvatarUrl?: string; // EXISTING image (URL)
};



type ModalProps = {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
};

function Modal({ title, children, onClose }: ModalProps) {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">{title}</h2>

                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="mt-6">{children}</div>
            </div>
        </div>,
        document.body
    );
}

function FloatingInput({
    label,
    type = "text",
    value,
    onChange,
}: {
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const isFilled = value && value.length > 0;

    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder=" "
                className="
          peer
          w-full
          rounded-xl
          border
          border-[#4f7cff]
          px-4
          py-3
          text-sm
          outline-none
          focus:border-[#4f7cff]
          focus:ring-2
          focus:ring-[#4f7cff]
        "
            />

            <label
                className={`
          absolute
          left-3
          bg-white
          px-1
          text-sm
          text-[#4f7cff]
          pointer-events-none
          transition-all

    ${isFilled ? "-top-2 text-xs" : "top-1/2 -translate-y-1/2"}

    peer-focus:-top-2
    peer-focus:text-xs
        `}
            >
                {label}
            </label>
        </div>
    );
}




export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [activeModal, setActiveModal] = useState<{
        type: "view" | "edit" | "delete" | "add" | null;
        user: User | null;
    }>({ type: null, user: null });

    const [step, setStep] = useState<1 | 2>(1);

    const [newUser, setNewUser] = useState<NewUser>({
        firstName: "",
        lastName: "",
        email: "",
        gender: "",
        dob: "",
        phone: "",
        role: "",
        joiningDate: "",
        exitDate: "",
        position: "",
        technologies: [],
        profileImage: undefined, // 👈 THIS LINE IS REQUIRED
    });

    const emptyNewUser: NewUser = {
        firstName: "",
        lastName: "",
        email: "",
        gender: "",
        dob: "",
        phone: "",
        role: "",
        joiningDate: "",
        exitDate: "",
        position: "",
        technologies: [],
        profileImage: undefined,
        existingAvatarUrl: undefined,
    };


    const [errors, setErrors] = useState<Record<string, string>>({});


    useEffect(() => {
        getUsersWithProfiles()
            .then((data: User[]) => {
                setUsers(data);
                setLoading(false);
            })
            .catch((err: any) => {
                console.error("Error loading users:", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".dropdown-button") && !target.closest(".dropdown-menu")) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const validateStep = (currentStep: 1 | 2) => {
        const newErrors: Record<string, string> = {};

        if (currentStep === 1) {
            if (!newUser.firstName) newErrors.firstName = "First name is required";
            if (!newUser.lastName) newErrors.lastName = "Last name is required";
            if (!newUser.email) newErrors.email = "Email is required";
            if (!newUser.phone) newErrors.phone = "Phone number is required";
            if (!newUser.gender) newErrors.gender = "Gender is required";
            if (!newUser.dob) newErrors.dob = "Date of birth is required";

            // ✅ FIXED LOGIC
            if (
                activeModal.type === "add" &&
                !newUser.profileImage
            ) {
                newErrors.profileImage = "Profile image is required";
            }
        }

        if (currentStep === 2) {
            if (!newUser.role) newErrors.role = "Role is required";
            if (!newUser.position) newErrors.position = "Position is required";
            if (!newUser.joiningDate) newErrors.joiningDate = "Joining date is required";
            if (!newUser.exitDate) newErrors.exitDate = "Exit date is required";
            if (newUser.technologies.length === 0)
                newErrors.technologies = "Select at least one technology";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };



    if (loading) return <p className="text-center mt-10">Loading...</p>;

    return (
        <div className="container p-6 max-auto">
            <div className="bg-white p-4 mb-3 rounded-xl shadow flex items-center justify-between">
                <h3 className="text font-semibold">Users</h3>

                <button
                    onClick={() => {
                        setNewUser(emptyNewUser);
                        setErrors({});
                        setStep(1);
                        setActiveModal({ type: "add", user: null });
                    }}

                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-white shadow"
                    style={{ backgroundColor: "#0074ba" }}
                >
                    <span className="text-lg">＋</span>
                    Add User
                </button>
            </div>


            <div className="bg-white rounded-xl shadow p-4">
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="pb-3 font-normal">Name</th>
                                <th className="pb-3 font-normal">Role</th>
                                <th className="pb-3 font-normal w-1/3">Email</th>
                                <th className="pb-3 w-20"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className={`border-b last:border-none ${openMenuId === user.id ? "bg-gray-50" : ""}`}
                                >
                                    <td className="py-4 flex items-center gap-3">
                                        <img
                                            src={user.avatar_url || "https://i.pinimg.com/736x/50/cc/b8/50ccb8824ffab91f5660274f24660100.jpg"}
                                            className="h-12 w-12 rounded-xl"
                                        />
                                        <div>
                                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                                            <p className="text-sm text-gray-500">User ID: {user.id.slice(0, 8)}...</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
                                            {user.role || "N/A"}
                                        </span>
                                    </td>
                                    <td className="text-gray-700">{user.email}</td>
                                    <td className="relative text-center">
                                        <button
                                            onClick={(e) => {
                                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                                setMenuPosition({ top: rect.bottom + window.scrollY, left: rect.right - 144 });
                                                setOpenMenuId(openMenuId === user.id ? null : user.id);
                                            }}
                                            className={`dropdown-button p-2 rounded-full ${openMenuId === user.id ? "bg-gray-100" : "hover:bg-gray-100"}`}
                                        >
                                            ⋮
                                        </button>

                                        {openMenuId === user.id &&
                                            createPortal(
                                                <div
                                                    className="dropdown-menu absolute w-36 bg-white border rounded-lg shadow-lg z-50"
                                                    style={{ top: menuPosition.top, left: menuPosition.left }}
                                                >
                                                    <button
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                        onClick={() => {
                                                            setActiveModal({ type: "view", user });
                                                            setOpenMenuId(null);
                                                        }}
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                        onClick={() => {
                                                            setNewUser({
                                                                firstName: user.first_name || "",
                                                                lastName: user.last_name || "",
                                                                email: user.email || "",
                                                                gender: user.gender || "",
                                                                dob: user.dob || "",
                                                                phone: user.phone || "",
                                                                role: user.role || "",
                                                                joiningDate: user.joiningDate || "",
                                                                exitDate: user.exitDate || "",
                                                                position: user.position || "",
                                                                technologies: user.technologies || [],

                                                                profileImage: undefined,            // no new upload yet
                                                                existingAvatarUrl: user.avatar_url ?? undefined, // 👈 THIS IS KEY
                                                            });

                                                            setStep(1);
                                                            setErrors({});
                                                            setActiveModal({ type: "edit", user });
                                                            setOpenMenuId(null);
                                                        }}


                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                                        onClick={() => {
                                                            setActiveModal({ type: "delete", user });
                                                            setOpenMenuId(null);
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>,
                                                document.body
                                            )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {activeModal.type && (
                <Modal
                    title={
                        activeModal.type === "view"
                            ? "View User"
                            : activeModal.type === "edit"
                                ? "Edit User"
                                : activeModal.type === "delete"
                                    ? "Delete User"
                                    : "Add User"
                    }
                    onClose={() => {
                        setActiveModal({ type: null, user: null });
                        setNewUser(emptyNewUser);
                        setErrors({});
                        setStep(1);
                    }}

                >
                    {/* VIEW */}
                    {activeModal.type === "view" && activeModal.user && (
                        <div>
                            <p>Name: {activeModal.user.first_name} {activeModal.user.last_name}</p>
                            <p>Email: {activeModal.user.email}</p>
                            <p>Role: {activeModal.user.role}</p>
                        </div>
                    )}

                    {/* DELETE */}
                    {activeModal.type === "delete" && activeModal.user && (
                        <div>
                            <p>Are you sure you want to delete {activeModal.user.first_name}?</p>
                            <button
                                className="bg-red-600 text-white px-4 py-2 rounded mt-3"
                                onClick={() => alert("Deleted!")}
                            >
                                Delete
                            </button>
                        </div>
                    )}

                    {/* ADD */}
                    {(activeModal.type === "add" || activeModal.type === "edit") && (
                        <div className="space-y-6">

                            {/* Step indicator */}
                            <div className="flex gap-2">
                                <div className={`flex-1 h-1 rounded ${step === 1 ? "bg-[#0074ba]" : "bg-gray-200"}`} />
                                <div className={`flex-1 h-1 rounded ${step === 2 ? "bg-[#0074ba]" : "bg-gray-200"}`} />
                            </div>

                            {/* STEP 1 */}
                            {step === 1 && (
                                <div className="space-y-5">

                                    {/* Profile Image */}
                                    <div className="flex items-center gap-4">
                                        <div className="h-20 w-20 rounded-full bg-gray-100 overflow-hidden">
                                            {newUser.profileImage ? (
                                                <img
                                                    src={URL.createObjectURL(newUser.profileImage)}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : newUser.existingAvatarUrl ? (
                                                <img
                                                    src={newUser.existingAvatarUrl}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-gray-400 text-sm">Image</span>
                                            )}
                                        </div>


                                        <label className="cursor-pointer text-sm text-[#0074ba] font-medium">
                                            Upload Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    setNewUser({ ...newUser, profileImage: e.target.files?.[0] })
                                                }
                                            />
                                        </label>
                                    </div>

                                    <FloatingInput
                                        label="First Name"
                                        value={newUser.firstName}
                                        onChange={(v) => {
                                            setNewUser({ ...newUser, firstName: v });
                                            setErrors({ ...errors, firstName: "" });
                                        }}

                                    />
                                    {errors.firstName && (
                                        <p className="text-xs text-red-500">{errors.firstName}</p>
                                    )}


                                    <FloatingInput
                                        label="Last Name"
                                        value={newUser.lastName}
                                        onChange={(v) => setNewUser({ ...newUser, lastName: v })}
                                    />

                                    {/* Email with validation */}
                                    <FloatingInput
                                        label="Email Address"
                                        type="email"
                                        value={newUser.email}
                                        onChange={(v) => setNewUser({ ...newUser, email: v })}
                                    />
                                    {!/^\S+@\S+\.\S+$/.test(newUser.email) && newUser.email && (
                                        <p className="text-xs text-red-500">Invalid email address</p>
                                    )}

                                    {/* Phone – only 10 digits */}
                                    <FloatingInput
                                        label="Phone Number"
                                        value={newUser.phone}
                                        onChange={(v) => {
                                            if (/^\d{0,10}$/.test(v)) {
                                                setNewUser({ ...newUser, phone: v });
                                            }
                                        }}
                                    />

                                    {/* Gender */}
                                    <div>
                                        <p className="text-sm font-medium mb-2">Gender</p>
                                        <div className="flex gap-6">
                                            {["Male", "Female", "Other"].map((g) => (
                                                <label key={g} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="radio"
                                                        checked={newUser.gender === g}
                                                        onChange={() => setNewUser({ ...newUser, gender: g })}
                                                    />
                                                    {g}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <FloatingInput
                                        label="Date of Birth"
                                        type="date"
                                        value={newUser.dob}
                                        onChange={(v) => setNewUser({ ...newUser, dob: v })}
                                    />
                                </div>
                            )}


                            {/* STEP 2 */}
                            {step === 2 && (
                                <div className="space-y-5">

                                    {/* Role */}
                                    <div className="relative">
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full rounded-xl border px-4 py-3"
                                        >
                                            <option value="">Select Role</option>
                                            <option value="Admin">Admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Employee">Employee</option>
                                        </select>
                                    </div>

                                    {/* Position */}
                                    <div className="relative">
                                        <select
                                            value={newUser.position}
                                            onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                                            className="w-full rounded-xl border px-4 py-3"
                                        >
                                            <option value="">Select Position</option>
                                            <option value="Frontend Developer">Frontend Developer</option>
                                            <option value="Backend Developer">Backend Developer</option>
                                            <option value="Designer">Designer</option>
                                        </select>
                                    </div>

                                    <FloatingInput
                                        label="Joining Date"
                                        type="date"
                                        value={newUser.joiningDate}
                                        onChange={(v) => setNewUser({ ...newUser, joiningDate: v })}
                                    />

                                    <FloatingInput
                                        label="Exit Date"
                                        type="date"
                                        value={newUser.exitDate}
                                        onChange={(v) => setNewUser({ ...newUser, exitDate: v })}
                                    />

                                    {/* Technologies – Multiselect */}
                                    <div>
                                        <p className="text-sm font-medium mb-2">Technologies</p>
                                        <div className="flex flex-wrap gap-3">
                                            {["React", "Node", "Angular", "Vue", "Python"].map((tech) => (
                                                <label key={tech} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={newUser.technologies.includes(tech)}
                                                        onChange={(e) => {
                                                            setNewUser({
                                                                ...newUser,
                                                                technologies: e.target.checked
                                                                    ? [...newUser.technologies, tech]
                                                                    : newUser.technologies.filter((t) => t !== tech),
                                                            });
                                                        }}
                                                    />
                                                    {tech}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex justify-between pt-4">
                                {step === 2 && (
                                    <button className="px-4 py-2 rounded-lg border" onClick={() => setStep(1)}>
                                        Back
                                    </button>
                                )}

                                {step === 1 ? (
                                    <button
                                        className="ml-auto rounded-lg px-6 py-2 text-white"
                                        style={{ backgroundColor: "#0074ba" }}
                                        onClick={() => {
                                            if (validateStep(1)) {
                                                setStep(2);
                                            }
                                        }}

                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        className="ml-auto rounded-lg px-6 py-2 text-white"
                                        style={{ backgroundColor: "#0074ba" }}
                                        onClick={async () => {
                                            if (!validateStep(2)) return;

                                            try {
                                                if (activeModal.type === "add") {
                                                    await createUser(newUser);
                                                    alert("User created");
                                                } else {
                                                    await updateUser(activeModal.user!.id, newUser);
                                                    alert("User updated");
                                                }
                                                setActiveModal({ type: null, user: null });
                                                setStep(1);
                                                setErrors({});
                                            } catch (err: any) {
                                                alert(err.message);
                                            }
                                        }}


                                    >
                                        {activeModal.type === "add" ? "Create User" : "Update User"}

                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            )}

        </div>
    );
}
