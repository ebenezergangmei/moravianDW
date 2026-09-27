// ============================================================
// MORAVIAN DAILY WATCHWORDS
// FINAL PARSER
// ============================================================


// ============================================================
// GITHUB
// ============================================================

const GITHUB_API =
  "https://api.github.com/repos/ebenezergangmei/moravianDW/contents/data?ref=main";

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/ebenezergangmei/moravianDW/main/data/";


// ============================================================
// DOM
// ============================================================

const languageSelect =
  document.getElementById("language");

const yearSelect =
  document.getElementById("year");

const previousBtn =
  document.getElementById("previousBtn");

const todayBtn =
  document.getElementById("todayBtn");

const nextBtn =
  document.getElementById("nextBtn");

const fontDownBtn =
  document.getElementById("fontDownBtn");

const fontUpBtn =
  document.getElementById("fontUpBtn");

const fontSizeLabel =
  document.getElementById("fontSizeLabel");

const offlineBtn =
  document.getElementById("offlineBtn");

const statusBox =
  document.getElementById("status");

const contentBox =
  document.getElementById("watchwordContent");


// ============================================================
// STATE
// ============================================================

let files = [];

let records = [];

let selectedLanguage = "";

let selectedYear = "";

let currentDate = new Date();

let readerScale = Number(
  localStorage.getItem(
    "watchwordFontScale"
  ) || 100
);


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function setStatus(text) {

  statusBox.textContent =
    text || "";
}


function showError(text) {

  contentBox.innerHTML = "";

  statusBox.innerHTML =
    '<div class="error">' +
    escapeHtml(text) +
    "</div>";
}


function pad(n) {

  return String(n)
    .padStart(2, "0");
}


function dateKey(date) {

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );
}


function dayOfYear(date) {

  const start =
    new Date(
      date.getFullYear(),
      0,
      1
    );

  return (
    Math.floor(
      (date - start) /
      86400000
    ) + 1
  );
}


function formatDate(date) {

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "2-digit",
      year: "numeric"
    }
  );
}


function normalizeText(text) {

  return String(text)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}


// ============================================================
// FILE INFORMATION
// ============================================================

function fileInfo(filename) {

  if (
    !filename ||
    !filename
      .toLowerCase()
      .endsWith(".txt")
  ) {
    return null;
  }


  const match =
    filename.match(
      /^(\d{4})\s+(.+)\.txt$/i
    );


  if (!match) {
    return null;
  }


  return {
    name: filename,
    year: Number(match[1]),
    language: match[2].trim()
  };
}


// ============================================================
// LOAD TXT FILE LIST
// ============================================================

async function loadFileList() {

  setStatus(
    "Loading Watchword files..."
  );


  const response =
    await fetch(
      GITHUB_API,
      {
        cache: "no-store",
        headers: {
          Accept:
            "application/vnd.github+json"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "Could not read the GitHub data folder (" +
      response.status +
      ")."
    );
  }


  const items =
    await response.json();


  files =
    items
      .filter(
        item =>
          item.type === "file" &&
          item.name
            .toLowerCase()
            .endsWith(".txt")
      )
      .map(
        item =>
          fileInfo(item.name)
      )
      .filter(Boolean)
      .sort(
        (a, b) => {

          if (
            a.year !== b.year
          ) {
            return (
              a.year -
              b.year
            );
          }

          return a.language.localeCompare(
            b.language,
            undefined,
            {
              sensitivity:
                "base"
            }
          );
        }
      );


  if (!files.length) {

    throw new Error(
      "No Watchword TXT files were found."
    );
  }


  populateSelectors();
}


// ============================================================
// SELECTORS
// ============================================================

function populateSelectors() {

  const languages =
    [
      ...new Set(
        files.map(
          file =>
            file.language
        )
      )
    ].sort();


  const years =
    [
      ...new Set(
        files.map(
          file =>
            file.year
        )
      )
    ].sort(
      (a, b) =>
        a - b
    );


  const savedLanguage =
    localStorage.getItem(
      "watchwordLanguage"
    );


  const savedYear =
    Number(
      localStorage.getItem(
        "watchwordYear"
      )
    );


  selectedLanguage =
    languages.includes(
      savedLanguage
    )
      ? savedLanguage
      : languages[0];


  selectedYear =
    years.includes(
      savedYear
    )
      ? savedYear
      : years[years.length - 1];


  languageSelect.innerHTML =
    languages
      .map(
        language =>
          `<option value="${escapeHtml(
            language
          )}">${escapeHtml(
            language
          )}</option>`
      )
      .join("");


  yearSelect.innerHTML =
    years
      .map(
        year =>
          `<option value="${year}">${year}</option>`
      )
      .join("");


  languageSelect.value =
    selectedLanguage;


  yearSelect.value =
    String(selectedYear);
}


// ============================================================
// SELECTED FILE
// ============================================================

function getSelectedFile() {

  return files.find(
    file =>
      file.language ===
        languageSelect.value &&
      file.year ===
        Number(
          yearSelect.value
        )
  );
}


// ============================================================
// LOAD SELECTED FILE
// ============================================================

async function loadSelectedFile() {

  const file =
    getSelectedFile();


  if (!file) {

    showError(
      "Selected Watchword file not found."
    );

    return;
  }


  selectedLanguage =
    file.language;


  selectedYear =
    file.year;


  localStorage.setItem(
    "watchwordLanguage",
    selectedLanguage
  );


  localStorage.setItem(
    "watchwordYear",
    String(selectedYear)
  );


  setStatus(
    "Loading " +
    file.name +
    "..."
  );


  try {

    const response =
      await fetch(
        GITHUB_RAW_BASE +
        encodeURIComponent(
          file.name
        ),
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Could not read " +
        file.name +
        " (" +
        response.status +
        ")."
      );
    }


    const text =
      await response.text();


    records =
      parseFile(text);


    if (!records.length) {

      throw new Error(
        "No # records found in " +
        file.name
      );
    }


    setStatus("");

    displayCurrentDate();


  } catch (error) {

    console.error(error);

    showError(
      "Could not load " +
      file.name +
      ".\n\n" +
      error.message
    );
  }
}


// ============================================================
// # PARSER
//
// Every # begins a new day.
// ============================================================

function parseFile(text) {

  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");


  const blocks =
    normalized.split(
      /^\s*#/m
    );


  return blocks
    .slice(1)
    .map(
      (block, index) => {

        const lines =
          block
            .split("\n")
            .map(
              line =>
                line.trim()
            )
            .filter(
              line =>
                line !== ""
            );


        return {
          dayNumber:
            index + 1,
          lines
        };
      }
    )
    .filter(
      record =>
        record.lines.length
    );
}


// ============================================================
// RECORD FOR DATE
// ============================================================

function getRecordForDate(date) {

  return (
    records[
      dayOfYear(date) - 1
    ] || null
  );
}


// ============================================================
// DATE LINE
// ============================================================

function looksLikeDateLine(line) {

  const text =
    line.trim();


  /*
    Recognize English month names.

    This supports examples such as:

    Friday, October 9

    Thursday, September 24

    Sunday/Neihneic, October – Baanchthbw 4
  */

  const month =
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i;


  if (!month.test(text)) {
    return false;
  }


  /*
    There must also be a number.
  */

  return /\d{1,2}/.test(text);
}


// ============================================================
// SCRIPTURE READINGS
// ============================================================

function looksLikeReadings(line) {

  if (!line.includes(";")) {
    return false;
  }


  const refs =
    line.match(
      /\b\d+:\d+(?:[-–]\d+)?/g
    );


  return (
    refs &&
    refs.length >= 2
  );
}


// ============================================================
// SPECIAL TITLE
// ============================================================

function isSpecialTitle(line) {

  return (
    /^\*[^*]+\*:/u.test(line) ||
    /^Good Friday\b/i.test(line) ||
    /^Maundy Thursday\b/i.test(line)
  );
}


// ============================================================
// BIBLE REFERENCE
//
// IMPORTANT:
//
// We only look for the FINAL reference.
// We do NOT allow arbitrary sentence words
// to become part of the reference.
//
// Examples:
//
// Isaiah 50:9
// Ezekiel 36:36
// Romans 8:34
// 1 Samuel 30:1
// 1 Korinmei 10:31
// ============================================================

function splitBibleReference(line) {

  const text =
    line.trim();


  /*
    The final part must look like:

    Book 12:34
    Book 12:34-36
    1 Book 12:34

    Book names can have up to 4 words,
    but ONLY words beginning with an
    uppercase letter are accepted.

    This prevents:

    "rebuilt the ruined places and
     replanted that which was desolate.
     Ezekiel 36:36"

    from swallowing the sentence.
  */

  const pattern =
    /((?:[1-3]\s+)?[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’.\-]*(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’.\-]*){0,3}\s+\d+:\d+(?:[-–]\d+)?(?:,\s*\d+(?:[-–]\d+)?)?)$/u;


  const match =
    text.match(pattern);


  if (!match) {
    return null;
  }


  const reference =
    match[1].trim();


  const verseText =
    text
      .slice(
        0,
        match.index
      )
      .trim();


  if (!verseText) {
    return null;
  }


  return {
    verseText,
    reference
  };
}


// ============================================================
// WATCHWORD
// ============================================================

function parseWatchword(line) {

  const match =
    line.match(
      /^Watchword\s+for\s+the\s+Week\s*:\s*(.*)$/i
    );


  if (!match) {
    return null;
  }


  const value =
    splitBibleReference(
      match[1]
    );


  if (!value) {

    return {
      text:
        match[1].trim(),
      reference:
        ""
    };
  }


  return value;
}


// ============================================================
// REMOVE DUPLICATE HEADING
// ============================================================

function removeHeadingDuplicate(
  heading,
  lines
) {

  if (!heading) {
    return lines;
  }


  const normalizedHeading =
    normalizeText(
      heading
    );


  return lines.filter(
    line =>
      normalizeText(
        line
      ) !==
      normalizedHeading
  );
}


// ============================================================
// DISPLAY RECORD
// ============================================================

function displayRecord(
  record,
  date
) {

  if (!record) {

    contentBox.innerHTML =
      '<div class="error">' +
      "No Watchword record found for " +
      escapeHtml(
        formatDate(date)
      ) +
      "." +
      "</div>";

    return;
  }


  let lines =
    record.lines.slice();


  /*
    Remove empty lines and
    consecutive duplicates.
  */

  const cleaned = [];

  for (
    const line of lines
  ) {

    if (!line.trim()) {
      continue;
    }


    if (
      cleaned.length &&
      normalizeText(
        cleaned[
          cleaned.length - 1
        ]
      ) ===
      normalizeText(
        line
      )
    ) {
      continue;
    }


    cleaned.push(
      line.trim()
    );
  }


  lines = cleaned;


  // ----------------------------------------------------------
  // Determine heading/date
  // ----------------------------------------------------------

  let heading = "";

  let dateLine = "";


  if (lines.length) {

    if (
      looksLikeDateLine(
        lines[0]
      )
    ) {

      /*
        Example:

        #Friday, October 9
      */

      dateLine =
        lines.shift();

    } else {

      /*
        Example:

        #Pentecost tangv Ruhna-Chaku Sunday/Neihneic
      */

      heading =
        lines.shift();
    }
  }


  /*
    If there is a heading, remove
    another exact copy of it.
  */

  if (heading) {

    lines =
      removeHeadingDuplicate(
        heading,
        lines
      );
  }


  /*
    Find the actual date line
    after the heading.
  */

  if (!dateLine) {

    for (
      let i = 0;
      i < Math.min(
        lines.length,
        4
      );
      i++
    ) {

      if (
        looksLikeDateLine(
          lines[i]
        )
      ) {

        dateLine =
          lines.splice(
            i,
            1
          )[0];

        break;
      }
    }
  }


  // ----------------------------------------------------------
  // BUILD HTML
  // ----------------------------------------------------------

  let html = "";


  /*
    Heading = normal
  */

  if (heading) {

    html +=
      '<div class="entry-heading">' +
      escapeHtml(
        heading
      ) +
      "</div>";
  }


  /*
    Date = BOLD
  */

  if (dateLine) {

    html +=
      '<div class="date">' +
      escapeHtml(
        dateLine
      ) +
      "</div>";
  }


  // ----------------------------------------------------------
  // Remaining lines
  // ----------------------------------------------------------

  for (
    const line of lines
  ) {

    // --------------------------------------------------------
    // Watchword for the Week
    // --------------------------------------------------------

    const watchword =
      parseWatchword(
        line
      );


    if (watchword) {

      html +=
        '<div class="watchword-line">';


      html +=
        "<strong>" +
        "Watchword for the Week:" +
        "</strong> ";


      html +=
        "<strong>" +
        escapeHtml(
          watchword.text
        ) +
        "</strong>";


      if (
        watchword.reference
      ) {

        html +=
          " " +
          '<span class="reference">' +
          escapeHtml(
            watchword.reference
          ) +
          "</span>";
      }


      html +=
        "</div>";


      continue;
    }


    // --------------------------------------------------------
    // Ignore another date line
    // --------------------------------------------------------

    if (
      looksLikeDateLine(
        line
      )
    ) {

      continue;
    }


    // --------------------------------------------------------
    // Scripture readings
    // --------------------------------------------------------

    if (
      looksLikeReadings(
        line
      )
    ) {

      html +=
        '<div class="readings">' +
        escapeHtml(
          line
        ) +
        "</div>";

      continue;
    }


    // --------------------------------------------------------
    // Special title
    // --------------------------------------------------------

    if (
      isSpecialTitle(
        line
      )
    ) {

      const special =
        line.replace(
          /^\*|\*$/g,
          ""
        );


      html +=
        '<div class="special">' +
        escapeHtml(
          special
        ) +
        "</div>";

      continue;
    }


    // --------------------------------------------------------
    // Bible verse
    // --------------------------------------------------------

    const bible =
      splitBibleReference(
        line
      );


    if (bible) {

      html +=
        '<div class="reader-paragraph">' +

        "<strong>" +
        escapeHtml(
          bible.verseText
        ) +
        "</strong> " +

        '<span class="reference">' +
        escapeHtml(
          bible.reference
        ) +
        "</span>" +

        "</div>";

      continue;
    }


    // --------------------------------------------------------
    // Normal text
    // --------------------------------------------------------

    html +=
      '<div class="reader-paragraph">' +
      escapeHtml(
        line
      ) +
      "</div>";
  }


  // ----------------------------------------------------------
  // FINAL
  // ----------------------------------------------------------

  contentBox.innerHTML =
    '<article class="entry">' +
    html +
    "</article>";
}


// ============================================================
// DISPLAY CURRENT DATE
// ============================================================

function displayCurrentDate() {

  const record =
    getRecordForDate(
      currentDate
    );


  displayRecord(
    record,
    currentDate
  );


  updateNavigationButtons();
}


// ============================================================
// PREVIOUS / NEXT
// ============================================================

function moveDate(days) {

  const newDate =
    new Date(
      currentDate
    );


  newDate.setDate(
    newDate.getDate() +
    days
  );


  if (
    newDate.getFullYear() !==
    Number(selectedYear)
  ) {
    return;
  }


  currentDate =
    newDate;


  displayCurrentDate();
}


// ============================================================
// TODAY
// ============================================================

function goToday() {

  const today =
    new Date();


  if (
    today.getFullYear() ===
    Number(selectedYear)
  ) {

    currentDate =
      today;

  } else {

    currentDate =
      new Date(
        Number(selectedYear),
        0,
        1
      );
  }


  displayCurrentDate();
}


// ============================================================
// LANGUAGE / YEAR CHANGE
// ============================================================

async function selectionChanged() {

  selectedLanguage =
    languageSelect.value;


  selectedYear =
    Number(
      yearSelect.value
    );


  localStorage.setItem(
    "watchwordLanguage",
    selectedLanguage
  );


  localStorage.setItem(
    "watchwordYear",
    String(selectedYear)
  );


  const today =
    new Date();


  if (
    today.getFullYear() ===
    selectedYear
  ) {

    currentDate =
      today;

  } else {

    currentDate =
      new Date(
        selectedYear,
        0,
        1
      );
  }


  await loadSelectedFile();
}


// ============================================================
// FONT SIZE
// ============================================================

function applyFontScale() {

  readerScale =
    Math.max(
      70,
      Math.min(
        150,
        readerScale
      )
    );


  /*
    Set BOTH:

    --reader-size

    and

    --reader-scale

    so the CSS always receives
    the current value.
  */

  const size =
    18 *
    readerScale /
    100;


  document.documentElement.style.setProperty(
    "--reader-size",
    size + "px"
  );


  document.documentElement.style.setProperty(
    "--reader-scale",
    readerScale + "%"
  );


  fontSizeLabel.textContent =
    readerScale +
    "%";


  localStorage.setItem(
    "watchwordFontScale",
    String(readerScale)
  );
}


// ============================================================
// FONT BUTTONS
// ============================================================

fontDownBtn.addEventListener(
  "click",
  function () {

    readerScale -= 5;

    applyFontScale();
  }
);


fontUpBtn.addEventListener(
  "click",
  function () {

    readerScale += 5;

    applyFontScale();
  }
);


// ============================================================
// NAVIGATION
// ============================================================

previousBtn.addEventListener(
  "click",
  function () {

    moveDate(-1);
  }
);


nextBtn.addEventListener(
  "click",
  function () {

    moveDate(1);
  }
);


todayBtn.addEventListener(
  "click",
  function () {

    goToday();
  }
);


// ============================================================
// SELECTORS
// ============================================================

languageSelect.addEventListener(
  "change",
  selectionChanged
);


yearSelect.addEventListener(
  "change",
  selectionChanged
);


// ============================================================
// NAVIGATION BUTTON STATE
// ============================================================

function updateNavigationButtons() {

  const firstDay =
    new Date(
      Number(selectedYear),
      0,
      1
    );


  const lastDay =
    new Date(
      Number(selectedYear),
      11,
      31
    );


  previousBtn.disabled =
    dateKey(
      currentDate
    ) ===
    dateKey(
      firstDay
    );


  nextBtn.disabled =
    dateKey(
      currentDate
    ) ===
    dateKey(
      lastDay
    );
}


// ============================================================
// SAVE OFFLINE
// ============================================================

async function saveOffline() {

  const file =
    getSelectedFile();


  if (!file) {
    return;
  }


  try {

    const response =
      await fetch(
        GITHUB_RAW_BASE +
        encodeURIComponent(
          file.name
        ),
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Could not download the Watchword file."
      );
    }


    const text =
      await response.text();


    localStorage.setItem(
      "watchwordOffline_" +
      file.name,
      text
    );


    offlineBtn.classList.add(
      "saved"
    );


    offlineBtn.textContent =
      "✓ Saved Offline";


  } catch (error) {

    console.error(error);


    offlineBtn.textContent =
      "Save Failed";


    setTimeout(
      function () {

        offlineBtn.textContent =
          "💾 Save Offline";

      },
      2000
    );
  }
}


offlineBtn.addEventListener(
  "click",
  saveOffline
);


// ============================================================
// START
// ============================================================

async function start() {

  try {

    applyFontScale();


    await loadFileList();


    /*
      Make sure selected
      language/year exists.
    */

    const exists =
      files.some(
        file =>
          file.language ===
            selectedLanguage &&
          file.year ===
            selectedYear
      );


    if (!exists) {

      const first =
        files[0];


      selectedLanguage =
        first.language;


      selectedYear =
        first.year;


      languageSelect.value =
        selectedLanguage;


      yearSelect.value =
        String(selectedYear);
    }


    /*
      Initial date.
    */

    const today =
      new Date();


    if (
      today.getFullYear() ===
      Number(selectedYear)
    ) {

      currentDate =
        today;

    } else {

      currentDate =
        new Date(
          selectedYear,
          0,
          1
        );
    }


    await loadSelectedFile();


  } catch (error) {

    console.error(error);


    showError(
      "Could not start the Watchword application.\n\n" +
      error.message
    );
  }
}


// ============================================================
// RUN
// ============================================================

start();
