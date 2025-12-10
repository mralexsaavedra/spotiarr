import { faBroom, faMusic } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { EmptyState } from "../components/molecules/EmptyState";
import { PageHeader } from "../components/molecules/PageHeader";
import { ConfirmModal } from "../components/organisms/ConfirmModal";
import { PlaylistList } from "../components/organisms/PlaylistList";
import { useHomeController } from "../hooks/controllers/useHomeController";

export const Home: FC = () => {
  const { t } = useTranslation();
  const {
    playlists,
    isLoading,
    isClearModalOpen,
    handleClearAllClick,
    handleConfirmClearAll,
    handleCancelClearAll,
    handlePlaylistClick,
  } = useHomeController();

  return (
    <section className="w-full px-4 py-6 bg-background md:px-8">
      <div className="max-w-full">
        <PageHeader
          title={t("home.title")}
          className="mb-6"
          action={
            playlists && playlists.length > 0 ? (
              <Button variant="secondary" size="md" icon={faBroom} onClick={handleClearAllClick}>
                <span className="hidden sm:inline">{t("home.clearCompleted")}</span>
              </Button>
            ) : undefined
          }
        />

        {isLoading ? (
          <Loading />
        ) : !playlists || playlists.length === 0 ? (
          <EmptyState
            icon={faMusic}
            title={t("home.emptyTitle")}
            description={t("home.emptyDescription")}
          />
        ) : (
          <PlaylistList playlists={playlists} onPlaylistClick={handlePlaylistClick} />
        )}
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        title={t("home.clearModal.title")}
        description={t("home.clearModal.description")}
        confirmLabel={t("common.clearAll")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleConfirmClearAll}
        onCancel={handleCancelClearAll}
        isDestructive={true}
      />
    </section>
  );
};
