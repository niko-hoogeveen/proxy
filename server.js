require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello from AI Email Responder proxy server!");
});

// Root POST endpoint for email generation (used by the extension)
app.post("/email", async (req, res) => {
  try {
    const { emailBody, keypoints, tone, length } = req.body;

    if (!emailBody) {
      return res.status(400).json({ error: "Email body is required" });
    }

    // Construct prompt for email response
    const messages = [
      {
        role: "system",
        content: `You are an email assistant. Generate a ${tone} email response that is ${length} in length.`,
      },
      {
        role: "user",
        content: `I need to respond to this email:
${emailBody}

${keypoints ? `Make sure to address these key points: ${keypoints}` : ""}
The tone should be ${tone} and the length should be ${length}.
`,
      },
    ];

    // Determine max tokens based on length
    let max_tokens = 350;
    if (length === "short") max_tokens = 150;
    if (length === "long") max_tokens = 750;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      return res.status(openaiResponse.status).json({ error: errText });
    }

    const data = await openaiResponse.json();

    // Format the response in a way the extension expects
    res.json({
      success: true,
      response: data.choices[0].message.content.trim(),
      choices: data.choices,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Something went wrong generating the email response",
    });
  }
});

// Fix the chat endpoint (for other purposes)
app.post("/chat", async (req, res) => {
  try {
    const { messages, model = "gpt-4o-mini", temperature = 0.7 } = req.body;
    if (!messages) {
      return res.status(400).json({ error: "messages is required" });
    }
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      }
    );
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

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`AI Email Responder proxy server is running on port ${port}`);
});
