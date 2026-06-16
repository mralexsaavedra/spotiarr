import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { prisma } from "../setup/prisma";
import { PrismaSettingsRepository } from "./prisma-settings.repository";

vi.mock("../setup/prisma", () => ({
  prisma: {
    setting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("PrismaSettingsRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findAll", () => {
    it("maps BigInt updatedAt to a numeric string", async () => {
      vi.mocked(prisma.setting.findMany).mockResolvedValue([
        { key: "theme", value: "dark", updatedAt: BigInt(1700000000000) },
      ] as any);

      const repo = new PrismaSettingsRepository();
      const result = await repo.findAll();

      expect(result[0].updatedAt).toBe("1700000000000");
    });

    it("returns undefined for updatedAt when the DB value is null", async () => {
      vi.mocked(prisma.setting.findMany).mockResolvedValue([
        { key: "lang", value: "en", updatedAt: null },
      ] as any);

      const repo = new PrismaSettingsRepository();
      const result = await repo.findAll();

      expect(result[0].updatedAt).toBeUndefined();
    });
  });

  describe("get", () => {
    it("returns the setting value when the key exists", async () => {
      vi.mocked(prisma.setting.findUnique).mockResolvedValue({
        key: "theme",
        value: "dark",
        updatedAt: null,
      } as any);

      const repo = new PrismaSettingsRepository();
      const result = await repo.get("theme");

      expect(result).toBe("dark");
    });

    it("returns undefined when the key does not exist", async () => {
      vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

      const repo = new PrismaSettingsRepository();
      const result = await repo.get("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("set", () => {
    it("calls upsert with BigInt updatedAt in both update and create", async () => {
      vi.mocked(prisma.setting.upsert).mockResolvedValue({} as any);

      const repo = new PrismaSettingsRepository();
      await repo.set("theme", "light");

      const call = vi.mocked(prisma.setting.upsert).mock.calls[0][0];
      expect(call.where).toEqual({ key: "theme" });
      expect(call.update.value).toBe("light");
      expect(typeof call.update.updatedAt).toBe("bigint");
      expect(call.create.key).toBe("theme");
      expect(call.create.value).toBe("light");
      expect(typeof call.create.updatedAt).toBe("bigint");
    });
  });

  describe("delete", () => {
    it("resolves without throwing when the record is not found (P2025 — idempotent)", async () => {
      const notFoundError = Object.assign(new Error("Record not found"), { code: "P2025" });
      vi.mocked(prisma.setting.delete).mockRejectedValue(notFoundError);

      const repo = new PrismaSettingsRepository();
      await expect(repo.delete("gone")).resolves.toBeUndefined();
    });

    it("rethrows other errors as AppError with internal_server_error", async () => {
      vi.mocked(prisma.setting.delete).mockRejectedValue(new Error("Connection lost"));

      const repo = new PrismaSettingsRepository();
      await expect(repo.delete("theme")).rejects.toBeInstanceOf(AppError);
      await expect(repo.delete("theme")).rejects.toMatchObject({
        statusCode: 500,
        errorCode: "internal_server_error",
      });
    });
  });
});
