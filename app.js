
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

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
      "https://prelive-oauth2.quran.foundation/oauth2/token",
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
      "https://apis-prelive.quran.foundation/content/api/v4/chapters",
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
        
