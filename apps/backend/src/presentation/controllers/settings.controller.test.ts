import { UI_SUPPORTED_AUDIO_FORMATS } from "@spotiarr/shared";
import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetSettingsUseCase } from "@/application/use-cases/settings/get-settings.use-case";
import type { UpdateSettingUseCase } from "@/application/use-cases/settings/update-setting.use-case";
import { SETTINGS_METADATA } from "@/constants/settings-metadata";
import { SettingsController } from "./settings.controller";

function makeRes(): Response {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { json, status, send } as unknown as Response;
}

function makeReq(body: unknown = {}): Request {
  return { body } as unknown as Request;
}

function makeUseCases() {
  const getSettingsUseCase = {
    execute: vi.fn().mockResolvedValue([{ key: "download_path", value: "/music" }]),
  } as unknown as GetSettingsUseCase;
  const updateSettingUseCase = {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as UpdateSettingUseCase;
  return { getSettingsUseCase, updateSettingUseCase };
}

describe("SettingsController", () => {
  let getSettingsUseCase: GetSettingsUseCase;
  let updateSettingUseCase: UpdateSettingUseCase;
  let controller: SettingsController;

  beforeEach(() => {
    ({ getSettingsUseCase, updateSettingUseCase } = makeUseCases());
    controller = new SettingsController(getSettingsUseCase, updateSettingUseCase);
  });

  describe("getSettings", () => {
    it("responds with { data: settings } from use case", async () => {
      const settings = [{ key: "download_path", value: "/music" }];
      vi.mocked(getSettingsUseCase.execute).mockResolvedValue(settings as never);

      const res = makeRes();
      await controller.getSettings({} as Request, res);

      expect(getSettingsUseCase.execute).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ data: settings });
    });
  });

  describe("getMetadata", () => {
    it("responds with { data: SETTINGS_METADATA } without calling any use case", async () => {
      const res = makeRes();
      await controller.getMetadata({} as Request, res);

      expect(res.json).toHaveBeenCalledWith({ data: SETTINGS_METADATA });
      expect(getSettingsUseCase.execute).not.toHaveBeenCalled();
      expect(updateSettingUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe("getFormats", () => {
    it("responds with { data: UI_SUPPORTED_AUDIO_FORMATS } without calling any use case", async () => {
      const res = makeRes();
      await controller.getFormats({} as Request, res);

      expect(res.json).toHaveBeenCalledWith({ data: UI_SUPPORTED_AUDIO_FORMATS });
      expect(getSettingsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("calls updateSettingUseCase for each setting and responds 204", async () => {
      const settings = [
        { key: "download_path", value: "/downloads" },
        { key: "format", value: "mp3" },
      ];

      const res = makeRes();
      await controller.updateSettings(makeReq({ settings }), res);

      expect(updateSettingUseCase.execute).toHaveBeenCalledTimes(2);
      expect(updateSettingUseCase.execute).toHaveBeenCalledWith("download_path", "/downloads");
      expect(updateSettingUseCase.execute).toHaveBeenCalledWith("format", "mp3");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("responds 400 when settings is not an array", async () => {
      const res = makeRes();
      await controller.updateSettings(makeReq({ settings: "not-an-array" }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "invalid_setting_payload" }),
      );
      expect(updateSettingUseCase.execute).not.toHaveBeenCalled();
    });

    it("responds 400 when settings is missing", async () => {
      const res = makeRes();
      await controller.updateSettings(makeReq({}), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds 400 when a setting entry has non-string key or value", async () => {
      const res = makeRes();
      await controller.updateSettings(makeReq({ settings: [{ key: 123, value: "ok" }] }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "invalid_setting_payload" }),
      );
    });

    it("responds 204 for an empty settings array", async () => {
      const res = makeRes();
      await controller.updateSettings(makeReq({ settings: [] }), res);

      expect(updateSettingUseCase.execute).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
