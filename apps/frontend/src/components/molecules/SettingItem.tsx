import { APP_LOCALE_LABELS } from "@spotiarr/shared";
import type { AppLocale, SettingMetadata } from "@spotiarr/shared";
import type { TFunction } from "i18next";
import { memo } from "react";
import type { ChangeEvent, FC, MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SettingInput } from "./SettingInput";
import { SettingSelect } from "./SettingSelect";
import { SettingTextarea } from "./SettingTextarea";
import { SettingToggle } from "./SettingToggle";

type SettingValue = string | number | boolean;
type ChangeHandler = (
  event:
    | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    | MouseEvent<HTMLButtonElement>,
) => void;

interface SettingItemProps {
  setting: SettingMetadata;
  value: SettingValue;
  onChange: (key: string) => ChangeHandler;
  disabled?: boolean;
  placeholder?: string;
}

const AI_PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  groq: "Groq",
  ollama: "Ollama",
  "ollama-cloud": "Ollama Cloud",
  lmstudio: "LM Studio",
  vercel: "Vercel AI Gateway",
  custom: "Custom",
};

const buildLabelFormatters = (t: TFunction): Record<string, (value: string) => string> => ({
  FORMAT: (option) => option.toUpperCase(),
  UI_LANGUAGE: (option) => APP_LOCALE_LABELS[option as AppLocale] || option,
  AI_PROVIDER: (option) =>
    t(`aiProviders.${option}` as any, {
      defaultValue: AI_PROVIDER_DISPLAY_NAMES[option] ?? option,
    }) as string,
});

export const SettingItem: FC<SettingItemProps> = memo(
  ({ setting, value, onChange, disabled, placeholder }) => {
    const { t } = useTranslation();
    const currentValue = value !== undefined ? value : setting.defaultValue;

    const labelFormatters = buildLabelFormatters(t);

    const translatedSetting = {
      ...setting,
      label: t(`settings.items.${setting.key}.label`, { defaultValue: setting.label }),
      description: t(`settings.items.${setting.key}.description`, {
        defaultValue: setting.description,
      }),
    };

    const renderers: Record<
      string,
      (props: {
        setting: SettingMetadata;
        value: SettingValue;
        onChange: ChangeHandler;
      }) => ReactNode
    > = {
      input: ({ setting: s, value: v, onChange: oc }) => (
        <SettingInput
          id={s.key}
          label={s.label}
          value={v as string | number}
          onChange={oc}
          type={s.type === "string" ? "text" : "number"}
          min={s.min}
          max={s.max}
          description={s.description}
          disabled={disabled}
          placeholder={placeholder}
        />
      ),
      toggle: ({ setting: s, value: v, onChange: oc }) => (
        <SettingToggle
          id={s.key}
          label={s.label}
          description={s.description}
          value={v === "true" || v === true}
          onChange={oc}
        />
      ),
      select: ({ setting: s, value: v, onChange: oc }) => (
        <SettingSelect
          id={s.key}
          label={s.label}
          value={v as string}
          onChange={oc}
          options={s.options || []}
          description={s.description}
          formatLabel={labelFormatters[s.key]}
        />
      ),
      textarea: ({ setting: s, value: v, onChange: oc }) => (
        <SettingTextarea
          id={s.key}
          label={s.label}
          value={v as string}
          onChange={oc}
          description={s.description}
        />
      ),
    };

    const renderFn = renderers[setting.component];
    if (!renderFn) return null;

    return renderFn({
      setting: translatedSetting,
      value: currentValue,
      onChange: onChange(setting.key),
    });
  },
);
