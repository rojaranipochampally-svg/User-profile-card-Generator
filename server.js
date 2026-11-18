require("dotenv").config();

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function safeUrl(value) {
  const text = cleanText(value, 300);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function validateProfile(body) {
  const name = cleanText(body.name, 60);
  const bio = cleanText(body.bio, 280);
  const skills = cleanText(body.skills, 300)
    .split(",")
    .map((skill) => cleanText(skill, 30))
    .filter(Boolean)
    .slice(0, 10);
  const github = safeUrl(body.github);
  const linkedin = safeUrl(body.linkedin);
  const portfolio = safeUrl(body.portfolio);

  if (!name) return { error: "Please enter your name." };
  if (!bio) return { error: "Please enter a short bio." };

  return {
    profile: { name, bio, skills, github, linkedin, portfolio }
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", databaseConfigured: Boolean(supabase) });
});

app.post("/api/profiles", async (req, res) => {
  const result = validateProfile(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  if (!supabase) {
    return res.status(503).json({
      error: "Database is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file."
    });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert(result.profile)
      .select("id, name, bio, skills, github, linkedin, portfolio, created_at")
      .single();

    if (error) throw error;
    res.status(201).json({ message: "Profile saved successfully.", profile: data });
  } catch (error) {
    console.error("Database insert failed:", error.message);
    res.status(500).json({ error: "Could not save the profile. Check your database setup and try again." });
  }
});

app.get("/api/profiles/:id", async (req, res) => {
  if (!supabase) return res.status(503).send("Database is not configured.");
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, bio, skills, github, linkedin, portfolio, created_at")
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).send("Profile not found.");
    const links = [
      data.github ? `<a href="${escapeHtml(data.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : "",
      data.linkedin ? `<a href="${escapeHtml(data.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : "",
      data.portfolio ? `<a href="${escapeHtml(data.portfolio)}" target="_blank" rel="noopener noreferrer">Portfolio</a>` : ""
    ].filter(Boolean).join(" · ");
    const skills = (data.skills || []).map((s) => `<span>${escapeHtml(s)}</span>`).join("");
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.name)} | Profile</title>
<style>
body{font-family:Arial,sans-serif;background:#f4f0ff;margin:0;padding:40px 16px;color:#202039}
main{max-width:620px;margin:auto;background:white;border-radius:22px;padding:32px;box-shadow:0 12px 40px #29205a18}
h1{margin:0 0 8px;color:#6037b5}p{line-height:1.6;color:#555}
.skills{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}.skills span{background:#eee7ff;color:#6037b5;padding:7px 12px;border-radius:20px}
a{color:#6037b5;font-weight:bold;margin-right:8px}
</style></head><body><main><h1>${escapeHtml(data.name)}</h1><p>${escapeHtml(data.bio)}</p>
<div class="skills">${skills}</div><p>${links || "No social links added."}</p></main></body></html>`);
  } catch (error) {
    console.error("Profile retrieval failed:", error.message);
    res.status(500).send("Unable to load this profile.");
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`User Profile Card Generator running at http://localhost:${PORT}`);
});
