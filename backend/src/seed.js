const bcrypt = require("bcryptjs");

function seedModerator(db) {
  db.get(
    `SELECT id FROM users WHERE role = 'moderator' LIMIT 1`,
    async (err, row) => {
      if (err) {
        console.error("Seed error:", err.message);
        return;
      }

      if (row) {
        console.log("Moderator already exists");
        return;
      }

      const passwordHash = await bcrypt.hash("admin123", 10);

      db.run(
        `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          account_status
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          "Admin",
          "admin@sandbox.com",
          passwordHash,
          "moderator",
          "approved",
        ],
        function (insertErr) {
          if (insertErr) {
            console.error("Failed to seed moderator:", insertErr.message);
            return;
          }

          console.log("Default moderator created");
        }
      );
    }
  );
}

module.exports = {
  seedModerator,
};