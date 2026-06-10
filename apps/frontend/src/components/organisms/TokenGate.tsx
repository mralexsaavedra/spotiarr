import { type FC, type ReactNode, type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTokenGate } from "@/hooks/controllers/useTokenGate";
import { ApiError } from "@/services/httpClient";

interface TokenGateProps {
  children: ReactNode;
}

export const TokenGate: FC<TokenGateProps> = ({ children }) => {
  const { t } = useTranslation();
  const { phase, unlock, sessionExpired } = useTokenGate();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sessionExpiredMsg = sessionExpired ? t("instanceAuth.sessionExpired") : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (phase === "checking") {
    return null;
  }

  if (phase === "unlocked") {
    return <>{children}</>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await unlock(token);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError(t("instanceAuth.rateLimited"));
        } else {
          setError(t("instanceAuth.invalidToken"));
        }
      } else {
        setError(t("instanceAuth.invalidToken"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-background-elevated w-full max-w-sm space-y-6 rounded-lg border border-white/10 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-text-primary text-xl font-bold">{t("instanceAuth.title")}</h1>
          <p className="text-text-secondary text-sm">{t("instanceAuth.description")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="instance-token" className="text-text-secondary text-sm">
              {t("instanceAuth.tokenLabel")}
            </label>
            <input
              id="instance-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("instanceAuth.tokenPlaceholder")}
              autoComplete="current-password"
              className="bg-background text-text-primary placeholder-text-secondary focus:ring-primary w-full rounded-md border border-white/20 px-3 py-2 text-sm outline-none focus:ring-2"
              disabled={isSubmitting}
            />
          </div>

          {(error ?? sessionExpiredMsg) && (
            <p className="text-sm text-red-400">{error ?? sessionExpiredMsg}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="bg-primary hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("instanceAuth.loadingButton") : t("instanceAuth.submitButton")}
          </button>
        </form>
      </div>
    </div>
  );
};
