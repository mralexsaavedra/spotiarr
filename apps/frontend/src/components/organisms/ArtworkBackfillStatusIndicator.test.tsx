import { render, screen } from "@testing-library/react";
import i18next, { i18n } from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import { ArtworkBackfillStatusIndicator } from "./ArtworkBackfillStatusIndicator";

const createI18nInstance = async (language: "en" | "es"): Promise<i18n> => {
  const instance = i18next.createInstance();

  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
};

describe("ArtworkBackfillStatusIndicator", () => {
  it("renders localized terminal error status in English", async () => {
    const i18n = await createI18nInstance("en");

    render(
      <I18nextProvider i18n={i18n}>
        <ArtworkBackfillStatusIndicator
          status={{
            runId: "run-1",
            status: "error",
            phase: "artists",
            totals: 100,
            processed: 20,
            skippedExisting: 0,
            written: 0,
            failed: 1,
            externalCalls: 0,
            lastCheckpoint: null,
            rateLimitUntil: null,
            updatedAt: null,
          }}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText(/Artwork backfill · Failed/)).toBeDefined();
    expect(screen.queryByText("error")).toBeNull();
  });

  it("renders localized terminal error status in Spanish", async () => {
    const i18n = await createI18nInstance("es");

    render(
      <I18nextProvider i18n={i18n}>
        <ArtworkBackfillStatusIndicator
          status={{
            runId: "run-1",
            status: "error",
            phase: "artists",
            totals: 100,
            processed: 20,
            skippedExisting: 0,
            written: 0,
            failed: 1,
            externalCalls: 0,
            lastCheckpoint: null,
            rateLimitUntil: null,
            updatedAt: null,
          }}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText(/Backfill de carátulas · Fallido/)).toBeDefined();
    expect(screen.queryByText("error")).toBeNull();
  });
});
