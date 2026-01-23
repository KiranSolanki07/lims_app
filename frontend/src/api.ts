const API_URL = import.meta.env.VITE_API_URL;

export async function getUsersWithProfiles() {
  const res = await fetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();

  // Include the new is_active field in the response
  return data.map((user: any) => ({
    ...user,
    is_active: user.is_active ?? false, // Ensure default value if missing
  }));
}

function buildFormData(user: any) {
  const formData = new FormData();

  Object.entries(user).forEach(([key, value]) => {
    // ❌ Skip frontend-only fields
    if (key === "existingAvatarUrl") return;

    // ✅ Image
    if (key === "profileImage") {
      if (value) {
        // Ensure file name includes extension
        const file = value as File;
        const fileExtension = file.name.split('.').pop(); // Extract extension
        const fileName = `${file.name}-${Date.now()}.${fileExtension}`; // Append extension
        formData.append("profileImage", file, fileName);
      }
      return;
    }

    // ✅ Arrays (technologies)
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    // ✅ Skip empty values
    if (value === undefined || value === null) return;

    formData.append(key, value as string);
  });

  return formData;
}

export async function createUser(user: any) {
  const formData = buildFormData(user);

  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create user");
  }

  return res.json();
}

export async function updateUser(userId: string, user: any) {
  const formData = buildFormData(user);

  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "PUT",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update user");
  }

  return res.json();
}

export async function deleteUser(userId: string) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delete user");
  }

  return res.json();
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const res = await fetch(`${API_URL}/api/users/${userId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!res.ok) {
    throw new Error("Failed to update user status");
  }

  return res.json();
}
/* =========================
   ATTENDANCE ENDPOINTS
========================= */

export async function checkIn(employeeId: string, taskDescription?: string) {
  const res = await fetch(`${API_URL}/api/attendance/check-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeId,
      taskDescription: taskDescription || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to check in");
  }

  return res.json();
}

export async function checkOut(employeeId: string) {
  const res = await fetch(`${API_URL}/api/attendance/check-out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ employeeId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to check out");
  }

  return res.json();
}

export async function getTodayAttendance(employeeId: string) {
  const res = await fetch(`${API_URL}/api/attendance/today/${employeeId}`);

  if (!res.ok) throw new Error("Failed to fetch today's attendance");

  return res.json();
}

export async function getAttendanceRecords(employeeId?: string, date?: string) {
  let url = `${API_URL}/api/attendance`;
  const params = new URLSearchParams();

  if (employeeId) params.append("employeeId", employeeId);
  if (date) params.append("date", date);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    console.log("Fetching attendance from:", url);
    const res = await fetch(url);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch attendance records (${res.status})`
      );
    }

    const data = await res.json();
    console.log("Attendance data received:", data);
    return data;
  } catch (err) {
    console.error("Attendance fetch error:", err);
    throw err;
  }
}

export async function approveAttendance(attendanceId: string) {
  const res = await fetch(`${API_URL}/api/attendance/approve/${attendanceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to approve attendance (${res.status})`);
  }

  return res.json();
}

export async function rejectAttendance(attendanceId: string, reason: string) {
  const res = await fetch(`${API_URL}/api/attendance/reject/${attendanceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to reject attendance (${res.status})`);
  }

  return res.json();
}

// Leaves API endpoints
export async function getAllLeaves() {
  const res = await fetch(`${API_URL}/api/leaves`);
  if (!res.ok) throw new Error("Failed to fetch leaves");
  return res.json();
}

export async function getEmployeeLeaves(employeeId: string) {
  const res = await fetch(`${API_URL}/api/leaves/employee/${employeeId}`);
  if (!res.ok) throw new Error("Failed to fetch employee leaves");
  return res.json();
}

export async function submitLeave(leaveData: {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
}) {
  const res = await fetch(`${API_URL}/api/leaves/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(leaveData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to submit leave (${res.status})`);
  }

  return res.json();
}

export async function approveLeave(leaveId: string) {
  const res = await fetch(`${API_URL}/api/leaves/${leaveId}/approve`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to approve leave (${res.status})`);
  }

  return res.json();
}

export async function rejectLeave(leaveId: string, rejectionReason: string) {
  const res = await fetch(`${API_URL}/api/leaves/${leaveId}/reject`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rejection_reason: rejectionReason }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to reject leave (${res.status})`);
  }

  return res.json();
}

export async function checkLeaveStatus(employeeId: string, date: string) {
  const res = await fetch(`${API_URL}/api/leaves/check/${employeeId}/${date}`);
  if (!res.ok) throw new Error("Failed to check leave status");
  return res.json();
}