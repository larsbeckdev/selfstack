import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.resolve("prisma/dev.db");
const db = new DatabaseSync(dbPath);

function toSlug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

const users = db
  .prepare("SELECT id, email, name, role FROM User WHERE username IS NULL")
  .all();
console.log(`Found ${users.length} user(s) without username.`);

const findUsername = db.prepare("SELECT id FROM User WHERE username = ?");
const updateUsername = db.prepare("UPDATE User SET username = ? WHERE id = ?");
const findBoards = db.prepare("SELECT id, slug FROM Board WHERE userId = ?");
const findBoardBySlug = db.prepare(
  "SELECT id FROM Board WHERE slug = ? AND id <> ?",
);
const updateBoardSlug = db.prepare("UPDATE Board SET slug = ? WHERE id = ?");

for (const u of users) {
  const local = String(u.email).split("@")[0];
  const base =
    toSlug(local) || toSlug(u.name) || `user-${String(u.id).slice(0, 6)}`;
  let username = base;
  let n = 0;
  while (findUsername.get(username)) {
    n++;
    username = `${base}-${n}`;
  }
  updateUsername.run(username, u.id);
  console.log(`  user ${u.email} -> ${username}`);

  if (u.role === "admin") continue;

  const boards = findBoards.all(u.id);
  for (const b of boards) {
    if (String(b.slug).includes("/")) continue;
    let newSlug = `${username}/${b.slug}`;
    let k = 0;
    while (findBoardBySlug.get(newSlug, b.id)) {
      k++;
      newSlug = `${username}/${b.slug}-${k}`;
    }
    updateBoardSlug.run(newSlug, b.id);
    console.log(`    board ${b.id}: ${b.slug} -> ${newSlug}`);
  }
}

db.close();
console.log("Done.");
