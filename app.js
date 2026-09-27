// ============================================================
// MORAVIAN DAILY WATCHWORDS
// SIMPLE TXT DISPLAY VERSION
//
// The TXT file is treated as the source of truth.
// # = beginning of a new daily entry.
//
// No Bible-reference parsing.
// No sentence parsing.
// No automatic duplicate removal.
// ============================================================


// ============================================================
// GITHUB DATA
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


function pad(number) {

  return String(number)
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
//
// Expected filenames:
//
// 2025 English.txt
// 2025 Rongmei.txt
// 2026 English.txt
// 2026 Rongmei.txt
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
// LOAD FILE LIST
//
// GitHub automatically tells us what TXT files are
// inside /data.
//
// Therefore files.json is NOT required.
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
      "No Watchword TXT files were found in the data folder."
    );
  }


  populateSelectors();
}


// ============================================================
// LANGUAGE + YEAR SELECTORS
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
// GET CURRENT FILE
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
// LOAD SELECTED TXT
// ============================================================

async function loadSelectedFile() {

  const file =
    getSelectedFile();


  if (!file) {

    showError(
      "The selected Watchword file could not be found."
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


    /*
      IMPORTANT:

      The TXT file itself is the source
      of truth.

      We only split it at #.
    */

    records =
      parseFile(
        text
      );


    if (!records.length) {

      throw new Error(
        "No # records were found in " +
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
// PARSE TXT
//
// ONLY # HAS SPECIAL MEANING.
//
// Everything inside each # section is kept.
// ============================================================

function parseFile(text) {

  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");


  /*
    Every # begins a new daily entry.
  */

  const blocks =
    normalized.split(
      /^\s*#/m
    );


  return blocks
    .slice(1)
    .map(
      block => {

        /*
          Keep the original lines.

          We remove only completely empty
          lines at the beginning/end.
        */

        const lines =
          block
            .split("\n")
            .map(
              line =>
                line.trim()
            );


        while (
          lines.length &&
          lines[0] === ""
        ) {
          lines.shift();
        }


        while (
          lines.length &&
          lines[
            lines.length - 1
          ] === ""
        ) {
          lines.pop();
        }


        return {
          lines
        };
      }
    )
    .filter(
      record =>
        record.lines.length > 0
    );
}


// ============================================================
// GET DAILY RECORD
//
// Record #1 = January 1
// Record #2 = January 2
// etc.
// ============================================================

function getRecordForDate(date) {

  const index =
    dayOfYear(date) - 1;


  return (
    records[index] ||
    null
  );
}


// ============================================================
// DISPLAY DAILY RECORD
//
// IMPORTANT:
//
// NO Bible parsing.
// NO heading parsing.
// NO duplicate removal.
// NO "undefined".
// NO automatic interpretation.
//
// The TXT lines are simply displayed.
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


  /*
    Build one paragraph for every
    non-empty TXT line.

    The content itself is untouched.
  */

  let html = "";


  for (
    let i = 0;
    i < record.lines.length;
    i++
  ) {

    const line =
      record.lines[i];


    /*
      Ignore only empty lines.

      We do NOT alter the text.
    */

    if (
      line.trim() === ""
    ) {
      continue;
    }


    html +=
      '<div class="txt-line">' +
      escapeHtml(line) +
      "</div>";
  }


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

    /*
      If viewing another year,
      Today goes to January 1
      of that selected year.
    */

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
    Base size = 18px.

    Example:

    100% = 18px
    90%  = 16.2px
    110% = 19.8px
    150% = 27px
  */

  const size =
    18 *
    readerScale /
    100;


  document.documentElement.style.setProperty(
    "--reader-size",
    size + "px"
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
// FONT DOWN
// ============================================================

fontDownBtn.addEventListener(
  "click",
  function () {

    readerScale -= 5;

    applyFontScale();
  }
);


// ============================================================
// FONT UP
// ============================================================

fontUpBtn.addEventListener(
  "click",
  function () {

    readerScale += 5;

    applyFontScale();
  }
);


// ============================================================
// PREVIOUS
// ============================================================

previousBtn.addEventListener(
  "click",
  function () {

    moveDate(-1);
  }
);


// ============================================================
// NEXT
// ============================================================

nextBtn.addEventListener(
  "click",
  function () {

    moveDate(1);
  }
);


// ============================================================
// TODAY
// ============================================================

todayBtn.addEventListener(
  "click",
  function () {

    goToday();
  }
);


// ============================================================
// LANGUAGE
// ============================================================

languageSelect.addEventListener(
  "change",
  selectionChanged
);


// ============================================================
// YEAR
// ============================================================

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
      Check whether the saved
      language/year combination
      still exists.
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
        files[
          files.length - 1
        ];


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
      Use today's date if that
      year exists.

      Otherwise begin at January 1
      of the selected year.
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
// START APPLICATION
// ============================================================

start();
