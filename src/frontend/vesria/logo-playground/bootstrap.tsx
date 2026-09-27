import { createRoot } from "react-dom/client";
import Playground from "./main";
import "./standalone.css";
createRoot(document.getElementById("root")!).render(<Playground />);
