// ============================================================
// MORAVIAN DAILY WATCHWORDS
// SIMPLE TXT DISPLAY VERSION
//
// files.json = list of TXT files
// #          = beginning of a new daily entry
//
// The TXT content itself is NOT interpreted.
// ============================================================


// ============================================================
// DATA LOCATION
// ============================================================

const DATA_FOLDER = "data/";

const FILE_LIST =
  DATA_FOLDER + "files.json";


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

let readerScale =
  Number(
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


// ============================================================
// FILE INFORMATION
//
// Example:
//
// 2026 English.txt
//
// becomes:
//
// year     = 2026
// language = English
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
// We use files.json instead of the GitHub API.
//
// This avoids GitHub API 403/rate-limit problems.
// ============================================================

async function loadFileList() {

  setStatus(
    "Loading Watchword files..."
  );


  const response =
    await fetch(
      FILE_LIST +
      "?v=" +
      Date.now(),
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "Could not read data/files.json (" +
      response.status +
      ")."
    );
  }


  const list =
    await response.json();


  if (
    !Array.isArray(list)
  ) {

    throw new Error(
      "data/files.json must contain a JSON array."
    );
  }


  files =
    list
      .map(
        filename =>
          fileInfo(filename)
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
            b.language
          );
        }
      );


  if (!files.length) {

    throw new Error(
      "No TXT files were found in files.json."
    );
  }


  populateSelectors();
}


// ============================================================
// POPULATE LANGUAGE + YEAR
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
      : years[
          years.length - 1
        ];


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
// LOAD TXT FILE
// ============================================================

async function loadSelectedFile() {

  const file =
    getSelectedFile();


  if (!file) {

    showError(
      "The selected Watchword file was not found."
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
        DATA_FOLDER +
        encodeURIComponent(
          file.name
        ) +
        "?v=" +
        Date.now(),
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
      ONLY # is interpreted.
    */

    records =
      parseFile(text);


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
// Every # begins a new day.
//
// Nothing else is interpreted.
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
      block => {

        const lines =
          block
            .split("\n");


        /*
          Remove only empty lines
          at the beginning and end.
        */

        while (
          lines.length &&
          lines[0].trim() === ""
        ) {
          lines.shift();
        }


        while (
          lines.length &&
          lines[
            lines.length - 1
          ].trim() === ""
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
// GET RECORD FOR DATE
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
// DISPLAY RECORD
//
// IMPORTANT:
//
// The TXT file is the source of truth.
//
// No:
// - Bible parsing
// - heading parsing
// - reference parsing
// - duplicate removal
// - automatic bolding
// - automatic italicizing
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


  let html = "";


  for (
    const line of record.lines
  ) {

    /*
      Ignore completely empty
      lines between paragraphs.
    */

    if (
      line.trim() === ""
    ) {
      continue;
    }


    html +=
      '<div class="txt-line">' +
      escapeHtml(
        line.trim()
      ) +
      "</div>";
  }


  contentBox.innerHTML =
    '<article class="entry">' +
    html +
    "</article>";
}


// ============================================================
// DISPLAY CURRENT DAY
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
// NAVIGATION BUTTONS
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
        DATA_FOLDER +
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
      Make sure saved selection
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
