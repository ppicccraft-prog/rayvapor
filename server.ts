import express from "express";
import { GoogleGenAI } from "@google/genai";

import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to proxy Google Sheets data (CSV)
  app.get("/api/sheets", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=140773285&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Transfer Antar Toko
  app.get("/api/transfer_toko", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=2019501247&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching transfer sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Bundling
  app.get("/api/bundling", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=943305088&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching bundling sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Diskon
  app.get("/api/diskon", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1280142997&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching diskon sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Forecast
  app.get("/api/forecast", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=745261167&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching forecast sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for BI Liquid per Toko
  app.get("/api/bi_liquid", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=555632840&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching bi liquid sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Analisa SKU
  app.get("/api/analisa-sku", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1925692475&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching analisa sku sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Pembelian
  app.get("/api/pembelian", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1331215353&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching pembelian sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Penjualan
  app.get("/api/penjualan", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1914323905&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching penjualan sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Parameter
  app.get("/api/parameter", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=101084867&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching parameter sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Dead Stock
  app.get("/api/dead_stock", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=507917823&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching dead stock sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // API Route for Scorecard Bulanan
  app.get("/api/scorecard_bulanan", async (req, res) => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=949856094&_=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Sheets");
      }
      const data = await response.text();
      res.setHeader("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      console.error("Error fetching scorecard bulanan sheets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Vite middleware for development
  
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
      
      const contents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: `You are an intelligent data analyst AI assistant for this business dashboard application. 
The user is viewing their internal dashboard. 
Here is a summary of the current data from the dashboard:\n\n${JSON.stringify(contextData).substring(0, 50000)}\n\n
Please use this context to answer the user's questions intelligently. 
Be concise, professional, and helpful. Do not output raw JSON, but summarize the insights in natural language.`,
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Error in chat api:", error);
      res.status(500).json({ error: "Failed to generate chat response" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
