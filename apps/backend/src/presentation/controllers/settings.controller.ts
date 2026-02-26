import { SupportedAudioFormat } from "@spotiarr/shared";
import { Request, Response } from "express";
import { GetSettingsUseCase } from "@/application/use-cases/settings/get-settings.use-case";
import { UpdateSettingUseCase } from "@/application/use-cases/settings/update-setting.use-case";
import { SETTINGS_METADATA } from "@/constants/settings-metadata";

const UI_SUPPORTED_FORMATS: SupportedAudioFormat[] = ["mp3", "m4a"];

export class SettingsController {
  constructor(
    private readonly getSettingsUseCase: GetSettingsUseCase,
    private readonly updateSettingUseCase: UpdateSettingUseCase,
  ) {}

  getSettings = async (_req: Request, res: Response) => {
    const settings = await this.getSettingsUseCase.execute();
    res.json({ data: settings });
  };

  getMetadata = async (_req: Request, res: Response) => {
    res.json({ data: SETTINGS_METADATA });
  };

  getFormats = async (_req: Request, res: Response) => {
    res.json({ data: UI_SUPPORTED_FORMATS });
  };

  updateSettings = async (req: Request, res: Response) => {
    const { settings } = req.body as { settings: Array<{ key: string; value: string }> };

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        error: "invalid_setting_payload",
        message: "settings must be an array",
      });
    }

    for (const setting of settings) {
      if (typeof setting.key !== "string" || typeof setting.value !== "string") {
        return res.status(400).json({
          error: "invalid_setting_payload",
          message: "each setting must have key and value as strings",
        });
      }
    }

    await Promise.all(settings.map((s) => this.updateSettingUseCase.execute(s.key, s.value)));
    res.status(204).send();
  };
}
