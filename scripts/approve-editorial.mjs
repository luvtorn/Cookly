import { createHash, randomUUID } from "node:crypto";
import { editorialDatabase, argument } from "./editorial-database.mjs";

// Dry-run by default. Apply only the exact inspected snapshot, without touching content.
export async function approveEditorial(client, email, confirmation) {
  await client.query("BEGIN");
  try {
    const actor = await client.query(
      `SELECT id FROM "User" WHERE email=$1 AND role='ADMIN' AND status='ACTIVE' FOR SHARE`,
      [email.trim().toLowerCase()],
    );
    if (actor.rowCount !== 1) throw new Error("Active administrator required.");
    const result = await client.query(
      `SELECT id,title,"updatedAt","verificationStatus" FROM "Recipe" WHERE "isEditorial" AND NOT "isHidden" AND status='PUBLISHED' AND "verificationStatus" <> 'VERIFIED' ORDER BY id ${confirmation ? "FOR UPDATE" : ""}`,
    );
    const digest = createHash("sha256")
      .update(JSON.stringify(result.rows))
      .digest("hex");
    if (!confirmation) {
      await client.query("ROLLBACK");
      return { targets: result.rows, confirmation: digest };
    }
    if (confirmation !== digest)
      throw new Error("Targets changed. Run the preview again.");
    for (const recipe of result.rows) {
      await client.query(
        `UPDATE "Recipe" SET "verificationStatus"='VERIFIED',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1`,
        [recipe.id],
      );
      await client.query(
        `UPDATE "RecipeVerificationRequest" SET status='VERIFIED',"reviewedAt"=CURRENT_TIMESTAMP,"reviewedById"=$2 WHERE "recipeId"=$1 AND status='PENDING'`,
        [recipe.id, actor.rows[0].id],
      );
      await client.query(
        `INSERT INTO "ModerationAction" (id,"actorId",action,"recipeId",note) VALUES ($1,$2,'VERIFY_RECIPE',$3,$4)`,
        [
          randomUUID(),
          actor.rows[0].id,
          recipe.id,
          "Existing editorial publication approved under the Studio policy.",
        ],
      );
    }
    await client.query("COMMIT");
    return { verified: result.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/approve-editorial.mjs")) {
  let client;
  try {
    const email = argument("--email");
    if (!email) throw new Error("Administrator email required.");
    client = await editorialDatabase();
    console.log(
      JSON.stringify(
        await approveEditorial(client, email, argument("--apply")),
        null,
        2,
      ),
    );
  } catch {
    console.error(
      "Editorial approval stopped. Check the administrator, migration and target snapshot; preview again before applying.",
    );
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
