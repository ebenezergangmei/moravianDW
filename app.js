const GITHUB_API =
  "https://api.github.com/repos/ebenezergangmei/moravianDW/contents/data?ref=main";

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/ebenezergangmei/moravianDW/main/data/";


// =========================================================
// DOM ELEMENTS
// =========================================================

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


// =========================================================
// APPLICATION STATE
// =========================================================

let files = [];
let records = [];

let selectedLanguage = "";
let selectedYear = "";

let currentDate = new Date();

let readerScale = Number(
  localStorage.getItem("watchwordFontScale") || 100
);


// =========================================================
// BASIC HELPERS
// =========================================================

function setStatus(message) {
  statusBox.textContent = message || "";
}


function showError(message) {
  contentBox.innerHTML = "";

  statusBox.innerHTML =
    '<div class="error">' +
    escapeHtml(message) +
    "</div>";
}


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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


// =========================================================
// FILE INFORMATION
// =========================================================

function fileInfo(filename) {

  if (
    !filename
      .toLowerCase()
      .endsWith(".txt")
  ) {
    return null;
  }

  /*
    Expected filename:

    2026 English.txt
    2026 Rongmei.txt
    2027 Nepali.txt
  */

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


// =========================================================
// LOAD FILE LIST DIRECTLY FROM GITHUB
// =========================================================

async function loadFileList() {

  setStatus(
    "Loading Watchword files..."
  );

  const response = await fetch(
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

  const items = await response.json();

  files = items
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

        if (a.year !== b.year) {
          return a.year - b.year;
        }

        return a.language.localeCompare(
          b.language,
          undefined,
          {
            sensitivity: "base"
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


// =========================================================
// POPULATE LANGUAGE AND YEAR
// =========================================================

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


  // -------------------------------------------------------
  // Remember previous selection
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // Language selector
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // Year selector
  // -------------------------------------------------------

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


// =========================================================
// GET SELECTED FILE
// =========================================================

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


// =========================================================
// LOAD SELECTED TXT FILE
// =========================================================

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


    records =
      parseWatchwordFile(
        text
      );


    if (!records.length) {

      throw new Error(
        "No Watchword records were found in " +
        file.name +
        "."
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


// =========================================================
// SPLIT FILE BY #
//
// EVERY # STARTS A NEW DAY
// =========================================================

function splitRecords(text) {

  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");


  /*
    Every # at the beginning
    of a line starts a new day.

    Example:

    #Day 1
    content

    #Day 2
    content
  */

  const parts =
    normalized.split(
      /^\s*#/m
    );


  /*
    Ignore anything before
    the first #.
  */

  return parts
    .slice(1)
    .map(
      part =>
        part.trim()
    )
    .filter(Boolean);
}


// =========================================================
// PARSE WATCHWORD FILE
// =========================================================

function parseWatchwordFile(text) {

  const blocks =
    splitRecords(text);


  return blocks.map(
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

        index: index,

        /*
          First # block = day 1
          Second # block = day 2
          etc.
        */

        dayNumber:
          index + 1,

        lines: lines
      };
    }
  );
}


// =========================================================
// GET RECORD FOR DATE
// =========================================================

function getRecordForDate(date) {

  const number =
    dayOfYear(date);

  return (
    records[number - 1] ||
    null
  );
}


// =========================================================
// REMOVE DUPLICATE LINES
// =========================================================

function removeDuplicateLines(lines) {

  const result = [];


  for (const line of lines) {

    const current =
      line.trim();


    if (!current) {
      continue;
    }


    /*
      Remove consecutive
      duplicate lines.
    */

    if (
      result.length &&
      result[
        result.length - 1
      ].toLowerCase() ===
        current.toLowerCase()
    ) {
      continue;
    }


    result.push(current);
  }


  return result;
}


// =========================================================
// REMOVE REPEATED DAILY HEADING
// =========================================================

function removeRepeatedHeading(
  heading,
  lines
) {

  if (!heading) {
    return lines;
  }


  const headingClean =
    heading
      .trim()
      .toLowerCase();


  /*
    Remove ANY later line that is
    exactly the same as the # heading.

    This fixes:

    #Pentecost tangv Ruhna-Chaku Sunday/Neihneic

    Pentecost tangv Ruhna-Chaku Sunday/Neihneic
  */

  return lines.filter(
    line =>
      line
        .trim()
        .toLowerCase() !==
      headingClean
  );
}


// =========================================================
// DETECT BIBLE REFERENCE
// =========================================================

function hasBibleReference(text) {

  /*
    Detect references such as:

    13:8
    25:1-13
    18:1-4,25-32
  */

  return /\b\d+:\d+(?:-\d+)?(?:,\d+(?:-\d+)?)?\s*$/u.test(
    text.trim()
  );
}


// =========================================================
// FORMAT BIBLE VERSE
//
// VERSE TEXT = BOLD
// REFERENCE  = ITALIC
// =========================================================

function formatBibleVerse(text) {

  const clean =
    text.trim();


  /*
    Try to separate the final
    Bible reference.

    Example:

    For the Lord will not cast away
    his people, for his great name's sake.
    1 Samuel 12:22
  */

  const match =
    clean.match(
      /^(.*?)(\s+)([A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*(?:\s+[A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*){0,5}\s+\d+:\d+(?:-\d+)?(?:,\d+(?:-\d+)?)?)$/u
    );


  if (!match) {

    return (
      '<div class="reader-paragraph verse-text">' +
      "<strong>" +
      escapeHtml(
        clean
      ) +
      "</strong>" +
      "</div>"
    );
  }


  const verseText =
    match[1].trim();

  const reference =
    match[3].trim();


  return (
    '<div class="reader-paragraph verse-text">' +

    "<strong>" +
    escapeHtml(
      verseText
    ) +
    "</strong> " +

    '<span class="reference">' +
    escapeHtml(
      reference
    ) +
    "</span>" +

    "</div>"
  );
}


// =========================================================
// WATCHWORD LINE
// =========================================================

function formatWatchword(text) {

  const match =
    text.match(
      /^Watchword\s+for\s+the\s+Week\s*:\s*(.*)$/i
    );


  if (!match) {
    return null;
  }


  const verse =
    match[1].trim();


  return (
    '<div class="watchword-line">' +

    "<strong>" +
    "Watchword for the Week:" +
    "</strong> " +

    formatWatchwordVerse(
      verse
    ) +

    "</div>"
  );
}


// =========================================================
// FORMAT WATCHWORD VERSE
// =========================================================

function formatWatchwordVerse(
  text
) {

  const match =
    text.match(
      /^(.*?)(?:\s+)([A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*(?:\s+[A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*){0,5}\s+\d+:\d+(?:-\d+)?)$/u
    );


  if (!match) {

    return (
      "<strong>" +
      escapeHtml(
        text
      ) +
      "</strong>"
    );
  }


  return (
    "<strong>" +
    escapeHtml(
      match[1].trim()
    ) +
    "</strong> " +

    '<span class="reference">' +
    escapeHtml(
      match[2].trim()
    ) +
    "</span>"
  );
}


// =========================================================
// DETECT DATE LINE
// =========================================================

function looksLikeDateLine(line) {

  const monthPattern =
    "(January|February|March|April|May|June|July|August|September|October|November|December)";


  /*
    If the line contains an English
    month and a number, it is treated
    as the source date line.

    We don't display it because the app
    generates the date itself.
  */

  if (
    new RegExp(
      monthPattern,
      "i"
    ).test(line)
  ) {

    if (
      /\b\d{1,2}\b/.test(
        line
      )
    ) {

      return true;
    }
  }


  return false;
}


// =========================================================
// DETECT SCRIPTURE READINGS
// =========================================================

function looksLikeReadings(line) {

  /*
    Scripture reading lines normally
    contain multiple references separated
    by semicolons.
  */

  if (
    !line.includes(";")
  ) {
    return false;
  }


  const references =
    line.match(
      /\b\d+:\d+(?:-\d+)?/g
    );


  return (
    references &&
    references.length >= 2
  );
}


// =========================================================
// SPECIAL TITLES
// =========================================================

function isSpecialTitle(line) {

  return (
    /^\*[^*]+\*:/u.test(line) ||

    /^Good Friday\b/i.test(
      line
    ) ||

    /^Maundy Thursday\b/i.test(
      line
    )
  );
}


// =========================================================
// DISPLAY RECORD
// =========================================================

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
    Remove empty lines and
    consecutive duplicate lines.
  */

  let lines =
    removeDuplicateLines(
      record.lines
    );


  /*
    IMPORTANT:

    The first line after # is
    always treated as the daily heading.

    Example:

    #Pentecost tangv Ruhna-Chaku Sunday/Neihneic

    The first line is:

    Pentecost tangv Ruhna-Chaku Sunday/Neihneic
  */

  const heading =
    lines.length
      ? lines.shift()
      : "";


  /*
    IMPORTANT FIX:

    If the same heading appears
    again later in the record,
    remove it.

    This prevents:

    Pentecost tangv Ruhna-Chaku Sunday/Neihneic

    Pentecost tangv Ruhna-Chaku Sunday/Neihneic
  */

  lines =
    removeRepeatedHeading(
      heading,
      lines
    );


  /*
    -------------------------------------------------------
    START HTML
    -------------------------------------------------------
  */

  let html = "";


  /*
    DAILY HEADING

    Normal weight.
  */

  if (heading) {

    html +=
      '<div class="entry-heading">' +

      escapeHtml(
        heading
          .replace(
            /^\*|\*$/g,
            ""
          )
      ) +

      "</div>";
  }


  /*
    DATE

    Bold.
  */

  html +=
    '<div class="date">' +

    escapeHtml(
      formatDate(date)
    ) +

    "</div>";


  /*
    PROCESS REMAINING LINES
  */

  for (
    const line of lines
  ) {


    // -----------------------------------------------------
    // WATCHWORD
    // -----------------------------------------------------

    const watchword =
      formatWatchword(
        line
      );


    if (watchword) {

      html +=
        watchword;

      continue;
    }


    // -----------------------------------------------------
    // SOURCE DATE LINE
    // -----------------------------------------------------

    /*
      We already generate the date
      from the # block position.

      Therefore the source date line
      is not displayed again.
    */

    if (
      looksLikeDateLine(
        line
      )
    ) {

      continue;
    }


    // -----------------------------------------------------
    // SCRIPTURE READINGS
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // SPECIAL TITLE
    // -----------------------------------------------------

    if (
      isSpecialTitle(
        line
      )
    ) {

      /*
        Keep the text itself.
        Remove the surrounding *
        used as markup in the TXT.
      */

      const cleaned =
        line.replace(
          /^\*|\*$/g,
          ""
        );


      html +=
        '<div class="special">' +

        escapeHtml(
          cleaned
        ) +

        "</div>";

      continue;
    }


    // -----------------------------------------------------
    // BIBLE VERSE
    // -----------------------------------------------------

    if (
      hasBibleReference(
        line
      )
    ) {

      html +=
        formatBibleVerse(
          line
        );

      continue;
    }


    // -----------------------------------------------------
    // NORMAL TEXT
    // -----------------------------------------------------

    html +=
      '<div class="reader-paragraph">' +

      escapeHtml(
        line
      ) +

      "</div>";
  }


  /*
    -------------------------------------------------------
    FINAL ENTRY
    -------------------------------------------------------
  */

  contentBox.innerHTML =
    '<article class="entry">' +

    html +

    "</article>";
}


// =========================================================
// DISPLAY CURRENT DATE
// =========================================================

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


// =========================================================
// MOVE PREVIOUS / NEXT
// =========================================================

function moveDate(
  days
) {

  const newDate =
    new Date(
      currentDate
    );


  newDate.setDate(
    newDate.getDate() +
    days
  );


  /*
    Do not move outside
    selected year.
  */

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


// =========================================================
// TODAY
// =========================================================

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


// =========================================================
// LANGUAGE / YEAR CHANGE
// =========================================================

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


// =========================================================
// FONT SCALE
// =========================================================

function applyFontScale() {

  readerScale =
    Math.max(
      70,
      Math.min(
        150,
        readerScale
      )
    );


  document.documentElement
    .style
    .setProperty(
      "--reader-size",
      (18 * readerScale / 100) +
        "px"
    );


  fontSizeLabel.textContent =
    readerScale +
    "%";


  localStorage.setItem(
    "watchwordFontScale",
    String(readerScale)
  );
}


// =========================================================
// FONT BUTTONS
// =========================================================

fontDownBtn.addEventListener(
  "click",
  () => {

    readerScale -= 5;

    applyFontScale();
  }
);


fontUpBtn.addEventListener(
  "click",
  () => {

    readerScale += 5;

    applyFontScale();
  }
);


// =========================================================
// NAVIGATION BUTTONS
// =========================================================

previousBtn.addEventListener(
  "click",
  () => {

    moveDate(-1);
  }
);


nextBtn.addEventListener(
  "click",
  () => {

    moveDate(1);
  }
);


todayBtn.addEventListener(
  "click",
  () => {

    goToday();
  }
);


// =========================================================
// SELECTORS
// =========================================================

languageSelect.addEventListener(
  "change",
  selectionChanged
);


yearSelect.addEventListener(
  "change",
  selectionChanged
);


// =========================================================
// NAVIGATION BUTTON STATE
// =========================================================

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
    dateKey(currentDate) ===
    dateKey(firstDay);


  nextBtn.disabled =
    dateKey(currentDate) ===
    dateKey(lastDay);
}


// =========================================================
// SAVE OFFLINE
// =========================================================

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
      () => {

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


// =========================================================
// START APPLICATION
// =========================================================

async function start() {

  try {

    applyFontScale();


    await loadFileList();


    /*
      Make sure the saved
      language/year combination
      actually exists.
    */

    if (
      !files.some(
        file =>
          file.language ===
            selectedLanguage &&
          file.year ===
            selectedYear
      )
    ) {

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
      Set initial date.
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
          Number(selectedYear),
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


// =========================================================
// START
// =========================================================

start();
