import { FC } from "react";
import { useLocation } from "react-router-dom";
import { ToastContainer } from "@/components/organisms/ToastContainer";
import { TokenGate } from "@/components/organisms/TokenGate";
import { APP_VERSION } from "@/config/version";
import { ToastProvider } from "@/contexts/ToastContext";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useServerEvents } from "@/hooks/useServerEvents";
import { Routing } from "@/routes/Routing";
import { Path } from "@/routes/routes";

const AuthenticatedApp: FC = () => {
  const { pathname } = useLocation();
  const version = APP_VERSION;

  useServerEvents();

  return (
    <ToastProvider>
      <ToastContainer />
      <Routing pathname={pathname as Path} version={version} />
    </ToastProvider>
  );
};

export const App: FC = () => {
  useLanguageSync();

  return (
    <TokenGate>
      <AuthenticatedApp />
    </TokenGate>
  );
};
