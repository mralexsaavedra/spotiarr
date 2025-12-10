import { APP_LOCALE_LABELS, AppLocale, SettingMetadata } from "@spotiarr/shared";
import { ChangeEvent, FC, memo, MouseEvent, ReactNode } from "react";
import { SettingInput } from "./SettingInput";
import { SettingSelect } from "./SettingSelect";
import { SettingToggle } from "./SettingToggle";

type SettingValue = string | number | boolean;
type ChangeHandler = (
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement> | MouseEvent<HTMLButtonElement>,
) => void;

interface SettingItemProps {
  setting: SettingMetadata;
  value: SettingValue;
  onChange: (key: string) => ChangeHandler;
}

const LABEL_FORMATTERS: Record<string, (value: string) => string> = {
  FORMAT: (option) => option.toUpperCase(),
  UI_LANGUAGE: (option) => APP_LOCALE_LABELS[option as AppLocale] || option,
};

const RENDERERS: Record<
  string,
  (props: { setting: SettingMetadata; value: SettingValue; onChange: ChangeHandler }) => ReactNode
> = {
  input: ({ setting, value, onChange }) => (
    <SettingInput
      id={setting.key}
      label={setting.label}
      value={value as string | number}
      onChange={onChange}
      min={setting.min}
      max={setting.max}
      description={setting.description}
    />
  ),
  toggle: ({ setting, value, onChange }) => (
    <SettingToggle
      id={setting.key}
      label={setting.label}
      description={setting.description}
      value={value === "true" || value === true}
      onChange={onChange}
    />
  ),
  select: ({ setting, value, onChange }) => (
    <SettingSelect
      id={setting.key}
      label={setting.label}
      value={value as string}
      onChange={onChange}
      options={setting.options || []}
      description={setting.description}
      formatLabel={LABEL_FORMATTERS[setting.key]}
    />
  ),
};

export const SettingItem: FC<SettingItemProps> = memo(({ setting, value, onChange }) => {
  const currentValue = value !== undefined ? value : setting.defaultValue;
  const renderFn = RENDERERS[setting.component];

  if (!renderFn) return null;

  return renderFn({
    setting,
    value: currentValue,
    onChange: onChange(setting.key),
  });
});
