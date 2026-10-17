import { useEffect, useState } from "react";
import { loadModel, type Model } from "./lib/model";

export function useModel(): { model: Model | null; error: string | null } {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadModel().then(setModel).catch((e: Error) => setError(e.message));
  }, []);
  return { model, error };
}
