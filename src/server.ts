import express from "express";
import cors from "cors";
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from "dotenv";
import { User } from "./types/user";
import { createClient } from "./config/supabase";

const supabase = createClient(
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_URL
);

dotenv.config();

interface QueryRequest extends express.Request {
  body: {
    query: string;
  };
}

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    res.json({ message: "registration successful!", user: data.user });
  } catch (error) {
    res.status(400).json({ error });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    res.json({ token: data.session.access_token });
  } catch (error) {
    res.status(400).json({ error });
  }
});

app.get("/", (req: QueryRequest, res: express.Response) => {
  res.json({ message: "Hello, world!" });
});

app.get("/api/users", async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query<User>(
      "SELECT * FROM users ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get(
  "/api/users/:id",
  async (req: express.Request, res: express.Response) => {
    try {
      const result = await pool.query<User>(
        "SELECT * FROM users WHERE id = $1",
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Query error:", err);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
