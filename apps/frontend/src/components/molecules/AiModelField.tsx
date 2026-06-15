import { useState } from "react";
import type { ChangeEvent, FC } from "react";
import { useTranslation } from "react-i18next";
import { aiChatService } from "@/services/aiChat.service";

interface AiModelFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  description: string;
  disabled?: boolean;
}

type LoadState = "idle" | "loading" | "success" | "empty" | "error";

export const AiModelField: FC<AiModelFieldProps> = ({
  id,
  label,
  value,
  onChange,
  description,
  disabled,
}) => {
  const { t } = useTranslation();
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [models, setModels] = useState<string[]>([]);
  const datalistId = `${id}-models-list`;

  const handleLoadModels = async () => {
    setLoadState("loading");
    try {
      const result = await aiChatService.getModels();
      if (result.length === 0) {
        setLoadState("empty");
      } else {
        setModels(result);
        setLoadState("success");
      }
    } catch {
      setLoadState("error");
    }
  };

  const buttonLabel =
    loadState === "loading"
      ? t("settings.items.AI_MODEL.loadingModels")
      : t("settings.items.AI_MODEL.loadModels");

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          list={loadState === "success" ? datalistId : undefined}
          className={[
            "bg-background-input text-text-primary focus:ring-text-primary/20 w-full rounded-md border-none px-4 py-2 focus:ring-2 focus:outline-none",
            disabled ? "cursor-not-allowed opacity-50" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        {loadState === "success" && (
          <datalist id={datalistId}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        )}
        <button
          type="button"
          onClick={handleLoadModels}
          disabled={loadState === "loading" || disabled}
          className="bg-background-input text-text-secondary hover:text-text-primary shrink-0 rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </div>
      {loadState === "success" && (
        <p className="text-text-secondary mt-1 text-xs">
          {t("settings.items.AI_MODEL.modelsLoaded", { count: models.length })}
        </p>
      )}
      {loadState === "empty" && (
        <p className="text-text-secondary mt-1 text-xs">
          {t("settings.items.AI_MODEL.modelsEmpty")}
        </p>
      )}
      {loadState === "error" && (
        <p className="mt-1 text-xs text-red-400">{t("settings.items.AI_MODEL.modelsError")}</p>
      )}
      {loadState === "idle" && <p className="text-text-secondary mt-1 text-xs">{description}</p>}
    </div>
  );
};
