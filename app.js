
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const QF_ENV = process.env.QF_ENV || "prelive";

const AUTH_BASE_URL =
  QF_ENV === "production"
    ? "https://oauth2.quran.foundation"
    : "https://prelive-oauth2.quran.foundation";

const API_BASE_URL =
  QF_ENV === "production"
    ? "https://apis.quran.foundation"
    : "https://apis-prelive.quran.foundation";
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ISLAM Tafsir API server is running"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/tafsirs", async (req, res) => {
  try {
    const clientId = process.env.QF_CLIENT_ID;
    const clientSecret = process.env.QF_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        status: "error",
        message: "Server credentials are not configured"
      });
    }

    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
      `${AUTH_BASE_URL}/oauth2/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "content"
        })
      }
    );

    if (!tokenResponse.ok) {
      return res.status(502).json({
        status: "error",
        step: "authentication",
        upstreamStatus: tokenResponse.status,
        message: "Quran Foundation authentication failed"
      });
    }

    const tokenData = await tokenResponse.json();

    const tafsirsResponse = await fetch(
      `${API_BASE_URL}/content/api/v4/resources/tafsirs?language=bn`,
      {
        headers: {
          "x-auth-token": tokenData.access_token,
          "x-client-id": clientId
        }
      }
    );

    if (!tafsirsResponse.ok) {
      return res.status(502).json({
        status: "error",
        step: "tafsirs",
        upstreamStatus: tafsirsResponse.status,
        message: "Tafsir list request failed"
      });
    }

    const data = await tafsirsResponse.json();
    const tafsirs = data.tafsirs || [];

    res.json({
      status: "ok",
      total: tafsirs.length,
      tafsirs: tafsirs.map(item => ({
        id: item.id,
        name: item.name,
        author: item.author_name,
        language: item.language_name,
        slug: item.slug,
        translatedName: item.translated_name
      }))
    });
  } catch (error) {
    console.error("Tafsir list error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve tafsir list"
    });
  }
});
      
app.get("/qf-test", async (req, res) => {
  try {
    const clientId = process.env.QF_CLIENT_ID;
    const clientSecret = process.env.QF_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        status: "error",
        message: "Server credentials are not configured"
      });
    }

    const credentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
    `${AUTH_BASE_URL}/oauth2/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "content"
        })
      }
    );

   if (!tokenResponse.ok) {
  const errorDetails = await tokenResponse.text();

  console.error(
    "QF authentication error:",
    tokenResponse.status,
    errorDetails
  );

  return res.status(502).json({
    status: "error",
    step: "authentication",
    message: "Quran Foundation authentication failed",
    upstreamStatus: tokenResponse.status,
    details: errorDetails
  });
    }

    const tokenData = await tokenResponse.json();

    const chaptersResponse = await fetch(
      `${API_BASE_URL}/content/api/v4/chapters`,
      {
        headers: {
          "x-auth-token": tokenData.access_token,
          "x-client-id": clientId
        }
      }
    );

    if (!chaptersResponse.ok) {
      return res.status(502).json({
        status: "error",
        step: "chapters",
        message: "Chapter request failed",
        upstreamStatus: chaptersResponse.status
      });
    }

    const data = await chaptersResponse.json();

    res.json({
      status: "ok",
      message: "Quran Foundation API connected",
      chapterCount: data.chapters?.length ?? null,
      chapters: (data.chapters || []).map(chapter => ({
        id: chapter.id,
        name: chapter.name_simple
      }))
    });
  } catch (error) {
    console.error("QF test failed:", error.message);
    res.status(500).json({
      status: "error",
      message: "Connection test failed"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ISLAM Tafsir API running on port ${PORT}`);
});
        
