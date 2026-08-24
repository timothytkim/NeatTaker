(function () {
  "use strict";

  var I18N = {
    ko: {
      tagline: "모든 노트를, 가장 단정하게.",
      subline: "제목을 적고, 내용을 적고, 복사하면 끝.",
      date: "날짜",
      kind: "종류",
      kinds: ["노트", "회의록", "메모", "할 일", "정리", "일지"],
      addSubject: "제목 추가",
      addBullet: "내용 추가",
      submit: "만들기",
      output: "결과",
      copy: "복사",
      pdf: "PDF로 저장",
      image: "이미지로 저장",
      removeSubject: "제목 삭제",
      removeBullet: "내용 삭제",
      phKind: "노트",
      phSubject: "제목을 입력하세요",
      phBullet: "내용을 입력하세요",
      copied: "복사했습니다",
      needSubject: "제목을 입력해주세요",
      needBullet: "제목 아래 내용을 하나 이상 입력해주세요",
      needOne: "최소 한 개의 제목을 입력해주세요",
      copyFail: "복사에 실패했어요. 직접 선택해서 복사해주세요",
      imageFail: "이미지를 만들지 못했어요",
      imageCount: "노트가 길어서 이미지 {n}장으로 나눴어요"
    },
    en: {
      tagline: "Every note. Beautifully in line.",
      subline: "Write a subject. Write the points. Copy it. Done.",
      date: "Date",
      kind: "Kind",
      kinds: ["Note", "Meeting Notes", "Memo", "To Do", "Summary", "Log"],
      addSubject: "Add Subject",
      addBullet: "Add Bullet Point",
      submit: "Submit",
      output: "Output",
      copy: "Copy",
      pdf: "Save as PDF",
      image: "Save as Image",
      removeSubject: "Remove subject",
      removeBullet: "Remove bullet point",
      phKind: "Note",
      phSubject: "Write the subject",
      phBullet: "Write a bullet point",
      copied: "Copied",
      needSubject: "Fill in the subject",
      needBullet: "Add at least one bullet point under the subject",
      needOne: "Add at least one subject",
      copyFail: "Copy failed — select the text manually",
      imageFail: "Could not create the image",
      imageCount: "The note was long, so it was split into {n} images"
    }
  };

  var subjectsEl = document.getElementById("subjects");
  var subjectTemplate = document.getElementById("subjectTemplate");
  var bulletTemplate = document.getElementById("bulletTemplate");
  var addSubjectBtn = document.getElementById("addSubjectBtn");
  var submitBtn = document.getElementById("submitBtn");
  var copyBtn = document.getElementById("copyBtn");
  var pdfBtn = document.getElementById("pdfBtn");
  var imgBtn = document.getElementById("imgBtn");
  var outputCard = document.getElementById("outputCard");
  var outputEl = document.getElementById("output");
  var dateInput = document.getElementById("dateInput");
  var kindInput = document.getElementById("kindInput");
  var kindOptions = document.getElementById("kindOptions");
  var toastEl = document.getElementById("toast");
  var langBtns = document.querySelectorAll(".lang-btn");

  var lang = "ko";
  var lastSubjects = [];
  var kindTouched = false;
  var fontsReady = !(document.fonts && document.fonts.ready);
  if (!fontsReady) {
    document.fonts.ready.then(function () { fontsReady = true; });
  }
  function t(key) { return I18N[lang][key]; }

  /* ---------- language ---------- */

  // Runs over the whole page and over a freshly cloned template alike.
  function localize(root) {
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-ph]").forEach(function (el) {
      el.placeholder = t(el.dataset.ph);
    });
    root.querySelectorAll("[data-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.dataset.aria));
    });
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;

    localize(document);

    // The presets follow the language, but a word the reader typed is theirs:
    // only an untouched field is swapped over to the new language's default.
    kindOptions.innerHTML = "";
    I18N[next].kinds.forEach(function (word) {
      var option = document.createElement("option");
      option.value = word;
      kindOptions.appendChild(option);
    });
    if (!kindTouched) kindInput.value = I18N[next].kinds[0];

    langBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === next));
    });
    document.title = "Neat Taker";

    if (!outputCard.hidden) {
      var text = buildOutput(true);
      if (text !== null) outputEl.textContent = text;
    }
  }

  /* ---------- date ---------- */

  // en: "2026-08-16" -> "8/16/26"   ko: "2026-08-16" -> "2026-08-16"
  function formatDate(value) {
    var parts = value.split("-");
    if (lang === "ko") return parts[0] + "-" + parts[1] + "-" + parts[2];
    return Number(parts[1]) + "/" + Number(parts[2]) + "/" + parts[0].slice(2);
  }

  // Whatever word names the note — the presets, or anything typed over them.
  function currentKind() {
    return kindInput.value.trim() || I18N[lang].kinds[0];
  }

  // en: <Note 8/16/26>   ko: <2026-08-16 노트>
  function buildHeader() {
    var date = formatDate(dateInput.value || todayValue());
    var kind = currentKind();
    return lang === "ko"
      ? "<" + date + " " + kind + ">"
      : "<" + kind + " " + date + ">";
  }

  function todayValue() {
    var now = new Date();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + m + "-" + d;
  }

  /* ---------- rows ---------- */

  function renumber() {
    var rows = subjectsEl.querySelectorAll(".subject");
    rows.forEach(function (row, i) {
      row.querySelector(".subject-index").textContent = String(i + 1) + ".";
      row.querySelector(".remove-subject").disabled = rows.length === 1;
    });
  }

  function renumberBullets(subject) {
    var items = subject.querySelectorAll(".bullet");
    items.forEach(function (item) {
      item.querySelector(".remove-bullet").disabled = items.length === 1;
    });
  }

  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function addBullet(subject, focus, after) {
    var list = subject.querySelector(".bullets");
    var node = bulletTemplate.content.cloneNode(true);
    var item = node.querySelector(".bullet");
    var field = item.querySelector(".bullet-text");

    localize(node);

    item.querySelector(".remove-bullet").addEventListener("click", function () {
      item.remove();
      // A subject always keeps one bullet to type into.
      if (!subject.querySelector(".bullet")) addBullet(subject, false);
      renumberBullets(subject);
    });

    field.addEventListener("input", function () {
      field.classList.remove("invalid-field");
      autoGrow(field);
    });

    // Enter opens the next bullet the way a list does everywhere else;
    // Shift+Enter still breaks the line inside one bullet.
    field.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      addBullet(subject, true, item);
    });

    if (after && after.parentNode === list) after.insertAdjacentElement("afterend", item);
    else list.appendChild(item);

    renumberBullets(subject);
    if (focus) field.focus();
    return item;
  }

  function addSubject(focus) {
    var node = subjectTemplate.content.cloneNode(true);
    var subject = node.querySelector(".subject");
    var titleField = subject.querySelector(".subject-title");

    localize(node);

    subject.querySelector(".remove-subject").addEventListener("click", function () {
      subject.remove();
      renumber();
    });

    titleField.addEventListener("input", function () {
      titleField.classList.remove("invalid-field");
    });

    titleField.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.isComposing) return;
      e.preventDefault();
      subject.querySelector(".bullet-text").focus();
    });

    subject.querySelector(".bullet-add").addEventListener("click", function () {
      addBullet(subject, true);
    });

    subjectsEl.appendChild(node);
    addBullet(subject, false);
    renumber();
    if (focus) titleField.focus();
  }

  /* ---------- output ---------- */

  function buildOutput(silent) {
    var rows = Array.prototype.slice.call(subjectsEl.querySelectorAll(".subject"));
    var subjects = [];
    var missingSubject = false;
    var missingBullet = false;

    rows.forEach(function (row) {
      var titleField = row.querySelector(".subject-title");
      var title = titleField.value.trim().replace(/[:：]\s*$/, "");
      var bullets = [];

      row.querySelectorAll(".bullet-text").forEach(function (field) {
        var text = field.value.trim().replace(/\s*\n\s*/g, " ");
        if (text) bullets.push(text);
      });

      if (!title && !bullets.length) return; // skip blank subjects

      if (!title) { titleField.classList.add("invalid-field"); missingSubject = true; }
      if (!bullets.length) {
        row.querySelectorAll(".bullet-text").forEach(function (field) {
          field.classList.add("invalid-field");
        });
        missingBullet = true;
      }
      if (title && bullets.length) subjects.push({ title: title, bullets: bullets });
    });

    if (missingSubject) { if (!silent) showToast(t("needSubject")); return null; }
    if (missingBullet) { if (!silent) showToast(t("needBullet")); return null; }
    if (!subjects.length) { if (!silent) showToast(t("needOne")); return null; }

    var blocks = subjects.map(function (s) {
      var lines = s.bullets.map(function (b) { return "  • " + b; });
      return "▪ " + s.title + "\n" + lines.join("\n");
    });

    lastSubjects = subjects;
    return buildHeader() + "\n\n" + blocks.join("\n\n");
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1900);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  /* ---------- share image ---------- */

  // 1080x1920 is 9:16 — the ratio every phone screen and messenger/story
  // viewer handles without cropping. A note too long for one frame is split
  // into several 9:16 pages rather than one tall image that messengers would
  // shrink until it is unreadable.
  var IMG = {
    width: 1080,
    height: 1920,
    pad: 90,
    dotIndent: 26,  // subject title -> bullet dot
    textIndent: 62, // subject title -> bullet text
    footer: 90,
    maxFont: 42,
    minFont: 32,   // floor while trying to keep everything on one page
    pageFont: 36,  // comfortable size once we accept multiple pages
    family: 'Inter, "Noto Sans KR", -apple-system, sans-serif'
  };

  // Split into wrap units: whole words for Latin, single characters for CJK,
  // which is how Korean has to break since it is written without spaces.
  function tokenize(text) {
    var tokens = [];
    var buf = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/\s/.test(ch)) {
        if (buf) { tokens.push(buf); buf = ""; }
        tokens.push(" ");
      } else if (/[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯]/.test(ch)) {
        if (buf) { tokens.push(buf); buf = ""; }
        tokens.push(ch);
      } else {
        buf += ch;
      }
    }
    if (buf) tokens.push(buf);
    return tokens;
  }

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var line = "";
    tokenize(text).forEach(function (token) {
      if (token === " " && line === "") return; // no leading space on a new line
      var next = line + token;
      if (line !== "" && ctx.measureText(next).width > maxWidth) {
        lines.push(line.replace(/\s+$/, ""));
        line = token === " " ? "" : token;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  // Measure the header, every subject title and every bullet once at a given
  // body size.
  function measure(ctx, header, subjects, size) {
    var textWidth = IMG.width - IMG.pad * 2;
    var headerSize = Math.round(size * 1.25);
    var titleSize = Math.round(size * 1.12);
    var titleLineHeight = Math.round(titleSize * 1.45);
    var lineHeight = Math.round(size * 1.55);

    ctx.font = "700 " + headerSize + "px " + IMG.family;
    var headerLines = wrapText(ctx, header, textWidth);
    var headerHeight = headerLines.length * Math.round(headerSize * 1.35) + Math.round(size * 1.9);

    var blocks = subjects.map(function (subject) {
      ctx.font = "700 " + titleSize + "px " + IMG.family;
      var titleLines = wrapText(ctx, subject.title, textWidth);

      ctx.font = "400 " + size + "px " + IMG.family;
      var bullets = subject.bullets.map(function (text) {
        var lines = wrapText(ctx, text, textWidth - IMG.textIndent);
        return { lines: lines, height: lines.length * lineHeight };
      });

      return {
        titleLines: titleLines,
        titleHeight: titleLines.length * titleLineHeight,
        bullets: bullets
      };
    });

    var plan = {
      size: size,
      headerSize: headerSize,
      headerLines: headerLines,
      headerHeight: headerHeight,
      titleSize: titleSize,
      titleLineHeight: titleLineHeight,
      lineHeight: lineHeight,
      titleGap: Math.round(size * 0.5),
      bulletGap: Math.round(size * 0.45),
      subjectGap: Math.round(size * 1.15),
      blocks: blocks
    };

    plan.total = headerHeight + blocks.reduce(function (sum, block, i) {
      var height = (i ? plan.subjectGap : 0) + block.titleHeight;
      block.bullets.forEach(function (bullet, j) {
        height += (j ? plan.bulletGap : plan.titleGap) + bullet.height;
      });
      return sum + height;
    }, 0);

    return plan;
  }

  // Greedy fill. A bullet never straddles a page break, and a subject title is
  // never left stranded at the foot of a page — when its list continues onto
  // the next page the title is repeated above it.
  function paginate(plan, bodyHeight) {
    var pages = [];
    var page = [];
    var used = plan.headerHeight;

    function flush() {
      if (page.length) pages.push(page);
      page = [];
      used = plan.headerHeight;
    }

    plan.blocks.forEach(function (block) {
      var gapBefore = page.length ? plan.subjectGap : 0;
      var first = block.bullets[0];
      var opening = gapBefore + block.titleHeight +
        (first ? plan.titleGap + first.height : 0);

      // Keep the title with its first bullet.
      if (page.length && used + opening > bodyHeight) { flush(); gapBefore = 0; }

      page.push({ type: "title", lines: block.titleLines, gapBefore: gapBefore });
      used += gapBefore + block.titleHeight;

      block.bullets.forEach(function (bullet, i) {
        var gap = i === 0 ? plan.titleGap : plan.bulletGap;
        if (page.length > 1 && used + gap + bullet.height > bodyHeight) {
          flush();
          page.push({ type: "title", lines: block.titleLines, gapBefore: 0 });
          used += block.titleHeight;
          gap = plan.titleGap;
        }
        page.push({ type: "bullet", lines: bullet.lines, gapBefore: gap });
        used += gap + bullet.height;
      });
    });

    flush();
    return pages;
  }

  function itemsHeight(plan, items) {
    return items.reduce(function (sum, item) {
      var lineHeight = item.type === "title" ? plan.titleLineHeight : plan.lineHeight;
      return sum + item.gapBefore + item.lines.length * lineHeight;
    }, 0);
  }

  function drawPage(plan, items, pageNo, pageCount) {
    var canvas = document.createElement("canvas");
    var bodyHeight = plan.headerHeight + itemsHeight(plan, items);

    canvas.width = IMG.width;
    // Only a single bullet taller than a whole frame can push a page past 9:16.
    canvas.height = Math.max(IMG.height, bodyHeight + IMG.pad * 2 + IMG.footer);

    var ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var y = IMG.pad;

    ctx.fillStyle = "#000000";
    ctx.font = "700 " + plan.headerSize + "px " + IMG.family;
    plan.headerLines.forEach(function (line) {
      ctx.fillText(line, IMG.pad, y);
      y += Math.round(plan.headerSize * 1.35);
    });

    // The logo's two colors, side by side.
    var barY = y + Math.round(plan.size * 0.5);
    ctx.fillStyle = "#00a4e4";
    ctx.fillRect(IMG.pad, barY, 96, 6);
    ctx.fillStyle = "#920091";
    ctx.fillRect(IMG.pad + 104, barY, 40, 6);
    y += Math.round(plan.size * 1.9);

    items.forEach(function (item) {
      y += item.gapBefore;

      if (item.type === "title") {
        ctx.fillStyle = "#000000";
        ctx.font = "700 " + plan.titleSize + "px " + IMG.family;
        item.lines.forEach(function (line) {
          ctx.fillText(line, IMG.pad, y);
          y += plan.titleLineHeight;
        });
        return;
      }

      ctx.fillStyle = "#920091";
      ctx.font = "400 " + plan.size + "px " + IMG.family;
      ctx.fillText("•", IMG.pad + IMG.dotIndent, y);

      ctx.fillStyle = "#000000";
      item.lines.forEach(function (line) {
        ctx.fillText(line, IMG.pad + IMG.textIndent, y);
        y += plan.lineHeight;
      });
    });

    ctx.fillStyle = "#b5b7b4";
    ctx.font = "500 26px " + IMG.family;
    ctx.fillText("Neat Taker", IMG.pad, canvas.height - IMG.pad - 26);

    if (pageCount > 1) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#575a5d";
      ctx.fillText(pageNo + " / " + pageCount, IMG.width - IMG.pad, canvas.height - IMG.pad - 26);
      ctx.textAlign = "left";
    }

    return canvas;
  }

  function renderPages(header, subjects) {
    var ctx = document.createElement("canvas").getContext("2d");
    var bodyHeight = IMG.height - IMG.pad * 2 - IMG.footer;

    // Prefer one page: shrink the type toward minFont to make it fit.
    var plan = measure(ctx, header, subjects, IMG.maxFont);
    for (var size = IMG.maxFont; plan.total > bodyHeight && size > IMG.minFont; size -= 2) {
      plan = measure(ctx, header, subjects, size - 2);
    }
    // Still too long: stop shrinking, go back to a comfortable size, split.
    if (plan.total > bodyHeight) plan = measure(ctx, header, subjects, IMG.pageFont);

    var pages = paginate(plan, bodyHeight);
    return pages.map(function (items, i) {
      return drawPage(plan, items, i + 1, pages.length);
    });
  }

  // toDataURL is synchronous, unlike toBlob. That matters: iOS Safari only
  // allows navigator.share() during a user gesture, and an awaited callback
  // no longer counts as one.
  function canvasToBlob(canvas) {
    var dataURL = canvas.toDataURL("image/png");
    var binary = atob(dataURL.split(",")[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: "image/png" });
  }

  function pageName(baseName, i, count) {
    return count === 1 ? baseName + ".png" : baseName + " (" + (i + 1) + ").png";
  }

  // On a phone the share sheet is the only route into Photos or KakaoTalk;
  // a plain download drops the file into Files, where nobody looks for it.
  function shareOrSave(canvases, baseName) {
    var files;
    try {
      files = canvases.map(function (canvas, i) {
        return new File([canvasToBlob(canvas)], pageName(baseName, i, canvases.length), {
          type: "image/png"
        });
      });
    } catch (e) {
      saveCanvases(canvases, baseName);
      return;
    }

    if (navigator.canShare && navigator.canShare({ files: files })) {
      navigator.share({ files: files }).catch(function (err) {
        if (err && err.name === "AbortError") return; // the user closed the sheet
        saveCanvases(canvases, baseName);
      });
      return;
    }

    saveCanvases(canvases, baseName);
  }

  function saveCanvas(canvas, filename) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob) { resolve(false); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        if ("download" in a) {
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.open(url, "_blank"); // iOS Safari: opens it to long-press save
        }
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        resolve(true);
      }, "image/png");
    });
  }

  // Browsers rate-limit bursts of downloads, so space them out.
  function saveCanvases(canvases, baseName) {
    canvases.forEach(function (canvas, i) {
      var name = pageName(baseName, i, canvases.length);
      setTimeout(function () { saveCanvas(canvas, name); }, i * 600);
    });
  }

  /* ---------- events ---------- */

  langBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { applyLang(btn.dataset.lang); });
  });

  kindInput.addEventListener("input", function () { kindTouched = true; });

  addSubjectBtn.addEventListener("click", function () { addSubject(true); });

  submitBtn.addEventListener("click", function () {
    var text = buildOutput();
    if (text === null) return;
    outputEl.textContent = text;
    outputCard.hidden = false;
    outputCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  copyBtn.addEventListener("click", function () {
    copyText(outputEl.textContent).then(
      function () { showToast(t("copied")); },
      function () { showToast(t("copyFail")); }
    );
  });

  imgBtn.addEventListener("click", function () {
    var text = buildOutput();
    if (text === null) return;
    outputEl.textContent = text;

    var name = currentKind() + " " + (dateInput.value || todayValue());

    function run() {
      try {
        var pages = renderPages(buildHeader(), lastSubjects);
        if (pages.length > 1) showToast(t("imageCount").replace("{n}", pages.length));
        shareOrSave(pages, name);
      } catch (e) {
        showToast(t("imageFail"));
      }
    }

    // Fonts are normally in long before anyone submits, so this runs inline and
    // keeps the gesture alive for the share sheet. Only a very early tap waits,
    // and that path just downloads instead.
    if (fontsReady) run();
    else document.fonts.ready.then(run);
  });

  // The browser's print dialog handles "Save as PDF" — it already renders
  // Hangul correctly, and document.title becomes the default file name.
  pdfBtn.addEventListener("click", function () {
    var restore = document.title;
    document.title = currentKind() + " " + (dateInput.value || todayValue());
    window.print();
    setTimeout(function () { document.title = restore; }, 500);
  });

  /* ---------- init ---------- */

  applyLang("ko");
  dateInput.value = todayValue();
  addSubject(false);
})();
