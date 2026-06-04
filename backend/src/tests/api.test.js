const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backend-api-tdd-"));
const testDbPath = path.join(tempDir, "test.sqlite");

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = "test-secret";

const app = require("../index");
const { db } = require("../db");

let counter = 0;

function nextEmail(prefix) {
  counter += 1;
  return `${prefix}-${counter}@example.com`;
}

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

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

async function insertUser({
  name = "Test User",
  email = nextEmail("user"),
  password = "secret123",
  role = "user",
  accountStatus = "approved",
} = {}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await run(
    `
    INSERT INTO users (name, email, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, ?)
    `,
    [name, email, passwordHash, role, accountStatus]
  );

  return {
    id: result.lastID,
    name,
    email,
    password,
    role,
    accountStatus,
  };
}

async function login(user) {
  const response = await request(app).post("/auth/login").send({
    email: user.email,
    password: user.password,
  });

  expect(response.status).toBe(200);

  return response.body.token;
}

async function insertExperiment(overrides = {}) {
  const result = await run(
    `
    INSERT INTO experiments (
      title,
      description,
      short_description,
      instructions,
      type,
      category,
      status,
      created_by,
      created_by_id,
      variant_a_html,
      variant_b_html,
      custom_questions,
      approved_custom_questions,
      moderation_comment,
      archived_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      overrides.title || "Experiment",
      overrides.description || "",
      overrides.short_description || "Short summary",
      overrides.instructions || "",
      overrides.type || "A/B",
      overrides.category || "ux",
      overrides.status || "draft",
      overrides.created_by || "Developer",
      overrides.created_by_id || null,
      overrides.variant_a_html || "<div>A</div>",
      overrides.variant_b_html || "<div>B</div>",
      JSON.stringify(overrides.custom_questions || []),
      overrides.approved_custom_questions === undefined
        ? null
        : JSON.stringify(overrides.approved_custom_questions),
      overrides.moderation_comment || "",
      overrides.archived_at || null,
    ]
  );

  return {
    id: result.lastID,
    ...overrides,
  };
}

async function insertEvaluation(overrides = {}) {
  const result = await run(
    `
    INSERT INTO evaluations (
      experiment_id,
      user_id,
      clarity,
      comprehension,
      cognitive_load,
      preferred_variant,
      comment,
      standard_answers,
      custom_answers
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      overrides.experiment_id,
      overrides.user_id,
      overrides.clarity,
      overrides.comprehension,
      overrides.cognitive_load,
      overrides.preferred_variant || null,
      overrides.comment || "",
      JSON.stringify(overrides.standard_answers || {}),
      JSON.stringify(overrides.custom_answers || {}),
    ]
  );

  return {
    id: result.lastID,
    ...overrides,
  };
}

function experimentPayload(overrides = {}) {
  return {
    title: "Endpoint Experiment",
    description: "Long description",
    short_description: "Short summary",
    instructions: "Try both versions",
    type: "A/B",
    category: "ux",
    created_by: "Developer",
    variant_a_html: "<button>A</button>",
    variant_b_html: "<button>B</button>",
    custom_questions: [{ id: "q1", text: "Which is clearer?" }],
    ...overrides,
  };
}

function evaluationPayload(overrides = {}) {
  return {
    experiment_id: overrides.experiment_id,
    user_id: overrides.user_id,
    clarity: 1,
    comprehension: 3,
    cognitive_load: 5,
    preferred_variant: "A",
    comment: "Clear enough",
    standard_answers: { clarity: "good" },
    custom_answers: { q1: "A" },
    ...overrides,
  };
}

beforeAll(async () => {
  await get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'");
});

beforeEach(async () => {
  await run("DELETE FROM evaluations");
  await run("DELETE FROM experiments");
  await run("DELETE FROM users");
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

describe("GET /health", () => {
  test("returns the public health contract", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe("POST /auth/register", () => {
  test.each([
    ["user", "approved"],
    ["moderator", "approved"],
    ["developer", "pending"],
  ])("creates a %s account with %s status", async (role, accountStatus) => {
    const email = nextEmail(role);

    const response = await request(app).post("/auth/register").send({
      name: `${role} Account`,
      email,
      password: "secret123",
      role,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      email,
      role,
      account_status: accountStatus,
    });
    expect(response.body.password_hash).toBeUndefined();
  });

  test("rejects missing required fields and invalid role classes", async () => {
    const missingResponse = await request(app).post("/auth/register").send({
      name: "",
      email: nextEmail("missing"),
      password: "secret123",
      role: "user",
    });

    const invalidRoleResponse = await request(app).post("/auth/register").send({
      name: "Invalid Role",
      email: nextEmail("invalid-role"),
      password: "secret123",
      role: "admin",
    });

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ error: "Missing required fields" });
    expect(invalidRoleResponse.status).toBe(400);
    expect(invalidRoleResponse.body).toEqual({ error: "Invalid role" });
  });

  test("rejects duplicate email", async () => {
    const email = nextEmail("duplicate");

    await request(app).post("/auth/register").send({
      name: "Original",
      email,
      password: "secret123",
      role: "user",
    });

    const response = await request(app).post("/auth/register").send({
      name: "Duplicate",
      email,
      password: "secret456",
      role: "user",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Email already registered" });
  });
});

describe("POST /auth/login", () => {
  test("returns a token and approved user details for valid credentials", async () => {
    const user = await insertUser({
      name: "Approved User",
      email: nextEmail("approved-login"),
      password: "secret123",
      role: "user",
    });

    const response = await request(app).post("/auth/login").send({
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      role: "user",
      account_status: "approved",
    });
  });

  test("rejects missing and invalid credential classes", async () => {
    const user = await insertUser({
      email: nextEmail("invalid-login"),
      password: "secret123",
    });

    const missingResponse = await request(app).post("/auth/login").send({
      email: user.email,
    });
    const invalidResponse = await request(app).post("/auth/login").send({
      email: user.email,
      password: "wrong-secret",
    });

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ error: "Missing email or password" });
    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body).toEqual({ error: "Invalid credentials" });
  });

  test.each([
    ["pending", "Account pending approval"],
    ["rejected", "Account rejected"],
  ])("rejects %s accounts", async (accountStatus, error) => {
    const user = await insertUser({
      email: nextEmail(accountStatus),
      password: "secret123",
      accountStatus,
    });

    const response = await request(app).post("/auth/login").send({
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error });
  });
});

describe("GET /users/pending", () => {
  test("requires moderator authentication", async () => {
    const user = await insertUser({ email: nextEmail("plain-user") });
    const userToken = await login(user);

    const missingAuthResponse = await request(app).get("/users/pending");
    const wrongRoleResponse = await request(app)
      .get("/users/pending")
      .set("Authorization", `Bearer ${userToken}`);

    expect(missingAuthResponse.status).toBe(401);
    expect(missingAuthResponse.body).toEqual({
      error: "Missing authorization header",
    });
    expect(wrongRoleResponse.status).toBe(403);
    expect(wrongRoleResponse.body).toEqual({ error: "Insufficient permissions" });
  });

  test("returns only pending developer accounts", async () => {
    const moderator = await insertUser({
      email: nextEmail("moderator"),
      role: "moderator",
    });
    const pendingDeveloper = await insertUser({
      name: "Pending Developer",
      email: nextEmail("pending-developer"),
      role: "developer",
      accountStatus: "pending",
    });
    await insertUser({
      name: "Approved Developer",
      email: nextEmail("approved-developer"),
      role: "developer",
      accountStatus: "approved",
    });
    await insertUser({
      name: "Approved User",
      email: nextEmail("approved-user"),
      role: "user",
      accountStatus: "approved",
    });
    const token = await login(moderator);

    const response = await request(app)
      .get("/users/pending")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: pendingDeveloper.id,
      email: pendingDeveloper.email,
      role: "developer",
      account_status: "pending",
    });
  });
});

describe("PATCH /users/:id/status", () => {
  test("updates developer status for valid status classes", async () => {
    const developer = await insertUser({
      email: nextEmail("status-developer"),
      role: "developer",
      accountStatus: "pending",
    });

    const response = await request(app)
      .patch(`/users/${developer.id}/status`)
      .send({ account_status: "approved" });
    const updated = await get("SELECT account_status FROM users WHERE id = ?", [
      developer.id,
    ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "User status updated successfully",
      changes: 1,
    });
    expect(updated.account_status).toBe("approved");
  });

  test("rejects invalid status and ignores non-developer users", async () => {
    const user = await insertUser({ email: nextEmail("status-user") });

    const invalidResponse = await request(app)
      .patch(`/users/${user.id}/status`)
      .send({ account_status: "disabled" });
    const nonDeveloperResponse = await request(app)
      .patch(`/users/${user.id}/status`)
      .send({ account_status: "rejected" });
    const unchanged = await get("SELECT account_status FROM users WHERE id = ?", [
      user.id,
    ]);

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body).toEqual({ error: "Invalid account status" });
    expect(nonDeveloperResponse.status).toBe(200);
    expect(nonDeveloperResponse.body.changes).toBe(0);
    expect(unchanged.account_status).toBe("approved");
  });
});

describe("POST /experiments", () => {
  test("requires developer authentication", async () => {
    const user = await insertUser({ email: nextEmail("experiment-user") });
    const userToken = await login(user);

    const missingAuthResponse = await request(app)
      .post("/experiments")
      .send(experimentPayload());
    const wrongRoleResponse = await request(app)
      .post("/experiments")
      .set("Authorization", `Bearer ${userToken}`)
      .send(experimentPayload());

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongRoleResponse.status).toBe(403);
    expect(wrongRoleResponse.body).toEqual({ error: "Insufficient permissions" });
  });

  test("creates an experiment and persists optional defaults", async () => {
    const developer = await insertUser({
      name: "Experiment Developer",
      email: nextEmail("experiment-developer"),
      role: "developer",
    });
    const token = await login(developer);

    const response = await request(app)
      .post("/experiments")
      .set("Authorization", `Bearer ${token}`)
      .send(
        experimentPayload({
          description: undefined,
          instructions: undefined,
          created_by: developer.name,
          created_by_id: developer.id,
          variant_a_html: undefined,
          variant_b_html: undefined,
          custom_questions: undefined,
        })
      );
    const row = await get("SELECT * FROM experiments WHERE id = ?", [
      response.body.id,
    ]);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Experiment created successfully");
    expect(row).toMatchObject({
      title: "Endpoint Experiment",
      description: "",
      instructions: "",
      status: "draft",
      created_by: developer.name,
      created_by_id: developer.id,
      variant_a_html: "",
      variant_b_html: "",
      custom_questions: "[]",
    });
  });

  test("rejects missing required fields", async () => {
    const developer = await insertUser({
      email: nextEmail("experiment-required"),
      role: "developer",
    });
    const token = await login(developer);

    const response = await request(app)
      .post("/experiments")
      .set("Authorization", `Bearer ${token}`)
      .send(experimentPayload({ title: "" }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Missing required fields" });
  });
});

describe("GET /experiments", () => {
  test("requires developer or moderator role", async () => {
    const user = await insertUser({ email: nextEmail("list-user") });
    const token = await login(user);

    const missingAuthResponse = await request(app).get("/experiments");
    const wrongRoleResponse = await request(app)
      .get("/experiments")
      .set("Authorization", `Bearer ${token}`);

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongRoleResponse.status).toBe(403);
  });

  test("returns only the developer's non-archived experiments", async () => {
    const developer = await insertUser({
      name: "Visible Dev",
      email: nextEmail("visible-dev"),
      role: "developer",
    });
    const otherDeveloper = await insertUser({
      name: "Other Dev",
      email: nextEmail("other-dev"),
      role: "developer",
    });
    const visible = await insertExperiment({
      title: "Visible",
      created_by: developer.name,
      created_by_id: developer.id,
    });
    await insertExperiment({
      title: "Archived",
      created_by: developer.name,
      created_by_id: developer.id,
      archived_at: "2026-06-04 10:00:00",
    });
    await insertExperiment({
      title: "Other",
      created_by: otherDeveloper.name,
      created_by_id: otherDeveloper.id,
    });
    const token = await login(developer);

    const response = await request(app)
      .get("/experiments")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((experiment) => experiment.id)).toEqual([visible.id]);
  });

  test("returns all experiments for moderators", async () => {
    const moderator = await insertUser({
      email: nextEmail("list-moderator"),
      role: "moderator",
    });
    await insertExperiment({ title: "Draft", status: "draft" });
    await insertExperiment({
      title: "Archived",
      status: "approved",
      archived_at: "2026-06-04 10:00:00",
    });
    const token = await login(moderator);

    const response = await request(app)
      .get("/experiments")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((experiment) => experiment.title)).toEqual(
      expect.arrayContaining(["Draft", "Archived"])
    );
  });
});

describe("PATCH /experiments/:id/status", () => {
  test("requires moderator authentication and rejects invalid status", async () => {
    const developer = await insertUser({
      email: nextEmail("status-wrong-role"),
      role: "developer",
    });
    const experiment = await insertExperiment();
    const developerToken = await login(developer);

    const missingAuthResponse = await request(app)
      .patch(`/experiments/${experiment.id}/status`)
      .send({ status: "approved" });
    const wrongRoleResponse = await request(app)
      .patch(`/experiments/${experiment.id}/status`)
      .set("Authorization", `Bearer ${developerToken}`)
      .send({ status: "approved" });
    const moderator = await insertUser({
      email: nextEmail("status-moderator"),
      role: "moderator",
    });
    const moderatorToken = await login(moderator);
    const invalidStatusResponse = await request(app)
      .patch(`/experiments/${experiment.id}/status`)
      .set("Authorization", `Bearer ${moderatorToken}`)
      .send({ status: "archived" });

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongRoleResponse.status).toBe(403);
    expect(invalidStatusResponse.status).toBe(400);
    expect(invalidStatusResponse.body).toEqual({ error: "Invalid status" });
  });

  test("stores rejection comments and clears comments for non-rejected statuses", async () => {
    const moderator = await insertUser({
      email: nextEmail("moderates"),
      role: "moderator",
    });
    const experiment = await insertExperiment({
      status: "pending",
      moderation_comment: "",
    });
    const token = await login(moderator);

    const rejectedResponse = await request(app)
      .patch(`/experiments/${experiment.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "rejected", moderation_comment: "Needs detail" });
    const rejectedRow = await get(
      "SELECT status, moderation_comment FROM experiments WHERE id = ?",
      [experiment.id]
    );
    const approvedResponse = await request(app)
      .patch(`/experiments/${experiment.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "approved", moderation_comment: "Ignored" });
    const approvedRow = await get(
      "SELECT status, moderation_comment FROM experiments WHERE id = ?",
      [experiment.id]
    );

    expect(rejectedResponse.status).toBe(200);
    expect(rejectedRow).toEqual({
      status: "rejected",
      moderation_comment: "Needs detail",
    });
    expect(approvedResponse.status).toBe(200);
    expect(approvedRow).toEqual({
      status: "approved",
      moderation_comment: "",
    });
  });
});

describe("GET /experiments/published", () => {
  test("returns only approved, non-archived experiments", async () => {
    const published = await insertExperiment({
      title: "Published",
      status: "approved",
    });
    await insertExperiment({ title: "Draft", status: "draft" });
    await insertExperiment({
      title: "Archived Published",
      status: "approved",
      archived_at: "2026-06-04 10:00:00",
    });

    const response = await request(app).get("/experiments/published");

    expect(response.status).toBe(200);
    expect(response.body.map((experiment) => experiment.id)).toEqual([
      published.id,
    ]);
  });
});

describe("POST /evaluations", () => {
  test("requires user authentication", async () => {
    const developer = await insertUser({
      email: nextEmail("evaluation-developer"),
      role: "developer",
    });
    const experiment = await insertExperiment();
    const developerToken = await login(developer);

    const missingAuthResponse = await request(app)
      .post("/evaluations")
      .send(evaluationPayload({ experiment_id: experiment.id, user_id: 1 }));
    const wrongRoleResponse = await request(app)
      .post("/evaluations")
      .set("Authorization", `Bearer ${developerToken}`)
      .send(evaluationPayload({ experiment_id: experiment.id, user_id: 1 }));

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongRoleResponse.status).toBe(403);
  });

  test("creates evaluations at the rating boundary values and stores JSON defaults", async () => {
    const user = await insertUser({ email: nextEmail("evaluation-user") });
    const experiment = await insertExperiment({ status: "approved" });
    const token = await login(user);

    const response = await request(app)
      .post("/evaluations")
      .set("Authorization", `Bearer ${token}`)
      .send(
        evaluationPayload({
          experiment_id: experiment.id,
          user_id: user.id,
          clarity: 1,
          comprehension: 3,
          cognitive_load: 5,
          preferred_variant: undefined,
          comment: undefined,
          standard_answers: undefined,
          custom_answers: undefined,
        })
      );
    const row = await get("SELECT * FROM evaluations WHERE id = ?", [
      response.body.id,
    ]);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Evaluation created successfully");
    expect(row).toMatchObject({
      experiment_id: experiment.id,
      user_id: user.id,
      clarity: 1,
      comprehension: 3,
      cognitive_load: 5,
      preferred_variant: null,
      comment: "",
      standard_answers: "{}",
      custom_answers: "{}",
    });
  });

  test("rejects missing required values and duplicate user evaluations", async () => {
    const user = await insertUser({ email: nextEmail("duplicate-evaluator") });
    const experiment = await insertExperiment({ status: "approved" });
    const token = await login(user);

    const missingResponse = await request(app)
      .post("/evaluations")
      .set("Authorization", `Bearer ${token}`)
      .send(
        evaluationPayload({
          experiment_id: experiment.id,
          user_id: user.id,
          clarity: 0,
        })
      );

    const payload = evaluationPayload({
      experiment_id: experiment.id,
      user_id: user.id,
    });
    await request(app)
      .post("/evaluations")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    const duplicateResponse = await request(app)
      .post("/evaluations")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ error: "Missing required fields" });
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toEqual({
      error: "User has already evaluated this experiment",
    });
  });
});

describe("GET /evaluations/user/:userId", () => {
  test("returns an empty list or the evaluated experiment ids for a user", async () => {
    const user = await insertUser({ email: nextEmail("evaluated-user") });
    const otherUser = await insertUser({ email: nextEmail("other-evaluated-user") });
    const experiment = await insertExperiment({ status: "approved" });
    const otherExperiment = await insertExperiment({ status: "approved" });
    await insertEvaluation({
      experiment_id: experiment.id,
      user_id: user.id,
      clarity: 4,
      comprehension: 5,
      cognitive_load: 2,
    });
    await insertEvaluation({
      experiment_id: otherExperiment.id,
      user_id: otherUser.id,
      clarity: 3,
      comprehension: 3,
      cognitive_load: 3,
    });

    const emptyResponse = await request(app).get("/evaluations/user/99999");
    const populatedResponse = await request(app).get(
      `/evaluations/user/${user.id}`
    );

    expect(emptyResponse.status).toBe(200);
    expect(emptyResponse.body).toEqual([]);
    expect(populatedResponse.status).toBe(200);
    expect(populatedResponse.body).toEqual([experiment.id]);
  });
});

describe("GET /experiments/:id/results", () => {
  test("returns zero totals and averages when there are no evaluations", async () => {
    const experiment = await insertExperiment();

    const response = await request(app).get(
      `/experiments/${experiment.id}/results`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      total: 0,
      averages: {
        clarity: 0,
        comprehension: 0,
        cognitive_load: 0,
      },
      evaluations: [],
    });
  });

  test("returns totals, averages, and evaluations for multiple rows", async () => {
    const experiment = await insertExperiment();
    await insertEvaluation({
      experiment_id: experiment.id,
      user_id: 1,
      clarity: 1,
      comprehension: 3,
      cognitive_load: 5,
    });
    await insertEvaluation({
      experiment_id: experiment.id,
      user_id: 2,
      clarity: 5,
      comprehension: 5,
      cognitive_load: 1,
    });
    await insertEvaluation({
      experiment_id: (await insertExperiment()).id,
      user_id: 3,
      clarity: 5,
      comprehension: 5,
      cognitive_load: 5,
    });

    const response = await request(app).get(
      `/experiments/${experiment.id}/results`
    );

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.averages).toEqual({
      clarity: 3,
      comprehension: 4,
      cognitive_load: 3,
    });
    expect(response.body.evaluations).toHaveLength(2);
  });
});

describe("PATCH /experiments/:id/category", () => {
  test("updates category and rejects empty category boundary", async () => {
    const experiment = await insertExperiment({ category: "ux" });

    const missingResponse = await request(app)
      .patch(`/experiments/${experiment.id}/category`)
      .send({ category: "" });
    const updateResponse = await request(app)
      .patch(`/experiments/${experiment.id}/category`)
      .send({ category: "accessibility" });
    const row = await get("SELECT category FROM experiments WHERE id = ?", [
      experiment.id,
    ]);

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ error: "Category is required" });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toEqual({
      message: "Category updated successfully",
      changes: 1,
    });
    expect(row.category).toBe("accessibility");
  });
});

describe("PATCH /experiments/:id/approved-questions", () => {
  test("stores array questions and converts non-array input to an empty array", async () => {
    const experiment = await insertExperiment();

    const arrayResponse = await request(app)
      .patch(`/experiments/${experiment.id}/approved-questions`)
      .send({
        approved_custom_questions: [
          { id: "q1", text: "Question one" },
          { id: "q2", text: "Question two" },
        ],
      });
    const arrayRow = await get(
      "SELECT approved_custom_questions FROM experiments WHERE id = ?",
      [experiment.id]
    );
    const nonArrayResponse = await request(app)
      .patch(`/experiments/${experiment.id}/approved-questions`)
      .send({ approved_custom_questions: "q1" });
    const nonArrayRow = await get(
      "SELECT approved_custom_questions FROM experiments WHERE id = ?",
      [experiment.id]
    );

    expect(arrayResponse.status).toBe(200);
    expect(JSON.parse(arrayRow.approved_custom_questions)).toEqual([
      { id: "q1", text: "Question one" },
      { id: "q2", text: "Question two" },
    ]);
    expect(nonArrayResponse.status).toBe(200);
    expect(JSON.parse(nonArrayRow.approved_custom_questions)).toEqual([]);
  });
});

describe("GET /evaluations/my", () => {
  test("requires user authentication", async () => {
    const moderator = await insertUser({
      email: nextEmail("my-evaluations-moderator"),
      role: "moderator",
    });
    const moderatorToken = await login(moderator);

    const missingAuthResponse = await request(app).get("/evaluations/my");
    const wrongRoleResponse = await request(app)
      .get("/evaluations/my")
      .set("Authorization", `Bearer ${moderatorToken}`);

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongRoleResponse.status).toBe(403);
  });

  test("returns the authenticated user's joined evaluation history only", async () => {
    const user = await insertUser({ email: nextEmail("my-evaluations-user") });
    const otherUser = await insertUser({
      email: nextEmail("other-my-evaluations-user"),
    });
    const experiment = await insertExperiment({
      title: "Joined Experiment",
      type: "A/B",
      category: "accessibility",
      status: "approved",
    });
    const otherExperiment = await insertExperiment({ title: "Other Joined" });
    await insertEvaluation({
      experiment_id: experiment.id,
      user_id: user.id,
      clarity: 4,
      comprehension: 5,
      cognitive_load: 2,
      preferred_variant: "B",
      comment: "Useful",
    });
    await insertEvaluation({
      experiment_id: otherExperiment.id,
      user_id: otherUser.id,
      clarity: 1,
      comprehension: 1,
      cognitive_load: 1,
    });
    const token = await login(user);

    const response = await request(app)
      .get("/evaluations/my")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      preferred_variant: "B",
      comment: "Useful",
      experiment_id: experiment.id,
      experiment_title: "Joined Experiment",
      experiment_type: "A/B",
      category: "accessibility",
    });
  });
});

describe("PATCH /experiments/:id/archive", () => {
  test("requires developer authentication", async () => {
    const moderator = await insertUser({
      email: nextEmail("archive-moderator"),
      role: "moderator",
    });
    const experiment = await insertExperiment();
    const moderatorToken = await login(moderator);

    const missingAuthResponse = await request(app).patch(
      `/experiments/${experiment.id}/archive`
    );
    const wrongRoleResponse = await request(app)
      .patch(`/experiments/${experiment.id}/archive`)
      .set("Authorization", `Bearer ${moderatorToken}`);

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongRoleResponse.status).toBe(403);
  });

  test("archives only owned experiments in archivable statuses", async () => {
    const owner = await insertUser({
      name: "Archive Owner",
      email: nextEmail("archive-owner"),
      role: "developer",
    });
    const otherDeveloper = await insertUser({
      name: "Archive Other",
      email: nextEmail("archive-other"),
      role: "developer",
    });
    const draft = await insertExperiment({
      title: "Draft",
      status: "draft",
      created_by: owner.name,
      created_by_id: owner.id,
    });
    const approved = await insertExperiment({
      title: "Approved",
      status: "approved",
      created_by: owner.name,
      created_by_id: owner.id,
    });
    const otherOwned = await insertExperiment({
      title: "Other Owned",
      status: "pending",
      created_by: otherDeveloper.name,
      created_by_id: otherDeveloper.id,
    });
    const token = await login(owner);

    const successResponse = await request(app)
      .patch(`/experiments/${draft.id}/archive`)
      .set("Authorization", `Bearer ${token}`);
    const approvedResponse = await request(app)
      .patch(`/experiments/${approved.id}/archive`)
      .set("Authorization", `Bearer ${token}`);
    const otherOwnedResponse = await request(app)
      .patch(`/experiments/${otherOwned.id}/archive`)
      .set("Authorization", `Bearer ${token}`);
    const rows = await all(
      "SELECT id, archived_at FROM experiments WHERE id IN (?, ?, ?) ORDER BY id",
      [draft.id, approved.id, otherOwned.id]
    );

    expect(successResponse.status).toBe(200);
    expect(successResponse.body).toEqual({
      message: "Experiment archived successfully",
      changes: 1,
    });
    expect(approvedResponse.status).toBe(403);
    expect(approvedResponse.body).toEqual({
      error: "Experiment cannot be archived",
    });
    expect(otherOwnedResponse.status).toBe(403);
    expect(otherOwnedResponse.body).toEqual({
      error: "Experiment cannot be archived",
    });
    expect(rows.find((row) => row.id === draft.id).archived_at).toEqual(
      expect.any(String)
    );
    expect(rows.find((row) => row.id === approved.id).archived_at).toBeNull();
    expect(rows.find((row) => row.id === otherOwned.id).archived_at).toBeNull();
  });
});
