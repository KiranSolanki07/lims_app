import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import usersRoute from "./users.js";

dotenv.config();

const app = express();

app.use(cors());

app.use("/api/users", usersRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
