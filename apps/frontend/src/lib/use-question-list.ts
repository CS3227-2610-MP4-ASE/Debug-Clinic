import { useEffect, useRef, useState } from "react";
import { questionFailure } from "./instructor-questions.js";

export function useQuestionList<T extends { id: string }>(
  load: (
    offset: number,
  ) => Promise<{ questions: T[]; nextOffset: number | null }>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(true);
  useEffect(() => {
    let active = true;
    busy.current = true;
    setPending(true);
    setError(null);
    void load(offset)
      .then((result) => {
        if (!active) return;
        setItems((previous) => {
          const merged = new Map(
            (offset === 0 ? [] : previous).map((item) => [item.id, item]),
          );
          for (const item of result.questions) merged.set(item.id, item);
          return [...merged.values()];
        });
        setNextOffset(result.nextOffset);
      })
      .catch((failed: unknown) => {
        if (active) setError(questionFailure(failed));
      })
      .finally(() => {
        if (active) {
          busy.current = false;
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [load, offset, revision]);
  return {
    items,
    pending,
    error,
    nextOffset,
    retry: () => {
      if (!busy.current) {
        busy.current = true;
        setRevision((value) => value + 1);
      }
    },
    more: () => {
      if (!busy.current && nextOffset !== null) {
        busy.current = true;
        setOffset(nextOffset);
      }
    },
  };
}
