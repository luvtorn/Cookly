"use client";
import { useController, type Control } from "react-hook-form";
import type { RecipeInput } from "./schema";
import { useI18n } from "@/lib/i18n/context";
import { IngredientPicker } from "@/components/shared/ingredient-picker";
export function IngredientCombobox({
  control,
  index,
}: {
  control: Control<RecipeInput>;
  index: number;
}) {
  const { t } = useI18n();
  const name = useController({ control, name: `ingredients.${index}.name` });
  const ingredientId = useController({
    control,
    name: `ingredients.${index}.ingredientId`,
  });
  const createNew = useController({
    control,
    name: `ingredients.${index}.createNew`,
  });
  return (
    <div>
      <IngredientPicker
        value={String(name.field.value ?? "")}
        name={name.field.name}
        onBlur={name.field.onBlur}
        invalid={Boolean(name.fieldState.error)}
        confirmed={Boolean(ingredientId.field.value || createNew.field.value)}
        onChange={(value) => {
          name.field.onChange(value);
          ingredientId.field.onChange(undefined);
          createNew.field.onChange(false);
        }}
        onSelect={(item) => {
          name.field.onChange(item.name);
          ingredientId.field.onChange(item.id);
          createNew.field.onChange(false);
        }}
        onCreate={() => {
          ingredientId.field.onChange(undefined);
          createNew.field.onChange(true);
        }}
      />
      {ingredientId.field.value ? (
        <small className="ingredient-confirmed">
          {t("editor.existingIngredient")}
        </small>
      ) : null}
      {createNew.field.value ? (
        <small className="ingredient-confirmed">
          {t("editor.ingredientWillBeAdded")}
        </small>
      ) : null}
      {name.fieldState.error ? (
        <small className="field-error">{t("editor.ingredientRequired")}</small>
      ) : null}
    </div>
  );
}
