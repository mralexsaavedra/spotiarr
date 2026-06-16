import type { SettingItem } from "@spotiarr/shared";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSettingsQuery } from "./queries/useSettingsQuery";
import { useLanguageSync } from "./useLanguageSync";

// Stable mock references declared before vi.mock calls.
const mockChangeLanguage = vi.fn();
const mockI18n = {
  language: "en",
  changeLanguage: mockChangeLanguage,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: mockI18n }),
}));

vi.mock("./queries/useSettingsQuery", () => ({
  useSettingsQuery: vi.fn(),
}));

const mockUseSettingsQuery = vi.mocked(useSettingsQuery);

const makeSetting = (key: string, value: string): SettingItem => ({ key, value });

describe("useLanguageSync", () => {
  it("calls i18n.changeLanguage when UI_LANGUAGE setting differs from current language", () => {
    mockI18n.language = "en";
    mockUseSettingsQuery.mockReturnValue({
      data: [makeSetting("UI_LANGUAGE", "es")],
    } as ReturnType<typeof useSettingsQuery>);

    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
  });

  it("does NOT call changeLanguage when UI_LANGUAGE matches the current i18n language", () => {
    mockChangeLanguage.mockClear();
    mockI18n.language = "es";
    mockUseSettingsQuery.mockReturnValue({
      data: [makeSetting("UI_LANGUAGE", "es")],
    } as ReturnType<typeof useSettingsQuery>);

    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("does NOT call changeLanguage when settings are undefined", () => {
    mockChangeLanguage.mockClear();
    mockUseSettingsQuery.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useSettingsQuery>);

    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("does NOT call changeLanguage when UI_LANGUAGE key is absent from settings", () => {
    mockChangeLanguage.mockClear();
    mockI18n.language = "en";
    mockUseSettingsQuery.mockReturnValue({
      data: [makeSetting("OTHER_SETTING", "value")],
    } as ReturnType<typeof useSettingsQuery>);

    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("does NOT call changeLanguage when UI_LANGUAGE value is an empty string", () => {
    mockChangeLanguage.mockClear();
    mockI18n.language = "en";
    mockUseSettingsQuery.mockReturnValue({
      data: [makeSetting("UI_LANGUAGE", "")],
    } as ReturnType<typeof useSettingsQuery>);

    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("calls changeLanguage again when settings change to a new language", () => {
    mockChangeLanguage.mockClear();
    mockI18n.language = "en";

    const { rerender } = renderHook(() => useLanguageSync());

    mockUseSettingsQuery.mockReturnValue({
      data: [makeSetting("UI_LANGUAGE", "es")],
    } as ReturnType<typeof useSettingsQuery>);

    rerender();

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
  });
});
