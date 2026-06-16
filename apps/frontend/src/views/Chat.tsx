import { faRobot, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type AiChatMessageDto } from "@spotiarr/shared";
import { FC, KeyboardEvent, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/atoms/Button";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ConfirmModal } from "@/components/organisms/ConfirmModal";
import { useChatController } from "@/hooks/controllers/useChatController";
import { usePlaylistsQuery } from "@/hooks/queries/usePlaylistsQuery";
import { Path } from "@/routes/routes";
import { cn } from "@/utils/cn";

const MAX_PROMPT_LENGTH = 500;

interface MessageBubbleProps {
  msg: AiChatMessageDto;
  playlists: Array<{ id: string }> | undefined;
  isPlaylistsLoading: boolean;
}

const MessageBubble: FC<MessageBubbleProps> = memo(({ msg, playlists, isPlaylistsLoading }) => {
  const { t } = useTranslation();

  const params = (msg.content.params ?? {}) as Record<string, unknown>;
  const text =
    msg.role === "user"
      ? String(
          msg.content.params?.prompt ??
            t(msg.content.key, { ...params, defaultValue: msg.content.key }),
        )
      : t(msg.content.key, { ...params, defaultValue: msg.content.key });

  let playlistLink: React.ReactNode = null;
  if (msg.role === "assistant" && msg.playlistId) {
    const playlistExists = isPlaylistsLoading || playlists?.some((p) => p.id === msg.playlistId);
    if (playlistExists) {
      playlistLink = (
        <Link
          to={`${Path.PLAYLIST_DETAIL.replace(":id", msg.playlistId)}?mode=library`}
          className="text-primary mt-2 inline-block font-medium hover:underline"
        >
          {t("ai.result.viewPlaylist")}
        </Link>
      );
    } else {
      playlistLink = (
        <span
          aria-label={t("aiChat.playlistGone")}
          className="text-text-secondary mt-2 inline-block cursor-not-allowed text-sm line-through opacity-60"
        >
          {t("ai.result.viewPlaylist")}
        </span>
      );
    }
  }

  return (
    <div
      className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
        msg.role === "user"
          ? "bg-primary self-end text-black"
          : "bg-background-elevated text-text-primary self-start",
      )}
    >
      <p>{text}</p>
      {playlistLink}
    </div>
  );
});
MessageBubble.displayName = "MessageBubble";

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
  const { data: playlists, isLoading: isPlaylistsLoading } = usePlaylistsQuery();
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const canSubmit = prompt.trim().length > 0 && !isGenerating;
  const showEmptyState = displayMessages.length === 0 && !isGenerating && !stage;

  // Hide the ephemeral result block once the transcript contains the persisted message.
  // This prevents a duplicate card when the server returns the stored assistant message.
  const showEphemeralDone =
    stage === "done" &&
    !displayMessages.some(
      (m) => m.role === "assistant" && m.playlistId === playlistId && playlistId != null,
    );
  const showEphemeralError =
    stage === "error" &&
    error != null &&
    !displayMessages.some(
      (m) => m.role === "assistant" && m.errorCode === error.code && m.errorCode != null,
    );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) handleSubmit();
    }
  };

  const handleClearConfirm = () => {
    setIsClearConfirmOpen(false);
    clearMessages();
  };

  return (
    <section className="bg-background flex h-full w-full flex-col px-4 py-6 md:px-8">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <div className="mb-6 flex items-start justify-between">
          <PageHeader title={t("ai.title")} description={t("ai.subtitle")} />
          {displayMessages.length > 0 && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
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
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    playlists={playlists}
                    isPlaylistsLoading={isPlaylistsLoading}
                  />
                ))}

                {isGenerating && stage && (
                  <div className="text-text-secondary flex items-center gap-2 self-start text-sm">
                    <FontAwesomeIcon icon={faRobot} className="text-primary" />
                    <span className="animate-pulse">{t(`ai.stages.${stage}`)}</span>
                  </div>
                )}

                {showEphemeralDone && (
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

                {showEphemeralError && (
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

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title={t("aiChat.clearConversation")}
        description={t("aiChat.clearConfirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleClearConfirm}
        onCancel={() => setIsClearConfirmOpen(false)}
        isDestructive
      />
    </section>
  );
};
