// ============================================================
// MORAVIAN DAILY WATCHWORDS
// SIMPLE TXT VERSION
// ============================================================

const DATA_FOLDER = "data/";
const FILE_LIST = "data/files.json";

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------

const languageSelect = document.getElementById("language");
const yearSelect = document.getElementById("year");

const previousBtn = document.getElementById("previousBtn");
const todayBtn = document.getElementById("todayBtn");
const nextBtn = document.getElementById("nextBtn");

const fontDownBtn = document.getElementById("fontDownBtn");
const fontUpBtn = document.getElementById("fontUpBtn");
const fontSizeLabel = document.getElementById("fontSizeLabel");

const offlineBtn = document.getElementById("offlineBtn");

const statusBox = document.getElementById("status");
const contentBox = document.getElementById("watchwordContent");

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------

let files = [];
let records = [];

let selectedLanguage = "";
let selectedYear = "";

let currentDate = new Date();

let readerScale = Number(
  localStorage.getItem("watchwordFontScale") || 100
);


// ============================================================
// BASIC HELPERS
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
  statusBox.textContent = text || "";
}


function showError(text) {
  contentBox.innerHTML = "";

  statusBox.innerHTML =
    '<div class="error">' +
    escapeHtml(text) +
    "</div>";
}


function pad(number) {
  return String(number).padStart(2, "0");
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
  const start = new Date(
    date.getFullYear(),
    0,
    1
  );

  return (
    Math.floor(
      (date - start) / 86400000
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
// FILE NAME INFORMATION
// ============================================================

function fileInfo(filename) {

  const match = filename.match(
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
// LOAD files.json
// ============================================================

async function loadFileList() {

  setStatus("Loading Watchword files...");

  try {

    const response = await fetch(
      FILE_LIST + "?v=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "files.json returned HTTP " +
        response.status
      );
    }

    const list = await response.json();

    if (!Array.isArray(list)) {
      throw new Error(
        "files.json is not a JSON list."
      );
    }

    files = list
      .map(fileInfo)
      .filter(Boolean)
      .sort(function(a, b) {

        if (a.year !== b.year) {
          return a.year - b.year;
        }

        return a.language.localeCompare(
          b.language
        );
      });

    if (!files.length) {
      throw new Error(
        "No TXT files were found in files.json."
      );
    }

    populateSelectors();

  } catch (error) {

    console.error(
      "FILE LIST ERROR:",
      error
    );

    throw error;
  }
}


// ============================================================
// LANGUAGE + YEAR
// ============================================================

function populateSelectors() {

  const languages = [
    ...new Set(
      files.map(
        file => file.language
      )
    )
  ].sort();


  const years = [
    ...new Set(
      files.map(
        file => file.year
      )
    )
  ].sort(
    (a, b) => a - b
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
    languages.includes(savedLanguage)
      ? savedLanguage
      : languages[0];


  selectedYear =
    years.includes(savedYear)
      ? savedYear
      : years[years.length - 1];


  languageSelect.innerHTML =
    languages
      .map(
        language =>
          '<option value="' +
          escapeHtml(language) +
          '">' +
          escapeHtml(language) +
          "</option>"
      )
      .join("");


  yearSelect.innerHTML =
    years
      .map(
        year =>
          '<option value="' +
          year +
          '">' +
          year +
          "</option>"
      )
      .join("");


  languageSelect.value =
    selectedLanguage;


  yearSelect.value =
    String(selectedYear);
}


// ============================================================
// GET SELECTED FILE
// ============================================================

function getSelectedFile() {

  return files.find(
    file =>
      file.language ===
        languageSelect.value &&
      file.year ===
        Number(yearSelect.value)
  );
}


// ============================================================
// LOAD TXT
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

    /*
      encodeURIComponent is important because
      filenames contain spaces.
    */

    const fileUrl =
      DATA_FOLDER +
      encodeURIComponent(
        file.name
      ) +
      "?v=" +
      Date.now();


    console.log(
      "Loading TXT:",
      fileUrl
    );


    const response =
      await fetch(
        fileUrl,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        file.name +
        " returned HTTP " +
        response.status
      );
    }


    const text =
      await response.text();


    console.log(
      "TXT loaded:",
      file.name,
      "Characters:",
      text.length
    );


    records =
      parseFile(text);


    console.log(
      "Daily records:",
      records.length
    );


    if (!records.length) {

      throw new Error(
        "The TXT file contains no # records."
      );
    }


    setStatus("");

    displayCurrentDate();


  } catch (error) {

    console.error(
      "TXT ERROR:",
      error
    );


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
// Everything else stays as text.
// ============================================================

function parseFile(text) {

  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");


  /*
    Every line beginning with #
    starts a new daily record.
  */

  const blocks =
    normalized.split(
      /^\s*#/m
    );


  return blocks
    .slice(1)
    .map(function(block) {

      const lines =
        block.split("\n");


      /*
        Remove blank lines only
        from the very beginning
        and very end.
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
        lines: lines
      };

    })
    .filter(function(record) {

      return (
        record.lines.length > 0
      );
    });
}


// ============================================================
// FIND RECORD FOR DATE
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
// NO PARSING OF BIBLE TEXT.
// NO DUPLICATE REMOVAL.
// NO BOLD/ITALIC GUESSING.
//
// The TXT file is the source.
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


  record.lines.forEach(
    function(line) {

      const text =
        line.trim();


      if (!text) {
        return;
      }


      html +=
        '<div class="txt-line">' +
        escapeHtml(text) +
        "</div>";
    }
  );


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
// MOVE DATE
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
    readerScale + "%";


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
  function() {

    readerScale -= 5;

    applyFontScale();
  }
);


fontUpBtn.addEventListener(
  "click",
  function() {

    readerScale += 5;

    applyFontScale();
  }
);


// ============================================================
// NAVIGATION
// ============================================================

previousBtn.addEventListener(
  "click",
  function() {

    moveDate(-1);
  }
);


nextBtn.addEventListener(
  "click",
  function() {

    moveDate(1);
  }
);


todayBtn.addEventListener(
  "click",
  function() {

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
// BUTTON STATE
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
      function() {

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
      Check saved language/year.
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
      Current date.
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

    console.error(
      "START ERROR:",
      error
    );


    showError(
      "Could not start the Watchword application.\n\n" +
      error.message
    );
  }
}


// ============================================================
// START
// ============================================================

start();
