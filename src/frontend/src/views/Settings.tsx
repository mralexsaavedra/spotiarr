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
  const { t, i18n } = useTranslation();
  const { settings, values, isLoading, isSaving, handleSubmit, handleChange, handleReset } =
    useSettingsController();

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title={t("settings.title")} className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : (
          <>
            <SpotifyAuthCard />

            <form
              onSubmit={handleSubmit}
              className="bg-background-elevated rounded-lg p-4 md:p-6 space-y-8 mt-6"
            >
              <fieldset disabled={isSaving} className="space-y-8">
                {/* Language Selector */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-text-primary border-b border-white/10 pb-2">
                    {t("settings.language")}
                  </h2>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-text-primary">
                      {t("settings.language")}
                    </label>
                    <p className="text-sm text-text-secondary">{t("settings.description")}</p>
                    <select
                      className="w-full max-w-md bg-background border border-white/10 rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      value={i18n.resolvedLanguage?.split("-")[0] || "en"}
                      onChange={(e) => i18n.changeLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Español (España)</option>
                    </select>
                  </div>
                </div>

                {Object.entries(settings).map(([section, sectionSettings]) => (
                  <div key={section} className="space-y-4">
                    <h2 className="text-lg font-bold text-text-primary border-b border-white/10 pb-2">
                      {section}
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
