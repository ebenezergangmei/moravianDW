// ============================================================
// MORAVIAN DAILY WATCHWORDS
// TXT IS THE SOURCE OF TRUTH
//
// Rules:
// 1. # starts one Watchword section.
// 2. Section 1 maps to January 1.
// 3. Section 2 maps to January 2.
// 4. No date is extracted from the TXT.
// 5. TXT content is displayed as written.
// 6. A file is valid only when # sections == days in its year.
// ============================================================

const DATA_FOLDER = "data/";
const FILE_LIST = "data/files.json";

const languageSelect = document.getElementById("language");
const yearSelect = document.getElementById("year");

const previousBtn = document.getElementById("previousBtn");
const todayBtn = document.getElementById("todayBtn");
const nextBtn = document.getElementById("nextBtn");

const calendarBtn = document.getElementById("calendarBtn");
const calendarPanel = document.getElementById("calendarPanel");
const calendarMonthTitle = document.getElementById("calendarMonthTitle");
const calendarDays = document.getElementById("calendarDays");
const calendarPrevMonth = document.getElementById("calendarPrevMonth");
const calendarNextMonth = document.getElementById("calendarNextMonth");
const calendarTodayBtn = document.getElementById("calendarTodayBtn");

const fontDownBtn = document.getElementById("fontDownBtn");
const fontUpBtn = document.getElementById("fontUpBtn");
const fontSizeLabel = document.getElementById("fontSizeLabel");

const offlineBtn = document.getElementById("offlineBtn");
const installBtn = document.getElementById("installBtn");

const statusBox = document.getElementById("status");
const contentBox = document.getElementById("watchwordContent");

let files = [];
let records = [];
let selectedLanguage = "";
let selectedYear = "";
let currentDate = new Date();

let readerScale = Number(
  localStorage.getItem("watchwordFontScale") || 100
);

let calendarViewMonth = 0;
let calendarViewYear = 0;
let deferredInstallPrompt = null;


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
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

function daysInYear(year) {
  return new Date(year, 11, 31).getDate() === 31
    ? Math.floor(
        (new Date(year + 1, 0, 1) -
          new Date(year, 0, 1)) / 86400000
      )
    : 365;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric"
  });
}

function monthName(year, month) {
  return new Date(year, month, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );
}


// ============================================================
// FILE LIST
// ============================================================

function fileInfo(filename) {
  if (!filename || !filename.toLowerCase().endsWith(".txt")) {
    return null;
  }

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

async function loadFileList() {
  setStatus("Loading Watchword files...");

  const response = await fetch(
    FILE_LIST + "?v=" + Date.now(),
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(
      "Could not read data/files.json (" +
      response.status +
      ")."
    );
  }

  const list = await response.json();

  if (!Array.isArray(list)) {
    throw new Error(
      "data/files.json must contain a JSON array."
    );
  }

  files = list
    .map(fileInfo)
    .filter(Boolean)
    .sort(function(a, b) {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.language.localeCompare(b.language);
    });

  if (!files.length) {
    throw new Error(
      "No TXT files were found in files.json."
    );
  }

  populateSelectors();
}

function populateSelectors() {
  const languages = [
    ...new Set(files.map(file => file.language))
  ].sort();

  const years = [
    ...new Set(files.map(file => file.year))
  ].sort((a, b) => a - b);

  const savedLanguage =
    localStorage.getItem("watchwordLanguage");

  const savedYear =
    Number(localStorage.getItem("watchwordYear"));

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
          `<option value="${escapeHtml(language)}">${escapeHtml(language)}</option>`
      )
      .join("");

  yearSelect.innerHTML =
    years
      .map(
        year =>
          `<option value="${year}">${year}</option>`
      )
      .join("");

  languageSelect.value = selectedLanguage;
  yearSelect.value = String(selectedYear);
}

function getSelectedFile() {
  return files.find(
    file =>
      file.language === languageSelect.value &&
      file.year === Number(yearSelect.value)
  );
}


// ============================================================
// TXT PARSER
//
// Only # has meaning.
// Everything between # markers is preserved.
// ============================================================

function parseFile(text) {
  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

  const blocks =
    normalized.split(/^\s*#/m);

  return blocks
    .slice(1)
    .map(function(block) {
      const lines = block.split("\n");

      while (
        lines.length &&
        lines[0].trim() === ""
      ) {
        lines.shift();
      }

      while (
        lines.length &&
        lines[lines.length - 1].trim() === ""
      ) {
        lines.pop();
      }

      return { lines };
    })
    .filter(record => record.lines.length > 0);
}


// ============================================================
// LOAD SELECTED TXT
// ============================================================

async function loadSelectedFile() {
  const file = getSelectedFile();

  if (!file) {
    showError(
      "The selected Watchword file was not found."
    );
    return;
  }

  selectedLanguage = file.language;
  selectedYear = file.year;

  localStorage.setItem(
    "watchwordLanguage",
    selectedLanguage
  );

  localStorage.setItem(
    "watchwordYear",
    String(selectedYear)
  );

  setStatus("Loading " + file.name + "...");

  try {
    const response = await fetch(
      DATA_FOLDER +
        encodeURIComponent(file.name) +
        "?v=" +
        Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        file.name +
        " returned HTTP " +
        response.status +
        "."
      );
    }

    const text = await response.text();

    records = parseFile(text);

    const expected =
      daysInYear(selectedYear);

    if (records.length !== expected) {
      showError(
        "This Watchword file cannot be loaded.\n\n" +
        file.name +
        "\n\n" +
        "Calendar days: " +
        expected +
        "\n" +
        "# sections found: " +
        records.length +
        "\n\n" +
        "The number of # sections must exactly match " +
        "the number of days in the selected year."
      );

      updateNavigationButtons();
      renderCalendar();
      return;
    }

    setStatus("");

    displayCurrentDate();
    renderCalendar();

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
// DATE → SECTION NUMBER
//
// No date is read from TXT.
// ============================================================

function getRecordForDate(date) {
  const index = dayOfYear(date) - 1;
  return records[index] || null;
}


// ============================================================
// DISPLAY TXT
// ============================================================

function displayRecord(record, date) {
  if (!record) {
    contentBox.innerHTML =
      '<div class="error">' +
      "No Watchword record found for " +
      escapeHtml(formatDate(date)) +
      "." +
      "</div>";
    return;
  }

  let html = "";

  for (const line of record.lines) {
    if (line.trim() === "") {
      continue;
    }

    html +=
      '<div class="txt-line">' +
      escapeHtml(line.trim()) +
      "</div>";
  }

  contentBox.innerHTML =
    '<article class="entry">' +
    html +
    "</article>";
}

function displayCurrentDate() {
  const record =
    getRecordForDate(currentDate);

  displayRecord(
    record,
    currentDate
  );

  updateNavigationButtons();
}


// ============================================================
// NAVIGATION
// ============================================================

function moveDate(days) {
  const newDate =
    new Date(currentDate);

  newDate.setDate(
    newDate.getDate() + days
  );

  if (
    newDate.getFullYear() !==
    Number(selectedYear)
  ) {
    return;
  }

  currentDate = newDate;

  displayCurrentDate();
  renderCalendar();
}

async function goToday() {
  const today = new Date();
  const todayYear = today.getFullYear();

  if (
    files.some(
      file =>
        file.year === todayYear &&
        file.language ===
          languageSelect.value
    )
  ) {
    if (
      Number(yearSelect.value) !==
      todayYear
    ) {
      yearSelect.value =
        String(todayYear);

      selectedYear = todayYear;

      await loadSelectedFile();
    }

    currentDate = today;
  } else {
    currentDate =
      new Date(
        Number(selectedYear),
        0,
        1
      );
  }

  displayCurrentDate();
  renderCalendar();
}

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

languageSelect.addEventListener(
  "change",
  selectionChanged
);

yearSelect.addEventListener(
  "change",
  selectionChanged
);

todayBtn.addEventListener(
  "click",
  goToday
);

async function selectionChanged() {
  selectedLanguage =
    languageSelect.value;

  selectedYear =
    Number(yearSelect.value);

  localStorage.setItem(
    "watchwordLanguage",
    selectedLanguage
  );

  localStorage.setItem(
    "watchwordYear",
    String(selectedYear)
  );

  const today = new Date();

  if (
    today.getFullYear() ===
    selectedYear
  ) {
    currentDate = today;
  } else {
    currentDate =
      new Date(
        selectedYear,
        0,
        1
      );
  }

  await loadSelectedFile();

  calendarViewYear =
    currentDate.getFullYear();

  calendarViewMonth =
    currentDate.getMonth();

  renderCalendar();
}


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
    dateKey(currentDate) ===
    dateKey(firstDay);

  nextBtn.disabled =
    dateKey(currentDate) ===
    dateKey(lastDay);
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
    18 * readerScale / 100;

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
// CALENDAR
// ============================================================

function openCalendar() {
  if (calendarPanel.hidden) {
    calendarViewYear =
      currentDate.getFullYear();

    calendarViewMonth =
      currentDate.getMonth();

    calendarPanel.hidden = false;

    calendarBtn.setAttribute(
      "aria-expanded",
      "true"
    );

    renderCalendar();
  } else {
    closeCalendar();
  }
}

function closeCalendar() {
  calendarPanel.hidden = true;

  calendarBtn.setAttribute(
    "aria-expanded",
    "false"
  );
}

function renderCalendar() {
  if (!calendarViewYear) {
    calendarViewYear =
      currentDate.getFullYear();
  }

  if (
    calendarViewYear !==
    Number(selectedYear)
  ) {
    calendarViewYear =
      Number(selectedYear);
  }

  calendarMonthTitle.textContent =
    monthName(
      calendarViewYear,
      calendarViewMonth
    );

  calendarDays.innerHTML = "";

  const firstDay =
    new Date(
      calendarViewYear,
      calendarViewMonth,
      1
    );

  const lastDay =
    new Date(
      calendarViewYear,
      calendarViewMonth + 1,
      0
    );

  const firstWeekday =
    firstDay.getDay();

  for (
    let i = 0;
    i < firstWeekday;
    i++
  ) {
    const empty =
      document.createElement("span");

    empty.className = "empty";

    calendarDays.appendChild(
      empty
    );
  }

  for (
    let day = 1;
    day <= lastDay.getDate();
    day++
  ) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent = day;

    const thisDate =
      new Date(
        calendarViewYear,
        calendarViewMonth,
        day
      );

    if (
      dateKey(thisDate) ===
      dateKey(currentDate)
    ) {
      button.classList.add(
        "selected-day"
      );
    }

    const realToday =
      new Date();

    if (
      dateKey(thisDate) ===
      dateKey(realToday)
    ) {
      button.classList.add(
        "today-day"
      );
    }

    button.addEventListener(
      "click",
      function() {
        chooseCalendarDate(
          thisDate
        );
      }
    );

    calendarDays.appendChild(
      button
    );
  }
}

function changeCalendarMonth(delta) {
  let nextMonth =
    calendarViewMonth + delta;

  let nextYear =
    calendarViewYear;

  if (nextMonth < 0) {
    nextMonth = 11;
    nextYear--;
  }

  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }

  if (
    nextYear !==
    Number(selectedYear)
  ) {
    return;
  }

  calendarViewMonth =
    nextMonth;

  calendarViewYear =
    nextYear;

  renderCalendar();
}

function chooseCalendarDate(date) {
  if (
    date.getFullYear() !==
    Number(selectedYear)
  ) {
    return;
  }

  currentDate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  displayCurrentDate();
  renderCalendar();
  closeCalendar();
}

calendarBtn.addEventListener(
  "click",
  openCalendar
);

calendarPrevMonth.addEventListener(
  "click",
  function() {
    changeCalendarMonth(-1);
  }
);

calendarNextMonth.addEventListener(
  "click",
  function() {
    changeCalendarMonth(1);
  }
);

calendarTodayBtn.addEventListener(
  "click",
  async function() {
    const today =
      new Date();

    if (
      today.getFullYear() ===
      Number(selectedYear)
    ) {
      currentDate = today;
    } else {
      currentDate =
        new Date(
          Number(selectedYear),
          0,
          1
        );
    }

    calendarViewYear =
      currentDate.getFullYear();

    calendarViewMonth =
      currentDate.getMonth();

    displayCurrentDate();
    renderCalendar();
  }
);

document.addEventListener(
  "click",
  function(event) {
    if (
      !calendarPanel.hidden &&
      !event.target.closest(".calendar-wrap")
    ) {
      closeCalendar();
    }
  }
);


// ============================================================
// SAVE OFFLINE
//
// Saves the selected TXT in local storage, while the PWA
// service worker caches the application and listed TXT files.
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
        { cache: "no-store" }
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
// PWA INSTALL
// ============================================================

window.addEventListener(
  "beforeinstallprompt",
  function(event) {
    event.preventDefault();

    deferredInstallPrompt =
      event;

    installBtn.hidden = false;
  }
);

installBtn.addEventListener(
  "click",
  async function() {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();

    const result =
      await deferredInstallPrompt.userChoice;

    if (
      result &&
      result.outcome ===
        "accepted"
    ) {
      installBtn.hidden = true;
    }

    deferredInstallPrompt =
      null;
  }
);

window.addEventListener(
  "appinstalled",
  function() {
    installBtn.hidden = true;

    setStatus(
      "Moravian Daily Watchwords is installed on this device."
    );
  }
);


// ============================================================
// SERVICE WORKER
// ============================================================

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    function() {
      navigator.serviceWorker
        .register(
          "service-worker.js",
          { scope: "./" }
        )
        .catch(function(error) {
          console.error(
            "Service worker registration failed:",
            error
          );
        });
    }
  );
}


// ============================================================
// START
// ============================================================

async function start() {
  try {
    applyFontScale();

    await loadFileList();

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
        files[files.length - 1];

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
      currentDate = today;
    } else {
      currentDate =
        new Date(
          selectedYear,
          0,
          1
        );
    }

    calendarViewYear =
      currentDate.getFullYear();

    calendarViewMonth =
      currentDate.getMonth();

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

start();
