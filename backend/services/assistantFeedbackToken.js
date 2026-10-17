const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/jwtSecret");

const AUDIENCE = "vera-ai-feedback";
const CHANNELS = new Set(["ask", "evidence-search"]);
const issueFeedbackToken = (user, channel, mode) => {
  if (!CHANNELS.has(channel) || !/^[a-z-]{1,32}$/.test(mode)) throw new Error("Invalid feedback context.");
  return jwt.sign({ channel, mode }, getJwtSecret(), {
    algorithm: "HS256", audience: AUDIENCE, subject: String(user.id), jwtid: randomUUID(), expiresIn: "24h"
  });
};

const verifyFeedbackToken = (token, user) => {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"], audience: AUDIENCE });
    if (payload.sub !== String(user.id) || !CHANNELS.has(payload.channel) ||
        !/^[a-z-]{1,32}$/.test(payload.mode) ||
        !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(payload.jti)) throw new Error("Invalid feedback token.");
    return { interactionId: payload.jti, channel: payload.channel, mode: payload.mode };
  } catch {
    const error = new Error("La valoración ya no es válida para esta sesión.");
    error.status = 400;
    throw error;
  }
};

module.exports = { issueFeedbackToken, verifyFeedbackToken };
