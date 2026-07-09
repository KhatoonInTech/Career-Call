import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini API to avoid startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

// Pre-populate with realistic and funny CareerCall examples
const INITIAL_ENTRIES = [
  {
    id: "demo-1",
    name: "Sarah Jenkins",
    guessedCareer: "Software Engineer",
    actualCareer: "Software Engineer",
    result: "success",
    shared: true,
    timestamp: Date.now() - 3600000 * 2, // 2 hours ago
  },
  {
    id: "demo-2",
    name: "Marcus Miller",
    guessedCareer: "Accountant",
    actualCareer: "Stunt Performer",
    result: "fail",
    shared: true,
    audiobookAssigned: "The Art of the Stunt",
    audiobookAuthor: "F. A. Talbot",
    audiobookLink: "https://archive.org/details/artofstunt00talbrich",
    timestamp: Date.now() - 3600000 * 5, // 5 hours ago
  },
  {
    id: "demo-3",
    name: "Emily Chen",
    guessedCareer: "Civil Engineer",
    actualCareer: "Civil Engineer",
    result: "success",
    shared: true,
    timestamp: Date.now() - 3600000 * 12, // 12 hours ago
  },
  {
    id: "demo-4",
    name: "Liam O'Connor",
    guessedCareer: "Chef",
    actualCareer: "Blacksmith",
    result: "fail",
    shared: true,
    audiobookAssigned: "The Story of Iron and Steel",
    audiobookAuthor: "Donald Wilhelm",
    audiobookLink: "https://archive.org/details/storyofironsteel00wilhrich",
    timestamp: Date.now() - 3600000 * 24, // 1 day ago
  }
];

function mapSupabaseToLeaderboardEntry(row: any) {
  return {
    id: row.id,
    name: row.name,
    guessedCareer: row.guessed_career,
    actualCareer: row.actual_career,
    result: row.result,
    shared: !!row.shared,
    audiobookAssigned: row.audiobook_assigned,
    audiobookAuthor: row.audiobook_author,
    audiobookLink: row.audiobook_link,
    timestamp: Number(row.timestamp),
  };
}

function mapLeaderboardEntryToSupabase(entry: any) {
  return {
    id: entry.id,
    name: entry.name,
    guessed_career: entry.guessedCareer,
    actual_career: entry.actualCareer,
    result: entry.result,
    shared: !!entry.shared,
    audiobook_assigned: entry.audiobookAssigned || null,
    audiobook_author: entry.audiobookAuthor || null,
    audiobook_link: entry.audiobookLink || null,
    timestamp: entry.timestamp,
  };
}

async function seedSupabaseIfEmpty(supabase: any) {
  try {
    const { count, error } = await supabase
      .from("leaderboard_entries")
      .select("*", { count: "exact", head: true });

    if (!error && count === 0) {
      console.log("Supabase leaderboard is empty. Seeding initial mock entries...");
      const dbRows = INITIAL_ENTRIES.map(mapLeaderboardEntryToSupabase);
      const { error: insertError } = await supabase
        .from("leaderboard_entries")
        .insert(dbRows);
      
      if (insertError) {
        console.warn("Could not seed initial entries to Supabase:", insertError);
      } else {
        console.log("Successfully seeded initial entries to Supabase!");
      }
    }
  } catch (err) {
    console.error("Error checking or seeding Supabase database:", err);
  }
}

// Lazy-initialize Supabase client to avoid startup crashes if key is missing
let supabaseInstance: any = null;
let isSupabaseConfigured = false;
let hasSeeded = false;

function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (
    url && 
    anonKey && 
    url !== "https://your-supabase-project.supabase.co" && 
    anonKey !== "your-supabase-anon-key" &&
    url.trim() !== "" &&
    anonKey.trim() !== ""
  ) {
    try {
      supabaseInstance = createClient(url, anonKey);
      isSupabaseConfigured = true;
      console.log("Supabase client initialized successfully!");
      if (!hasSeeded) {
        hasSeeded = true;
        seedSupabaseIfEmpty(supabaseInstance);
      }
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
    }
  } else {
    console.log("Supabase URL/Key is not fully configured. Using local JSON leaderboard storage as fallback.");
  }
  return supabaseInstance;
}

// Persisted Leaderboard database fallback
const LEADERBOARD_FILE = path.join(process.cwd(), "leaderboard-data.json");
let leaderboardEntries: any[] = [];

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
      leaderboardEntries = JSON.parse(data);
    } else {
      leaderboardEntries = [...INITIAL_ENTRIES];
      saveLeaderboard();
    }
  } catch (err) {
    console.error("Error loading leaderboard, falling back to memory:", err);
    leaderboardEntries = [...INITIAL_ENTRIES];
  }
}

function saveLeaderboard() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboardEntries, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving leaderboard to file:", err);
  }
}

// Load initial data
loadLeaderboard();

// Static audiobooks fallback library for robust offline/no-quota scenarios
const STATIC_FALLBACKS: Record<string, { title: string; author: string; link: string }> = {
  science: {
    title: "The Time Machine",
    author: "H. G. Wells",
    link: "https://librivox.org/the-time-machine-by-h-g-wells/",
  },
  business: {
    title: "The Art of War",
    author: "Sun Tzu",
    link: "https://librivox.org/the-art-of-war-by-sun-tzu-2/",
  },
  medical: {
    title: "Experiments on Plant Hybridization",
    author: "Gregor Mendel",
    link: "https://librivox.org/experiments-in-plant-hybridization-by-gregor-mendel/",
  },
  history: {
    title: "The History of Herodotus",
    author: "Herodotus",
    link: "https://librivox.org/the-history-of-herodotus-volume-1-by-herodotus/",
  },
  philosophy: {
    title: "The Republic",
    author: "Plato",
    link: "https://librivox.org/the-republic-by-plato/",
  },
  poetry: {
    title: "The Raven and Other Poems",
    author: "Edgar Allan Poe",
    link: "https://librivox.org/the-raven-and-other-poems-by-edgar-allan-poe/",
  },
  adventure: {
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    link: "https://librivox.org/the-adventures-of-sherlock-holmes-by-sir-arthur-conan-doyle/",
  },
  "classic fiction": {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    link: "https://librivox.org/pride-and-prejudice-by-jane-austen-solo-project-3/",
  },
};

// Map career titles to genres
function getGenreKeyword(career: string): string {
  const c = career.toLowerCase();
  if (
    c.includes("engineer") ||
    c.includes("tech") ||
    c.includes("develop") ||
    c.includes("program") ||
    c.includes("science") ||
    c.includes("data") ||
    c.includes("it") ||
    c.includes("cod") ||
    c.includes("comput")
  ) {
    return "science";
  }
  if (
    c.includes("finance") ||
    c.includes("business") ||
    c.includes("market") ||
    c.includes("sales") ||
    c.includes("account") ||
    c.includes("bank") ||
    c.includes("manage") ||
    c.includes("consult") ||
    c.includes("hr") ||
    c.includes("recruit")
  ) {
    return "business";
  }
  if (
    c.includes("medic") ||
    c.includes("health") ||
    c.includes("doctor") ||
    c.includes("nurse") ||
    c.includes("dent") ||
    c.includes("therapy") ||
    c.includes("surgeon") ||
    c.includes("pharm") ||
    c.includes("clinic")
  ) {
    return "medical";
  }
  if (
    c.includes("law") ||
    c.includes("court") ||
    c.includes("legal") ||
    c.includes("attorney") ||
    c.includes("judge") ||
    c.includes("polic") ||
    c.includes("histor") ||
    c.includes("archiv")
  ) {
    return "history";
  }
  if (
    c.includes("educat") ||
    c.includes("teach") ||
    c.includes("school") ||
    c.includes("prof") ||
    c.includes("philosoph") ||
    c.includes("learn") ||
    c.includes("acad")
  ) {
    return "philosophy";
  }
  if (
    c.includes("creat") ||
    c.includes("art") ||
    c.includes("design") ||
    c.includes("writ") ||
    c.includes("music") ||
    c.includes("paint") ||
    c.includes("act") ||
    c.includes("stunt") ||
    c.includes("sing") ||
    c.includes("photo") ||
    c.includes("video") ||
    c.includes("fash")
  ) {
    return "poetry";
  }
  if (
    c.includes("trade") ||
    c.includes("manual") ||
    c.includes("build") ||
    c.includes("plumb") ||
    c.includes("electr") ||
    c.includes("mechan") ||
    c.includes("carp") ||
    c.includes("dri") ||
    c.includes("pilot") ||
    c.includes("chef") ||
    c.includes("cook") ||
    c.includes("bak") ||
    c.includes("farm") ||
    c.includes("garden")
  ) {
    return "adventure";
  }
  return "classic fiction";
}

// ---------------------- API ROUTES ----------------------

// 1. Leaderboard Endpoints
app.get("/api/leaderboard", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("leaderboard_entries")
        .select("*")
        .order("timestamp", { ascending: false });

      if (!error && data) {
        const mapped = data.map(mapSupabaseToLeaderboardEntry);
        return res.json(mapped);
      } else {
        console.warn("Supabase query error, using local fallback:", error);
      }
    } catch (err) {
      console.error("Supabase exception, using local fallback:", err);
    }
  }

  // Fallback to local file storage if Supabase is not configured or fails
  const sorted = [...leaderboardEntries].sort((a, b) => b.timestamp - a.timestamp);
  res.json(sorted);
});

app.post("/api/leaderboard", async (req, res) => {
  const { name, guessedCareer, actualCareer, result, shared, audiobookAssigned, audiobookAuthor, audiobookLink } = req.body;

  if (!name || !guessedCareer || !actualCareer || !result) {
    return res.status(400).json({ error: "Missing required leaderboard entry fields." });
  }

  const newEntry = {
    id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    guessedCareer,
    actualCareer,
    result,
    shared: !!shared,
    audiobookAssigned: audiobookAssigned || null,
    audiobookAuthor: audiobookAuthor || null,
    audiobookLink: audiobookLink || null,
    timestamp: Date.now(),
  };

  // Always store to local file fallback as standard practice
  leaderboardEntries.unshift(newEntry);
  saveLeaderboard();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const dbRow = mapLeaderboardEntryToSupabase(newEntry);
      const { error } = await supabase
        .from("leaderboard_entries")
        .insert([dbRow]);

      if (error) {
        console.warn("Supabase insert error:", error);
      } else {
        console.log("Successfully saved entry to Supabase:", newEntry.id);
      }
    } catch (err) {
      console.error("Supabase insert exception:", err);
    }
  }

  res.status(201).json(newEntry);
});

// 2. Audiobook Recommendation Route
app.get("/api/audiobook", async (req, res) => {
  const career = (req.query.career as string) || "default";
  const genre = getGenreKeyword(career);

  try {
    // Attempt LibriVox API
    const librivoxUrl = `https://librivox.org/api/feed/audiobooks?search=${encodeURIComponent(genre)}&format=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

    const lvResponse = await fetch(librivoxUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (lvResponse.ok) {
      const data: any = await lvResponse.json();
      const books = data.books || [];
      if (books.length > 0) {
        // Pick a random book from the search results for variety
        const book = books[Math.floor(Math.random() * books.length)];
        const author = book.authors?.map((a: any) => `${a.first_name} ${a.last_name}`).join(", ") || "Unknown";
        return res.json({
          title: book.title,
          author: author,
          link: book.url_librivox || `https://librivox.org/search?q=${encodeURIComponent(book.title)}&search_form=advanced`,
        });
      }
    }
  } catch (err) {
    console.log("LibriVox failed or timed out. Trying Internet Archive...");
  }

  try {
    // Attempt Internet Archive
    const iaUrl = `https://archive.org/advancedsearch.php?q=subject:"${encodeURIComponent(genre)}"+AND+mediatype:audio&output=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const iaResponse = await fetch(iaUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (iaResponse.ok) {
      const data: any = await iaResponse.json();
      const docs = data.response?.docs || [];
      if (docs.length > 0) {
        const doc = docs[Math.floor(Math.random() * docs.length)];
        return res.json({
          title: doc.title,
          author: doc.creator || "Unknown Creator",
          link: `https://archive.org/details/${doc.identifier}`,
        });
      }
    }
  } catch (err) {
    console.log("Internet Archive failed or timed out. Using curated static fallback.");
  }

  // Pure fallback
  const fallbackBook = STATIC_FALLBACKS[genre] || STATIC_FALLBACKS["classic fiction"];
  return res.json(fallbackBook);
});

// 3. Career guessing rapid-fire interview engine
app.post("/api/interview/next-question", async (req, res) => {
  const { name, history, forceGuess } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing candidate name" });
  }

  const messagesList = history || [];
  const questionCount = messagesList.filter((m: any) => m.role === "model").length;

  const SYSTEM_INSTRUCTION = `You are a rapid-fire career-guessing interviewer, styled after the 'Career Ladder' street interview format. You have at most 120 seconds and at most 8 questions. Never ask directly about someone's job, title, industry, or workplace. Ask short, casual questions about habits, energy levels, tools they touch daily, how they spend their weekday mornings, what stresses them, what they'd do with a free afternoon, and similar indirect signals. After each answer, silently narrow down plausible careers. Keep every question under 15 words. Be warm, quick, a little playful.`;

  // Dynamic system instructions emphasizing current interview state
  const transcript = messagesList
    .map((msg: any) => {
      const speaker = msg.role === "model" ? "Interviewer" : `${name}`;
      return `${speaker}: ${msg.content}`;
    })
    .join("\n");

  const prompt = `You are interviewing ${name} for the game 'CareerCall'. 
Current state:
- Number of questions asked so far: ${questionCount} out of maximum 8.
- Force Guess Flag is: ${forceGuess ? "TRUE" : "FALSE"}.

Here is the conversation transcript so far:
---
${transcript || "(No conversation yet. Interviewer starts with the very first greeting and a short, casual indirect question.)"}
---

INSTRUCTIONS:
1. If "Force Guess Flag" is TRUE, or if you have already asked 7 or 8 questions, or if you feel 90%+ confident about their career, you MUST stop asking questions. Complete the interview immediately by setting "isGuess" to true, and output your career guess, confidence, and reasoning.
2. Otherwise, set "isGuess" to false, and ask the next indirect question. Keep your question short, casual, and strictly under 15 words. Avoid any direct career questions.

You must reply with a JSON object adhering exactly to the specified response schema.`;

  const responseSchema = {
    type: "OBJECT",
    properties: {
      isGuess: {
        type: "BOOLEAN",
        description: "Set to true if you are ready to make the final career guess. Set to false if you are asking the next question."
      },
      question: {
        type: "STRING",
        description: "The next indirect, rapid-fire question to ask. Must be under 15 words. Leave blank or empty if isGuess is true."
      },
      guess: {
        type: "OBJECT",
        description: "The final career guess details. Required if isGuess is true.",
        properties: {
          guessed_career: { type: "STRING", description: "The career title you have guessed." },
          confidence: { type: "NUMBER", description: "Your level of confidence from 0.0 to 1.0." },
          reasoning: { type: "STRING", description: "One short sentence explaining the guess based on their indirect answers." }
        },
        required: ["guessed_career", "confidence", "reasoning"]
      }
    },
    required: ["isGuess"]
  };

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini Interview API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with Gemini." });
  }
});

// ------------------ FRONTEND SERVING ------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from production dist folder
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CareerCall Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
