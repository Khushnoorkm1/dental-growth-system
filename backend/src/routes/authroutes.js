import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // simple check (abhi ke liye)
  if (email === "admin@test.com" && password === "123456") {
    
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

export default router;
