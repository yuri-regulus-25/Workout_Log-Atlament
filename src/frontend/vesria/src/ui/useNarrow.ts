import { useEffect, useState } from "react";

/** CSSのNavigation切替と同じ境界。狭幅固有の一時表示を幅変更時に解放する。 */
export function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width: 640px)");
    const change = () => setNarrow(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return narrow;
}
