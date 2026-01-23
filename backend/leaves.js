import express from "express";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Get all leaves (admin view)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("Error fetching leaves:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get leaves for specific employee
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .eq("employee_id", employeeId)
      .order("start_date", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("Error fetching employee leaves:", err);
    res.status(500).json({ error: err.message });
  }
});

// Submit leave request
router.post("/submit", async (req, res) => {
  try {
    const {
      employee_id,
      employee_name,
      employee_email,
      start_date,
      end_date,
      leave_type,
      reason,
    } = req.body;

    // Validate required fields
    if (!employee_id || !start_date || !end_date || !leave_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert leave request
    const { data: leaveData, error: leaveError } = await supabase
      .from("leaves")
      .insert([
        {
          employee_id,
          employee_name,
          employee_email,
          start_date,
          end_date,
          leave_type,
          reason: reason || "",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (leaveError) throw leaveError;

    // Get admin email addresses
    const { data: adminUsers, error: adminError } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "Admin")
      .eq("is_active", true);

    if (adminError) {
      console.error("Error fetching admin emails:", adminError);
    }

    // Send email to admins
    if (adminUsers && adminUsers.length > 0) {
      const adminEmails = adminUsers.map((admin) => admin.email);

      try {
        await resend.emails.send({
          from: "Attendance System <onboarding@resend.dev>",
          to: adminEmails,
          subject: `New Leave Request from ${employee_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>New Leave Request</h2>
              <p><strong>Employee:</strong> ${employee_name}</p>
              <p><strong>Email:</strong> ${employee_email}</p>
              <p><strong>Leave Type:</strong> ${leave_type}</p>
              <p><strong>Start Date:</strong> ${start_date}</p>
              <p><strong>End Date:</strong> ${end_date}</p>
              <p><strong>Reason:</strong> ${reason || "N/A"}</p>
              <p style="margin-top: 20px; color: #666;">
                Please log in to the admin dashboard to review and approve/reject this leave request.
              </p>
            </div>
          `,
        });
        console.log("Leave request email sent to admins");
      } catch (emailError) {
        console.error("Error sending leave request email:", emailError);
      }
    }

    res.json({
      message: "Leave request submitted successfully",
      data: leaveData[0],
    });
  } catch (err) {
    console.error("Error submitting leave:", err);
    res.status(500).json({ error: err.message });
  }
});

// Approve leave
router.patch("/:leaveId/approve", async (req, res) => {
  try {
    const { leaveId } = req.params;

    const { data, error } = await supabase
      .from("leaves")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leaveId)
      .select();

    if (error) throw error;

    // Send approval email to employee
    if (data && data.length > 0) {
      const leave = data[0];
      try {
        await resend.emails.send({
          from: "Attendance System <onboarding@resend.dev>",
          to: [leave.employee_email],
          subject: "Your Leave Request Has Been Approved",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Leave Request Approved</h2>
              <p>Hi ${leave.employee_name},</p>
              <p>Your leave request has been approved.</p>
              <p><strong>Leave Type:</strong> ${leave.leave_type}</p>
              <p><strong>Start Date:</strong> ${leave.start_date}</p>
              <p><strong>End Date:</strong> ${leave.end_date}</p>
              <p>You will not be able to submit attendance during this period.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }
    }

    res.json({ message: "Leave approved successfully", data: data[0] });
  } catch (err) {
    console.error("Error approving leave:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reject leave
router.patch("/:leaveId/reject", async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { rejection_reason } = req.body;

    const { data, error } = await supabase
      .from("leaves")
      .update({
        status: "rejected",
        rejection_reason: rejection_reason || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leaveId)
      .select();

    if (error) throw error;

    // Send rejection email to employee
    if (data && data.length > 0) {
      const leave = data[0];
      try {
        await resend.emails.send({
          from: "Attendance System <onboarding@resend.dev>",
          to: [leave.employee_email],
          subject: "Your Leave Request Has Been Rejected",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Leave Request Rejected</h2>
              <p>Hi ${leave.employee_name},</p>
              <p>Unfortunately, your leave request has been rejected.</p>
              <p><strong>Reason:</strong> ${rejection_reason || "No reason provided"}</p>
              <p>Please contact your administrator for more information.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }
    }

    res.json({ message: "Leave rejected successfully", data: data[0] });
  } catch (err) {
    console.error("Error rejecting leave:", err);
    res.status(500).json({ error: err.message });
  }
});

// Check if employee is on leave for a specific date
router.get("/check/:employeeId/:date", async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("start_date", date)
      .gte("end_date", date);

    if (error) throw error;

    res.json({
      isOnLeave: data && data.length > 0,
      leave: data && data.length > 0 ? data[0] : null,
    });
  } catch (err) {
    console.error("Error checking leave status:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
