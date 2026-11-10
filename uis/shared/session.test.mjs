import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { consumeSession, receiveSession } from "./session.ts";

const token = "test.payload.signature";
const website = "https://site.example.com";
const backoffice = "https://app.example.com";
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_WEBSITE_URL = website;
  process.env.NEXT_PUBLIC_BACKOFFICE_URL = backoffice;
});
afterEach(() => {
  mock.restoreAll();
  process.env = { ...originalEnv };
});

function request(origin = website) {
  return new Request(`${backoffice}/session`, {
    method: "POST",
    headers: { origin },
    body: new URLSearchParams({ token }),
  });
}

test("admin session is validated and transferred without a token in the URL", async () => {
  mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    return Response.json({ role: "admin" });
  });
  const response = await receiveSession(request(), true);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${backoffice}/suppliers`);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly; SameSite=Lax; Path=\/session; Max-Age=60; Secure/);
  assert.ok(cookie.includes(token));
  assert.ok(!response.headers.get("location").includes(token));
});

test("normal users keep their session when leaving the backoffice", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ role: "user" }));
  const response = await receiveSession(request(backoffice), false);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${website}/`);
});

test("non-admin sessions cannot enter the backoffice", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ role: "user" }));
  assert.equal((await receiveSession(request(), true)).status, 403);
});

test("superadmin sessions enter the restricted management panel", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ role: "superadmin" }));
  const response = await receiveSession(request(), true);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${backoffice}/admin`);
});

test("untrusted origins cannot inject a session", async () => {
  const fetch = mock.method(globalThis, "fetch");
  assert.equal((await receiveSession(request("https://other.example.com"), true)).status, 403);
  assert.equal(fetch.mock.callCount(), 0);
});

test("invalid JWTs do not get transferred", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({}, { status: 401 }));
  const response = await receiveSession(request(), true);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("session cookie is consumed once and responses cannot be cached", async () => {
  const response = consumeSession(new Request(`${website}/session`, {
    headers: { cookie: `other=value; trackflow_handoff=${token}` },
  }));
  assert.deepEqual(await response.json(), { token });
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await consumeSession(new Request(`${website}/session`)).json(), { token: null });
});
