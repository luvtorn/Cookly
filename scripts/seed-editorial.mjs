import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { editorialDatabase, argument } from "./editorial-database.mjs";
import { z } from "zod";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const tagNames = {
  quick: "Quick & Easy",
  fresh: "Fresh & Green",
  comfort: "Comfort Food",
  vegetarian: "Vegetarian",
};
export async function seedEditorial(client, email, assets) {
  const recipes = JSON.parse(
    await readFile(
      new URL("../prisma/starter-recipes.json", import.meta.url),
      "utf8",
    ),
  );
  const assetSchema = z.record(
    z.string(),
    z.object({
      url: z.url().refine((v) => v.startsWith("https://res.cloudinary.com/")),
      key: z.string().min(1),
    }),
  );
  assets = assetSchema.parse(assets);
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(729415027)");
    const owner = await client.query(
      "SELECT id FROM \"User\" WHERE email=$1 AND role='ADMIN' AND status='ACTIVE'",
      [email.trim().toLowerCase()],
    );
    if (owner.rowCount !== 1) throw new Error("Active administrator required.");
    const authorId = owner.rows[0].id;
    let created = 0,
      skipped = 0;
    for (const recipe of recipes) {
      const id = `cookly-editorial-${recipe.slug}`;
      const found = await client.query(
        'SELECT id,"authorId","isEditorial" FROM "Recipe" WHERE id=$1 OR slug=$2',
        [id, recipe.slug],
      );
      if (found.rowCount) {
        if (
          found.rowCount !== 1 ||
          found.rows[0].id !== id ||
          found.rows[0].authorId !== authorId ||
          !found.rows[0].isEditorial
        )
          throw new Error("Starter recipe identity conflict.");
        skipped++;
        continue;
      }
      const asset = assets[recipe.slug];
      if (!asset) throw new Error("Missing approved cover.");
      const taxonomy = async (table, name) => {
        // Table is a fixed internal allowlist, never user input.
        if (!["Category", "Cuisine", "Tag"].includes(table))
          throw new Error("Invalid taxonomy.");
        const slug = slugify(name),
          key = `cookly-${table.toLowerCase()}-${slug}`;
        const rows = await client.query(
          `SELECT id,name,slug FROM "${table}" WHERE slug=$1 OR name=$2`,
          [slug, name],
        );
        if (
          rows.rowCount === 1 &&
          rows.rows[0].slug === slug &&
          rows.rows[0].name === name
        )
          return rows.rows[0].id;
        if (rows.rowCount) throw new Error("Taxonomy conflict.");
        await client.query(
          `INSERT INTO "${table}" (id,name,slug${table !== "Tag" ? ',"updatedAt"' : ""}) VALUES ($1,$2,$3${table !== "Tag" ? ",CURRENT_TIMESTAMP" : ""})`,
          [key, name, slug],
        );
        return key;
      };
      const categoryId = await taxonomy("Category", recipe.category),
        cuisineId = await taxonomy("Cuisine", recipe.cuisine);
      await client.query(
        'INSERT INTO "Recipe" (id,"authorId",slug,title,description,"coverImageUrl","coverImageKey",servings,"prepMinutes","cookMinutes",difficulty,status,"isEditorial","coverImageIsAi","publishedAt","updatedAt","categoryId","cuisineId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,\'PUBLISHED\',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$12,$13)',
        [
          id,
          authorId,
          recipe.slug,
          recipe.title,
          recipe.description,
          asset.url,
          asset.key,
          recipe.servings,
          recipe.prepMinutes,
          recipe.cookMinutes,
          recipe.difficulty,
          categoryId,
          cuisineId,
        ],
      );
      for (const [
        position,
        [name, amount, unit],
      ] of recipe.ingredients.entries()) {
        const normalized = name
          .normalize("NFKC")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");
        const ingredientId = `ingredient-${createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
        const result = await client.query(
          'INSERT INTO "Ingredient" (id,name,"normalizedName",slug,"updatedAt") VALUES ($1,$2,$2,$3,CURRENT_TIMESTAMP) ON CONFLICT ("normalizedName") DO UPDATE SET "normalizedName"=EXCLUDED."normalizedName" RETURNING id',
          [
            ingredientId,
            normalized,
            `${slugify(normalized)}-${createHash("sha256").update(normalized).digest("hex").slice(0, 10)}`,
          ],
        );
        await client.query(
          'INSERT INTO "RecipeIngredient" (id,"recipeId","ingredientId",amount,unit,position) VALUES ($1,$2,$3,$4,$5,$6)',
          [
            `${id}-ingredient-${position}`,
            id,
            result.rows[0].id,
            amount,
            unit,
            position,
          ],
        );
      }
      for (const [position, instruction] of recipe.steps.entries())
        await client.query(
          'INSERT INTO "RecipeStep" (id,"recipeId",position,instruction) VALUES ($1,$2,$3,$4)',
          [`${id}-step-${position}`, id, position, instruction],
        );
      for (const slug of recipe.tags) {
        const tagId = `cookly-tag-${slug}`;
        await client.query(
          'INSERT INTO "Tag" (id,name,slug) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING',
          [tagId, tagNames[slug], slug],
        );
        await client.query(
          'INSERT INTO "RecipeTag" ("recipeId","tagId") SELECT $1,id FROM "Tag" WHERE slug=$2',
          [id, slug],
        );
      }
      created++;
    }
    await client.query("COMMIT");
    return { created, skipped };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/seed-editorial.mjs")) {
  let client;
  try {
    const email = argument("--email");
    if (!email) throw new Error("Administrator email required.");
    const assets = JSON.parse(
      await readFile(
        new URL("../prisma/starter-images.json", import.meta.url),
        "utf8",
      ),
    );
    client = await editorialDatabase();
    console.log(await seedEditorial(client, email, assets));
  } catch {
    console.error(
      "Editorial seed failed; the transaction was rolled back. Check administrator, migrations, taxonomy and image manifest.",
    );
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
