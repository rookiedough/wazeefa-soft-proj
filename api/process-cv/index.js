const mammoth = require("mammoth");

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
    summary: { type: "string" },
    experience: { type: "string" },
    education: { type: "string" },
    skills: {
      type: "array",
      items: { type: "string" }
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" }
        },
        required: ["title", "date"]
      }
    },
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: candidateSchema
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Gemini request failed."
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini did not return candidate JSON.");
  }

  return JSON.parse(text);
}

module.exports = async function (context, req) {
  try {
    if (!GEMINI_API_KEY) {
      context.res = {
        status: 500,
        body: {
          error: "Missing GEMINI_API_KEY environment variable."
        }
      };
      return;
    }

    const { fileName, mimeType, dataBase64 } = req.body || {};

    if (!fileName || !mimeType || !dataBase64) {
      context.res = {
        status: 400,
        body: {
          error: "Missing fileName, mimeType, or dataBase64."
        }
      };
      return;
    }

    const lowerName = fileName.toLowerCase();
    const buffer = Buffer.from(dataBase64, "base64");

    const instruction = `
You are Wazeefa's AI resume screening assistant.

Extract the candidate profile from this CV.

Rules:
- Return only valid JSON.
- Follow the provided response schema exactly.
- score must be 0 to 100.
- status must be "Review".
- If a value is missing, use an empty string or empty array.
- Make the summary concise and recruiter-friendly.
- For role, infer the most likely target role from the CV.
- For breakdown, include:
  Technical Skills
  Communication
  Cultural Fit
  Leadership
`;

    let candidate;

    if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
      candidate = await callGeminiWithParts([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: dataBase64
          }
        },
        {
          text: instruction
        }
      ]);
    } else if (
      lowerName.endsWith(".docx") ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const extracted = await mammoth.extractRawText({ buffer });
      const resumeText = extracted.value || "";

      if (!resumeText.trim()) {
        throw new Error("Could not extract text from DOCX.");
      }

      candidate = await callGeminiWithParts([
        {
          text: `${instruction}

CV text:
${resumeText}`
        }
      ]);
    } else {
      context.res = {
        status: 400,
        body: {
          error: "Unsupported file type. Please upload a PDF or DOCX file."
        }
      };
      return;
    }

    candidate.id = makeCandidateId(candidate);
    candidate.applied = candidate.applied || today();
    candidate.status = "Review";

    context.res = {
      status: 200,
      body: candidate
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        error: "CV processing failed.",
        detail: error.message
      }
    };
  }
};