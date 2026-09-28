import { useId, type CSSProperties } from "react";

export type GlassLilyPlacement = "hero" | "background";

export const LILY_LAYOUTS = {
  hero: { left: "calc(51% - 24px)", bottom: "0.5%", width: "282px", height: "489px" },
  background: { left: "4%", bottom: "5%", width: "186px", height: "322px" },
} as const;

/** 同じ百合造形を配置指定だけで主役株と左奥株へ使い分ける。 */
export function GlassLily({ placement }: { placement: GlassLilyPlacement }) {
  const id = `lily-${useId().replace(/:/g, "")}`;
  const layout = LILY_LAYOUTS[placement];
  const face = `url(#${id}-face)`;
  const back = `url(#${id}-back)`;
  const leaf = `url(#${id}-leaf)`;
  const stem = `url(#${id}-stem)`;

  return (
    <svg
      className={`abyss-glass-lily abyss-glass-lily--${placement}`}
      style={
        {
          "--lily-left": layout.left,
          "--lily-bottom": layout.bottom,
          "--lily-width": layout.width,
          "--lily-height": layout.height,
        } as CSSProperties
      }
      viewBox="0 0 300 520"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#d1f0ff" stopOpacity="0.43" />
          <stop offset="0.25" stopColor="#8ac6ed" stopOpacity="0.18" />
          <stop offset="0.6" stopColor="#377cae" stopOpacity="0.075" />
          <stop offset="0.88" stopColor="#93cfee" stopOpacity="0.25" />
          <stop offset="1" stopColor="#e0f5ff" stopOpacity="0.44" />
        </linearGradient>
        <linearGradient id={`${id}-back`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#326a95" stopOpacity="0.11" />
          <stop offset="0.6" stopColor="#73b2d7" stopOpacity="0.17" />
          <stop offset="1" stopColor="#b5dff3" stopOpacity="0.31" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="0.65" y2="1">
          <stop stopColor="#acd9ed" stopOpacity="0.34" />
          <stop offset="0.4" stopColor="#3a81a9" stopOpacity="0.12" />
          <stop offset="0.75" stopColor="#173f60" stopOpacity="0.08" />
          <stop offset="1" stopColor="#8dc8e7" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#3a789d" stopOpacity="0.2" />
          <stop offset="0.35" stopColor="#86c6e4" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#c4eafa" stopOpacity="0.65" />
          <stop offset="1" stopColor="#24597e" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <g className="lily-whole-plant">
        {/* 下部の直立から花首の湾曲までを、先細りする一つの面でつなぐ。 */}
        <path className="lily-stalk" fill={stem} d="M121 511 C127 439 131 370 123 301 C119 257 109 218 112 190 C114 169 123 155 139 143 L143 149 C128 162 122 177 121 192 C119 223 128 263 132 301 C140 373 135 444 131 511 Q126 516 121 511Z" />
        <path className="lily-stalk-edge" d="M128 507 C134 428 136 363 128 300 C123 256 114 216 117 191 C119 173 127 157 141 146" />

        <g className="lily-leaves" fill={leaf}>
          <path d="M133 427 C157 397 188 396 210 418 C231 439 231 469 217 488 C223 451 193 415 166 418 C152 419 142 423 133 432Z" />
          <path d="M132 382 C111 348 69 345 42 364 C20 380 20 413 38 433 C28 402 52 372 82 372 C102 371 120 380 132 387Z" />
          <path d="M130 332 C151 299 180 287 205 301 C224 312 233 334 230 357 C223 330 206 313 182 314 C163 314 144 326 131 338Z" />
          <path d="M123 280 C99 252 68 241 37 251 C17 257 12 267 9 278 C31 259 54 262 75 267 C96 273 113 282 124 287Z" />
          <path d="M116 225 C134 200 157 188 185 193 C164 200 151 214 143 223 C133 228 124 230 117 232Z" />
        </g>
        <g className="lily-leaf-folds">
          <path d="M136 428 C170 404 206 418 219 451" />
          <path d="M129 382 C91 357 46 361 30 395" />
          <path d="M133 332 C177 294 211 306 228 345" />
          <path d="M119 279 C85 257 44 249 17 271" />
          <path d="M120 226 C142 207 157 198 179 195" />
        </g>

        {/* 奥側3枚と手前側3枚。花の喉だけを共有し、先端の間に余白を残す。 */}
        <g transform="translate(0 35.52) scale(1 0.76)">
        <g className="lily-tepals lily-tepals-back" fill={back}>
          <path data-tepal="upper-back" d="M140 144 C155 130 164 112 165 91 C165 64 154 46 158 28 C178 40 191 57 190 82 C189 108 172 131 148 148Z" />
          <path data-tepal="upper-far" d="M145 144 C165 116 181 85 207 67 C231 51 249 48 261 30 C265 51 255 72 232 84 C205 96 184 124 155 150Z" />
          <path data-tepal="right-back" d="M148 148 C179 131 202 109 229 104 C251 100 272 110 290 98 C284 120 263 135 239 132 C211 129 184 145 157 156Z" />
        </g>

        <g className="lily-tepals lily-tepals-front" fill={face}>
          <path data-tepal="lower-far" d="M145 150 C174 148 199 148 220 158 C244 170 254 193 276 197 C251 207 229 195 214 181 C195 167 171 163 148 158Z" />
          <path data-tepal="lower-front" d="M140 149 C163 151 188 162 201 185 C214 210 209 233 223 248 C197 239 179 221 175 198 C171 178 153 166 137 157Z" />
          <path data-tepal="upper-front" d="M136 144 C151 126 160 110 156 92 C151 76 136 66 120 65 C140 50 164 57 176 77 C186 98 171 126 147 151Z" />
        </g>

        <g className="lily-petal-folds">
          <path d="M153 134 C177 110 189 83 180 57" />
          <path d="M164 134 C196 103 209 79 240 67" />
          <path d="M169 147 C204 123 243 116 270 114" />
          <path d="M166 160 C210 160 236 190 262 196" />
          <path d="M151 165 C184 185 179 214 211 239" />
          <path d="M145 139 C166 111 175 87 149 68" />
        </g>
        <g className="lily-cut-edges">
          <path d="M158 29 C154 48 165 63 165 88" />
          <path d="M217 82 C240 73 256 59 260 37" />
          <path d="M243 131 C263 133 281 119 288 103" />
          <path d="M217 185 C236 201 256 205 271 198" />
          <path d="M178 207 C184 225 202 241 219 246" />
          <path d="M124 64 C144 59 161 67 170 79" />
        </g>

        <g className="lily-filaments">
          <path d="M151 148 Q177 136 211 132 M152 150 Q184 143 218 148 M152 152 Q183 154 214 167 M151 153 Q178 163 202 180 M150 151 Q173 139 199 122 M151 154 Q173 170 186 185" />
          <g className="lily-anthers">
            <ellipse cx="212" cy="132" rx="5" ry="1.8" transform="rotate(-9 212 132)" />
            <ellipse cx="219" cy="148" rx="5" ry="1.8" transform="rotate(12 219 148)" />
            <ellipse cx="215" cy="167" rx="5" ry="1.8" transform="rotate(24 215 167)" />
            <ellipse cx="203" cy="180" rx="5" ry="1.8" transform="rotate(32 203 180)" />
            <ellipse cx="200" cy="122" rx="4.5" ry="1.6" transform="rotate(-19 200 122)" />
            <ellipse cx="187" cy="185" rx="4.5" ry="1.6" transform="rotate(47 187 185)" />
          </g>
        </g>
        </g>
      </g>
    </svg>
  );
}
