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
        is_active: p.is_active, // Include the new column
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
       1️⃣ CREATE USER WITH DEFAULT PASSWORD
    ========================= */
    const DEFAULT_PASSWORD = "MBT@123";
    let userId;
    let userCreated = false;

    // Check if user already exists
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error("Failed to check existing users: " + listError.message);
    }

    const existingUser = allUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // User already exists
      userId = existingUser.id;
    } else {
      // Create new user with default password
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: DEFAULT_PASSWORD,
        email_confirm: false, // Don't auto-confirm yet
        user_metadata: {
          full_name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          role,
        },
      });

      if (createError) {
        throw createError;
      }

      userId = createData.user.id;
      userCreated = true;

      console.log("User created successfully with ID:", userId);
      console.log("Confirmation email will be sent by Supabase automatically");
    }

    /* =========================
       2️⃣ UPLOAD PROFILE IMAGE
    ========================= */
    let avatarUrl = null;

    if (req.file) {
      const fileExtension = req.file.originalname.split('.').pop(); // Extract file extension
      const filePath = `Profile_Images/${userId}-${Date.now()}.${fileExtension}`; // Include folder path and extension

      console.log("Uploading file:", filePath); // Log file name
      console.log("Original file name:", req.file.originalname); // Log original file name
      console.log("File extension:", fileExtension); // Log file extension

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

      if (uploadError) {
        console.error("Upload Error:", uploadError); // Log upload error
        throw uploadError;
      }

      console.log("Upload Data:", uploadData); // Log upload data

      avatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath).data.publicUrl; // Use filePath directly

      console.log("Uploaded file URL:", avatarUrl); // Log public URL
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
      message: userCreated 
        ? "User created successfully. Confirmation email sent with login credentials (Email & Password: MBT@123)"
        : "User already exists. Profile updated.",
      userId,
      loginCredentials: {
        email: email,
        password: "MBT@123"
      }
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
      existingAvatarUrl,
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
      // New image uploaded
      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      const filePath = `Profile_Images/${userId}-${Date.now()}.${fileExtension}`;
      
      console.log("UPDATE: Uploading file:", filePath);
      console.log("UPDATE: Original file name:", req.file.originalname);
      console.log("UPDATE: File extension:", fileExtension);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, req.file.buffer, { 
          contentType: req.file.mimetype,
          upsert: true 
        });

      if (uploadError) {
        console.error("UPDATE: Upload Error:", uploadError);
        throw uploadError;
      }

      console.log("UPDATE: Upload Data:", uploadData);

      avatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath).data.publicUrl;
      
      console.log("UPDATE: Uploaded file URL:", avatarUrl);
    } else if (existingAvatarUrl) {
      // Keep existing image if no new one uploaded
      avatarUrl = existingAvatarUrl;
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

/* =========================
   UPDATE USER STATUS (ADMIN)
========================= */
router.patch("/:id/status", async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ error: "Missing is_active field" });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active })
      .eq("id", userId);

    if (error) throw error;

    res.json({ message: "User status updated successfully" });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   DELETE USER (ADMIN)
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete from profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) throw profileError;

    // Delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) throw authError;

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
