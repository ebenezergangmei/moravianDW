// ============================================================
// MORAVIAN DAILY WATCHWORDS
// GitHub Pages version
// ============================================================


// ============================================================
// GITHUB DATA
// ============================================================

const GITHUB_API =
  "https://api.github.com/repos/ebenezergangmei/moravianDW/contents/data?ref=main";

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/ebenezergangmei/moravianDW/main/data/";


// ============================================================
// DOM ELEMENTS
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
// APPLICATION STATE
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
// BASIC HELPERS
// ============================================================

function setStatus(message) {

  statusBox.textContent =
    message || "";
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


  /*
    Expected filenames:

    2025 English.txt
    2025 Rongmei.txt
    2026 English.txt
    2026 Rongmei.txt
  */

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
// LOAD AVAILABLE TXT FILES
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
            a.year !==
            b.year
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
// LANGUAGE / YEAR SELECTORS
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


  // ----------------------------------------------------------
  // Restore previous selection
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Language
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Year
  // ----------------------------------------------------------

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
// GET SELECTED FILE
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
// LOAD SELECTED TXT FILE
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


// ============================================================
// SPLIT FILE USING #
//
// EVERY # STARTS A NEW DAY
// ============================================================

function splitRecords(text) {

  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");


  /*
    A # at the beginning of a line
    starts a new daily entry.

    Example:

    #Friday, October 9

    content...

    #Saturday, October 10

    content...
  */

  const parts =
    normalized.split(
      /^\s*#/m
    );


  /*
    Anything before the first #
    is ignored.
  */

  return parts
    .slice(1)
    .map(
      part =>
        part.trim()
    )
    .filter(Boolean);
}


// ============================================================
// PARSE WATCHWORD FILE
// ============================================================

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

        index,

        /*
          First # block = January 1
          Second # block = January 2
          etc.

          This is used only for navigation/date matching.
        */

        dayNumber:
          index + 1,

        lines
      };
    }
  );
}


// ============================================================
// GET RECORD FOR DATE
// ============================================================

function getRecordForDate(date) {

  const number =
    dayOfYear(date);


  return (
    records[number - 1] ||
    null
  );
}


// ============================================================
// NORMALIZE TEXT FOR COMPARISON
// ============================================================

function normalizeForComparison(text) {

  return String(text)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}


// ============================================================
// REMOVE DUPLICATE CONSECUTIVE LINES
// ============================================================

function removeDuplicateLines(lines) {

  const result = [];


  for (
    const line of lines
  ) {

    const current =
      line.trim();


    if (!current) {
      continue;
    }


    if (
      result.length &&
      normalizeForComparison(
        result[
          result.length - 1
        ]
      ) ===
      normalizeForComparison(
        current
      )
    ) {

      continue;
    }


    result.push(current);
  }


  return result;
}


// ============================================================
// REMOVE REPEATED HEADING
// ============================================================

function removeRepeatedHeading(
  heading,
  lines
) {

  if (!heading) {
    return lines;
  }


  const headingClean =
    normalizeForComparison(
      heading
    );


  /*
    Remove another exact copy
    of the # heading anywhere
    in the same daily record.
  */

  return lines.filter(
    line =>
      normalizeForComparison(
        line
      ) !== headingClean
  );
}


// ============================================================
// DATE LINE DETECTION
// ============================================================

function looksLikeDateLine(line) {

  const text =
    line.trim();


  /*
    Our files contain English month
    names even when the rest of the
    text is in another language.

    Examples:

    Friday, October 9

    Sunday, September 27

    Sunday/Neihneic, October – Baanchthbw 4
  */


  const hasMonth =
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i
      .test(text);


  if (!hasMonth) {
    return false;
  }


  /*
    A date line should also contain
    a day number.

    Examples:

    October 9
    October – 4
    September 27
  */

  const hasNumber =
    /\b\d{1,2}\b/
      .test(text);


  if (!hasNumber) {
    return false;
  }


  return true;
}


// ============================================================
// FIND DATE LINE
// ============================================================

function findDateLine(lines) {

  /*
    Usually the date is one of the
    first few lines.

    Search the first 4 lines only,
    so that ordinary Bible text
    containing a month isn't mistaken
    for the date.
  */

  const limit =
    Math.min(
      lines.length,
      4
    );


  for (
    let i = 0;
    i < limit;
    i++
  ) {

    if (
      looksLikeDateLine(
        lines[i]
      )
    ) {

      return i;
    }
  }


  return -1;
}


// ============================================================
// BIBLE REFERENCE DETECTION
// ============================================================

function hasBibleReference(text) {

  /*
    Detects references such as:

    13:8
    25:1-13
    18:1-4,25-32
    10:31

    The reference must be at the end
    of the line.
  */

  return /\b\d+:\d+(?:[-–]\d+)?(?:,\s*\d+(?:[-–]\d+)?)*\s*$/u
    .test(
      text.trim()
    );
}


// ============================================================
// FORMAT BIBLE VERSE
//
// Bible text = BOLD
// Bible reference = ITALIC
// ============================================================

function formatBibleVerse(text) {

  const clean =
    text.trim();


  /*
    Try to separate the final
    Bible book + chapter/verse.

    Examples:

    Isaiah 50:9
    John 17:26
    Nehemia 9:5
    1 Korinmei 10:31
  */

  const match =
    clean.match(
      /^(.*?)(?:\s+)((?:[1-3]\s+)?[A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*(?:\s+[A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*){0,5}\s+\d+:\d+(?:[-–]\d+)?(?:,\s*\d+(?:[-–]\d+)?)?)$/u
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
    match[2].trim();


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


// ============================================================
// WATCHWORD DETECTION
// ============================================================

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


// ============================================================
// FORMAT WATCHWORD VERSE
// ============================================================

function formatWatchwordVerse(
  text
) {

  const match =
    text.match(
      /^(.*?)(?:\s+)((?:[1-3]\s+)?[A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*(?:\s+[A-Za-zÀ-ž][A-Za-zÀ-ž0-9'’.\-]*){0,5}\s+\d+:\d+(?:[-–]\d+)?)$/u
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


// ============================================================
// SCRIPTURE READINGS DETECTION
// ============================================================

function looksLikeReadings(line) {

  /*
    Scripture reading lines normally
    contain several references separated
    by semicolons.

    Example:

    Psalm 118:1–9; 1 Samuel 30:1; John 6:25–42
  */

  if (
    !line.includes(";")
  ) {
    return false;
  }


  const references =
    line.match(
      /\b\d+:\d+(?:[-–]\d+)?/g
    );


  return (
    references &&
    references.length >= 2
  );
}


// ============================================================
// SPECIAL TITLES
// ============================================================

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


  // ----------------------------------------------------------
  // Clean lines
  // ----------------------------------------------------------

  let lines =
    removeDuplicateLines(
      record.lines
    );


  /*
    ----------------------------------------------------------
    IMPORTANT STRUCTURE
    ----------------------------------------------------------

    A record can look like:

    #Friday, October 9

    Psalm 118:1–9; 1 Samuel 30:1; John 6:25–42

    It is the Lord GOD who helps me...
    Isaiah 50:9

    OR:

    #Pentecost tangv Ruhna-Chaku Sunday/Neihneic

    Pentecost tangv Ruhna-Chaku Sunday/Neihneic

    *Neihdak khang Tingmikthui Raswai*: ...

    Sunday/Neihneic, October – Baanchthbw 4

    ...

    Therefore:

    First line may be:
      1. heading
      2. date
  */


  let heading = "";

  let dateLine = "";


  // ----------------------------------------------------------
  // First line
  // ----------------------------------------------------------

  if (
    lines.length
  ) {

    if (
      looksLikeDateLine(
        lines[0]
      )
    ) {

      /*
        The # line itself was the date.
      */

      dateLine =
        lines.shift();

    } else {

      /*
        The # line itself was a heading.
      */

      heading =
        lines.shift();
    }
  }


  // ----------------------------------------------------------
  // Remove duplicate heading
  // ----------------------------------------------------------

  if (heading) {

    lines =
      removeRepeatedHeading(
        heading,
        lines
      );
  }


  // ----------------------------------------------------------
  // Find date after heading
  // ----------------------------------------------------------

  if (!dateLine) {

    const dateIndex =
      findDateLine(
        lines
      );


    if (
      dateIndex !== -1
    ) {

      dateLine =
        lines.splice(
          dateIndex,
          1
        )[0];
    }
  }


  // ----------------------------------------------------------
  // START HTML
  // ----------------------------------------------------------

  let html = "";


  // ----------------------------------------------------------
  // HEADING
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  if (dateLine) {

    html +=
      '<div class="date">' +

      escapeHtml(
        dateLine
      ) +

      "</div>";
  }


  // ----------------------------------------------------------
  // PROCESS REMAINING CONTENT
  // ----------------------------------------------------------

  for (
    const line of lines
  ) {


    // --------------------------------------------------------
    // WATCHWORD FOR THE WEEK
    // --------------------------------------------------------

    const watchword =
      formatWatchword(
        line
      );


    if (watchword) {

      html +=
        watchword;

      continue;
    }


    // --------------------------------------------------------
    // ANOTHER DATE LINE
    // --------------------------------------------------------

    /*
      If a date line somehow remains,
      don't display it a second time.
    */

    if (
      looksLikeDateLine(
        line
      )
    ) {

      continue;
    }


    // --------------------------------------------------------
    // SCRIPTURE READINGS
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
    // SPECIAL TITLE
    // --------------------------------------------------------

    if (
      isSpecialTitle(
        line
      )
    ) {

      /*
        Remove * used in the TXT
        as markup.
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


    // --------------------------------------------------------
    // BIBLE VERSE
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // NORMAL TEXT
    // --------------------------------------------------------

    html +=
      '<div class="reader-paragraph">' +

      escapeHtml(
        line
      ) +

      "</div>";
  }


  // ----------------------------------------------------------
  // FINAL ENTRY
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
    Stay inside selected year.
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


// ============================================================
// FONT BUTTONS
// ============================================================

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


// ============================================================
// NAVIGATION BUTTONS
// ============================================================

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
    dateKey(currentDate) ===
    dateKey(firstDay);


  nextBtn.disabled =
    dateKey(currentDate) ===
    dateKey(lastDay);
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


// ============================================================
// START APPLICATION
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

    const savedCombinationExists =
      files.some(
        file =>
          file.language ===
            selectedLanguage &&
          file.year ===
            selectedYear
      );


    if (
      !savedCombinationExists
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


// ============================================================
// RUN
// ============================================================

start();
