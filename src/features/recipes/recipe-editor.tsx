"use client";
import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeSchema, type RecipeInput, type RecipeOptions } from "./schema";
import { saveRecipeAction, uploadCoverAction } from "./actions";
import { saveUserRecipeAction, uploadUserCoverAction } from "./creator-actions";
import { IngredientCombobox } from "./ingredient-combobox";
import { useI18n } from "@/lib/i18n/context";

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
  mode = "admin",
}: {
  options: RecipeOptions;
  initial?: RecipeInput;
  coverUrl?: string;
  slug?: string;
  mode?: "admin" | "creator";
}) {
  const router = useRouter();
  const { t, href } = useI18n();
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
        {
          name: "",
          amount: "",
          unit: "",
          note: "",
          isOptional: false,
          createNew: false,
        },
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
      const result =
        mode === "admin"
          ? await saveRecipeAction(data)
          : await saveUserRecipeAction(data);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setMessage(t("editor.saved"));
      router.replace(
        mode === "admin"
          ? `/admin/recipes/${result.recipe.id}/edit`
          : href(`/my-recipes/${result.recipe.id}/edit`),
      );
      router.refresh();
    } catch {
      setMessage(t("editor.saveError"));
    } finally {
      locked.current = false;
    }
  };
  return (
    <form
      className="recipe-editor"
      onSubmit={(event) =>
        void handleSubmit(submit, () => setMessage(t("editor.checkFields")))(
          event,
        )
      }
      noValidate
      aria-busy={pending}
    >
      <div className="section-heading admin-page-heading">
        <div>
          <Link
            href={mode === "admin" ? "/admin/recipes" : href("/my-recipes")}
            className="text-link"
          >
            ← {t("editor.back")}
          </Link>
          <h1>{initial ? t("editor.editHeading") : t("editor.newHeading")}</h1>
          <p>{t("editor.care")}</p>
        </div>
        {slug && initial?.status === "PUBLISHED" && (
          <Link className="button-secondary" href={href(`/recipes/${slug}`)}>
            {t("editor.view")} ↗
          </Link>
        )}
      </div>
      <fieldset disabled={pending} className="editor-layout">
        <div className="editor-main">
          <section className="admin-panel glass">
            <h2>{t("editor.essentials")}</h2>
            <Field label={t("editor.title")} error={errors.title?.message}>
              <input
                {...register("title")}
                maxLength={140}
                placeholder="Give your dish a name"
                aria-invalid={!!errors.title}
              />
            </Field>
            <Field
              label={t("editor.description")}
              error={errors.description?.message}
            >
              <textarea
                {...register("description")}
                rows={3}
                maxLength={600}
                placeholder="What makes this dish special?"
                aria-invalid={!!errors.description}
              />
            </Field>
            <div className="editor-three">
              <Field
                label={t("editor.servings")}
                error={errors.servings?.message}
              >
                <input
                  type="number"
                  min={1}
                  max={100}
                  {...register("servings", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label={t("editor.prepTime")}
                error={errors.prepMinutes?.message}
              >
                <input
                  type="number"
                  min={0}
                  max={1440}
                  {...register("prepMinutes", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label={t("editor.cookTime")}
                error={errors.cookMinutes?.message}
              >
                <input
                  type="number"
                  min={0}
                  max={1440}
                  {...register("cookMinutes", { valueAsNumber: true })}
                />
              </Field>
            </div>
            <div className="editor-three">
              <Field
                label={t("editor.category")}
                error={errors.categoryId?.message}
              >
                <select {...register("categoryId")}>
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("editor.cuisine")}>
                <select {...register("cuisineId")}>
                  <option value="">{t("editor.notSpecified")}</option>
                  {options.cuisines.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("catalog.difficulty")}>
                <select {...register("difficulty")}>
                  <option value="EASY">{t("difficulty.easy")}</option>
                  <option value="MEDIUM">{t("difficulty.medium")}</option>
                  <option value="HARD">{t("difficulty.hard")}</option>
                </select>
              </Field>
            </div>
            <fieldset className="editor-tags">
              <legend>{t("editor.discoveryTags")}</legend>
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
                <h2>{t("editor.ingredients")}</h2>
                <p>Use simple names, such as “chicken breast”.</p>
              </div>
            </div>
            {ingredients.fields.map((item, index) => (
              <fieldset key={item.id} className="ingredient-row">
                <legend>
                  {t("common.ingredients")} {index + 1}
                </legend>
                <div className="ingredient-main">
                  <IngredientCombobox control={control} index={index} />
                  <Field
                    label={t("editor.amount")}
                    error={errors.ingredients?.[index]?.amount?.message}
                  >
                    <input
                      {...register(`ingredients.${index}.amount`)}
                      inputMode="decimal"
                      placeholder="200"
                    />
                  </Field>
                  <Field
                    label={t("editor.unit")}
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
                  label={t("editor.note")}
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
                    {t("editor.optional")}
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
                    {t("editor.remove")}
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
                  createNew: false,
                })
              }
            >
              + {t("editor.addIngredient")}
            </button>
          </section>
          <section className="admin-panel glass">
            <h2>{t("recipe.method")}</h2>
            <p>One clear instruction at a time.</p>
            {steps.fields.map((step, index) => (
              <div className="step-row" key={step.id}>
                <Field
                  label={`${t("editor.step")} ${index + 1}`}
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
                    {t("editor.remove")}
                    <span className="sr-only">
                      {" "}
                      {t("editor.step")} {index + 1}
                    </span>
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
              + {t("editor.addStep")}
            </button>
          </section>
        </div>
        <aside className="editor-aside">
          <section className="admin-panel glass">
            <h2>{t("editor.firstImpression")}</h2>
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
            <Field label={t("editor.uploadCover")}>
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
                    const result =
                      mode === "admin"
                        ? await uploadCoverAction(form)
                        : await uploadUserCoverAction(form);
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
            <p className="editor-help">{t("editor.imageHelp")}</p>
            <label className="editor-checkbox">
              <input type="checkbox" {...register("coverImageIsAi")} /> This
              {t("editor.aiCover")}
            </label>
          </section>
          <section className="admin-panel glass">
            <h2>{t("editor.ready")}</h2>
            <p>
              {mode === "admin"
                ? "Published under Cookly. Verification is a separate review."
                : "Published under your profile. Cookly verification is a separate review."}
            </p>
            <Field label={t("editor.publication")}>
              <select {...register("status")}>
                <option value="DRAFT">{t("editor.draftOption")}</option>
                <option value="PUBLISHED">{t("editor.publishedOption")}</option>
                <option value="ARCHIVED">{t("editor.archivedOption")}</option>
              </select>
            </Field>
            <button className="button-primary" type="submit" disabled={pending}>
              {pending
                ? uploading
                  ? t("editor.uploading")
                  : t("editor.saving")
                : t("editor.save")}
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
