import { SettingMetadata, SettingSection } from "@spotiarr/shared";
import {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUpdateSettingsMutation } from "../mutations/useUpdateSettingsMutation";
import { useSettingsMetadataQuery } from "../queries/useSettingsMetadataQuery";
import { useSettingsQuery } from "../queries/useSettingsQuery";
import { useSupportedFormatsQuery } from "../queries/useSupportedFormatsQuery";

export const useSettingsController = () => {
  const { data: settingsData = [], isLoading: settingsLoading } = useSettingsQuery();
  const { data: metadata = {}, isLoading: metadataLoading } = useSettingsMetadataQuery();
  const { data: availableFormats = ["mp3"] } = useSupportedFormatsQuery();
  const updateSettings = useUpdateSettingsMutation();

  const [values, setValues] = useState<Record<string, string>>({});

  const getValue = useCallback(
    (key: string, fallback = ""): string => {
      return settingsData.find((s) => s.key === key)?.value ?? fallback;
    },
    [settingsData],
  );

  useEffect(() => {
    if (settingsLoading || metadataLoading || Object.keys(metadata).length === 0) {
      return;
    }

    setValues((prev) => {
      if (Object.keys(prev).length > 0) return prev;

      const newValues: Record<string, string> = {};
      Object.values(metadata).forEach((meta) => {
        newValues[meta.key] = getValue(meta.key, meta.defaultValue);
      });
      return newValues;
    });
  }, [getValue, settingsLoading, metadataLoading, metadata]);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();

      const settingsToUpdate = Object.entries(values)
        .map(([key, value]) => {
          const currentValue = getValue(key);
          const meta = metadata[key];
          const defaultValue = meta?.defaultValue || "";
          const newValue = String(value || defaultValue);

          if (newValue !== currentValue) {
            return { key, value: newValue };
          }
          return null;
        })
        .filter((s): s is { key: string; value: string } => s !== null);

      if (settingsToUpdate.length > 0) {
        updateSettings.mutate(settingsToUpdate);
      }
    },
    [values, metadata, getValue, updateSettings],
  );

  const handleChange = useCallback((key: string) => {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement> | MouseEvent<HTMLButtonElement>,
    ) => {
      if ("target" in event && event.target && "value" in event.target) {
        const target = event.target as HTMLInputElement | HTMLSelectElement;
        setValues((prev) => ({ ...prev, [key]: target.value }));
      } else {
        event.preventDefault();
        setValues((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
      }
    };
  }, []);

  const settings = useMemo(() => {
    const sections: Record<SettingSection, SettingMetadata[]> = {} as Record<
      SettingSection,
      SettingMetadata[]
    >;
    Object.values(metadata).forEach((setting) => {
      const enrichedSetting = {
        ...setting,
        options: setting.key === "FORMAT" ? availableFormats : setting.options,
      };

      if (!sections[enrichedSetting.section]) {
        sections[enrichedSetting.section] = [];
      }
      sections[enrichedSetting.section].push(enrichedSetting);
    });
    return sections;
  }, [metadata, availableFormats]);

  const handleReset = useCallback(() => {
    const defaultValues: Record<string, string> = {};
    Object.values(metadata).forEach((meta) => {
      defaultValues[meta.key] = meta.defaultValue;
    });
    setValues(defaultValues);
  }, [metadata]);

  const isSaving = updateSettings.isPending;

  return {
    settings,
    values,
    isLoading: settingsLoading || metadataLoading,
    isSaving,
    handleSubmit,
    handleChange,
    handleReset,
  };
};
