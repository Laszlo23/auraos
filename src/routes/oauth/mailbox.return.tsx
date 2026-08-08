import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { completeMailboxConnect } from "@/lib/mailbox.functions";

export const Route = createFileRoute("/oauth/mailbox/return")({
  head: () => ({
    meta: [
      { title: "Connecting your mailbox | Aura OS" },
      { name: "description", content: "Finishing the secure mailbox connection for Aura Akquise." },
      { property: "og:title", content: "Connecting your mailbox" },
      {
        property: "og:description",
        content: "Finishing the secure mailbox connection for Aura Akquise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MailboxReturn,
});

function MailboxReturn() {
  const [message, setMessage] = useState("Finishing the connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "mailboxConnected" | "mailboxFailed") => {
      window.opener?.postMessage({ type }, window.location.origin);
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "The mailbox connection was cancelled.");
      notify("mailboxFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("mailboxConnected");
        return;
      }
      setMessage("The provider returned no exchange code.");
      notify("mailboxFailed");
      return;
    }
    void completeMailboxConnect({ data: { code } })
      .then(() => notify("mailboxConnected"))
      .catch(() => {
        setMessage("We could not finish the connection.");
        notify("mailboxFailed");
      });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
