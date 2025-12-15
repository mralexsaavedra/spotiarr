import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsQuery } from "./queries/useSettingsQuery";

export const useLanguageSync = () => {
  const { i18n } = useTranslation();
  const { data: settings } = useSettingsQuery();

  useEffect(() => {
    if (settings) {
      const languageSetting = settings.find((s) => s.key === "UI_LANGUAGE");

      if (languageSetting && languageSetting.value && languageSetting.value !== i18n.language) {
        i18n.changeLanguage(languageSetting.value);
      }
    }
  }, [settings, i18n]);
};
