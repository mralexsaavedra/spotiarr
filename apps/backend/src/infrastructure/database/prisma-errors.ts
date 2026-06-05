/**
 * Type guard for Prisma unique constraint violation (P2002).
 *
 * Use this in application-layer code (use cases) to detect and handle
 * concurrent-write races on unique-constrained columns.
 * Do NOT use this to silently swallow errors in the repository layer —
 * keep "find-or-create" semantics in the use case where intent is clear.
 */
export const isPrismaUniqueViolation = (e: unknown): e is { code: string } =>
  e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002";
