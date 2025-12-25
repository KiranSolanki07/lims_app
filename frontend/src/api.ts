const API_URL = import.meta.env.VITE_API_URL;

export async function getUsersWithProfiles() {
  const res = await fetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function createUser(user: any) {
  const formData = new FormData();

  Object.entries(user).forEach(([key, value]) => {
    if (key === "profileImage" && value) {
      formData.append("profileImage", value as File);
    } else if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value as string);
    }
  });

  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    body: formData, // ❗ NO content-type
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create user");
  }

  return res.json();
}

export async function updateUser(userId: string, user: any) {
  const formData = new FormData();

  Object.entries(user).forEach(([key, value]) => {
    if (key === "profileImage" && value) {
      formData.append("profileImage", value as File);
    } else if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value as string);
    }
  });

  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: "PUT",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }

  return res.json();
}
