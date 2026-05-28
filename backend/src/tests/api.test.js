const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backend-api-tests-"));
const testDbPath = path.join(tempDir, "test.sqlite");

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = "test-secret";

const app = require("../index");
const { db } = require("../db");

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

async function insertUser({
  name,
  email,
  password,
  role,
  accountStatus = role === "developer" ? "approved" : "approved",
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await run(
    `
    INSERT INTO users (name, email, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, ?)
    `,
    [name, email, passwordHash, role, accountStatus]
  );

  return result.lastID;
}

async function createExperiment(token, overrides = {}) {
  const response = await request(app)
    .post("/experiments")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Experiment 1",
      type: "A/B",
      short_description: "Short summary",
      category: "ux",
      created_by: "Developer One",
      description: "",
      instructions: "",
      variant_a_html: "<div>A</div>",
      variant_b_html: "<div>B</div>",
      custom_questions: [],
      ...overrides,
    });

  return response;
}

beforeAll(async () => {
  await get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'");
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("register user", async () => {
  const response = await request(app).post("/auth/register").send({
    name: "Register User",
    email: "register-user@example.com",
    password: "secret123",
    role: "user",
  });

  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    email: "register-user@example.com",
    role: "user",
    account_status: "approved",
  });
});

test("duplicate email rejected", async () => {
  const email = "duplicate-user@example.com";

  await request(app).post("/auth/register").send({
    name: "First User",
    email,
    password: "secret123",
    role: "user",
  });

  const response = await request(app).post("/auth/register").send({
    name: "Second User",
    email,
    password: "secret456",
    role: "user",
  });

  expect(response.status).toBe(409);
  expect(response.body).toEqual({ error: "Email already registered" });
});

test("login returns token", async () => {
  await insertUser({
    name: "Approved User",
    email: "login-user@example.com",
    password: "secret123",
    role: "user",
  });

  const response = await request(app).post("/auth/login").send({
    email: "login-user@example.com",
    password: "secret123",
  });

  expect(response.status).toBe(200);
  expect(response.body.token).toEqual(expect.any(String));
  expect(response.body.user).toMatchObject({
    email: "login-user@example.com",
    role: "user",
  });
});

test("developer creates experiment", async () => {
  const developerId = await insertUser({
    name: "Developer One",
    email: "developer-one@example.com",
    password: "secret123",
    role: "developer",
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email: "developer-one@example.com",
    password: "secret123",
  });

  const createResponse = await createExperiment(loginResponse.body.token, {
    created_by_id: developerId,
    created_by: "Developer One",
  });

  expect(createResponse.status).toBe(201);
  expect(createResponse.body.message).toBe("Experiment created successfully");
});

test("user cannot create experiment", async () => {
  await insertUser({
    name: "Regular User",
    email: "regular-user@example.com",
    password: "secret123",
    role: "user",
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email: "regular-user@example.com",
    password: "secret123",
  });

  const response = await createExperiment(loginResponse.body.token);

  expect(response.status).toBe(403);
  expect(response.body).toEqual({ error: "Insufficient permissions" });
});

test("moderator approves experiment", async () => {
  const developerId = await insertUser({
    name: "Dev Approve",
    email: "dev-approve@example.com",
    password: "secret123",
    role: "developer",
  });

  await insertUser({
    name: "Moderator One",
    email: "moderator-one@example.com",
    password: "secret123",
    role: "moderator",
  });

  const developerLogin = await request(app).post("/auth/login").send({
    email: "dev-approve@example.com",
    password: "secret123",
  });

  const createResponse = await createExperiment(developerLogin.body.token, {
    title: "Approve Me",
    created_by: "Dev Approve",
    created_by_id: developerId,
  });

  const moderatorLogin = await request(app).post("/auth/login").send({
    email: "moderator-one@example.com",
    password: "secret123",
  });

  const statusResponse = await request(app)
    .patch(`/experiments/${createResponse.body.id}/status`)
    .set("Authorization", `Bearer ${moderatorLogin.body.token}`)
    .send({ status: "approved", moderation_comment: "Looks good" });

  expect(statusResponse.status).toBe(200);
  expect(statusResponse.body.message).toBe(
    "Experiment status updated successfully"
  );
});

test("user submits evaluation", async () => {
  const developerId = await insertUser({
    name: "Eval Dev",
    email: "eval-dev@example.com",
    password: "secret123",
    role: "developer",
  });

  const moderatorId = await insertUser({
    name: "Eval Moderator",
    email: "eval-moderator@example.com",
    password: "secret123",
    role: "moderator",
  });

  const userId = await insertUser({
    name: "Eval User",
    email: "eval-user@example.com",
    password: "secret123",
    role: "user",
  });

  const developerLogin = await request(app).post("/auth/login").send({
    email: "eval-dev@example.com",
    password: "secret123",
  });

  const experimentResponse = await createExperiment(developerLogin.body.token, {
    title: "Evaluation Experiment",
    created_by: "Eval Dev",
    created_by_id: developerId,
  });

  const moderatorLogin = await request(app).post("/auth/login").send({
    email: "eval-moderator@example.com",
    password: "secret123",
  });

  await request(app)
    .patch(`/experiments/${experimentResponse.body.id}/status`)
    .set("Authorization", `Bearer ${moderatorLogin.body.token}`)
    .send({ status: "approved", moderation_comment: "Approved" });

  const userLogin = await request(app).post("/auth/login").send({
    email: "eval-user@example.com",
    password: "secret123",
  });

  const response = await request(app)
    .post("/evaluations")
    .set("Authorization", `Bearer ${userLogin.body.token}`)
    .send({
      experiment_id: experimentResponse.body.id,
      user_id: userId,
      clarity: 4,
      comprehension: 5,
      cognitive_load: 2,
      preferred_variant: "A",
      comment: "Good",
      standard_answers: { q1: "A" },
      custom_answers: {},
    });

  expect(response.status).toBe(201);
  expect(response.body.message).toBe("Evaluation created successfully");
});

test("duplicate evaluation returns 409", async () => {
  const developerId = await insertUser({
    name: "Dup Eval Dev",
    email: "dup-eval-dev@example.com",
    password: "secret123",
    role: "developer",
  });

  const moderatorId = await insertUser({
    name: "Dup Eval Moderator",
    email: "dup-eval-moderator@example.com",
    password: "secret123",
    role: "moderator",
  });

  const userId = await insertUser({
    name: "Dup Eval User",
    email: "dup-eval-user@example.com",
    password: "secret123",
    role: "user",
  });

  const developerLogin = await request(app).post("/auth/login").send({
    email: "dup-eval-dev@example.com",
    password: "secret123",
  });

  const experimentResponse = await createExperiment(developerLogin.body.token, {
    title: "Duplicate Evaluation Experiment",
    created_by: "Dup Eval Dev",
    created_by_id: developerId,
  });

  const moderatorLogin = await request(app).post("/auth/login").send({
    email: "dup-eval-moderator@example.com",
    password: "secret123",
  });

  await request(app)
    .patch(`/experiments/${experimentResponse.body.id}/status`)
    .set("Authorization", `Bearer ${moderatorLogin.body.token}`)
    .send({ status: "approved", moderation_comment: "Approved" });

  const userLogin = await request(app).post("/auth/login").send({
    email: "dup-eval-user@example.com",
    password: "secret123",
  });

  const payload = {
    experiment_id: experimentResponse.body.id,
    user_id: userId,
    clarity: 4,
    comprehension: 5,
    cognitive_load: 2,
    preferred_variant: "A",
    comment: "Good",
    standard_answers: { q1: "A" },
    custom_answers: {},
  };

  await request(app)
    .post("/evaluations")
    .set("Authorization", `Bearer ${userLogin.body.token}`)
    .send(payload);

  const duplicateResponse = await request(app)
    .post("/evaluations")
    .set("Authorization", `Bearer ${userLogin.body.token}`)
    .send(payload);

  expect(duplicateResponse.status).toBe(409);
  expect(duplicateResponse.body).toEqual({
    error: "User has already evaluated this experiment",
  });
});