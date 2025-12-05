import { FC } from "react";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "../components/organisms/ToastContainer";
import { APP_VERSION } from "../constants/version";
import { DownloadStatusProvider } from "../contexts/DownloadStatusContext";
import { ToastProvider } from "../contexts/ToastContext";
import { useServerEvents } from "../hooks/useServerEvents";
import { Routing } from "../routes/Routing";
import { Path } from "../routes/routes";

export const App: FC = () => {
  const { pathname } = useLocation();
  const version = APP_VERSION;

  useServerEvents();

  return (
    <ToastProvider>
      <DownloadStatusProvider>
        <ToastContainer />
        <Routing pathname={pathname as Path} version={version} />
      </DownloadStatusProvider>
    </ToastProvider>
  );
};
