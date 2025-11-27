import { SettingMetadata } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { SettingInput } from "../components/SettingInput";
import { SettingSelect } from "../components/SettingSelect";
import { SettingToggle } from "../components/SettingToggle";
import { useSettingsForm } from "../hooks/useSettingsForm";

export const Settings: FC = () => {
  const { settings, values, isLoading, isSaving, handleSubmit, handleChange, handleReset } =
    useSettingsForm();

  const renderSetting = useCallback(
    (setting: SettingMetadata) => {
      const value = values[setting.key] || setting.defaultValue;

      switch (setting.component) {
        case "input":
          return (
            <SettingInput
              key={setting.key}
              id={setting.key}
              label={setting.label}
              value={value}
              onChange={handleChange(setting.key)}
              min={setting.min}
              max={setting.max}
              description={setting.description}
            />
          );

        case "toggle":
          return (
            <SettingToggle
              key={setting.key}
              id={setting.key}
              label={setting.label}
              description={setting.description}
              value={value === "true"}
              onChange={handleChange(setting.key)}
            />
          );

        case "select": {
          const formatLabel =
            setting.key === "FORMAT" ? (option: string) => option.toUpperCase() : undefined;

          return (
            <SettingSelect
              key={setting.key}
              id={setting.key}
              label={setting.label}
              value={value}
              onChange={handleChange(setting.key)}
              options={setting.options || []}
              description={setting.description}
              formatLabel={formatLabel}
            />
          );
        }

        default:
          return null;
      }
    },
    [values, handleChange],
  );

  return (
    <section className="w-full bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Settings" />

        <form
          onSubmit={handleSubmit}
          className="bg-background-elevated rounded-lg p-4 md:p-6 space-y-8"
        >
          <fieldset disabled={isLoading || isSaving} className="space-y-8">
            {Object.entries(settings).map(([section, sectionSettings]) => (
              <div key={section} className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary border-b border-white/10 pb-2">
                  {section}
                </h2>
                <div className="space-y-6">{sectionSettings.map(renderSetting)}</div>
              </div>
            ))}
          </fieldset>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleReset}
              disabled={isLoading || isSaving}
              variant="secondary"
              size="lg"
            >
              Reset to Defaults
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isSaving}
              variant="primary"
              size="lg"
              loading={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};
