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
app.post("/", async (req, res) => {
  try {
    const persona = "professional and helpful";
    const { emailBody, keypoints, tone, length, persona } = req.body;

    if (!emailBody) {
      return res.status(400).json({ error: "Email body is required" });
    }

    // Construct prompt for email response
    const formattedKeypoints = keypoints
    ? `- ${keypoints.split('\n').join('\n- ')}`
    : 'N/A';
    const messages = [
      {
        role: "system",
        content: `You are an AI assistant specializing in crafting high-quality email responses. Your persona should be ${persona}.`,
      },
      {
        role: "user",
        content: `
## TASK
Your task is to generate a complete email response based on the provided original email and instructions.

## INSTRUCTIONS

### 1. Analyze the Incoming Email
- **Original Email:**
\`\`\`
${emailBody}
\`\`\`

### 2. Core Requirements
- **Key Points to Address:**
  ${formattedKeypoints}
- **Tone:** ${tone}
- **Length:** ${length}

### 3. Composition Guidelines
- **Subject Line:** Do not include a subject line.
- **Body Content:**
    - Directly and clearly address the original email and all the specified key points.
    - Maintain the specified tone throughout the response.
    - Adhere to the specified length. 'Concise' means a few sentences to a short paragraph. 'Medium' is a few paragraphs. 'Detailed' can be longer.
    - Structure the email for readability using paragraphs and bullet points if appropriate.
- **Closing:** Include a professional closing, using the name for the sender as ${senderName}.

## OUTPUT FORMAT
Provide only the complete email response, starting after the subject line. Do not include any other explanatory text.

---

### EXAMPLE

**INPUT:**
- \`emailBody\`: "Hi, I'm interested in your product. Can you tell me more about the pricing and features? Thanks, Alex"
- \`keypoints\`: "Mention the three pricing tiers (Basic, Pro, Enterprise).\\nHighlight the key features of the Pro plan."
- \`tone\`: "Friendly and informative"
- \`length\`: "Medium"
- \`persona\`: "a sales representative"
- \`senderName\`: "Jane at Acme Corp"

**CORRECT OUTPUT:**
Hi Alex,

Thanks for reaching out! I'm happy to tell you more about our product.

We have three pricing tiers to fit different needs:
*   **Basic:** Great for individuals and small teams getting started.
*   **Pro:** Our most popular plan, perfect for growing businesses.
*   **Enterprise:** For large organizations requiring advanced security and support.

The Pro plan is a great choice for many businesses as it includes advanced analytics, priority support, and enhanced team collaboration tools.

You can find a full feature comparison on our pricing page here: [Link to Pricing Page]

Let me know if you have any other questions!

Best regards,

Jane at Acme Corp
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
