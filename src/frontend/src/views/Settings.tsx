import { FC } from "react";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { AppFooter } from "../components/molecules/AppFooter";
import { SettingItem } from "../components/molecules/SettingItem";
import { SpotifyAuthCard } from "../components/molecules/SpotifyAuthCard";
import { useSettingsController } from "../hooks/controllers/useSettingsController";

export const Settings: FC = () => {
  const { settings, values, isLoading, isSaving, handleSubmit, handleChange, handleReset } =
    useSettingsController();

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Settings" className="mb-6" />

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
                  Reset to Defaults
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  variant="primary"
                  size="lg"
                  loading={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Settings"}
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
