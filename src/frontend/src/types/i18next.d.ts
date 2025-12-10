import "i18next";
import en from "@/locales/en.json";

declare module "i18next" {
  // Extend CustomTypeOptions
  interface CustomTypeOptions {
    // Default namespace usage
    defaultNS: "translation";
    // Define the resources type
    resources: {
      translation: typeof en;
    };
  }
}
