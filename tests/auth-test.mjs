import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hashPassword, verifyPassword, encryptSecret, decryptSecret, createSessionToken, verifySessionToken } from "../src/lib/authCrypto.mjs";
import { createUser, findUserByEmail, findUserById, updateUser, getUsers } from "../src/lib/userStore.mjs";

console.log("Running Auth & Crypto Test Suite...");

// 1. Password Hashing Tests
const plainPass = "SuperSecretPassword123!";
const hashed = await hashPassword(plainPass);
assert.ok(hashed && hashed.startsWith("$2"), "Password should be hashed with bcrypt");
assert.equal(await verifyPassword(plainPass, hashed), true, "Valid password should verify");
assert.equal(await verifyPassword("wrong_password", hashed), false, "Invalid password should fail verification");

// 2. AES-256-GCM Token Encryption Tests
const rawToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
const encrypted = encryptSecret(rawToken);
assert.ok(encrypted && encrypted.includes(":"), "Encrypted secret should contain IV and AuthTag separated by colon");
const decrypted = decryptSecret(encrypted);
assert.equal(decrypted, rawToken, "Decrypted secret should match original token");

// Null / invalid decryption tests
assert.equal(encryptSecret(null), null);
assert.equal(decryptSecret(null), null);
assert.equal(decryptSecret("invalid:payload"), null);

// 3. JWT Session Token Tests
const payload = { userId: "user-1234", email: "developer@deepmind.com" };
const token = createSessionToken(payload);
assert.ok(typeof token === "string" && token.split(".").length === 3, "Session token should be a valid JWT");
const verified = verifySessionToken(token);
assert.equal(verified?.userId, payload.userId);
assert.equal(verified?.email, payload.email);
assert.equal(verifySessionToken("invalid.jwt.token"), null);

// 4. User Store Tests
const testUserId = "test-uuid-" + Date.now();
const testEmail = `testuser-${Date.now()}@example.com`;
const userRecord = {
  id: testUserId,
  name: "Test User",
  email: testEmail,
  passwordHash: hashed,
  encryptedGitHubToken: encrypted,
  createdAt: new Date().toISOString(),
};

createUser(userRecord);

const foundByEmail = findUserByEmail(testEmail);
assert.ok(foundByEmail, "User should be found by email");
assert.equal(foundByEmail.id, testUserId);

const foundById = findUserById(testUserId);
assert.ok(foundById, "User should be found by ID");
assert.equal(foundById.email, testEmail);

const updated = updateUser(testUserId, { name: "Updated Name" });
assert.equal(updated.name, "Updated Name");
assert.equal(findUserById(testUserId).name, "Updated Name");

// 5. GitHub Token Association & Disconnect Lifecycle Tests
const freshUserId = "gh-user-" + Date.now();
createUser({
  id: freshUserId,
  name: "GitHub Developer",
  email: `gh-${Date.now()}@example.com`,
  passwordHash: hashed,
  encryptedGitHubToken: null,
  createdAt: new Date().toISOString(),
});

// Link token
const ghAccessToken = "gho_test_oauth_token_987654321";
const encToken = encryptSecret(ghAccessToken);
updateUser(freshUserId, { encryptedGitHubToken: encToken });

const userWithToken = findUserById(freshUserId);
assert.ok(userWithToken.encryptedGitHubToken, "User should have encrypted GitHub token stored");
assert.equal(decryptSecret(userWithToken.encryptedGitHubToken), ghAccessToken, "Decrypted token must match original");

// 6. Google OAuth User Lifecycle Tests
const googleUserId = "google-user-" + Date.now();
const googleEmail = `googleuser-${Date.now()}@gmail.com`;
const googleUser = createUser({
  id: googleUserId,
  name: "Google User",
  email: googleEmail,
  passwordHash: null,
  avatarUrl: "https://lh3.googleusercontent.com/a/default-user",
  encryptedGitHubToken: null,
  createdAt: new Date().toISOString(),
});

const foundGoogleUser = findUserByEmail(googleEmail);
assert.ok(foundGoogleUser, "Google OAuth user should be found by email");
assert.equal(foundGoogleUser.passwordHash, null, "OAuth account should have null passwordHash");

const googleSessionToken = createSessionToken({ userId: googleUser.id, email: googleUser.email });
const verifiedGoogleSession = verifySessionToken(googleSessionToken);
assert.equal(verifiedGoogleSession?.userId, googleUserId);

console.log("All Auth & Crypto tests passed successfully!");


