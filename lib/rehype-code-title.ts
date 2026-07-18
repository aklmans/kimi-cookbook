type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: unknown;
};

function propertyName(name: string) {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function hasProperty(node: HastNode, name: string) {
  const properties = node.properties;
  if (!properties) return false;
  return name in properties || propertyName(name) in properties;
}

function textContent(node: HastNode): string {
  if (node.type === "text") return String(node.value ?? "");
  return (node.children ?? []).map(textContent).join("");
}

function findDirectChild(
  node: HastNode,
  predicate: (child: HastNode) => boolean,
) {
  return (node.children ?? []).find(predicate);
}

function normalizeFigure(node: HastNode) {
  if (
    node.type !== "element" ||
    node.tagName !== "figure" ||
    !hasProperty(node, "data-rehype-pretty-code-figure")
  ) {
    return;
  }

  const titleIndex = (node.children ?? []).findIndex(
    (child) =>
      child.type === "element" &&
      child.tagName === "figcaption" &&
      hasProperty(child, "data-rehype-pretty-code-title"),
  );
  if (titleIndex < 0 || !node.children) return;

  const title = textContent(node.children[titleIndex]).trim();
  if (!title) return;

  const pre = findDirectChild(
    node,
    (child) => child.type === "element" && child.tagName === "pre",
  );
  if (!pre) return;

  pre.properties = {
    ...(pre.properties ?? {}),
    "data-code-title": title,
    "data-rehype-pretty-code-title": title,
  };
  node.children.splice(titleIndex, 1);
}

function visit(node: HastNode) {
  normalizeFigure(node);
  for (const child of node.children ?? []) visit(child);
}

export default function rehypeCodeTitle() {
  return (tree: HastNode) => {
    visit(tree);
  };
}
