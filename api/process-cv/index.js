const mammoth = require("mammoth");
const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const candidateSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    role: { type: "string" },
    score: { type: "integer" },
    status: { type: "string" },
    applied: { type: "string" },
    timeline: { type: "array", items: { type: "object" } },
    summary: { type: "string" },
    experience: { type: "string" },
    education: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    breakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "integer" }
        },
        required: ["label", "value"]
      }
    }
  },
  required: [
    "name",
    "email",
    "phone",
    "location",
    "role",
    "score",
    "status",
    "applied",
    "summary",
    "experience",
    "education",
    "skills",
    "timeline",
    "breakdown"
  ]
};

function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/?.+?(>|$)/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stringifySection(value) {
  if (!value) return "";

  if (typeof value === "string") return stripHtml(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return stripHtml(item);
        if (!item || typeof item !== "object") return "";

        const title = item.title || item.institution || item.organization || item.qualification || "";
        const meta = [item.organization, item.location, item.period, item.qualification]
          .filter(Boolean)
          .map(stripHtml)
          .join(" • ");
        const highlights = Array.isArray(item.highlights)
          ? item.highlights.map(stripHtml).filter(Boolean).join("; ")
          : "";
        const details = Array.isArray(item.details)
          ? item.details.map(stripHtml).filter(Boolean).join("; ")
          : "";

        return [title, meta, highlights, details].filter(Boolean).join(" — ");
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof value === "object") {
    return Object.values(value).map(stringifySection).filter(Boolean).join("\n");
  }

  return String(value);
}

function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.map(stripHtml).filter(Boolean);
  if (typeof skills === "string") {
    return skills
      .split(/,|\n|•|;/)
      .map(stripHtml)
      .filter(Boolean);
  }
  return [];
}

function normalizeTimeline(timeline) {
  if (!timeline) return [];

  if (Array.isArray(timeline)) {
    return timeline
      .map((item) => {
        if (typeof item === "string") return { title: stripHtml(item), date: "" };
        return {
          title: stripHtml(item?.title || ""),
          date: stripHtml(item?.date || "")
        };
      })
      .filter((item) => item.title || item.date)
      .slice(0, 12);
  }

  if (typeof timeline === "string") {
    return stripHtml(timeline)
      .split(/\n|•|\d+\.\s+/)
      .map((text) => text.trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((title) => ({ title, date: "" }));
  }

  return [];
}

function normalizeBreakdown(breakdown) {
  const fallback = [
    { label: "Technical Skills", value: 0 },
    { label: "Communication", value: 0 },
    { label: "Cultural Fit", value: 0 },
    { label: "Leadership", value: 0 }
  ];

  if (!Array.isArray(breakdown)) return fallback;

  return breakdown.map((item) => ({
    label: stripHtml(item?.label || ""),
    value: Number(item?.value || 0)
  }));
}

function normalizeCandidate(candidate) {
  return {
    id: stripHtml(candidate?.id || ""),
    name: stripHtml(candidate?.name || "Unknown Candidate"),
    email: stripHtml(candidate?.email || ""),
    phone: stripHtml(candidate?.phone || ""),
    location: stripHtml(candidate?.location || ""),
    role: stripHtml(candidate?.role || "Candidate"),
    score: Number(candidate?.score || 0),
    status: "Review",
    applied: stripHtml(candidate?.applied || today()),
    summary: stripHtml(candidate?.summary || ""),
    experience: stringifySection(candidate?.experience),
    education: stringifySection(candidate?.education),
    skills: normalizeSkills(candidate?.skills),
    timeline: normalizeTimeline(candidate?.timeline),
    breakdown: normalizeBreakdown(candidate?.breakdown)
  };
}

function makeCandidateId(candidate) {
  const base = candidate.email || candidate.name || `candidate-${Date.now()}`;
  return String(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

async function callGeminiWithParts(parts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: candidateSchema
      }
    })
  });

  const rawText = await response.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${rawText}`);
  }

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini request failed.");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini did not return candidate JSON.");

  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY environment variable." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { fileName, mimeType, dataBase64 } = body || {};

    if (!fileName || !mimeType || !dataBase64) {
      return res.status(400).json({ error: "Missing fileName, mimeType, or dataBase64." });
    }

    const lowerName = fileName.toLowerCase();
    const buffer = Buffer.from(dataBase64, "base64");

    const instruction = `
You are Wazeefa's AI resume screening assistant.
Extract the candidate profile from this CV.

Rules:
- Return only valid JSON.
- Do not return markdown.
- Do not return HTML.
- Do not include <ol>, <ul>, <li>, <br>, <p>, <div>, or any HTML tags.
- Follow the provided response schema exactly.
- Do not generate an application timeline. The Application Timeline is handled by recruitment actions in the app, such as Move to Next Stage, Schedule Interview, and Reject Candidate.

Field rules:
- summary must be only 2 to 3 clear recruiter-friendly sentences.
- experience must be total estimated years of relevant experience only, not a long work history.
  Example: "Approximately 2 years of relevant experience."
- education must show only the latest or highest education entry.
- skills must be an array of short skill names, not one long string.
- score must be 0 to 100.
- status must be "Review".
- If a value is missing, use an empty string or empty array.
- For role, infer the most likely target role from the CV.
- For breakdown, include exactly:
  Technical Skills
  Communication
  Cultural Fit
  Leadership
`;

    let candidate;

    if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
      candidate = await callGeminiWithParts([
        { inlineData: { mimeType: "application/pdf", data: dataBase64 } },
        { text: instruction }
      ]);
    } else if (
      lowerName.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const extracted = await mammoth.extractRawText({ buffer });
      const resumeText = extracted.value || "";
      if (!resumeText.trim()) throw new Error("Could not extract text from DOCX.");

      candidate = await callGeminiWithParts([{ text: `${instruction}\n\nCV text:\n${resumeText}` }]);
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload a PDF or DOCX file." });
    }

    candidate = normalizeCandidate(candidate);
    candidate.id = makeCandidateId(candidate);
    candidate.applied = candidate.applied || today();
    candidate.status = "Review";

    // Application Timeline should not come from AI/CV processing.
    candidate.timeline = [];

    // Keep summary short.
    if (candidate.summary) {
      const sentences = String(candidate.summary)
        .replace(/<[^>]*>/g, "")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);

      candidate.summary = sentences.slice(0, 3).join(" ");
    }

    // Clean experience and education from any accidental HTML.
    candidate.experience = String(candidate.experience || "")
      .replace(/<[^>]*>/g, "")
      .trim();

    candidate.education = String(candidate.education || "")
      .replace(/<[^>]*>/g, "")
      .trim();

    return res.status(200).json(candidate);

  } catch (error) {
    console.error("CV processing failed:", error);
    return res.status(500).json({
      error: "CV processing failed.",
      detail: error.message
    });
  }
};

