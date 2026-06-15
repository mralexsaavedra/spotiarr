import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/atoms/Button";
import { PageHeader } from "@/components/molecules/PageHeader";
import { useChatController } from "@/hooks/controllers/useChatController";
import { cn } from "@/utils/cn";

const MAX_PROMPT_LENGTH = 500;

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
  const showEmptyState = messages.length === 0 && !isGenerating && !stage;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) handleSubmit();
    }
  };

  return (
    <section className="bg-background flex h-full w-full flex-col px-4 py-6 md:px-8">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <PageHeader title={t("ai.title")} description={t("ai.subtitle")} className="mb-6" />

        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {showEmptyState ? (
              <div className="text-text-secondary m-auto flex max-w-md flex-col items-center gap-3 text-center">
                <span className="bg-background-elevated flex size-14 items-center justify-center rounded-full">
                  <FontAwesomeIcon icon={faRobot} className="text-primary text-xl" />
                </span>
                <p className="text-text-primary text-lg font-semibold">{t("ai.empty.title")}</p>
                <p className="text-sm">{t("ai.empty.hint")}</p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
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
                    <FontAwesomeIcon icon={faRobot} className="text-primary" />
                    <span className="animate-pulse">{t(`ai.stages.${stage}`)}</span>
                  </div>
                )}

                {stage === "done" && (
                  <div className="bg-background-elevated self-start rounded-2xl px-4 py-3 text-sm">
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
                  <div className="self-start rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {t(`ai.errors.${error.code}`, error.message)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-background-elevated focus-within:ring-primary/60 rounded-2xl border border-white/10 transition focus-within:ring-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("ai.promptPlaceholder")}
              disabled={isGenerating}
              maxLength={MAX_PROMPT_LENGTH}
              rows={2}
              className="text-text-primary placeholder:text-text-secondary w-full resize-none bg-transparent px-4 pt-3 text-sm focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-3">
              <span className="text-text-secondary text-xs tabular-nums">
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
              <Button
                variant="primary"
                icon={faRobot}
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={isGenerating}
                ariaLabel={t("ai.sendButton")}
              >
                {t("ai.sendButton")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
