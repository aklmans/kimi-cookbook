import assert from "node:assert/strict";
import test from "node:test";
import { about } from "../content/books/kimi/about";

/* Pins the「关于本书」MP payload shape — the Mini Program renders its
   about page entirely from this object (see the handoff contract:
   meta rows, 4 sections, 4 ways in III, license + contacts in IV,
   plain text only). */

test("about payload carries the required top-level fields", () => {
  assert.ok(about.lede, "lede missing");
  assert.ok(about.bookline, "bookline missing");
  assert.ok(about.intro, "intro missing");
  assert.ok(about.kicker, "kicker missing");
  assert.ok(about.meta.length >= 6, "meta should have at least 6 rows");
  for (const row of about.meta) {
    assert.ok(row.label && row.value, "meta row needs label + value");
  }
});

test("sections follow the I/II/III/IV contract", () => {
  assert.equal(about.sections.length, 4);
  for (const section of about.sections) {
    assert.ok(section.no, "section needs a roman no");
    assert.ok(section.title, "section needs a title");
    assert.ok(
      !section.title.endsWith("."),
      `section title must not end with a period: ${section.title}`,
    );
    assert.ok(
      (section.paragraphs?.length ?? 0) > 0 ||
        (section.ways?.length ?? 0) > 0,
      `section ${section.no} needs paragraphs or ways`,
    );
  }
});

test("section III offers 4 ways, each with a typed action", () => {
  const ways = about.sections[2].ways ?? [];
  assert.equal(ways.length, 4);
  for (const way of ways) {
    assert.ok(way.label && way.text, "way needs label + text");
    assert.ok(
      way.action.kind === "toc" || way.action.kind === "copy",
      `unknown action kind: ${(way.action as { kind: string }).kind}`,
    );
    if (way.action.kind === "copy") {
      assert.ok(way.action.value, "copy action needs a value");
      assert.ok(way.action.toast, "copy action needs a toast");
    }
  }
});

test("section IV carries license + contacts", () => {
  const iv = about.sections[3];
  assert.ok(iv.license, "license missing");
  assert.equal(iv.contacts?.length, 3);
  for (const contact of iv.contacts ?? []) {
    assert.ok(contact.label && contact.text && contact.value && contact.toast);
  }
});

test("every user-facing string is plain text (no HTML / newlines)", () => {
  const blob = JSON.stringify(about);
  assert.ok(!/<[a-z]+[\s>]/i.test(blob), "HTML found in about payload");
  assert.ok(!/\\n/.test(blob), "newline found in about payload");
});
