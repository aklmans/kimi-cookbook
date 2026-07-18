import type { ThemeRegistrationRaw } from "shiki";

/* Cool editorial Shiki theme — the Kimi-site retune of the palette that
   started as the Zhaphar website's warm editorial theme. Same restrained,
   low-chroma structure (no default-IDE-skin saturation), but every role is
   swung cool so the code surface sits with the Kimi blue accent instead of
   fighting it: keyword carries the Kimi blue, string stays steel blue,
   function violet, type cold teal, constants go quiet slate, and all the
   warm greys become cool greys. Used by rehype-pretty-code in the chapter
   MDX pipeline; the --shiki-light / --shiki-dark vars it emits are
   consumed by globals.css Round-8. The block surface itself is the
   --code-bg token (Round-101), matched to these backgrounds. */

export const ZHAPHAR_CODE_COLORS = {
  light: {
    foreground: "#2b3038",
    background: "#f3f6f9",
    muted: "#7c8492",
    punctuation: "#657080",
    keyword: "#1168d8",
    string: "#2e6e91",
    function: "#7451b8",
    type: "#3e7e7a",
    constant: "#556274",
    variable: "#3b424d",
    invalid: "#b03c3c"
  },
  dark: {
    foreground: "#e2e6ec",
    background: "#242a32",
    muted: "#8a93a2",
    punctuation: "#9aa4b2",
    keyword: "#6ba8ff",
    string: "#8fbad4",
    function: "#b4a5ee",
    type: "#7fc4bc",
    constant: "#a8b3c2",
    variable: "#dde3ea",
    invalid: "#ff8a78"
  }
} as const;

const scopes: Record<
  | "comments"
  | "punctuation"
  | "keywords"
  | "strings"
  | "functions"
  | "types"
  | "constants"
  | "variables"
  | "invalid",
  string[]
> = {
  comments: ["comment", "punctuation.definition.comment"],
  punctuation: [
    "punctuation",
    "meta.brace",
    "meta.delimiter",
    "keyword.operator",
    "keyword.operator.assignment"
  ],
  keywords: [
    "keyword",
    "keyword.control",
    "keyword.control.loop",
    "keyword.operator.expression",
    "keyword.operator.new",
    "storage",
    "storage.type",
    "storage.modifier"
  ],
  strings: [
    "string",
    "string.quoted",
    "punctuation.definition.string",
    "constant.character.escape"
  ],
  functions: [
    "entity.name.function",
    "support.function",
    "variable.function",
    "meta.function-call",
    "meta.method-call"
  ],
  types: [
    "entity.name.type",
    "entity.name.class",
    "support.type",
    "support.class",
    "support.type.primitive"
  ],
  constants: [
    "constant",
    "constant.numeric",
    "constant.language",
    "variable.other.constant",
    "variable.other.enummember"
  ],
  variables: [
    "variable",
    "variable.other",
    "variable.parameter",
    "meta.object-literal.key",
    "variable.other.object.property"
  ],
  invalid: ["invalid", "invalid.illegal"]
};

function createTheme(name: string, type: "light" | "dark"): ThemeRegistrationRaw {
  const color = ZHAPHAR_CODE_COLORS[type];

  return {
    name,
    type,
    settings: [
      {
        settings: {
          background: color.background,
          foreground: color.foreground
        }
      },
      { scope: scopes.comments, settings: { foreground: color.muted, fontStyle: "italic" } },
      { scope: scopes.punctuation, settings: { foreground: color.punctuation } },
      { scope: scopes.variables, settings: { foreground: color.variable } },
      { scope: scopes.constants, settings: { foreground: color.constant } },
      { scope: scopes.types, settings: { foreground: color.type } },
      { scope: scopes.functions, settings: { foreground: color.function } },
      { scope: scopes.strings, settings: { foreground: color.string } },
      { scope: scopes.keywords, settings: { foreground: color.keyword } },
      { scope: scopes.invalid, settings: { foreground: color.invalid } }
    ],
    colors: {
      "editor.background": color.background,
      "editor.foreground": color.foreground,
      "editorLineNumber.foreground": color.muted,
      "editor.selectionBackground": type === "light" ? "#d9e4f2" : "#2e3a4d"
    }
  };
}

export const zhapharEditorialLight = createTheme("zhaphar-editorial-light", "light");
export const zhapharEditorialDark = createTheme("zhaphar-editorial-dark", "dark");

export const ZHAPHAR_CODE_THEMES = {
  light: zhapharEditorialLight,
  dark: zhapharEditorialDark
} as const;
