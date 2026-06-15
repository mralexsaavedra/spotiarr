import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  provider?: string;
  baseURL?: string;
  apiKey?: string;
}

type LoadState = "idle" | "loading" | "success" | "empty" | "error";

export const AiModelField: FC<AiModelFieldProps> = ({
  id,
  label,
  value,
  onChange,
  description,
  disabled,
  provider,
  baseURL,
  apiKey,
}) => {
  const { t } = useTranslation();
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [models, setModels] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleLoadModels = async () => {
    setLoadState("loading");
    setIsOpen(false);
    try {
      const result = await aiChatService.getModels({ provider, baseURL, apiKey });
      if (result.length === 0) {
        setModels([]);
        setLoadState("empty");
      } else {
        setModels(result);
        setLoadState("success");
        setIsOpen(true);
      }
    } catch {
      setLoadState("error");
    }
  };

  const selectModel = (model: string) => {
    onChange({ target: { value: model } } as ChangeEvent<HTMLInputElement>);
    setIsOpen(false);
  };

  const hasModels = models.length > 0;
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
        <div className="relative w-full">
          <input
            id={id}
            type="text"
            autoComplete="off"
            className={[
              "bg-background-input text-text-primary focus:ring-text-primary/20 w-full rounded-md border-none px-4 py-2 focus:ring-2 focus:outline-none",
              hasModels ? "pr-10" : "",
              disabled ? "cursor-not-allowed opacity-50" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          {hasModels && (
            <button
              type="button"
              aria-label={t("settings.items.AI_MODEL.toggleModels")}
              onClick={() => setIsOpen((open) => !open)}
              disabled={disabled}
              className="text-text-secondary hover:text-text-primary absolute inset-y-0 right-0 flex items-center px-3"
            >
              <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
            </button>
          )}
          {isOpen && hasModels && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <ul
                role="listbox"
                className="bg-background-input absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-white/10 py-1 shadow-lg"
              >
                {models.map((model) => (
                  <li key={model}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={model === value}
                      onClick={() => selectModel(model)}
                      className={[
                        "block w-full px-4 py-2 text-left text-sm hover:bg-white/10",
                        model === value ? "text-primary" : "text-text-primary",
                      ].join(" ")}
                    >
                      {model}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
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
