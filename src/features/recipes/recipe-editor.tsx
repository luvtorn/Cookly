"use client";
import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeSchema, type RecipeInput, type RecipeOptions } from "./schema";
import { saveRecipeAction, uploadCoverAction } from "./actions";
import { saveUserRecipeAction, uploadUserCoverAction } from "./creator-actions";
import { IngredientCombobox } from "./ingredient-combobox";
import { useI18n } from "@/lib/i18n/context";
import { GlassSelect } from "@/components/shared/glass-select";
import { ImageUploadControl } from "@/components/shared/image-upload-control";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <label className="editor-field">
      <span>{label}</span>
      {children}
      {error && (
        <small className="field-error">
          {error === "Enter a positive amount with up to two decimal places."
            ? t("editor.amountError")
            : t("editor.invalidField")}
        </small>
      )}
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
      !window.confirm(t("editor.archiveConfirm"))
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
        setMessage(t("editor.saveError"));
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
                placeholder={t("editor.titlePlaceholder")}
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
                placeholder={t("editor.descriptionPlaceholder")}
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
              <div className="editor-field">
                <span>{t("editor.category")}</span>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <GlassSelect
                      ariaLabel={t("editor.category")}
                      value={field.value}
                      onChange={field.onChange}
                      options={options.categories.map((item) => ({
                        value: item.id,
                        label: item.name,
                      }))}
                    />
                  )}
                />
                {errors.categoryId && (
                  <small className="field-error">
                    {t("editor.invalidField")}
                  </small>
                )}
              </div>
              <div className="editor-field">
                <span>{t("editor.cuisine")}</span>
                <Controller
                  name="cuisineId"
                  control={control}
                  render={({ field }) => (
                    <GlassSelect
                      ariaLabel={t("editor.cuisine")}
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: "", label: t("editor.notSpecified") },
                        ...options.cuisines.map((item) => ({
                          value: item.id,
                          label: item.name,
                        })),
                      ]}
                    />
                  )}
                />
              </div>
              <div className="editor-field">
                <span>{t("catalog.difficulty")}</span>
                <Controller
                  name="difficulty"
                  control={control}
                  render={({ field }) => (
                    <GlassSelect
                      ariaLabel={t("catalog.difficulty")}
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: "EASY", label: t("difficulty.easy") },
                        { value: "MEDIUM", label: t("difficulty.medium") },
                        { value: "HARD", label: t("difficulty.hard") },
                      ]}
                    />
                  )}
                />
              </div>
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
                <p>{t("editor.ingredientsHelp")}</p>
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
                    placeholder={t("editor.notePlaceholder")}
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
                    aria-label={t("editor.moveUp").replace(
                      "{item}",
                      `${t("common.ingredients")} ${index + 1}`,
                    )}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === ingredients.fields.length - 1}
                    onClick={() => ingredients.move(index, index + 1)}
                    aria-label={t("editor.moveDown").replace(
                      "{item}",
                      `${t("common.ingredients")} ${index + 1}`,
                    )}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={ingredients.fields.length === 1}
                    onClick={() => ingredients.remove(index)}
                  >
                    {t("editor.remove")}
                    <span className="sr-only">
                      {" "}
                      {t("common.ingredients")} {index + 1}
                    </span>
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
            <p>{t("editor.methodHelp")}</p>
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
                    aria-label={t("editor.moveUp").replace(
                      "{item}",
                      `${t("editor.step")} ${index + 1}`,
                    )}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === steps.fields.length - 1}
                    onClick={() => steps.move(index, index + 1)}
                    aria-label={t("editor.moveDown").replace(
                      "{item}",
                      `${t("editor.step")} ${index + 1}`,
                    )}
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
                  alt={t("editor.coverPreview")}
                  fill
                  sizes="(max-width: 800px) 90vw, 330px"
                />
              ) : (
                <span>{t("editor.coverEmpty")}</span>
              )}
            </div>
            <ImageUploadControl
              label={t("editor.uploadCover")}
              pendingLabel={t("editor.uploading")}
              pending={pending}
              help={t("editor.imageHelp")}
              onFile={async (file) => {
                if (locked.current) return;
                if (file.size > 3 * 1024 * 1024) {
                  setMessage(t("editor.imageSizeError"));
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
                    setMessage(t("editor.coverUploaded"));
                  } else setMessage(t("editor.uploadError"));
                } catch {
                  setMessage(t("editor.uploadError"));
                } finally {
                  locked.current = false;
                  setUploading(false);
                }
              }}
            />
            <label className="editor-checkbox">
              <input type="checkbox" {...register("coverImageIsAi")} />
              {t("editor.aiCover")}
            </label>
          </section>
          <section className="admin-panel glass">
            <h2>{t("editor.ready")}</h2>
            <p>
              {mode === "admin"
                ? "Published under Cookly. Verification is a separate review."
                : t("editor.publishHelp")}
            </p>
            <div className="editor-field">
              <span>{t("editor.publication")}</span>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <GlassSelect
                    ariaLabel={t("editor.publication")}
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "DRAFT", label: t("editor.draftOption") },
                      {
                        value: "PUBLISHED",
                        label: t("editor.publishedOption"),
                      },
                      { value: "ARCHIVED", label: t("editor.archivedOption") },
                    ]}
                  />
                )}
              />
            </div>
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
