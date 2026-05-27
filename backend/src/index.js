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
    short_description,
    instructions,
    type,
    category,
    created_by,
    variant_a_html,
    variant_b_html,
    custom_questions,
    status,
  } = req.body;

  console.log("BODY /experiments:", req.body);
  console.log("FIELDS:", {
    title,
    description,
    short_description,
    instructions,
    type,
    category,
    created_by,
  });

  if (!title || !type || !short_description || !category || !created_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO experiments
    (title, description, short_description, instructions, type, category, status, created_by, variant_a_html, variant_b_html, custom_questions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      title,
      description || "",
      short_description,
      instructions || "",
      type,
      category,
      status || "draft",
      created_by,
      variant_a_html || "",
      variant_b_html || "",
      JSON.stringify(custom_questions || []),
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
    standard_answers,
    custom_answers,
  } = req.body;

  if (!title || !type || !short_description || !category || !created_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO evaluations
    (experiment_id, clarity, comprehension, cognitive_load, preferred_variant, comment, standard_answers, custom_answers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(standard_answers || {}),
      JSON.stringify(custom_answers || {}),
    ],
    function (err) {
      if (err) {
        console.error("ERROR SQL:", err);
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

app.patch("/experiments/:id/category", (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }

  const query = `
    UPDATE experiments
    SET category = ?
    WHERE id = ?
  `;

  db.run(query, [category, id], function (err) {
    if (err) {
      console.error("ERROR updating category:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: "Category updated successfully",
      changes: this.changes,
    });
  });
});

app.patch("/experiments/:id/approved-questions", (req, res) => {
  const { id } = req.params;
  const { approved_custom_questions } = req.body;

  const questions = Array.isArray(approved_custom_questions)
    ? approved_custom_questions
    : [];

  const query = `
    UPDATE experiments
    SET approved_custom_questions = ?
    WHERE id = ?
  `;

  db.run(query, [JSON.stringify(questions), id], function (err) {
    if (err) {
      console.error("ERROR updating approved questions:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: "Approved questions updated successfully",
      changes: this.changes,
    });
  });
});