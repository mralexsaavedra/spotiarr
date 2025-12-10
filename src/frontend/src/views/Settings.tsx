import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { AppFooter } from "../components/layouts/AppFooter";
import { PageHeader } from "../components/molecules/PageHeader";
import { SettingItem } from "../components/molecules/SettingItem";
import { SpotifyAuthCard } from "../components/organisms/SpotifyAuthCard";
import { useSettingsController } from "../hooks/controllers/useSettingsController";

export const Settings: FC = () => {
  const { t } = useTranslation();
  const { settings, values, isLoading, isSaving, handleSubmit, handleChange, handleReset } =
    useSettingsController();

  return (
    <section className="bg-background flex-1 px-4 py-6 md:px-8">
      <div className="max-w-full">
        <PageHeader title={t("settings.title")} className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : (
          <>
            <SpotifyAuthCard />

            <form
              onSubmit={handleSubmit}
              className="bg-background-elevated mt-6 space-y-8 rounded-lg p-4 md:p-6"
            >
              <fieldset disabled={isSaving} className="space-y-8">
                {Object.entries(settings).map(([section, sectionSettings]) => (
                  <div key={section} className="space-y-4">
                    <h2 className="text-text-primary border-b border-white/10 pb-2 text-lg font-bold">
                      {t(`settings.sections.${section}`, { defaultValue: section })}
                    </h2>
                    <div className="space-y-6">
                      {sectionSettings.map((setting) => (
                        <SettingItem
                          key={setting.key}
                          setting={setting}
                          value={values[setting.key]}
                          onChange={handleChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  variant="secondary"
                  size="lg"
                >
                  {t("settings.resetToDefaults")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  variant="primary"
                  size="lg"
                  loading={isSaving}
                >
                  {isSaving ? t("settings.saving") : t("settings.saveSettings")}
                </Button>
              </div>
            </form>
          </>
        )}

        <AppFooter className="mt-8 md:hidden" />
      </div>
    </section>
  );
};
