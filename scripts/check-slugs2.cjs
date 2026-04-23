const path = require("path");
const Database = require("better-sqlite3");
const dbPath = path.join(__dirname, "..", "prisma", "dev.db");
const db = new Database(dbPath, { readonly: true });
const rows = db.prepare("SELECT slug, orgId, name FROM Board").all();
console.log(rows);
db.close();
