# Neat Taker

> 모든 노트를, 가장 단정하게.
> Every note. Beautifully in line.

A tiny static app for writing a note as subjects with bullet points under each one,
and copying it in one tap. Three files, no build step, no backend, no database —
nothing you type is stored or sent anywhere.

## Use

1. Pick the date (defaults to today).
2. Pick the word that names the note in **종류 / Kind** — 노트, 회의록, 메모, 할 일, 정리,
   일지 are offered, and any other word can be typed straight over them. It is the word
   in the header and the name of the exported file. Leaving it empty falls back to
   노트 / Note.
3. Type a subject, then the bullet points under it.
   - **+ 내용 추가 / + Add Bullet Point** under a subject adds another bullet point.
     Pressing **Enter** inside a bullet point does the same thing; **Shift+Enter**
     breaks the line inside one bullet point instead.
   - **+ 제목 추가 / + Add Subject** at the bottom starts another subject, which
     comes with its first bullet point already open.
   - The ✕ on the right removes a subject or a bullet point (hidden when only one
     is left).
4. Press **만들기 / Submit** to render the formatted note.
5. **복사 / Copy** puts it on the clipboard, **PDF로 저장 / Save as PDF** opens the
   print dialog with everything but the note stripped away, and
   **이미지로 저장 / Save as Image** renders it as a 9:16 PNG.

Blank subjects are skipped. A subject with bullet points but no title — or a title
with no bullet points — is highlighted and blocks submission. A trailing `:` after a
title is dropped, and line breaks inside a bullet point collapse to spaces so every
bullet stays one line.

## Language

A `한국어 / English` toggle sits at the top right. Korean is the default. Everything in
the UI is localized from a single `I18N` object at the top of `script.js` — adding a
language means adding one object.

The word order follows the language, and switching languages re-renders an
already-submitted note:

```
한국어   <2026-08-24 회의록>
English  <회의록 8/24/26>
```

The **종류 / Kind** presets follow the language too, and so does the field itself —
until you type your own word, which is then yours to keep across a switch.

## Output format

```
<2026-08-24 노트>

▪ 이번 주 회의
  • 새 학기 일정은 다음 주 월요일에 확정하기로 했습니다.
  • 예산안은 김민수님이 정리해서 목요일까지 공유합니다.

▪ 다음 할 일
  • 이서연님께 자료 요청 메일 보내기.
  • 장소 예약 확인하기.
```

## Design

Notion's design language, in Neat Taker's colors:

| | |
|---|---|
| `#00a4e4` | sky blue — anything you act on: active language, focus rings, Submit, `+` marks |
| `#920091` | purple — anything you wrote: bullet dots, subject numbers, the output bar |
| `#000000` | text, headings, toast |
| `#575a5d` | labels and secondary text |
| `#b5b7b4` | placeholders and hairlines at 45% opacity |

The two accents come from the logo, and they split the interface the same way it does:
blue for the controls, purple for the content.

Page icon and title, a quote block for the tagline, the date and the kind as page
properties, and
subject blocks built like a Notion Heading 3 with a bulleted list under it — every input
invisible until focused. Light only — no dark mode. Under 600px the indents tighten and
every control grows to a thumb-sized tap target.

## Image export

`Save as Image` draws the note onto a 1080×1920 canvas — 9:16, the ratio every phone
screen and messenger handles without cropping. The type shrinks toward 32px to keep a
note on one page; past that it splits into several pages instead of one unreadably tall
image. A bullet point never straddles a page break, and when a subject's list continues
onto the next page its title is repeated above it.

On a phone the result goes through the share sheet — the only route into Photos or
KakaoTalk — and falls back to a download everywhere else.

## PDF export

`Save as PDF` calls `window.print()` against a print stylesheet that hides everything
except the note, and swaps `document.title` so the suggested file name is the chosen
word and the date — `회의록 2026-08-24`.

This is deliberate rather than a JS PDF library: jsPDF and friends ship no Hangul
glyphs, so Korean renders as tofu boxes unless you embed a multi-megabyte Korean font.
The browser already has the fonts.

## Deploy (Netlify)

Static site at the repo root — no build step.

- **Git:** connect this repo in Netlify; `netlify.toml` sets the publish directory to `.`
  (leave the build command empty). Every push to `main` redeploys.
- **Drag & drop:** drop this folder onto app.netlify.com/drop.

## Files

- `index.html` — markup, the subject and bullet `<template>`s, and `data-i18n` hooks
- `style.css` — Notion-style layout, responsive rules, print sheet
- `script.js` — i18n, the kind presets, add/remove subjects and bullets, formatting,
  clipboard, image, print
- `netlify.toml` — publish directory
