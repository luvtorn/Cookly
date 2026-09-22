import { readFile } from "node:fs/promises";
import { editorialDatabase, argument } from "./editorial-database.mjs";

// Explicit, one-off editorial approval. Never called by the normal seed.
export async function verifyEditorial(client, email) {
  const starters = JSON.parse(
    await readFile(
      new URL("../prisma/starter-recipes.json", import.meta.url),
      "utf8",
    ),
  );
  if (starters.length !== 10)
    throw new Error("Expected exactly ten starter recipes.");
  await client.query("BEGIN");
  try {
    const owner = await client.query(
      "SELECT id FROM \"User\" WHERE email=$1 AND role='ADMIN' AND status='ACTIVE' FOR SHARE",
      [email.trim().toLowerCase()],
    );
    if (owner.rowCount !== 1) throw new Error("Active administrator required.");
    const actorId = owner.rows[0].id;
    let verified = 0,
      skipped = 0;
    for (const starter of starters) {
      const id = `cookly-editorial-${starter.slug}`;
      const result = await client.query(
        'SELECT id,slug,title,status,"isHidden","isEditorial","authorId","verificationStatus" FROM "Recipe" WHERE id=$1 FOR UPDATE',
        [id],
      );
      const recipe = result.rows[0];
      if (
        !recipe ||
        recipe.slug !== starter.slug ||
        recipe.title !== starter.title ||
        recipe.status !== "PUBLISHED" ||
        recipe.isHidden ||
        !recipe.isEditorial ||
        recipe.authorId !== actorId
      )
        throw new Error("Starter recipe identity or publication conflict.");
      const auditId = `cookly-starter-review-${starter.slug}`;
      const audited = await client.query(
        'SELECT id FROM "ModerationAction" WHERE id=$1 AND "actorId"=$2 AND "recipeId"=$3 AND action=\'VERIFY_RECIPE\'',
        [auditId, actorId, id],
      );
      if (audited.rowCount) {
        skipped++;
        continue;
      }
      if (recipe.verificationStatus !== "NONE")
        throw new Error("Recipe already has an independent review.");
      await client.query(
        'UPDATE "Recipe" SET "verificationStatus"=\'VERIFIED\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1',
        [id],
      );
      await client.query(
        'INSERT INTO "ModerationAction" (id,"actorId",action,note,"recipeId") VALUES ($1,$2,\'VERIFY_RECIPE\',$3,$4)',
        [
          auditId,
          actorId,
          "Starter collection explicitly approved by the administrator. Editorial review only; not certification or proof of cooking.",
          id,
        ],
      );
      verified++;
    }
    await client.query("COMMIT");
    return { verified, skipped };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/verify-editorial.mjs")) {
  let client;
  try {
    const email = argument("--email");
    if (!email) throw new Error("Administrator email required.");
    client = await editorialDatabase();
    console.log(await verifyEditorial(client, email));
  } catch {
    console.error(
      "Starter approval failed and was rolled back. Inspect administrator, recipe identities and existing decisions before retrying.",
    );
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
