"use client";
import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeSchema, type RecipeInput, type RecipeOptions } from "./schema";
import { saveRecipeAction, uploadCoverAction } from "./actions";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
export function RecipeEditor({
  options,
  initial,
  coverUrl,
  slug,
}: {
  options: RecipeOptions;
  initial?: RecipeInput;
  coverUrl?: string;
  slug?: string;
}) {
  const router = useRouter();
  const locked = useRef(false);
  const [image, setImage] = useState(coverUrl);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecipeInput>({
    resolver: zodResolver(recipeSchema),
    defaultValues: initial ?? {
      title: "",
      description: "",
      servings: 2,
      prepMinutes: 10,
      cookMinutes: 20,
      difficulty: "EASY",
      status: "DRAFT",
      categoryId: options.categories[0]?.id ?? "",
      cuisineId: "",
      tagIds: [],
      coverImageIsAi: false,
      ingredients: [
        { name: "", amount: "", unit: "", note: "", isOptional: false },
      ],
      steps: [{ instruction: "" }],
    },
  });
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const steps = useFieldArray({ control, name: "steps" });
  const pending = isSubmitting || uploading;
  const submit = async (data: RecipeInput) => {
    if (locked.current) return;
    if (
      data.status === "ARCHIVED" &&
      initial?.status !== "ARCHIVED" &&
      !window.confirm(
        "Archive this recipe? It will no longer be visible on Cookly.",
      )
    )
      return;
    locked.current = true;
    setMessage("");
    try {
      const result = await saveRecipeAction(data);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setMessage("Recipe saved.");
      router.replace(`/admin/recipes/${result.recipe.id}/edit`);
      router.refresh();
    } catch {
      setMessage("Unable to save right now. Please try again.");
    } finally {
      locked.current = false;
    }
  };
  return (
    <form
      className="recipe-editor"
      onSubmit={(event) =>
        void handleSubmit(submit, () =>
          setMessage("Please check the highlighted fields."),
        )(event)
      }
      noValidate
      aria-busy={pending}
    >
      <div className="section-heading admin-page-heading">
        <div>
          <Link href="/admin/recipes" className="text-link">
            ← Your recipes
          </Link>
          <h1>{initial ? "Refine your recipe" : "A new recipe"}</h1>
          <p>Every good dish starts with a little care.</p>
        </div>
        {slug && initial?.status === "PUBLISHED" && (
          <Link className="button-secondary" href={`/recipes/${slug}`}>
            View recipe ↗
          </Link>
        )}
      </div>
      <fieldset disabled={pending} className="editor-layout">
        <div className="editor-main">
          <section className="admin-panel glass">
            <h2>The essentials</h2>
            <Field label="Recipe title" error={errors.title?.message}>
              <input
                {...register("title")}
                maxLength={140}
                placeholder="Give your dish a name"
                aria-invalid={!!errors.title}
              />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <textarea
                {...register("description")}
                rows={3}
                maxLength={600}
                placeholder="What makes this dish special?"
                aria-invalid={!!errors.description}
              />
            </Field>
            <div className="editor-three">
              <Field label="Servings" error={errors.servings?.message}>
                <input
                  type="number"
                  min={1}
                  max={100}
                  {...register("servings", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Prep (minutes)" error={errors.prepMinutes?.message}>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  {...register("prepMinutes", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Cook (minutes)" error={errors.cookMinutes?.message}>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  {...register("cookMinutes", { valueAsNumber: true })}
                />
              </Field>
            </div>
            <div className="editor-three">
              <Field label="Category" error={errors.categoryId?.message}>
                <select {...register("categoryId")}>
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cuisine">
                <select {...register("cuisineId")}>
                  <option value="">Not specified</option>
                  {options.cuisines.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty">
                <select {...register("difficulty")}>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </Field>
            </div>
            <fieldset className="editor-tags">
              <legend>Discovery tags</legend>
              {options.tags.map((t) => (
                <label key={t.id}>
                  <input type="checkbox" value={t.id} {...register("tagIds")} />
                  {t.name}
                </label>
              ))}
            </fieldset>
          </section>
          <section className="admin-panel glass">
            <div className="section-heading">
              <div>
                <h2>Ingredients</h2>
                <p>Use simple names, such as “chicken breast”.</p>
              </div>
            </div>
            {ingredients.fields.map((item, index) => (
              <fieldset key={item.id} className="ingredient-row">
                <legend>Ingredient {index + 1}</legend>
                <div className="ingredient-main">
                  <Field
                    label="Ingredient"
                    error={errors.ingredients?.[index]?.name?.message}
                  >
                    <input
                      {...register(`ingredients.${index}.name`)}
                      maxLength={100}
                    />
                  </Field>
                  <Field
                    label="Amount"
                    error={errors.ingredients?.[index]?.amount?.message}
                  >
                    <input
                      {...register(`ingredients.${index}.amount`)}
                      inputMode="decimal"
                      placeholder="200"
                    />
                  </Field>
                  <Field
                    label="Unit"
                    error={errors.ingredients?.[index]?.unit?.message}
                  >
                    <input
                      {...register(`ingredients.${index}.unit`)}
                      maxLength={32}
                      placeholder="g"
                    />
                  </Field>
                </div>
                <Field
                  label="Preparation note"
                  error={errors.ingredients?.[index]?.note?.message}
                >
                  <input
                    {...register(`ingredients.${index}.note`)}
                    maxLength={160}
                    placeholder="Optional: finely chopped"
                  />
                </Field>
                <div className="editor-row-controls">
                  <label>
                    <input
                      type="checkbox"
                      {...register(`ingredients.${index}.isOptional`)}
                    />{" "}
                    Optional ingredient
                  </label>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => ingredients.move(index, index - 1)}
                    aria-label={`Move ingredient ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === ingredients.fields.length - 1}
                    onClick={() => ingredients.move(index, index + 1)}
                    aria-label={`Move ingredient ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={ingredients.fields.length === 1}
                    onClick={() => ingredients.remove(index)}
                  >
                    Remove
                    <span className="sr-only"> ingredient {index + 1}</span>
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className="button-secondary"
              disabled={ingredients.fields.length >= 60}
              onClick={() =>
                ingredients.append({
                  name: "",
                  amount: "",
                  unit: "",
                  note: "",
                  isOptional: false,
                })
              }
            >
              + Add ingredient
            </button>
          </section>
          <section className="admin-panel glass">
            <h2>Method</h2>
            <p>One clear instruction at a time.</p>
            {steps.fields.map((step, index) => (
              <div className="step-row" key={step.id}>
                <Field
                  label={`Step ${index + 1}`}
                  error={errors.steps?.[index]?.instruction?.message}
                >
                  <textarea
                    rows={3}
                    maxLength={3000}
                    {...register(`steps.${index}.instruction`)}
                  />
                </Field>
                <div className="editor-row-controls">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => steps.move(index, index - 1)}
                    aria-label={`Move step ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === steps.fields.length - 1}
                    onClick={() => steps.move(index, index + 1)}
                    aria-label={`Move step ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={steps.fields.length === 1}
                    onClick={() => steps.remove(index)}
                  >
                    Remove<span className="sr-only"> step {index + 1}</span>
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button-secondary"
              disabled={steps.fields.length >= 40}
              onClick={() => steps.append({ instruction: "" })}
            >
              + Add step
            </button>
          </section>
        </div>
        <aside className="editor-aside">
          <section className="admin-panel glass">
            <h2>A first impression</h2>
            <div className="editor-cover">
              {image ? (
                <Image
                  src={image}
                  alt="Recipe cover preview"
                  fill
                  sizes="(max-width: 800px) 90vw, 330px"
                />
              ) : (
                <span>Your dish belongs here</span>
              )}
            </div>
            <Field label="Upload cover">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file || locked.current) return;
                  if (file.size > 3 * 1024 * 1024) {
                    setMessage("Choose an image up to 3 MiB.");
                    return;
                  }
                  locked.current = true;
                  setUploading(true);
                  setMessage("");
                  try {
                    const form = new FormData();
                    form.set("file", file);
                    const result = await uploadCoverAction(form);
                    if (result.success) {
                      setImage(result.url);
                      setValue("imageReceipt", result.receipt, {
                        shouldDirty: true,
                      });
                      setMessage(
                        "Cover uploaded. Save within 30 minutes to attach it.",
                      );
                    } else setMessage(result.message);
                  } catch {
                    setMessage("Upload failed. Please try again.");
                  } finally {
                    locked.current = false;
                    setUploading(false);
                  }
                }}
              />
            </Field>
            <p className="editor-help">JPEG, PNG or WebP · up to 3 MiB</p>
            <label className="editor-checkbox">
              <input type="checkbox" {...register("coverImageIsAi")} /> This
              cover is an AI-generated illustration
            </label>
          </section>
          <section className="admin-panel glass">
            <h2>Ready for the table?</h2>
            <p>Published under Cookly. Verification is a separate review.</p>
            <Field label="Publication status">
              <select {...register("status")}>
                <option value="DRAFT">Draft — only you can see it</option>
                <option value="PUBLISHED">Published — visible on Cookly</option>
                <option value="ARCHIVED">
                  Archived — removed from discovery
                </option>
              </select>
            </Field>
            <button className="button-primary" type="submit" disabled={pending}>
              {pending
                ? uploading
                  ? "Uploading…"
                  : "Saving…"
                : "Save recipe →"}
            </button>
          </section>
        </aside>
      </fieldset>
      <div className="editor-result" role="status" aria-live="polite">
        {message}
      </div>
    </form>
  );
}
