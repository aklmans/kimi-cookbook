import type { ThemeRegistrationRaw } from "shiki";

/* Warm editorial Shiki theme, ported verbatim from the Zhaphar website
   (the newer source-of-truth design language). Restrained, low-chroma
   palette on a warm code surface — not a default IDE skin. Used by
   rehype-pretty-code in the chapter MDX pipeline; the --shiki-light /
   --shiki-dark vars it emits are consumed by globals.css Round-8. */

export const ZHAPHAR_CODE_COLORS = {
  light: {
    foreground: "#2d2926",
    background: "#f3efe7",
    muted: "#7f7a70",
    punctuation: "#6f6a62",
    keyword: "#b65a43",
    string: "#2f5f86",
    function: "#7c5f9d",
    type: "#52756a",
    constant: "#946b35",
    variable: "#3b3833",
    invalid: "#a83f32"
  },
  dark: {
    foreground: "#e7dfd4",
    background: "#101312",
    muted: "#928b7e",
    punctuation: "#b7afa4",
    keyword: "#e18a6f",
    string: "#8fbad4",
    function: "#c1a3e8",
    type: "#9cbe8f",
    constant: "#d2b16d",
    variable: "#e3d9ca",
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
      "editor.selectionBackground": type === "light" ? "#ead9cf" : "#3a2924"
    }
  };
}

export const zhapharEditorialLight = createTheme("zhaphar-editorial-light", "light");
export const zhapharEditorialDark = createTheme("zhaphar-editorial-dark", "dark");

export const ZHAPHAR_CODE_THEMES = {
  light: zhapharEditorialLight,
  dark: zhapharEditorialDark
} as const;
