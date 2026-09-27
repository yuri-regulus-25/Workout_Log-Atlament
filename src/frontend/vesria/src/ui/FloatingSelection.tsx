import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { Select } from "@base-ui/react/select";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";
import { ja } from "react-day-picker/locale";
import { useReducedMotion } from "motion/react";
import { mdiCalendarOutline, mdiChevronDown, mdiCheck } from "@mdi/js";
import { useRuntime } from "../application/runtime";
import { Icon } from "./common";
import "./floatingSelection.css";

/** Spike用の値通知。DOM Eventを偽装せず、既存入力のtarget.value読み取りだけを接続する。 */
type ValueChange = (change: { target: { value: string } }) => void;
function useFloatingMaterial(value: string) {
  const { reduced } = useRuntime();
  const osReduced = useReducedMotion();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null),
    previous = useRef(value);
  // Native dialogのtop layerとinert境界を越えない。通常時はbodyへPortalする。
  const triggerRef = useCallback((node: HTMLElement | null) => {
    trigger.current = node;
    if (node) setContainer(node.closest("dialog") || document.body);
  }, []);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    if (reduced || osReduced) return;
    const response = trigger.current?.animate?.(
      [
        { boxShadow: "inset 0 0 0 1px #bdf2f880" },
        { boxShadow: "inset 0 0 0 1px #bdf2f800" },
      ],
      { duration: 160 },
    );
    return () => response?.cancel();
  }, [value, reduced, osReduced]);
  return { container, triggerRef, reduced: reduced || !!osReduced };
}

/** 同じ1枚のIndicatorだけを移動。文字・日付グリッドの座標は動かさない。 */
function LiquidSurface({
  children,
  reduced,
  calendar = false,
}: {
  children: ReactNode;
  reduced: boolean;
  calendar?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    indicator = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const surface = root.current!,
      liquid = indicator.current!;
    let target: HTMLElement | null = null;
    const position = (next: HTMLElement | null) => {
      target = next;
      if (
        !next ||
        !surface.contains(next) ||
        next.matches(":disabled,[data-disabled]")
      ) {
        liquid.style.opacity = "0";
        return;
      }
      const a = next.getBoundingClientRect(),
        b = surface.getBoundingClientRect();
      const sx = b.width / (surface.offsetWidth || b.width || 1),
        sy = b.height / (surface.offsetHeight || b.height || 1);
      liquid.style.width = `${a.width / (sx || 1)}px`;
      liquid.style.height = `${a.height / (sy || 1)}px`;
      liquid.style.transform = `translate3d(${(a.left - b.left) / (sx || 1) + surface.scrollLeft}px,${(a.top - b.top) / (sy || 1) + surface.scrollTop}px,0)`;
      liquid.style.opacity = "1";
    };
    const selected = () => calendar
      ? surface.querySelector<HTMLElement>(".rdp-day_button:focus") || surface.querySelector<HTMLElement>(".rdp-selected .rdp-day_button")
      : surface.querySelector<HTMLElement>("[data-highlighted]");
    const sync = () => position(selected());
    const interact = (event: Event) => {
      if (!calendar) return;
      const el = (event.target as HTMLElement).closest<HTMLElement>(
        ".rdp-day_button",
      );
      if (el && el !== target) position(el);
    };
    const scroll = () => position(target);
    const observer = new MutationObserver(sync);
    observer.observe(surface, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-highlighted", "aria-selected"],
    });
    const resize = new ResizeObserver(scroll);
    resize.observe(surface);
    surface.addEventListener("pointermove", interact);
    surface.addEventListener("focusin", interact);
    surface.addEventListener("scroll", scroll, true);
    sync();
    return () => {
      observer.disconnect();
      resize.disconnect();
      surface.removeEventListener("pointermove", interact);
      surface.removeEventListener("focusin", interact);
      surface.removeEventListener("scroll", scroll, true);
    };
  }, [calendar]);
  return (
    <div
      ref={root}
      className={`floating-material-content ${reduced ? "floating-reduced" : ""}`}
    >
      <div
        ref={indicator}
        className="liquid-selection-indicator"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value" | "multiple"
> & { value: string; onChange: ValueChange };
/** 既存optionの宣言を保ち、操作と選択状態はBase UIへ委譲する単一選択Spike。 */
export function FloatingSelect({
  children,
  value,
  onChange,
  disabled,
  required,
  name,
  id,
  className,
  ...aria
}: SelectProps) {
  const material = useFloatingMaterial(value);
  const options = Children.toArray(children)
    .filter(
      isValidElement<{
        value: string;
        children: ReactNode;
        disabled?: boolean;
      }>,
    )
    .map((child) => ({
      value: String(child.props.value),
      label: child.props.children,
      disabled: child.props.disabled,
    }));
  return (
    <Select.Root
      value={value}
      items={options}
      name={name}
      disabled={disabled}
      required={required}
      modal={false}
      onValueChange={(next) => onChange({ target: { value: next ?? "" } })}
      onOpenChange={(_, details) => {
        if (details.reason === "escape-key") details.event.preventDefault();
      }}
    >
      <Select.Trigger
        ref={material.triggerRef}
        id={id}
        className={`floating-trigger ${className || ""}`}
        aria-label={aria["aria-label"]}
        aria-invalid={aria["aria-invalid"]}
        aria-describedby={aria["aria-describedby"]}
        aria-labelledby={aria["aria-labelledby"]}
      >
        <Select.Value />
        <Select.Icon>
          <Icon path={mdiChevronDown} size={18} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={material.container}>
        <Select.Positioner
          className="floating-positioner"
          sideOffset={8}
          align="start"
          alignItemWithTrigger={false}
          collisionPadding={12}
        >
          <Select.Popup
            className={`floating-glass floating-select-popup ${material.reduced ? "floating-reduced" : ""}`}
          >
            <LiquidSurface reduced={material.reduced}>
              <Select.List className="floating-options">
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="floating-option"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="floating-selected-mark">
                      <Icon path={mdiCheck} size={16} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </LiquidSurface>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/** UTC変換による日付ずれを避け、実在するローカル日付だけを受け入れる。 */
export function parseSelectionDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(y, m - 1, d);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : undefined;
}
export function selectionDate(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
type DateProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "type" | "min" | "max"
> & {
  value: string;
  onChange: ValueChange;
  type?: "date" | "month";
  min?: string;
  max?: string;
};
export function FloatingDate({
  value,
  onChange,
  type = "date",
  min,
  max,
  disabled,
  required,
  id,
  name,
  className,
  ...aria
}: DateProps) {
  const material = useFloatingMaterial(value);
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value),
    [invalid, setInvalid] = useState(false);
  const selected = parseSelectionDate(
    type === "month" && value ? `${value}-01` : value,
  );
  const [month, setMonth] = useState(selected || new Date());
  const grid = useRef<HTMLDivElement>(null);
  const minimum = min
    ? parseSelectionDate(type === "month" ? `${min}-01` : min)
    : undefined;
  const maxMonth =
    type === "month" && max ? parseSelectionDate(`${max}-01`) : undefined;
  const maximum = maxMonth
    ? new Date(maxMonth.getFullYear(), maxMonth.getMonth() + 1, 0, 12)
    : max
      ? parseSelectionDate(max)
      : undefined;
  const allowed = (text: string) =>
    !!parseSelectionDate(type === "month" ? `${text}-01` : text) &&
    (!min || text >= min) &&
    (!max || text <= max);
  const commit = (text: string) => {
    if (text && !allowed(text)) {
      setInvalid(true);
      return;
    }
    if (!text && required) return;
    onChange({ target: { value: text } });
    setOpen(false);
    setInvalid(false);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        if (details.reason === "escape-key") details.event.preventDefault();
        if (next) {
          setDraft(value);
          setMonth(selected || new Date());
          setInvalid(false);
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger
        ref={material.triggerRef}
        id={id}
        disabled={disabled}
        className={`floating-trigger ${className || ""}`}
        aria-label={aria["aria-label"]}
        aria-invalid={aria["aria-invalid"]}
        aria-describedby={aria["aria-describedby"]}
        aria-labelledby={aria["aria-labelledby"]}
      >
        <span>
          {value
            ? value.replaceAll("-", " / ")
            : type === "month"
              ? "月を選択"
              : "日付を選択"}
        </span>
        <Icon path={mdiCalendarOutline} size={18} />
      </Popover.Trigger>
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      <Popover.Portal container={material.container}>
        <Popover.Positioner
          className="floating-positioner"
          sideOffset={8}
          align="start"
          collisionPadding={12}
        >
          <Popover.Popup
            className={`floating-glass floating-calendar-popup ${material.reduced ? "floating-reduced" : ""}`}
            initialFocus={false}
          >
            <Popover.Title className="floating-calendar-title">
              {type === "month" ? "月を選ぶ" : "日付を選ぶ"}
            </Popover.Title>
            <LiquidSurface reduced={material.reduced} calendar>
              <div ref={grid}>
                <DayPicker
                  locale={ja}
                  mode="single"
                  autoFocus
                  selected={selected}
                  month={month}
                  fixedWeeks
                  showOutsideDays
                  onMonthChange={(next) => {
                    setMonth(next);
                    if (!material.reduced)
                      grid.current?.animate(
                        [
                          { opacity: 0.55, transform: "translateY(3px)" },
                          { opacity: 1, transform: "translateY(0)" },
                        ],
                        { duration: 130 },
                      );
                  }}
                  disabled={[
                    ...(minimum ? [{ before: minimum }] : []),
                    ...(maximum ? [{ after: maximum }] : []),
                  ]}
                  onSelect={(date) => {
                    if (date)
                      commit(
                        type === "month"
                          ? selectionDate(date).slice(0, 7)
                          : selectionDate(date),
                      );
                  }}
                />
              </div>
            </LiquidSurface>
            <div className="floating-calendar-footer">
              <label>
                直接入力
                <input
                  aria-label="日付の直接入力"
                  value={draft}
                  placeholder={type === "month" ? "YYYY-MM" : "YYYY-MM-DD"}
                  aria-invalid={invalid || undefined}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setInvalid(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commit(draft);
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="quiet"
                onClick={() => commit(draft)}
              >
                適用
              </button>
              {!required && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => commit("")}
                >
                  クリア
                </button>
              )}
            </div>
            {invalid && (
              <p role="alert" className="field-error">
                形式と選択可能な範囲を確認してください。
              </p>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
