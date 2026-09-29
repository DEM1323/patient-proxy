import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { DebriefView, type DebriefProps } from "./view";

type PromptKey = "interpretation" | "planning";

/**
 * The Attempt Debrief for an Ended Attempt: reflection before Formative
 * Feedback. Rendered by the Attempt page; authorization stays in Convex.
 */
export function AttemptDebrief({ attemptId }: { attemptId: string }) {
  const debrief = useQuery(api.attemptDebrief.access.ownDebrief, { attemptId });
  const reflect = useMutation(api.attemptDebrief.access.reflect);
  const retryFeedback = useMutation(
    api.attemptDebrief.access.retryFeedbackGeneration,
  );
  const [drafts, setDrafts] = useState<Record<PromptKey, string>>({
    interpretation: "",
    planning: "",
  });
  // A reflection whose response was lost keeps its request id, so sending the
  // same text again cannot append it twice.
  const [unsent, setUnsent] = useState<{
    clientRequestId: string;
    prompt: PromptKey;
    response: "answer" | "skip";
    text?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!debrief) {
    return null;
  }

  const submit = async (request: NonNullable<typeof unsent>) => {
    setUnsent(request);
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await reflect({ attemptId, ...request });
      setUnsent(null);
      if (result.status === "recorded") {
        if (request.response === "answer") {
          setDrafts((current) => ({ ...current, [request.prompt]: "" }));
        }
      } else if (result.status === "already_responded") {
        setNotice("You already responded to this question.");
      } else {
        setNotice("This Attempt Debrief is not available.");
      }
    } catch {
      setNotice(
        "Your reflection could not be saved. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const reuseOrNew = (
    prompt: PromptKey,
    response: "answer" | "skip",
    text?: string,
  ) =>
    unsent &&
    unsent.prompt === prompt &&
    unsent.response === response &&
    unsent.text === text
      ? unsent
      : { clientRequestId: crypto.randomUUID(), prompt, response, text };

  const props: DebriefProps = {
    drafts,
    submitting,
    notice,
    onDraftChange: (prompt, draft) =>
      setDrafts((current) => ({ ...current, [prompt]: draft })),
    onAnswer: (prompt) =>
      void submit(reuseOrNew(prompt, "answer", drafts[prompt].trim())),
    onSkip: (prompt) => void submit(reuseOrNew(prompt, "skip")),
    onRetryFeedback: () => {
      setSubmitting(true);
      setNotice(null);
      retryFeedback({ attemptId })
        .catch(() =>
          setNotice(
            "Feedback could not be requested. Check your connection and try again.",
          ),
        )
        .finally(() => setSubmitting(false));
    },
  };
  return <DebriefView debrief={debrief} props={props} />;
}
