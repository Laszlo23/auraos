import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/social/return")({
  head: () => ({
    meta: [
      { title: "Connecting your channel | Aura OS" },
      { name: "description", content: "Finishing the secure social connection." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SocialReturn,
});

function SocialReturn() {
  const [message, setMessage] = useState("Finishing the connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ok = params.get("success") === "true";
    const provider = params.get("provider") ?? undefined;
    const error = params.get("error");

    const notify = (type: "socialConnected" | "socialFailed") => {
      window.opener?.postMessage({ type, provider, error }, window.location.origin);
      window.close();
    };

    if (!ok) {
      setMessage(error ?? "The connection was cancelled.");
      notify("socialFailed");
      return;
    }
    notify("socialConnected");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="mt-3 text-[12px] text-muted-foreground/70">
          You can close this window if it does not close automatically.
        </p>
      </div>
    </main>
  );
}
