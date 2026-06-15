import { faRobot, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type AiChatMessageDto } from "@spotiarr/shared";
import { FC, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/atoms/Button";
import { PageHeader } from "@/components/molecules/PageHeader";
import { useChatController } from "@/hooks/controllers/useChatController";
import { Path } from "@/routes/routes";
import { cn } from "@/utils/cn";

const MAX_PROMPT_LENGTH = 500;

const MessageBubble: FC<{ msg: AiChatMessageDto }> = ({ msg }) => {
  const { t } = useTranslation();

  const params = (msg.content.params ?? {}) as Record<string, unknown>;
  const text =
    msg.role === "user"
      ? String(
          msg.content.params?.prompt ??
            t(msg.content.key, { ...params, defaultValue: msg.content.key }),
        )
      : t(msg.content.key, { ...params, defaultValue: msg.content.key });

  const playlistLink =
    msg.role === "assistant" && msg.playlistId ? (
      <Link
        to={`${Path.PLAYLIST_DETAIL.replace(":id", msg.playlistId)}?mode=library`}
        className="text-primary mt-2 inline-block font-medium hover:underline"
      >
        {t("ai.result.viewPlaylist")}
      </Link>
    ) : null;

  return (
    <div
      className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
        msg.role === "user"
          ? "bg-primary self-end text-black"
          : "bg-background-elevated text-text-primary self-start",
      )}
    >
      <span>{text}</span>
      {playlistLink}
    </div>
  );
};

export const Chat: FC = () => {
  const { t } = useTranslation();
  const {
    prompt,
    setPrompt,
    stage,
    resolvedCount,
    droppedTitles,
    playlistId,
    playlistName,
    error,
    isGenerating,
    displayMessages,
    handleSubmit,
    clearMessages,
    isClearPending,
  } = useChatController();

  const canSubmit = prompt.trim().length > 0 && !isGenerating;
  const showEmptyState = displayMessages.length === 0 && !isGenerating && !stage;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) handleSubmit();
    }
  };

  const handleClearClick = () => {
    const confirmed = window.confirm(t("aiChat.clearConfirm"));
    if (confirmed) {
      clearMessages();
    }
  };

  return (
    <section className="bg-background flex h-full w-full flex-col px-4 py-6 md:px-8">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <div className="mb-6 flex items-start justify-between">
          <PageHeader title={t("ai.title")} description={t("ai.subtitle")} />
          {displayMessages.length > 0 && (
            <button
              onClick={handleClearClick}
              disabled={isClearPending}
              className="text-text-secondary hover:text-text-primary mt-1 flex items-center gap-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
              {t("aiChat.clearConversation")}
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {showEmptyState ? (
              <div className="text-text-secondary m-auto flex max-w-md flex-col items-center gap-3 text-center">
                <span className="bg-background-elevated flex size-14 items-center justify-center rounded-full">
                  <FontAwesomeIcon icon={faRobot} className="text-primary text-xl" />
                </span>
                <p className="text-text-primary text-lg font-semibold">{t("ai.empty.title")}</p>
                <p className="text-sm">{t("aiChat.emptyState")}</p>
              </div>
            ) : (
              <>
                {displayMessages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
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
                    {playlistName && (
                      <p className="text-text-secondary mt-1">
                        {t("ai.result.savedTo", { name: playlistName })}
                      </p>
                    )}
                    {droppedTitles && droppedTitles.length > 0 && (
                      <p className="text-text-secondary mt-1">
                        {t("ai.result.droppedTitles", { count: droppedTitles.length })}:{" "}
                        {droppedTitles.join(", ")}
                      </p>
                    )}
                    {playlistId && (
                      <Link
                        to={`${Path.PLAYLIST_DETAIL.replace(":id", playlistId)}?mode=library`}
                        className="text-primary mt-2 inline-block font-medium hover:underline"
                      >
                        {t("ai.result.viewPlaylist")}
                      </Link>
                    )}
                  </div>
                )}

                {stage === "error" && error && (
                  <div className="self-start rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {t(`ai.errors.${error.code}`, {
                      defaultValue: error.message,
                      detail: error.message,
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-background-elevated focus-within:border-primary/60 rounded-2xl border border-white/10 transition-colors">
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
