"use client";
import { createContext, useContext, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactionState } from "./schema";

export type CachedReaction = ReactionState & { pending?: boolean };
export const reactionKey = (viewer: string | null, id: string) => [
  "recipe-reaction",
  viewer,
  id,
];
const Context = createContext<{
  viewer: string | null;
  initial: Record<string, ReactionState>;
  unavailable: boolean;
}>({ viewer: null, initial: {}, unavailable: false });
export function SocialProvider({
  viewer,
  initial,
  unavailable,
  children,
}: {
  viewer: string | null;
  initial: Record<string, ReactionState>;
  unavailable: boolean;
  children: React.ReactNode;
}) {
  const cache = useQueryClient();
  useEffect(() => {
    for (const [id, state] of Object.entries(initial)) {
      const key = reactionKey(viewer, id);
      if (!cache.getQueryData<CachedReaction>(key)?.pending)
        cache.setQueryData(key, state);
    }
  }, [cache, viewer, initial]);
  return (
    <Context.Provider value={{ viewer, initial, unavailable }}>
      {children}
    </Context.Provider>
  );
}
export const useSocial = () => useContext(Context);
