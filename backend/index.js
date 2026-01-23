import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import usersRoute from "./users.js";
import attendanceRoute from "./attendance.js";
import leavesRoute from "./leaves.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/users", usersRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/leaves", leavesRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
