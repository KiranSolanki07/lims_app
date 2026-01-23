import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Select from "react-select";
import { getUsersWithProfiles, createUser, updateUser, deleteUser, updateUserStatus } from "../../api";
import FunnelSvg from "../../icons/FunnelSvg";


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
    is_active: boolean; // Added new field
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
    error,
}: {
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
}) {
    const isFilled = value && value.length > 0;

    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder=" "
                className={`
          peer
          w-full
          rounded-xl
          border
          px-4
          py-3
          text-sm
          outline-none
          transition-all
          ${error 
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200" 
            : "border-[#4f7cff] focus:border-[#4f7cff] focus:ring-2 focus:ring-[#4f7cff]"
          }
        `}
            />

            <label
                className={`
          absolute
          left-3
          bg-white
          px-1
          text-sm
          pointer-events-none
          transition-all
          ${error ? "text-red-500" : "text-[#4f7cff]"}
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

// Custom Date Picker Component
function DatePickerInput({
    label,
    value,
    onChange,
    error,
    maxDate,
    showCalendar,
    setShowCalendar,
}: {
    label: string;
    value: string;
    onChange: (date: string) => void;
    error?: string;
    maxDate?: Date;
    showCalendar: string | null;
    setShowCalendar: (id: string | null) => void;
}) {
    const pickerId = `datepicker-${label.replace(/\s+/g, '-').toLowerCase()}`;
    const isOpen = showCalendar === pickerId;
    const [calendarMonth, setCalendarMonth] = useState(value ? new Date(value) : new Date());

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const handleSelectDate = (day: number) => {
        const selected = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
        const formattedDate = selected.toISOString().split('T')[0];
        onChange(formattedDate);
        setShowCalendar(null);
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="relative" data-picker-id={pickerId}>
            <label className="text-sm font-medium block mb-2">{label}</label>
            <div className="flex gap-2">
                <div className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none transition-all flex items-center ${
                    error ? "border-red-500" : "border-[#4f7cff]"
                } bg-gray-50`}>
                    {value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : <span className="text-gray-400">Select date</span>}
                </div>
                <button
                    type="button"
                    onClick={() => setShowCalendar(isOpen ? null : pickerId)}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                        error ? "border-red-500" : "border-[#4f7cff]"
                    } hover:bg-gray-50 font-bold text-lg`}
                >
                    📅
                </button>
            </div>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCalendar(null)}>
                    <div 
                        className="bg-white rounded-2xl shadow-2xl p-6 w-80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                                className="px-3 py-1 rounded-lg hover:bg-gray-100 text-2xl"
                            >
                                ‹
                            </button>
                            <div className="flex gap-2">
                                <select
                                    value={calendarMonth.getMonth()}
                                    onChange={(e) => setCalendarMonth(new Date(calendarMonth.getFullYear(), parseInt(e.target.value)))}
                                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:outline-none"
                                >
                                    {monthNames.map((month, idx) => (
                                        <option key={idx} value={idx}>{month}</option>
                                    ))}
                                </select>
                                <select
                                    value={calendarMonth.getFullYear()}
                                    onChange={(e) => setCalendarMonth(new Date(parseInt(e.target.value), calendarMonth.getMonth()))}
                                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:outline-none"
                                >
                                    {Array.from({ length: new Date().getFullYear() - 1950 + 11 }, (_, i) => 1950 + i).map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                                className="px-3 py-1 rounded-lg hover:bg-gray-100 text-2xl"
                            >
                                ›
                            </button>
                        </div>

                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map((day) => (
                                <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => {
                                const isSelected = day && value === `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isDisabled = day && maxDate && new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) > maxDate;
                                
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => day && !isDisabled && handleSelectDate(day)}
                                        disabled={!day || !!isDisabled}
                                        className={`
                                            aspect-square rounded-lg font-medium text-sm transition-all
                                            ${!day || isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}
                                            ${isSelected ? 'bg-[#0074ba] text-white font-bold hover:bg-[#005a94]' : ''}
                                        `}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Today Button */}
                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    const formattedDate = today.toISOString().split('T')[0];
                                    onChange(formattedDate);
                                    setCalendarMonth(today);
                                    setShowCalendar(null);
                                }}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [showCalendar, setShowCalendar] = useState<string | null>(null);
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
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

    // Function to reload users from API
    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsersWithProfiles();
            setUsers(data);
        } catch (err: any) {
            console.error("Error loading users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Filter users based on search and status
    const filteredUsers = users.filter((user) => {
        const matchesSearch = 
            (user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
        
        const matchesStatus = statusFilter === null || user.is_active === statusFilter;
        const matchesRole = roleFilter === null || user.role === roleFilter;
        
        return matchesSearch && matchesStatus && matchesRole;
    });

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
            // First Name validation
            if (!newUser.firstName.trim()) {
                newErrors.firstName = "First name is required";
            } else if (newUser.firstName.length < 2) {
                newErrors.firstName = "First name must be at least 2 characters";
            } else if (!/^[a-zA-Z\s]+$/.test(newUser.firstName)) {
                newErrors.firstName = "First name can only contain letters";
            }

            // Last Name validation
            if (!newUser.lastName.trim()) {
                newErrors.lastName = "Last name is required";
            } else if (newUser.lastName.length < 2) {
                newErrors.lastName = "Last name must be at least 2 characters";
            } else if (!/^[a-zA-Z\s]+$/.test(newUser.lastName)) {
                newErrors.lastName = "Last name can only contain letters";
            }

            // Email validation
            if (!newUser.email.trim()) {
                newErrors.email = "Email is required";
            } else if (!/^\S+@\S+\.\S+$/.test(newUser.email)) {
                newErrors.email = "Please enter a valid email address";
            } else if (newUser.email.length > 100) {
                newErrors.email = "Email is too long";
            }

            // Phone validation
            if (!newUser.phone.trim()) {
                newErrors.phone = "Phone number is required";
            } else if (!/^\d{10}$/.test(newUser.phone)) {
                newErrors.phone = "Phone number must be exactly 10 digits";
            }

            // Gender validation
            if (!newUser.gender) {
                newErrors.gender = "Gender is required";
            }

            // Date of Birth validation
            if (!newUser.dob) {
                newErrors.dob = "Date of birth is required";
            } else {
                const dob = new Date(newUser.dob);
                const today = new Date();
                const age = today.getFullYear() - dob.getFullYear();
                if (age < 18) {
                    newErrors.dob = "Must be at least 18 years old";
                }
                if (dob > today) {
                    newErrors.dob = "Date of birth cannot be in the future";
                }
            }

            // Profile Image validation for new users
            if (
                activeModal.type === "add" &&
                !newUser.profileImage &&
                !newUser.existingAvatarUrl
            ) {
                newErrors.profileImage = "Profile image is required";
            }
        }

        if (currentStep === 2) {
            // Role validation
            if (!newUser.role.trim()) {
                newErrors.role = "Role is required";
            }

            // Position validation
            if (!newUser.position.trim()) {
                newErrors.position = "Position is required";
            }

            // Joining Date validation
            if (!newUser.joiningDate) {
                newErrors.joiningDate = "Joining date is required";
            } else {
                const joiningDate = new Date(newUser.joiningDate);
                const today = new Date();
                if (joiningDate > today) {
                    newErrors.joiningDate = "Joining date cannot be in the future";
                }
            }

            // Exit Date validation
            if (newUser.exitDate) {
                const exitDate = new Date(newUser.exitDate);
                const joiningDate = new Date(newUser.joiningDate);
                if (exitDate <= joiningDate) {
                    newErrors.exitDate = "Exit date must be after joining date";
                }
            }

            // Technologies validation
            if (newUser.technologies.length === 0) {
                newErrors.technologies = "Select at least one technology";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };



    if (loading) return <p className="text-center mt-10">Loading...</p>;

    return (
        <div className="container p-6 max-auto">
            <div className="bg-white p-4 mb-3 rounded-xl shadow flex items-center justify-between">
                <h3 className="text font-semibold">Users</h3>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`flex items-center justify-center rounded-lg p-2 shadow border transition-colors ${
                            showFilter 
                                ? "bg-blue-50 border-blue-300 text-blue-600" 
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                        title="Filter users"
                    >
                        <FunnelSvg className={showFilter ? "text-blue-600" : "text-gray-600"} />
                    </button>

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
            </div>

            {showFilter && (
                <div className="bg-white p-4 mb-3 rounded-xl shadow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <Select
                                options={[
                                    { value: null, label: "All Status" },
                                    { value: true, label: "Active" },
                                    { value: false, label: "Inactive" },
                                ]}
                                value={
                                    statusFilter === null
                                        ? { value: null, label: "All Status" }
                                        : { value: statusFilter, label: statusFilter ? "Active" : "Inactive" }
                                }
                                onChange={(selectedOption) => {
                                    if (selectedOption) {
                                        setStatusFilter(selectedOption.value);
                                    }
                                }}
                                className="w-full"
                                menuPlacement="bottom"
                                menuShouldScrollIntoView={false}
                                isSearchable={false}
                                styles={{
                                    control: (base) => ({ 
                                        ...base, 
                                        minHeight: "40px", 
                                        height: "40px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.5rem"
                                    }),
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                }}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        <div>
                            <Select
                                options={[
                                    { value: "", label: "All Roles" },
                                    { value: "Admin", label: "Admin" },
                                    { value: "Employee", label: "Employee" },
                                    { value: "Intern", label: "Intern" },
                                ] as Array<{ value: string; label: string }>}
                                value={
                                    roleFilter === null || roleFilter === ""
                                        ? { value: "", label: "All Roles" }
                                        : { value: roleFilter, label: roleFilter }
                                }
                                onChange={(selectedOption) => {
                                    if (selectedOption) {
                                        setRoleFilter(selectedOption.value === "" ? null : selectedOption.value);
                                    }
                                }}
                                className="w-full"
                                menuPlacement="bottom"
                                menuShouldScrollIntoView={false}
                                isSearchable={false}
                                styles={{
                                    control: (base) => ({ 
                                        ...base, 
                                        minHeight: "40px", 
                                        height: "40px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.5rem"
                                    }),
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                }}
                                menuPortalTarget={document.body}
                            />
                        </div>
                    </div>
                </div>
            )}


            <div className="bg-white rounded-xl shadow p-4">
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="pb-3 font-normal">Name</th>
                                <th className="pb-3 font-normal">Role</th>
                                <th className="pb-3 font-normal w-1/3">Email</th>
                                <th className="pb-3 w-20">Status</th>
                                <th className="pb-3 w-20"></th>                                
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b last:border-none ${openMenuId === user.id ? "bg-gray-50" : ""}`}
                                    >
                                    <td className="py-4 flex items-center gap-3 w-1/3">
                                        <img
                                            src={user.avatar_url || "https://i.pinimg.com/736x/50/cc/b8/50ccb8824ffab91f5660274f24660100.jpg"}
                                            className="h-12 w-12 rounded-xl"
                                        />
                                        <div>
                                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                                            <p className="text-sm text-gray-500">User ID: {user.id.slice(0, 8)}...</p>
                                        </div>
                                    </td>
                                    <td className="w-1/8">
                                        <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
                                            {user.role || "N/A"}
                                        </span>
                                    </td>
                                    <td className="text-gray-700 w-1/6">{user.email}</td>
                                    <td className="text-gray-700 text-center w-1/6">
                                        <div className="relative">
                                            <Select
                                                options={[
                                                    { value: true, label: "Active" },
                                                    { value: false, label: "Inactive" },
                                                ]}
                                                value={{ value: user.is_active, label: user.is_active ? "Active" : "Inactive" }}
                                                onChange={async (selectedOption) => {
                                                    if (selectedOption) {
                                                        try {
                                                            await updateUserStatus(user.id, selectedOption.value);
                                                            // Update local state only
                                                            setUsers(users.map(u => 
                                                                u.id === user.id ? { ...u, is_active: selectedOption.value } : u
                                                            ));
                                                        } catch (err) {
                                                            console.error("Error updating user status:", err);
                                                        }
                                                    }
                                                }}
                                                className="dropdown-button"
                                                menuPlacement="bottom"
                                                menuShouldScrollIntoView={false}
                                                isSearchable={false}
                                                styles={{
                                                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                                }}
                                                menuPortalTarget={document.body}
                                            />
                                        </div>
                                    </td>
                                    <td className="relative text-center w-1/8">
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
                            ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-6 text-gray-500">
                                        No users found matching your filters.
                                    </td>
                                </tr>
                            )}
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
                        <div className="space-y-6">
                            {/* Step indicator */}
                            <div className="flex gap-2">
                                <div className={`flex-1 h-1 rounded ${step === 1 ? "bg-[#0074ba]" : "bg-gray-200"}`} />
                                <div className={`flex-1 h-1 rounded ${step === 2 ? "bg-[#0074ba]" : "bg-gray-200"}`} />
                            </div>

                            {/* STEP 1 */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    {/* Profile Image */}
                                    <div>
                                        <div className="flex justify-center mb-6">
                                            <div className="h-32 w-32 rounded-lg bg-gray-100 overflow-hidden border-4 border-gray-200 shadow">
                                                {activeModal.user.avatar_url ? (
                                                    <img
                                                        src={activeModal.user.avatar_url}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400 text-sm flex items-center justify-center h-full">No Image</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* First Name */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">First Name</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.first_name || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Last Name */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.last_name || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            disabled
                                            value={activeModal.user.email || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Phone Number</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.phone || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Gender */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Gender</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.gender || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Date of Birth */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Date of Birth</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.dob ? new Date(activeModal.user.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 2 */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    {/* Role */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Role</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.role || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Position */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Position</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.position || ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Joining Date */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Joining Date</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.joiningDate ? new Date(activeModal.user.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ""}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Exit Date */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Exit Date</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={activeModal.user.exitDate ? new Date(activeModal.user.exitDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Technologies */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Technologies</label>
                                        <div className="flex flex-wrap gap-2">
                                            {activeModal.user.technologies && activeModal.user.technologies.length > 0 ? (
                                                activeModal.user.technologies.map((tech) => (
                                                    <span
                                                        key={tech}
                                                        className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                                                    >
                                                        {tech}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-500 text-sm">No technologies</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer - Navigation only */}
                            <div className="flex justify-between pt-4">
                                {step === 2 && (
                                    <button
                                        className="px-4 py-2 rounded-lg border"
                                        onClick={() => setStep(1)}
                                    >
                                        Back
                                    </button>
                                )}

                                {step === 1 ? (
                                    <button
                                        className="ml-auto rounded-lg px-6 py-2 text-white"
                                        style={{ backgroundColor: "#0074ba" }}
                                        onClick={() => setStep(2)}
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        className="ml-auto rounded-lg px-6 py-2 bg-gray-300 text-gray-700 cursor-not-allowed"
                                        disabled
                                    >
                                        View Only
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* DELETE */}
                    {activeModal.type === "delete" && activeModal.user && (
                        <div>
                            <p>Are you sure you want to delete {activeModal.user.first_name}?</p>
                            <div className="flex gap-3 mt-4">
                                <button
                                    className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
                                    onClick={() => setActiveModal({ type: null, user: null })}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                                    onClick={async () => {
                                        try {
                                            await deleteUser(activeModal.user!.id);
                                            alert("User deleted successfully");
                                            
                                            // Reload users list
                                            await loadUsers();
                                            
                                            setActiveModal({ type: null, user: null });
                                        } catch (err: any) {
                                            alert(err.message);
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
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
                                <div className="space-y-4">

                                    {/* Profile Image */}
                                    <div>
                                        <div className="flex items-center gap-4">
                                            <div className={`h-20 w-20 rounded-full bg-gray-100 overflow-hidden border-2 ${errors.profileImage ? "border-red-500" : "border-gray-200"}`}>
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
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                          setNewUser({ ...newUser, profileImage: file });
                                                          setErrors({ ...errors, profileImage: "" }); // Clear validation error
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {errors.profileImage && (
                                            <p className="text-xs text-red-500 mt-2">{errors.profileImage}</p>
                                        )}
                                    </div>

                                    {/* First Name */}
                                    <div>
                                        <FloatingInput
                                            label="First Name"
                                            value={newUser.firstName}
                                            error={errors.firstName}
                                            onChange={(v) => {
                                                setNewUser({ ...newUser, firstName: v });
                                                setErrors({ ...errors, firstName: "" });
                                            }}

                                        />
                                        {errors.firstName && (
                                            <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                                        )}
                                    </div>

                                    {/* Last Name */}
                                    <div>
                                        <FloatingInput
                                            label="Last Name"
                                            value={newUser.lastName}
                                            error={errors.lastName}
                                            onChange={(v) => {
                                                setNewUser({ ...newUser, lastName: v });
                                                setErrors({ ...errors, lastName: "" });
                                            }}
                                        />
                                        {errors.lastName && (
                                            <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <FloatingInput
                                            label="Email Address"
                                            type="email"
                                            value={newUser.email}
                                            error={errors.email}
                                            onChange={(v) => {
                                                setNewUser({ ...newUser, email: v });
                                                setErrors({ ...errors, email: "" });
                                            }}
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <FloatingInput
                                            label="Phone Number"
                                            value={newUser.phone}
                                            error={errors.phone}
                                            onChange={(v) => {
                                                if (/^\d{0,10}$/.test(v)) {
                                                    setNewUser({ ...newUser, phone: v });
                                                    setErrors({ ...errors, phone: "" });
                                                }
                                            }}
                                        />
                                        {errors.phone && (
                                            <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                                        )}
                                    </div>

                                    {/* Gender */}
                                    <div>
                                        <p className={`text-sm font-medium mb-2 ${errors.gender ? "text-red-500" : ""}`}>Gender</p>
                                        <div className="flex gap-6">
                                            {["Male", "Female", "Other"].map((g) => (
                                                <label key={g} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="radio"
                                                        checked={newUser.gender === g}
                                                        onChange={() => {
                                                            setNewUser({ ...newUser, gender: g });
                                                            setErrors({ ...errors, gender: "" });
                                                        }}
                                                    />
                                                    {g}
                                                </label>
                                            ))}
                                        </div>
                                        {errors.gender && (
                                            <p className="text-xs text-red-500 mt-1">{errors.gender}</p>
                                        )}
                                    </div>

                                    {/* Date of Birth */}
                                    <div>
                                        <DatePickerInput
                                            label="Date of Birth"
                                            value={newUser.dob}
                                            error={errors.dob}
                                            maxDate={new Date()}
                                            showCalendar={showCalendar}
                                            setShowCalendar={setShowCalendar}
                                            onChange={(date) => {
                                                setNewUser({ ...newUser, dob: date });
                                                setErrors({ ...errors, dob: "" });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}


                            {/* STEP 2 */}
                            {step === 2 && (
                                <div className="space-y-4">

                                    {/* Role */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Role</label>
                                        <Select
                                            options={[
                                                { value: "Admin", label: "Admin" },
                                                { value: "Manager", label: "Manager" },
                                                { value: "Employee", label: "Employee" },
                                            ]}
                                            value={newUser.role ? { value: newUser.role, label: newUser.role } : null}
                                            onChange={(option) => {
                                                setNewUser({ ...newUser, role: option?.value || "" });
                                                setErrors({ ...errors, role: "" });
                                            }}
                                            isClearable
                                            styles={{
                                                control: (base: any) => ({
                                                    ...base,
                                                    borderRadius: "0.75rem",
                                                    borderColor: errors.role ? "#ef4444" : "#d1d5db",
                                                    borderWidth: "1px",
                                                    padding: "2px",
                                                    minHeight: "42px",
                                                }),
                                                option: (base: any) => ({
                                                    ...base,
                                                    backgroundColor: "#f3f4f6",
                                                    color: "#1f2937",
                                                    cursor: "pointer",
                                                    ":hover": {
                                                        backgroundColor: "#e5e7eb",
                                                    },
                                                }),
                                            }}
                                            placeholder="Select Role"
                                        />
                                        {errors.role && (
                                            <p className="text-xs text-red-500 mt-1">{errors.role}</p>
                                        )}
                                    </div>

                                    {/* Position */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Position</label>
                                        <Select
                                            options={[
                                                { value: "Frontend Developer", label: "Frontend Developer" },
                                                { value: "Backend Developer", label: "Backend Developer" },
                                                { value: "Designer", label: "Designer" },
                                            ]}
                                            value={newUser.position ? { value: newUser.position, label: newUser.position } : null}
                                            onChange={(option) => {
                                                setNewUser({ ...newUser, position: option?.value || "" });
                                                setErrors({ ...errors, position: "" });
                                            }}
                                            isClearable
                                            styles={{
                                                control: (base: any) => ({
                                                    ...base,
                                                    borderRadius: "0.75rem",
                                                    borderColor: errors.position ? "#ef4444" : "#d1d5db",
                                                    borderWidth: "1px",
                                                    padding: "2px",
                                                    minHeight: "42px",
                                                }),
                                                option: (base: any) => ({
                                                    ...base,
                                                    backgroundColor: "#f3f4f6",
                                                    color: "#1f2937",
                                                    cursor: "pointer",
                                                    ":hover": {
                                                        backgroundColor: "#e5e7eb",
                                                    },
                                                }),
                                            }}
                                            placeholder="Select Position"
                                        />
                                        {errors.position && (
                                            <p className="text-xs text-red-500 mt-1">{errors.position}</p>
                                        )}
                                    </div>

                                    {/* Joining Date */}
                                    <div>
                                        <DatePickerInput
                                            label="Joining Date"
                                            value={newUser.joiningDate}
                                            error={errors.joiningDate}
                                            maxDate={new Date()}
                                            showCalendar={showCalendar}
                                            setShowCalendar={setShowCalendar}
                                            onChange={(date) => {
                                                setNewUser({ ...newUser, joiningDate: date });
                                                setErrors({ ...errors, joiningDate: "" });
                                            }}
                                        />
                                    </div>

                                    {/* Exit Date */}
                                    <div>
                                        <DatePickerInput
                                            label="Exit Date"
                                            value={newUser.exitDate}
                                            error={errors.exitDate}
                                            showCalendar={showCalendar}
                                            setShowCalendar={setShowCalendar}
                                            onChange={(date) => {
                                                setNewUser({ ...newUser, exitDate: date });
                                                setErrors({ ...errors, exitDate: "" });
                                            }}
                                        />
                                    </div>
                                    {/* Technologies – Multi Select Dropdown */}
                                    <div>
                                        <label className="text-sm font-medium block mb-2">Technologies</label>
                                        <Select
                                            isMulti
                                            options={[
                                                { value: "React", label: "React" },
                                                { value: "Node", label: "Node" },
                                                { value: "Angular", label: "Angular" },
                                                { value: "Vue", label: "Vue" },
                                                { value: "Python", label: "Python" },
                                                { value: "TypeScript", label: "TypeScript" },
                                                { value: "JavaScript", label: "JavaScript" },
                                                { value: "MongoDB", label: "MongoDB" },
                                                { value: "Asp.Net", label: "Asp.Net" },
                                                { value: "Bubble.io", label: "Bubble.io" },
                                            ]}
                                            value={newUser.technologies.map((tech) => ({ value: tech, label: tech }))}
                                            onChange={(selectedOptions) => {
                                                const selectedTechs = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [];
                                                setNewUser({ ...newUser, technologies: selectedTechs });
                                                setErrors({ ...errors, technologies: "" });
                                            }}
                                            styles={{
                                                control: (base: any) => ({
                                                    ...base,
                                                    borderRadius: "0.75rem",
                                                    borderColor: errors.technologies ? "#ef4444" : "#d1d5db",
                                                    borderWidth: "1px",
                                                    padding: "2px",
                                                    minHeight: "42px",
                                                }),
                                                multiValue: (base: any) => ({
                                                    ...base,
                                                    backgroundColor: "#dbeafe",
                                                    color: "#1e40af",
                                                    borderRadius: "0.5rem",
                                                }),
                                                multiValueLabel: (base: any) => ({
                                                    ...base,
                                                    color: "#1e40af",
                                                    fontWeight: "500",
                                                }),
                                                multiValueRemove: (base: any) => ({
                                                    ...base,
                                                    color: "#1e40af",
                                                    cursor: "pointer",
                                                    ":hover": {
                                                        backgroundColor: "#93c5fd",
                                                        color: "white",
                                                    },
                                                }),
                                                option: (base: any, state: any) => ({
                                                    ...base,
                                                    backgroundColor: state.isSelected ? "#0074ba" : state.isFocused ? "#e5e7eb" : "#f3f4f6",
                                                    color: state.isSelected ? "white" : "#1f2937",
                                                    cursor: "pointer",
                                                    ":active": {
                                                        backgroundColor: "#0074ba",
                                                        color: "white",
                                                    },
                                                }),
                                            }}
                                            placeholder="Select technologies..."
                                            isSearchable={false} // Disable search input
                                        />
                                        {errors.technologies && (
                                            <p className="text-xs text-red-500 mt-1">{errors.technologies}</p>
                                        )}
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
                                                    alert("User created successfully");
                                                } else {
                                                    await updateUser(activeModal.user!.id, newUser);
                                                    alert("User updated successfully");
                                                }
                                                
                                                // Reload users list
                                                await loadUsers();
                                                
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
