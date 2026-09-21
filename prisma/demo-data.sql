-- Cookly demo data v1. Run the ENTIRE file in Neon SQL Editor after migrations.
-- Fictional creators; no passwords, sessions, admin roles or verification claims.
-- Existing records are never updated. Conflicting natural keys abort the transaction.
-- Re-running skips existing IDs; edited existing recipes and their children are preserved.
-- Image paths refer to existing illustrative public/images assets; no uploads are needed.
BEGIN;
SET LOCAL search_path = public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

INSERT INTO "User" ("id", "email", "updatedAt") VALUES
  ('demo-user-emma', 'emma@cookly.example', CURRENT_TIMESTAMP),
  ('demo-user-daniel', 'daniel@cookly.example', CURRENT_TIMESTAMP),
  ('demo-user-sophie', 'sophie@cookly.example', CURRENT_TIMESTAMP),
  ('demo-user-aisha', 'aisha@cookly.example', CURRENT_TIMESTAMP),
  ('demo-user-marcus', 'marcus@cookly.example', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Profile" ("id", "userId", "username", "displayName", "bio", "updatedAt") VALUES
  ('demo-profile-emma', 'demo-user-emma', 'demo-emma', 'Emma Chen', 'Fictional Cookly demo creator. Simple weeknight cooking.', CURRENT_TIMESTAMP),
  ('demo-profile-daniel', 'demo-user-daniel', 'demo-daniel', 'Daniel Kim', 'Fictional Cookly demo creator. Everyday meals with bold flavors.', CURRENT_TIMESTAMP),
  ('demo-profile-sophie', 'demo-user-sophie', 'demo-sophie', 'Sophie Laurent', 'Fictional Cookly demo creator. Slow mornings and cozy breakfasts.', CURRENT_TIMESTAMP),
  ('demo-profile-aisha', 'demo-user-aisha', 'demo-aisha', 'Aisha Khan', 'Fictional Cookly demo creator. Colorful bowls and seasonal vegetables.', CURRENT_TIMESTAMP),
  ('demo-profile-marcus', 'demo-user-marcus', 'demo-marcus', 'Marcus Lee', 'Fictional Cookly demo creator. Comforting soups and simple suppers.', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Category" ("id", "name", "slug", "updatedAt") VALUES
  ('demo-category-pasta', 'Pasta', 'pasta', CURRENT_TIMESTAMP),
  ('demo-category-seafood', 'Seafood', 'seafood', CURRENT_TIMESTAMP),
  ('demo-category-breakfast', 'Breakfast', 'breakfast', CURRENT_TIMESTAMP),
  ('demo-category-bowls', 'Bowls', 'bowls', CURRENT_TIMESTAMP),
  ('demo-category-soups', 'Soups', 'soups', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Cuisine" ("id", "name", "slug", "updatedAt") VALUES
  ('demo-cuisine-italian', 'Italian-inspired', 'italian-inspired', CURRENT_TIMESTAMP),
  ('demo-cuisine-japanese', 'Japanese-inspired', 'japanese-inspired', CURRENT_TIMESTAMP),
  ('demo-cuisine-international', 'International', 'international', CURRENT_TIMESTAMP),
  ('demo-cuisine-mediterranean', 'Mediterranean-inspired', 'mediterranean-inspired', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Tag" ("id", "name", "slug") VALUES
  ('demo-tag-quick', 'Quick meals', 'quick'),
  ('demo-tag-comfort', 'Comfort food', 'comfort'),
  ('demo-tag-vegetarian', 'Vegetarian', 'vegetarian'),
  ('demo-tag-fresh', 'Fresh favorites', 'fresh')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Ingredient" ("id", "name", "normalizedName", "slug", "updatedAt")
SELECT 'demo-ingredient-' || slug, name, name, slug, CURRENT_TIMESTAMP
FROM (VALUES
  ('pasta', 'pasta'), ('lemon', 'lemon'), ('olive oil', 'olive-oil'),
  ('garlic', 'garlic'), ('cream', 'cream'), ('hard cheese', 'hard-cheese'),
  ('parsley', 'parsley'), ('salt', 'salt'), ('black pepper', 'black-pepper'),
  ('salmon fillet', 'salmon-fillet'), ('white miso', 'white-miso'),
  ('soy sauce', 'soy-sauce'), ('maple syrup', 'maple-syrup'),
  ('rice vinegar', 'rice-vinegar'), ('spinach', 'spinach'),
  ('sesame seeds', 'sesame-seeds'), ('banana', 'banana'),
  ('all-purpose flour', 'all-purpose-flour'), ('egg', 'egg'), ('milk', 'milk'),
  ('baking powder', 'baking-powder'), ('butter', 'butter'), ('berries', 'berries'),
  ('quinoa', 'quinoa'), ('chickpeas', 'chickpeas'), ('cucumber', 'cucumber'),
  ('tomato', 'tomato'), ('avocado', 'avocado'), ('onion', 'onion'),
  ('vegetable stock', 'vegetable-stock'), ('basil', 'basil')
) AS ingredients(name, slug)
ON CONFLICT ("id") DO NOTHING;

-- Insert each recipe and its children together, only when the recipe is new.
-- Ingredient tuples: canonical slug, amount, unit, optional, recipe-specific note.
DO $seed$
DECLARE
  recipe jsonb;
  inserted_id text;
BEGIN
  FOR recipe IN SELECT value FROM jsonb_array_elements($recipes$[
    {
      "slug": "lemon-pasta", "title": "Creamy Lemon Herb Pasta",
      "description": "Demo recipe: a bright lemon and herb pasta for a simple weeknight meal. Illustrative photo; not reviewed by Cookly.",
      "author": "emma", "category": "pasta", "cuisine": "italian",
      "servings": 2, "prep": 5, "cook": 15,
      "tags": ["quick", "comfort"],
      "ingredients": [["pasta",200,"g",false,null],["lemon",1,"piece",false,"Zest and juice"],["olive-oil",1,"tbsp",false,null],["garlic",2,"cloves",false,"Minced"],["cream",100,"ml",false,null],["hard-cheese",30,"g",false,"Finely grated"],["parsley",10,"g",false,"Chopped"],["salt",null,null,true,"To taste"],["black-pepper",null,null,true,"To taste"]],
      "steps": ["Cook the pasta according to its package directions. Reserve a cup of cooking water before draining.","Warm the olive oil in a large pan over medium-low heat. Add the garlic and cook for one minute without browning.","Add the cream and lemon zest. Simmer gently for two minutes, then stir in the drained pasta and grated cheese.","Loosen with a little reserved pasta water. Add lemon juice to taste and the parsley. Season as desired and serve."]
    },
    {
      "slug": "salmon", "title": "Miso Glazed Salmon",
      "description": "Demo recipe: oven-baked salmon with a savory miso glaze and spinach. Illustrative photo; not reviewed by Cookly.",
      "author": "daniel", "category": "seafood", "cuisine": "japanese",
      "servings": 2, "prep": 10, "cook": 15,
      "tags": ["quick"],
      "ingredients": [["salmon-fillet",300,"g",false,"Two evenly sized fillets"],["white-miso",1,"tbsp",false,null],["soy-sauce",1,"tsp",false,null],["maple-syrup",1,"tbsp",false,null],["rice-vinegar",1,"tsp",false,null],["spinach",150,"g",false,null],["olive-oil",1,"tsp",false,null],["sesame-seeds",1,"tsp",true,"To finish"]],
      "steps": ["Heat the oven to 200 C. Line a baking tray. Mix the miso, soy sauce, maple syrup and rice vinegar in a small bowl.","Place the salmon on the tray and spread the glaze over the top. Bake for about 12 to 15 minutes, adjusting for thickness, until fully cooked; check the center with a food thermometer against local food-safety guidance.","While the salmon cooks, warm the oil in a pan and wilt the spinach for two to three minutes.","Divide the spinach between two plates, add the salmon and finish with optional sesame seeds."]
    },
    {
      "slug": "pancakes", "title": "Fluffy Banana Pancakes",
      "description": "Demo recipe: small banana pancakes for a cozy breakfast. Illustrative photo; not reviewed by Cookly.",
      "author": "sophie", "category": "breakfast", "cuisine": "international",
      "servings": 2, "prep": 5, "cook": 10,
      "tags": ["quick", "comfort", "vegetarian"],
      "ingredients": [["banana",1,"piece",false,"Ripe, mashed"],["all-purpose-flour",120,"g",false,null],["egg",1,"piece",false,null],["milk",150,"ml",false,null],["baking-powder",1,"tsp",false,null],["butter",10,"g",false,"For the pan"],["berries",80,"g",true,"To serve"],["maple-syrup",1,"tbsp",true,"To serve"]],
      "steps": ["Whisk the mashed banana, egg and milk in a bowl.","Mix the flour and baking powder separately, then fold into the wet ingredients just until combined.","Heat a nonstick pan over medium heat and lightly grease with butter. Spoon in small portions of batter.","Cook for two to three minutes until bubbles appear, then turn and cook the other side until golden and the centers are cooked through. Serve with optional berries and maple syrup."]
    },
    {
      "slug": "grain-bowl", "title": "Mediterranean Grain Bowl",
      "description": "Demo recipe: quinoa, chickpeas and crisp vegetables with lemon dressing. Illustrative photo; not reviewed by Cookly.",
      "author": "aisha", "category": "bowls", "cuisine": "mediterranean",
      "servings": 2, "prep": 5, "cook": 15,
      "tags": ["quick", "fresh", "vegetarian"],
      "ingredients": [["quinoa",120,"g",false,"Dry weight; rinse before cooking"],["chickpeas",240,"g",false,"Cooked, drained and rinsed"],["cucumber",150,"g",false,"Diced"],["tomato",150,"g",false,"Chopped"],["avocado",1,"piece",false,"Sliced"],["lemon",1,"piece",false,"Juice to taste"],["olive-oil",2,"tbsp",false,null],["parsley",10,"g",true,"Chopped"],["salt",null,null,true,"To taste"]],
      "steps": ["Cook the rinsed quinoa according to its package directions, then fluff with a fork and let it cool slightly.","While the quinoa cooks, dice the cucumber and tomatoes, slice the avocado and rinse the cooked chickpeas.","Whisk the olive oil with lemon juice to taste and optional salt.","Divide the quinoa and vegetables between bowls, add the chickpeas and drizzle with dressing. Finish with optional parsley."]
    },
    {
      "slug": "tomato-soup", "title": "Roasted Tomato Soup",
      "description": "Demo recipe: roasted tomatoes blended into a comforting soup. Illustrative photo; not reviewed by Cookly.",
      "author": "marcus", "category": "soups", "cuisine": "international",
      "servings": 4, "prep": 10, "cook": 30,
      "tags": ["comfort", "vegetarian"],
      "ingredients": [["tomato",800,"g",false,"Halved"],["onion",1,"piece",false,"Cut into wedges"],["garlic",3,"cloves",false,"Peeled"],["olive-oil",2,"tbsp",false,null],["vegetable-stock",500,"ml",false,null],["basil",10,"g",false,null],["cream",50,"ml",true,"To finish"],["salt",null,null,true,"To taste"],["black-pepper",null,null,true,"To taste"]],
      "steps": ["Heat the oven to 220 C. Place the tomatoes, onion and garlic on a roasting tray and toss with the olive oil.","Roast for about 25 minutes until softened and lightly browned.","Transfer the vegetables and their juices to a saucepan. Add the stock and simmer for five minutes.","Remove from the heat, add the basil and blend carefully with an immersion blender, keeping the blade submerged. Season to taste and finish with optional cream."]
    }
  ]$recipes$::jsonb)
  LOOP
    inserted_id := NULL;
    INSERT INTO "Recipe" (
      "id", "authorId", "slug", "title", "description", "coverImageUrl",
      "servings", "prepMinutes", "cookMinutes", "difficulty", "status",
      "verificationStatus", "publishedAt", "updatedAt", "categoryId", "cuisineId"
    ) VALUES (
      'demo-recipe-' || (recipe->>'slug'), 'demo-user-' || (recipe->>'author'),
      recipe->>'slug', recipe->>'title', recipe->>'description',
      '/images/' || (recipe->>'slug') || '.webp',
      (recipe->>'servings')::int, (recipe->>'prep')::int, (recipe->>'cook')::int,
      'EASY', 'PUBLISHED', 'NONE', '2026-09-18T12:00:00Z', CURRENT_TIMESTAMP,
      'demo-category-' || (recipe->>'category'), 'demo-cuisine-' || (recipe->>'cuisine')
    ) ON CONFLICT ("id") DO NOTHING RETURNING "id" INTO inserted_id;

    IF inserted_id IS NOT NULL THEN
      INSERT INTO "RecipeIngredient" ("id", "recipeId", "ingredientId", "amount", "unit", "isOptional", "note", "position")
      SELECT inserted_id || '-ingredient-' || n, inserted_id,
        'demo-ingredient-' || (item->>0), (item->>1)::numeric,
        item->>2, (item->>3)::boolean, item->>4, n::int
      FROM jsonb_array_elements(recipe->'ingredients') WITH ORDINALITY AS items(item, n);

      INSERT INTO "RecipeStep" ("id", "recipeId", "position", "instruction")
      SELECT inserted_id || '-step-' || n, inserted_id, n::int, instruction
      FROM jsonb_array_elements_text(recipe->'steps') WITH ORDINALITY AS steps(instruction, n);

      INSERT INTO "RecipeTag" ("recipeId", "tagId")
      SELECT inserted_id, 'demo-tag-' || tag
      FROM jsonb_array_elements_text(recipe->'tags') AS tags(tag);
    END IF;
  END LOOP;
END;
$seed$;

COMMIT;

-- Expected on a fresh database: 5 demo users, 5 recipes, 43 ingredient rows, 20 steps.
SELECT 'demo users' AS entity, count(*) AS total FROM "User" WHERE "id" LIKE 'demo-user-%'
UNION ALL SELECT 'demo recipes', count(*) FROM "Recipe" WHERE "id" LIKE 'demo-recipe-%'
UNION ALL SELECT 'demo recipe ingredients', count(*) FROM "RecipeIngredient" WHERE "recipeId" LIKE 'demo-recipe-%'
UNION ALL SELECT 'demo steps', count(*) FROM "RecipeStep" WHERE "recipeId" LIKE 'demo-recipe-%';
