import { SupportedAudioFormat } from "@spotiarr/shared";
import { Router, type Router as ExpressRouter } from "express";
import { SETTINGS_METADATA } from "@/constants/settings-metadata";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { getSettingsUseCase, updateSettingUseCase } = container;

const UI_SUPPORTED_FORMATS: SupportedAudioFormat[] = ["mp3", "m4a"];

// GET /api/settings - Get all settings
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await getSettingsUseCase.execute();
    res.json({ data: settings });
  }),
);

// GET /api/settings/metadata - Get settings metadata
router.get(
  "/metadata",
  asyncHandler(async (_req, res) => {
    res.json({ data: SETTINGS_METADATA });
  }),
);

// GET /api/settings/formats - Get supported audio formats
router.get(
  "/formats",
  asyncHandler(async (_req, res) => {
    res.json({ data: UI_SUPPORTED_FORMATS });
  }),
);

// PUT /api/settings - Update multiple settings at once
router.put(
  "/",
  asyncHandler(async (req, res) => {
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

    await Promise.all(settings.map((s) => updateSettingUseCase.execute(s.key, s.value)));
    res.status(204).send();
  }),
);

export default router;
