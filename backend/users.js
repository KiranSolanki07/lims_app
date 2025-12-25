import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Multer config (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
});

/* =========================
   GET USERS
========================= */
router.get("/", async (req, res) => {
  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const { data: profiles, error: profilesError } =
      await supabase.from("profiles").select("*");

    if (profilesError) throw profilesError;

    const users = profiles.map((p) => {
      const authUser = authData.users.find((u) => u.id === p.id);

      return {
        id: p.id,
        email: authUser?.email ?? null,
        first_name: p.first_name,
        last_name: p.last_name,
        role: p.role,
        avatar_url: p.avatar_url,
        gender: p.gender,
        dob: p.dob,
        phone: p.phone,
        joiningDate: p.joining_date,
        exitDate: p.exit_date,
        position: p.position,
        technologies: p.technologies,
      };

    });

    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CREATE USER (ADMIN)
========================= */
router.post("/", upload.single("profileImage"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      gender,
      dob,
      phone,
      role,
      joiningDate,
      exitDate,
      position,
      technologies,
    } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parse technologies safely
    let techsArray = [];
    try {
      techsArray = technologies ? JSON.parse(technologies) : [];
    } catch {
      techsArray = [];
    }

    /* =========================
       1️⃣ INVITE USER (AUTH)
    ========================= */
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.VITE_APP_URL_PROD}/login`,
        data: {
          full_name: `${firstName} ${lastName}`,
          role,
        },
      });

    if (inviteError && !inviteError.message.includes("already been registered")) {
      throw inviteError;
    }

    // If user already exists, fetch their ID
    let userId;

    if (inviteData?.user?.id) {
      userId = inviteData.user.id;
    } else {
      const { data: existingUser, error: fetchError } =
        await supabase.auth.admin.getUserByEmail(email);

      if (fetchError || !existingUser?.user) {
        throw new Error("Failed to retrieve existing user");
      }

      userId = existingUser.user.id;
    }

    /* =========================
       2️⃣ UPLOAD PROFILE IMAGE
    ========================= */
    let avatarUrl = null;

    if (req.file) {
      const filePath = `avatars/${userId}-${Date.now()}`;

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

      if (uploadError) throw uploadError;

      avatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path).data.publicUrl;
    }

    /* =========================
       3️⃣ UPSERT PROFILE (SAFE)
    ========================= */
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId, // FK → auth.users.id
          first_name: firstName,
          last_name: lastName,
          role,
          gender,
          dob,
          phone,
          joining_date: joiningDate,
          exit_date: exitDate,
          position,
          technologies: techsArray,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

    if (profileError) throw profileError;

    res.status(201).json({
      message: "User created / updated & invite email sent",
      userId,
    });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   UPDATE USER (ADMIN)
========================= */
router.put("/:id", upload.single("profileImage"), async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      firstName,
      lastName,
      email,
      gender,
      dob,
      phone,
      role,
      joiningDate,
      exitDate,
      position,
      technologies,
    } = req.body;

    let techsArray = [];
    try {
      techsArray = technologies ? JSON.parse(technologies) : [];
    } catch { }

    // Update auth email (optional)
    if (email) {
      await supabase.auth.admin.updateUserById(userId, { email });
    }

    let avatarUrl;
    if (req.file) {
      const path = `avatars/${userId}-${Date.now()}`;
      const { data } = await supabase.storage
        .from("avatars")
        .upload(path, req.file.buffer, { upsert: true });

      avatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        gender,
        dob,
        phone,
        role,
        joining_date: joiningDate,
        exit_date: exitDate,
        position,
        technologies: techsArray,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      })
      .eq("id", userId);

    if (error) throw error;

    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
