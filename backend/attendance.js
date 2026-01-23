import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   GET ATTENDANCE RECORDS
========================= */
router.get("/", async (req, res) => {
  try {
    const { employeeId, date } = req.query;

    console.log("GET /api/attendance - Query params:", { employeeId, date });

    let query = supabase
      .from("attendance")
      .select("*")
      .order("date", { ascending: false });

    if (employeeId) {
      console.log("Filtering by employeeId:", employeeId);
      query = query.eq("employee_id", employeeId);
    }

    if (date) {
      console.log("Filtering by date:", date);
      query = query.eq("date", date);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    console.log("Successfully fetched attendance records:", data?.length || 0, "records");
    res.json(data || []);
  } catch (err) {
    console.error("GET ATTENDANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET EMPLOYEE TODAY'S STATUS
========================= */
router.get("/today/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle();

    if (error) throw error;

    res.json(data || null);
  } catch (err) {
    console.error("GET TODAY STATUS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CHECK-IN
========================= */
router.post("/check-in", async (req, res) => {
  try {
    const { employeeId, taskDescription } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toISOString().split("T")[1].slice(0, 8); // HH:MM:SS

    // Get employee info
    const { data: profileData } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", employeeId)
      .maybeSingle();

    const employeeName = profileData
      ? `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim()
      : "Unknown";

    // Get auth email
    const { data: authData } = await supabase.auth.admin.getUserById(employeeId);
    const employeeEmail = authData?.user?.email || "";

    // Check if already checked in today
    const { data: existingRecord } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle();

    if (existingRecord) {
      return res.status(400).json({
        error: "Already checked in today. Please check out first.",
      });
    }

    // Create attendance record
    const { data, error } = await supabase
      .from("attendance")
      .insert({
        employee_id: employeeId,
        employee_name: employeeName,
        employee_email: employeeEmail,
        date: today,
        check_in_time: currentTime,
        check_out_time: null,
        total_hours: null,
        task_description: taskDescription || null,
        status: "present",
        is_approved: false,
      });

    if (error) throw error;

    res.status(201).json({
      message: "Check-in successful",
      data: data,
    });
  } catch (err) {
    console.error("CHECK-IN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CHECK-OUT
========================= */
router.post("/check-out", async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toISOString().split("T")[1].slice(0, 8); // HH:MM:SS

    // Get today's attendance record
    const { data: attendanceRecord, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!attendanceRecord) {
      return res.status(400).json({
        error: "No check-in found for today. Please check in first.",
      });
    }

    if (attendanceRecord.check_out_time) {
      return res.status(400).json({
        error: "Already checked out today.",
      });
    }

    // Calculate total hours
    const checkInTime = new Date(`2000-01-01T${attendanceRecord.check_in_time}`);
    const checkOutTime = new Date(`2000-01-01T${currentTime}`);
    const totalMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
    const totalSeconds = Math.max(0, totalMilliseconds / 1000); // Ensure non-negative
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const totalHoursFormatted = `${hours}h:${minutes}m`;

    // Update attendance record
    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_out_time: currentTime,
        total_hours: totalHoursFormatted,
      })
      .eq("id", attendanceRecord.id);

    if (error) throw error;

    res.json({
      message: "Check-out successful",
      totalHours: totalHoursFormatted,
      data: data,
    });
  } catch (err) {
    console.error("CHECK-OUT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   APPROVE ATTENDANCE
========================= */
router.post("/approve/:attendanceId", async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId) {
      return res.status(400).json({ error: "Attendance ID is required" });
    }

    const { data, error } = await supabase
      .from("attendance")
      .update({ 
        is_approved: true, 
        rejection_reason: null 
      })
      .eq("id", attendanceId)
      .select();

    if (error) throw error;

    res.json({
      message: "Attendance approved successfully",
      data: data,
    });
  } catch (err) {
    console.error("APPROVE ATTENDANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   REJECT ATTENDANCE
========================= */
router.post("/reject/:attendanceId", async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { reason } = req.body;

    if (!attendanceId) {
      return res.status(400).json({ error: "Attendance ID is required" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const { data, error } = await supabase
      .from("attendance")
      .update({ 
        is_approved: false, 
        rejection_reason: reason 
      })
      .eq("id", attendanceId)
      .select();

    if (error) throw error;

    res.json({
      message: "Attendance rejected successfully",
      data: data,
    });
  } catch (err) {
    console.error("REJECT ATTENDANCE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
