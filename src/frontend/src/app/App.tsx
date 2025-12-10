import { FC } from "react";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "../components/organisms/ToastContainer";
import { APP_VERSION } from "../config/version";
import { DownloadStatusProvider } from "../contexts/DownloadStatusContext";
import { ToastProvider } from "../contexts/ToastContext";
import { useLanguageSync } from "../hooks/useLanguageSync";
import { useServerEvents } from "../hooks/useServerEvents";
import { Routing } from "../routes/Routing";
import { Path } from "../routes/routes";

export const App: FC = () => {
  const { pathname } = useLocation();
  const version = APP_VERSION;

  useServerEvents();
  useLanguageSync();

  return (
    <ToastProvider>
      <DownloadStatusProvider>
        <ToastContainer />
        <Routing pathname={pathname as Path} version={version} />
      </DownloadStatusProvider>
    </ToastProvider>
  );
};
