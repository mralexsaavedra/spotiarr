import { FollowedArtist } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import i18next, { i18n } from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import { SearchTopResultCard } from "./SearchTopResultCard";

const artistItem: { type: "artist"; data: FollowedArtist } = {
  type: "artist",
  data: {
    id: "artist-1",
    name: "Daft Punk",
    image: null,
    spotifyUrl: "https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi",
  },
};

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

describe("SearchTopResultCard", () => {
  it("renders Artist label for English locale", async () => {
    const i18n = await createI18nInstance("en");

    render(
      <I18nextProvider i18n={i18n}>
        <SearchTopResultCard item={artistItem} onClick={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByText("Artist")).toBeDefined();
  });

  it("renders Artista label for Spanish locale", async () => {
    const i18n = await createI18nInstance("es");

    render(
      <I18nextProvider i18n={i18n}>
        <SearchTopResultCard item={artistItem} onClick={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByText("Artista")).toBeDefined();
  });
});
