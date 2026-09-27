import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ReviewRepository } from "../infrastructure/review-repository";
import { LegacyAfRepository } from "../infrastructure/legacy-af";
import type { DataSnapshot, VesriaRepository } from "./contracts";

export type ReviewState =
  | ""
  | "loading"
  | "empty"
  | "data-error"
  | "local-error"
  | "not-found"
  | "fatal";
type Runtime = {
  repository: VesriaRepository;
  data: DataSnapshot | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  switchMode: (mode: "review" | "live") => void;
  notify: (message: string) => void;
  toast: string;
  reduced: boolean;
  setReduced: (value: boolean) => void;
  reviewState: ReviewState;
  setReviewState: (state: ReviewState) => void;
};
const Context = createContext<Runtime | null>(null);
export function useRuntime() {
  const value = useContext(Context);
  if (!value) throw new Error("Runtime root is missing");
  return value;
}
/** 接続・データ寿命をルートより外側で所有。切り替え前の遅延応答は破棄する。 */
export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<VesriaRepository>(
    () => new ReviewRepository(),
  );
  const [data, setData] = useState<DataSnapshot | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [reduced, setReduced] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>("");
  const generation = useRef(0);
  async function refresh() {
    const id = ++generation.current;
    setLoading(data === null);
    setError("");
    try {
      const result = await repository.load();
      if (id === generation.current) setData(result);
    } catch (e) {
      if (id === generation.current) {
        setError((e as Error).message);
        setData(null);
      }
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [repository]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 8000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <Context.Provider
      value={{
        repository,
        data,
        loading,
        error,
        refresh,
        switchMode: (mode) => {
          generation.current++;
          setReviewState("");
          setData(null);
          setRepository(
            mode === "live" ? new LegacyAfRepository() : new ReviewRepository(),
          );
        },
        notify: setToast,
        toast,
        reduced,
        setReduced,
        reviewState,
        setReviewState,
      }}
    >
      {children}
    </Context.Provider>
  );
}
