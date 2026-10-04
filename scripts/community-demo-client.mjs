import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import nextEnv from "@next/env";
import pg from "pg";

// Operates only through the application's authenticated actions. SQL is read-only.
const origin = "https://cookly-proj.vercel.app";
const require = createRequire(import.meta.url);
const {
  encodeReply,
} = require("next/dist/compiled/react-server-dom-webpack/client.node");
const recipes = JSON.parse(
  await readFile("prisma/community-demo-recipes.json", "utf8"),
);
const credentials = Object.fromEntries(
  (await readFile(".env.demo-accounts.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
nextEnv.loadEnvConfig(process.cwd(), true);
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const aliases = {
  cinnamon: "ground cinnamon",
  chickpeas: "cooked chickpeas",
  ginger: "fresh ginger",
  "vegetable oil": "sunflower oil",
  "chopped tomatoes": "chopped canned tomato",
  rice: "basmati rice",
  spinach: "baby spinach",
};
const categories = {
  Soup: "Soups",
  Dessert: "Desserts",
  "Main Course": "Main courses",
  Salad: "Bowls",
  Lunch: "Main courses",
};

class AppClient {
  cookies = new Map();
  ids = new Map();
  async fetch(path, init = {}) {
    const response = await fetch(new URL(path, origin), {
      ...init,
      redirect: "manual",
      headers: {
        ...init.headers,
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      },
      signal: AbortSignal.timeout(45000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const at = pair.indexOf("=");
      this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
    return response;
  }
  async discover(path) {
    const response = await this.fetch(path);
    if (response.status !== 200)
      throw new Error(`Page unavailable (${response.status})`);
    const html = await response.text();
    const scripts = [
      ...new Set(
        [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((match) => match[1]),
      ),
    ];
    for (const src of scripts) {
      const code = await (await this.fetch(src)).text();
      for (const match of code.matchAll(
        /createServerReference\)\("([a-f0-9]+)"[^)]{0,200}?"(registerAction|saveUserRecipeAction|uploadUserCoverAction|updateProfileAction|requestVerificationAction)"\)/g,
      ))
        this.ids.set(match[2], match[1]);
    }
    return html;
  }
  async action(path, name, input) {
    if (!this.ids.has(name)) await this.discover(path);
    const id = this.ids.get(name);
    if (!id) throw new Error(`Missing application action: ${name}`);
    const body = await encodeReply([input]);
    const response = await this.fetch(path, {
      method: "POST",
      headers: {
        Origin: origin,
        "Next-Action": id,
        Accept: "text/x-component",
        ...(typeof body === "string"
          ? { "Content-Type": "text/plain;charset=UTF-8" }
          : {}),
      },
      body,
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(`Action rejected (${response.status}): ${name}`);
    const resultLine = text.split("\n").find((line) => /^1:\{/.test(line));
    if (!resultLine) throw new Error(`Unexpected action response: ${name}`);
    const result = JSON.parse(resultLine.slice(2));
    if (result.success !== true)
      throw new Error(
        `Application rejected ${name}: ${result.message ?? result.code ?? "unavailable"}`,
      );
    return result;
  }
  async signIn(email, password) {
    const csrf = await (await this.fetch("/api/auth/csrf")).json();
    const response = await this.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email,
        password,
        callbackUrl: `${origin}/en/my-recipes`,
        json: "true",
      }),
    });
    if (response.status >= 400) throw new Error("Sign-in failed");
    const session = await (await this.fetch("/api/auth/session")).json();
    if (!session.user?.id) throw new Error("Authenticated session unavailable");
    return session.user.id;
  }
}

async function run() {
  const apply = process.argv.includes("--apply-cookly-demo");
  const inspect = process.argv.includes("--inspect");
  const verify = process.argv.includes("--verify");
  if (!apply && !inspect && !verify)
    throw new Error(
      "Use --inspect, --verify or the explicitly authorized --apply-cookly-demo operation.",
    );
  for (const author of ["everyday", "weekend"]) {
    const prefix = author.toUpperCase();
    const email = credentials[`${prefix}_EMAIL`];
    const username = credentials[`${prefix}_USERNAME`];
    const displayName = `Cookly ${author === "everyday" ? "Everyday" : "Weekend"} Demo`;
    const client = new AppClient();
    const conflicts = await db.query(
      'SELECT u.id,u.email,u.role,u.status,p.username FROM "User" u LEFT JOIN "Profile" p ON p."userId"=u.id WHERE lower(u.email)=lower($1) OR lower(p.username)=lower($2)',
      [email, username],
    );
    if (
      conflicts.rowCount &&
      (conflicts.rowCount !== 1 ||
        conflicts.rows[0].email !== email ||
        conflicts.rows[0].username !== username ||
        conflicts.rows[0].role !== "USER" ||
        conflicts.rows[0].status !== "ACTIVE")
    )
      throw new Error(
        "Demo account identity conflict; no existing account changed.",
      );
    if (!conflicts.rowCount) {
      if (!apply) {
        console.log(JSON.stringify({ author, account: "not-created" }));
        continue;
      }
      await client.action("/en/auth/sign-up", "registerAction", {
        displayName,
        username,
        email,
        password: credentials[`${prefix}_PASSWORD`],
        confirmation: credentials[`${prefix}_PASSWORD`],
      });
      console.log(JSON.stringify({ author, account: "created" }));
    }
    const userId = await client.signIn(
      email,
      credentials[`${prefix}_PASSWORD`],
    );
    if (conflicts.rowCount && conflicts.rows[0].id !== userId)
      throw new Error("Session identity mismatch");
    if (verify) {
      const own = await db.query(
        'SELECT r.id,r.title,r.slug,r.status,r."verificationStatus",r."isEditorial",r."isHidden",r."coverImageIsAi",r."coverImageUrl" FROM "Recipe" r WHERE r."authorId"=$1 ORDER BY r.title',
        [userId],
      );
      if (own.rowCount !== 10) throw new Error("Unexpected demo recipe count");
      for (const row of own.rows) {
        const expected = recipes.find(
          (recipe) => recipe.author === author && recipe.title === row.title,
        );
        if (
          !expected ||
          row.status !== "PUBLISHED" ||
          row.isEditorial ||
          row.isHidden ||
          !row.coverImageIsAi ||
          row.verificationStatus !==
            (expected.requestReview ? "PENDING" : "NONE")
        )
          throw new Error("Unexpected published recipe state");
        const page = await client.fetch(`/en/recipes/${row.slug}`);
        const html = await page.text();
        if (
          page.status !== 200 ||
          !html.includes(row.title) ||
          !html.includes(username) ||
          !html.includes("AI-generated")
        )
          throw new Error("Public recipe verification failed");
        const image = await fetch(row.coverImageUrl, { method: "HEAD" });
        if (!image.ok) throw new Error("Published cover unavailable");
      }
      const ownedEditor = await client.fetch(
        `/en/my-recipes/${own.rows[0].id}/edit`,
      );
      if (
        ownedEditor.status !== 200 ||
        !(await ownedEditor.text()).includes(own.rows[0].title)
      )
        throw new Error("Own editor unavailable");
      const other = await db.query(
        'SELECT r.id FROM "Recipe" r JOIN "Profile" p ON p."userId"=r."authorId" WHERE p.username=$1 LIMIT 1',
        [
          author === "everyday"
            ? "cookly_weekend_demo"
            : "cookly_everyday_demo",
        ],
      );
      const forbiddenEditor = await client.fetch(
        `/en/my-recipes/${other.rows[0].id}/edit`,
      );
      const forbiddenHtml = await forbiddenEditor.text();
      // App Router may stream a not-found boundary with HTTP 200 after headers flush.
      if (
        forbiddenEditor.status !== 404 &&
        !(
          forbiddenHtml.includes("noindex") &&
          forbiddenHtml.includes("This page isn’t on the menu.")
        )
      )
        throw new Error(
          `Foreign editor was not rejected (${forbiddenEditor.status}; noindex=${forbiddenHtml.includes("noindex")}; boundary=${forbiddenHtml.includes("This page isn’t on the menu.")}; editor=${forbiddenHtml.includes("Save recipe")})`,
        );
      const requests = await db.query(
        'SELECT q.id,q."recipeId",q.status,q."initiatedByAdmin",q."requestedById",r.title FROM "RecipeVerificationRequest" q JOIN "Recipe" r ON r.id=q."recipeId" WHERE r."authorId"=$1',
        [userId],
      );
      if (
        requests.rowCount !== 2 ||
        requests.rows.some(
          (q) =>
            q.status !== "PENDING" ||
            q.initiatedByAdmin ||
            q.requestedById !== userId,
        )
      )
        throw new Error("Unexpected demo review requests");
      console.log(
        JSON.stringify({
          author,
          authenticated: true,
          published: own.rowCount,
          publicPagesAndImages: "passed",
          ownedEditor: "passed",
          foreignEditor: "not-found boundary",
          pendingRequests: requests.rows.map(({ id, title }) => ({
            id,
            title,
          })),
        }),
      );
      continue;
    }
    await client.discover(`/en/u/${username}`);
    await client.discover("/en/recipes/new");
    if (inspect) {
      console.log(
        JSON.stringify({
          author,
          authenticated: true,
          actions: Object.fromEntries(client.ids),
        }),
      );
      continue;
    }
    await client.action(`/en/u/${username}`, "updateProfileAction", {
      displayName,
      username,
      bio: `Cookly demonstration profile featuring ${author === "everyday" ? "practical everyday" : "relaxed weekend"} recipes. Recipe covers are AI-generated illustrations.`,
      location: "",
    });
    for (let index = 0; index < recipes.length; index++) {
      const r = recipes[index];
      if (r.author !== author) continue;
      const existing = await db.query(
        'SELECT id,slug,status,"verificationStatus","isEditorial","coverImageIsAi",description FROM "Recipe" WHERE "authorId"=$1 AND title=$2',
        [userId, r.title],
      );
      if (existing.rowCount > 1)
        throw new Error(
          "Duplicate recipe identity; stopping without overwriting.",
        );
      if (
        existing.rowCount &&
        (existing.rows[0].isEditorial ||
          !existing.rows[0].coverImageIsAi ||
          existing.rows[0].description !== r.description ||
          !["DRAFT", "PUBLISHED"].includes(existing.rows[0].status))
      )
        throw new Error(
          "Existing recipe differs; stopping without overwriting.",
        );
      const category = await db.query(
        'SELECT id FROM "Category" WHERE name=$1',
        [categories[r.category] ?? r.category],
      );
      if (category.rowCount !== 1)
        throw new Error("Recipe category unavailable");
      const ingredients = [];
      for (const [display, amount, unit] of r.ingredients) {
        const name = aliases[display] ?? display.toLowerCase();
        const found = await db.query(
          'SELECT id,name FROM "Ingredient" WHERE "normalizedName"=$1',
          [name],
        );
        if (found.rowCount > 1) throw new Error("Ingredient identity conflict");
        ingredients.push({
          name,
          ...(found.rowCount
            ? { ingredientId: found.rows[0].id }
            : { createNew: true }),
          amount,
          unit,
          note: "",
          isOptional: false,
        });
      }
      let saved = existing.rows[0];
      if (!saved || saved.status === "DRAFT") {
        let receipt;
        if (!saved) {
          const bytes = await readFile(
            `public/images/community-demo/${String(index).padStart(2, "0")}.jpg`,
          );
          const form = new FormData();
          form.set(
            "file",
            new File([bytes], `${r.title}.jpg`, { type: "image/jpeg" }),
          );
          const cover = await client.action(
            "/en/recipes/new",
            "uploadUserCoverAction",
            form,
          );
          receipt = cover.receipt;
        }
        const input = {
          ...(saved ? { id: saved.id } : {}),
          title: r.title,
          description: r.description,
          servings: r.servings,
          prepMinutes: r.prep,
          cookMinutes: r.cook,
          difficulty: r.difficulty,
          status: "DRAFT",
          categoryId: category.rows[0].id,
          cuisineId: "",
          tagIds: [],
          ...(receipt ? { imageReceipt: receipt } : {}),
          coverImageIsAi: true,
          ingredients,
          steps: r.steps.map((instruction) => ({ instruction })),
        };
        if (!saved) {
          const draft = await client.action(
            "/en/recipes/new",
            "saveUserRecipeAction",
            input,
          );
          saved = draft.recipe;
          console.log(
            JSON.stringify({
              author,
              index,
              title: r.title,
              state: "draft-saved",
              id: saved.id,
            }),
          );
        }
        const persisted = await db.query(
          'SELECT r.status,r."isEditorial",r."authorId",r.description,r."coverImageIsAi",(SELECT count(*)::int FROM "RecipeIngredient" WHERE "recipeId"=r.id) AS ingredients,(SELECT count(*)::int FROM "RecipeStep" WHERE "recipeId"=r.id) AS steps FROM "Recipe" r WHERE r.id=$1',
          [saved.id],
        );
        const check = persisted.rows[0];
        if (
          !check ||
          check.status !== "DRAFT" ||
          check.isEditorial ||
          check.authorId !== userId ||
          check.description !== r.description ||
          !check.coverImageIsAi ||
          check.ingredients !== r.ingredients.length ||
          check.steps !== r.steps.length
        )
          throw new Error("Draft review failed; left private.");
        const published = await client.action(
          `/en/my-recipes/${saved.id}/edit`,
          "saveUserRecipeAction",
          { ...input, id: saved.id, status: "PUBLISHED" },
        );
        saved = published.recipe;
      }
      if (r.requestReview) {
        const status = await db.query(
          'SELECT "verificationStatus" FROM "Recipe" WHERE id=$1',
          [saved.id],
        );
        if (status.rows[0].verificationStatus === "NONE")
          await client.action(
            `/en/my-recipes/${saved.id}/edit`,
            "requestVerificationAction",
            {
              recipeId: saved.id,
              creatorNote:
                "Demo recipe submitted to demonstrate the optional Cookly review workflow.",
            },
          );
      }
      console.log(
        JSON.stringify({
          author,
          index,
          title: r.title,
          id: saved.id,
          url: `${origin}/en/recipes/${saved.slug}`,
          expectedVerification: r.requestReview ? "PENDING" : "NONE",
        }),
      );
    }
  }
}
try {
  await run();
} finally {
  await db.end();
}
