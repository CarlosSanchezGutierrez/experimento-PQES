const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "notification-read-test-secret-over-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");
const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const options = (id, method = "GET", body) => ({
  method, headers: { Authorization: `Bearer ${tokenFor(id)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test("HU-17: la lectura es individual y la tarea sigue pendiente hasta resolverla", async (context) => {
  const base = await startTestServer(context, app);
  const created = await fetch(`${base}/api/planning`, options(3, "POST", {
    title: `HU-17 lectura ${Date.now()}`, objective: "Decidir la revisión del proceso.",
    scope: "Compras regionales.", justification: "El riesgo requiere una revisión.",
    area: "Compras", year: 2026, quarter: "Q3"
  }));
  assert.equal(created.status, 201);
  const proposal = (await created.json()).proposal;
  const id = `PROPOSAL_REVIEW:${proposal.id}`;
  const url = `${base}/api/notifications/${encodeURIComponent(id)}/read`;
  assert.equal((await fetch(url, options(4, "PUT"))).status, 404);
  assert.equal((await fetch(url, options(2, "PUT"))).status, 403);
  assert.equal((await fetch(url, { method: "PUT" })).status, 401);
  const read = await fetch(url, options(3, "PUT"));
  assert.equal(read.status, 200);
  const { readAt } = await read.json();
  assert.ok(readAt);
  const manager = (await (await fetch(`${base}/api/notifications`, options(3))).json()).notifications;
  assert.equal(manager.find((item) => item.id === id).readAt, readAt);
  const superAdmin = (await (await fetch(`${base}/api/notifications`, options(1))).json()).notifications;
  assert.equal(superAdmin.find((item) => item.id === id).readAt, null);
  assert.equal((await fetch(url, options(3, "DELETE"))).status, 200);
  const unread = (await (await fetch(`${base}/api/notifications`, options(3))).json()).notifications;
  assert.equal(unread.find((item) => item.id === id).readAt, null);
});
