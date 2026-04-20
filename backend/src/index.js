const express = require("express");
const cors = require("cors");
const { db, initDb } = require("./db");

const app = express();
const PORT = 4000;

initDb();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/experiments", (req, res) => {
  const {
    title,
    description,
    type,
    created_by,
    variant_a_html,
    variant_b_html,
    status,
  } = req.body;

  if (!title || !type || !created_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO experiments
    (title, description, type, status, created_by, variant_a_html, variant_b_html)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      title,
      description || "",
      type,
      status || "draft",
      created_by,
      variant_a_html || "",
      variant_b_html || "",
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        message: "Experiment created successfully",
      });
    }
  );
});

app.get("/experiments", (_req, res) => {
  db.all(
    `SELECT * FROM experiments ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

app.patch("/experiments/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["draft", "pending", "approved", "rejected"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  db.run(
    `UPDATE experiments SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: "Experiment status updated successfully",
        changes: this.changes,
      });
    }
  );
});

app.get("/experiments/published", (_req, res) => {
  db.all(
    `SELECT * FROM experiments WHERE status = 'approved' ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

app.post("/evaluations", (req, res) => {
  const {
    experiment_id,
    clarity,
    comprehension,
    cognitive_load,
    preferred_variant,
    comment,
  } = req.body;

  if (!experiment_id || !clarity || !comprehension || !cognitive_load) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO evaluations
    (experiment_id, clarity, comprehension, cognitive_load, preferred_variant, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      experiment_id,
      clarity,
      comprehension,
      cognitive_load,
      preferred_variant || null,
      comment || "",
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        message: "Evaluation created successfully",
      });
    }
  );
});

app.get("/experiments/:id/results", (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT * FROM evaluations WHERE experiment_id = ?`,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (rows.length === 0) {
        return res.json({
          total: 0,
          averages: {
            clarity: 0,
            comprehension: 0,
            cognitive_load: 0,
          },
          evaluations: [],
        });
      }

      const total = rows.length;

      const averages = {
        clarity:
          rows.reduce((sum, row) => sum + row.clarity, 0) / total,
        comprehension:
          rows.reduce((sum, row) => sum + row.comprehension, 0) / total,
        cognitive_load:
          rows.reduce((sum, row) => sum + row.cognitive_load, 0) / total,
      };

      res.json({
        total,
        averages,
        evaluations: rows,
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});