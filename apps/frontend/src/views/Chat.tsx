import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/atoms/Button";
import { useChatController } from "@/hooks/controllers/useChatController";
import { cn } from "@/utils/cn";

export const Chat: FC = () => {
  const { t } = useTranslation();
  const {
    prompt,
    setPrompt,
    stage,
    resolvedCount,
    droppedTitles,
    error,
    isGenerating,
    messages,
    handleSubmit,
  } = useChatController();

  const canSubmit = prompt.trim().length > 0 && !isGenerating;

  return (
    <section className="bg-background flex h-full w-full flex-col px-4 py-6 md:px-8">
      <h1 className="text-text-primary mb-6 text-2xl font-bold">{t("ai.title")}</h1>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary self-end text-black"
                  : "bg-background-elevated text-text-primary self-start",
              )}
            >
              {msg.text}
            </div>
          ))}

          {isGenerating && stage && (
            <div className="text-text-secondary flex items-center gap-2 self-start text-sm">
              <span className="animate-pulse">{t(`ai.stages.${stage}`)}</span>
            </div>
          )}

          {stage === "done" && (
            <div className="bg-background-elevated self-start rounded-xl px-4 py-3 text-sm">
              <p className="text-text-primary font-medium">
                {t("ai.result.tracksAdded", { count: resolvedCount ?? 0 })}
              </p>
              {droppedTitles && droppedTitles.length > 0 && (
                <p className="text-text-secondary mt-1">
                  {t("ai.result.droppedTitles", { count: droppedTitles.length })}:{" "}
                  {droppedTitles.join(", ")}
                </p>
              )}
            </div>
          )}

          {stage === "error" && error && (
            <div className="self-start rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {t(`ai.errors.${error.code}`, error.message)}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("ai.promptPlaceholder")}
            disabled={isGenerating}
            maxLength={500}
            rows={3}
            className="bg-background-elevated text-text-primary placeholder:text-text-secondary focus:ring-primary flex-1 resize-none rounded-xl border border-white/10 px-4 py-3 text-sm focus:ring-2 focus:outline-none"
          />
          <Button
            variant="primary"
            icon={faRobot}
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={isGenerating}
            ariaLabel={t("ai.sendButton")}
            className="self-end"
          >
            {t("ai.sendButton")}
          </Button>
        </div>
      </div>
    </section>
  );
};
