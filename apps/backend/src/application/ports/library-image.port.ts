type RejectReason = "outside-root" | "bad-extension" | "not-found" | "missing-path";

type ResolveImageResult =
  | { kind: "ok"; absolutePath: string; contentType: string }
  | { kind: "reject"; reason: RejectReason };

export interface LibraryImagePort {
  resolveImage(rawPath: string | undefined): Promise<ResolveImageResult>;
}
