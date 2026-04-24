import express from 'express';
const router = express.Router();

// 🔑 LOGIN ROUTE
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // simple test login
    if (email === "admin@test.com" && password === "123456") {
        return res.json({
            token: "mysecrettoken123"
        });
    }

    return res.status(401).json({ error: "Invalid credentials" });
});

export default router;
