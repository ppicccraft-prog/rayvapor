const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

const genaiImport = `import { GoogleGenAI } from "@google/genai";\n`;

const chatRoute = `
  app.post("/api/chat", express.json({limit: '50mb'}), async (req, res) => {
    try {
      const { messages, contextData } = req.body;
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: \`You are an intelligent data analyst AI assistant for this business dashboard application. 
The user is viewing their internal dashboard. 
Here is a summary of the current data from the dashboard:\\n\\n\${JSON.stringify(contextData)}\\n\\n
Please use this context to answer the user's questions intelligently. 
Be concise, professional, and helpful. Do not output raw JSON, but summarize the insights in natural language.\`,
        }
      });

      // To maintain conversation history, we could reconstruct the chat history, 
      // but the simplest way with @google/genai is to just pass the last message if the frontend handles history,
      // or we can manually rebuild the history. 
      // Let's manually rebuild history for the chat object.
      // Wait, @google/genai doesn't easily support setting history after creation in a simple way without a specific format, 
      // let's pass all previous messages as contents if we use generateContent, but with ai.chats.create we can pass history.
      
      // We will use generateContent to make it stateless and easier to handle the whole array
      const contents = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: \`You are an intelligent data analyst AI assistant for this business dashboard application. 
The user is viewing their internal dashboard. 
Here is a summary of the current data from the dashboard:\\n\\n\${JSON.stringify(contextData).substring(0, 50000)}\\n\\n
Please use this context to answer the user's questions intelligently. 
Be concise, professional, and helpful. Do not output raw JSON, but summarize the insights in natural language.\`,
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Error in chat api:", error);
      res.status(500).json({ error: "Failed to generate chat response" });
    }
  });
`;

if (!code.includes("@google/genai")) {
  code = code.replace('import express from "express";', 'import express from "express";\n' + genaiImport);
}

if (!code.includes("/api/chat")) {
  code = code.replace('if (process.env.NODE_ENV !== "production")', chatRoute + '\n  if (process.env.NODE_ENV !== "production")');
}

fs.writeFileSync("server.ts", code);
