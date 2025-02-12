require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello from Pepe Cupid proxy server!");
});

app.post("/chat", async (req, res) => {
    try {
        const { messages, model = "gpt-4o-mini", temperature = 0.7 } = req.body;
        if (messages) {
            return res.status(400).json({ error: "messages is required" });
        }
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
            }),
        });
        if (!openaiResponse.ok) {
            const errText = await openaiResponse.text();
            return res.status(openaiResponse.status).json({ error: errText });
        }

        const data = await openaiResponse.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong calling OpenAI" });
    }
});

// 3) Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Pepe Cupid proxy server is running on port ${port}`);
});