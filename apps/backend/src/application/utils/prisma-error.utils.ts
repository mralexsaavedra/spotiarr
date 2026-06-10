export const isPrismaUniqueViolation = (e: unknown): e is { code: string } =>
  e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002";
