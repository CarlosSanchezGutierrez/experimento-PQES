const test = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_SECRET ||= "server-integration-test-secret-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");

test("GET / responds with the API health message", async (context) => {
  const baseUrl = await startTestServer(context, app);
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: "VERA API funcionando correctamente"
  });
});
