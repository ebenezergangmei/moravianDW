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
const calendarPrevMonth = document.getElementById("calendarPrevMonth");
const calendarNextMonth = document.getElementById("calendarNextMonth");
const calendarMonthTitle = document.getElementById("calendarMonthTitle");
const calendarDays = document.getElementById("calendarDays");
const calendarTodayBtn = document.getElementById("calendarTodayBtn");

const fontDownBtn = document.getElementById("fontDownBtn");
const fontUpBtn = document.getElementById("fontUpBtn");
const fontSizeLabel = document.getElementById("fontSizeLabel");

const installBtn = document.getElementById("installBtn");

const statusEl = document.getElementById("status");
const contentEl = document.getElementById("watchwordContent");

const STORAGE_LANGUAGE = "moravianLanguage";
const STORAGE_YEAR = "moravianYear";
const STORAGE_FONT = "moravianFontScale";

const MIN_FONT_SCALE = 80;
const MAX_FONT_SCALE = 140;
const FONT_STEP = 10;

let availableFiles = [];
let selectedLanguage = "";
let selectedYear = 0;

let records = [];
let currentDate = new Date();

let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

let fontScale =
  Number(localStorage.getItem(STORAGE_FONT)) || 100;


// ------------------------------------------------------------
// Basic helpers
// ------------------------------------------------------------

function setStatus(message) {
  statusEl.textContent = message;
}

function showError(message) {
  contentEl.innerHTML = "";

  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;

  contentEl.appendChild(error);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ------------------------------------------------------------
// Date helpers
// ------------------------------------------------------------

function daysInYear(year) {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);

  const current = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  return (
    Math.floor(
      (current - start) / 86400000
    ) + 1
  );
}

function createDateForDay(year, dayNumber) {
  return new Date(
    year,
    0,
    dayNumber
  );
}

function clampDateToYear(date, year) {
  let month = date.getMonth();
  let day = date.getDate();

  const maxDay =
    daysInYear(year);

  const candidate =
    new Date(year, month, day);

  if (candidate.getFullYear() !== year) {
    return new Date(year, 0, 1);
  }

  const candidateDay =
    dayOfYear(candidate);

  if (candidateDay > maxDay) {
    return new Date(year, 11, 31);
  }

  return candidate;
}

function formatDate(date) {
  return date.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
}


// ------------------------------------------------------------
// TXT parser
// ------------------------------------------------------------

function parseWatchwordText(text) {
  const normalized =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

  const blocks =
    normalized.split(/^\s*#/m);

  return blocks
    .slice(1)
    .map(block => {
      const lines =
        block.split("\n");

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

      return {
        lines
      };
    })
    .filter(record =>
      record.lines.length > 0
    );
}


// ------------------------------------------------------------
// File name handling
// ------------------------------------------------------------

function getFileName(file) {
  if (typeof file === "string") {
    return file;
  }

  if (file && file.name) {
    return file.name;
  }

  return "";
}

function parseFileInfo(file) {
  const name =
    getFileName(file);

  const match =
    name.match(
      /^(.+?)\s+(\d{4})\.txt$/i
    );

  if (!match) {
    return null;
  }

  return {
    name,
    language: match[1].trim(),
    year: Number(match[2])
  };
}


// ------------------------------------------------------------
// Load file list
// ------------------------------------------------------------

async function loadFileList() {
  const response =
    await fetch(
      FILE_LIST + "?v=" + Date.now(),
      {
        cache: "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(
      "Could not load data/files.json."
    );
  }

  const data =
    await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      "data/files.json is not a valid file list."
    );
  }

  availableFiles =
    data
      .map(item => {
        if (typeof item === "string") {
          return item;
        }

        if (item && item.name) {
          return item.name;
        }

        return null;
      })
      .filter(Boolean);
}


// ------------------------------------------------------------
// Selectors
// ------------------------------------------------------------

function getLanguages() {
  return [
    ...new Set(
      availableFiles
        .map(parseFileInfo)
        .filter(Boolean)
        .map(info => info.language)
    )
  ].sort((a, b) =>
    a.localeCompare(b)
  );
}

function getYearsForLanguage(language) {
  return [
    ...new Set(
      availableFiles
        .map(parseFileInfo)
        .filter(info =>
          info &&
          info.language === language
        )
        .map(info => info.year)
    )
  ].sort((a, b) => a - b);
}

function findFile(language, year) {
  return (
    availableFiles.find(file => {
      const info =
        parseFileInfo(file);

      return (
        info &&
        info.language === language &&
        info.year === year
      );
    }) || null
  );
}

function populateLanguageSelect() {
  const languages =
    getLanguages();

  languageSelect.innerHTML = "";

  languages.forEach(language => {
    const option =
      document.createElement("option");

    option.value = language;
    option.textContent = language;

    languageSelect.appendChild(option);
  });

  if (!languages.length) {
    languageSelect.innerHTML =
      '<option value="">No languages</option>';

    return;
  }

  const savedLanguage =
    localStorage.getItem(
      STORAGE_LANGUAGE
    );

  if (
    savedLanguage &&
    languages.includes(savedLanguage)
  ) {
    selectedLanguage =
      savedLanguage;
  } else {
    selectedLanguage =
      languages[0];
  }

  languageSelect.value =
    selectedLanguage;
}

function populateYearSelect() {
  const years =
    getYearsForLanguage(
      selectedLanguage
    );

  yearSelect.innerHTML = "";

  years.forEach(year => {
    const option =
      document.createElement("option");

    option.value = String(year);
    option.textContent = String(year);

    yearSelect.appendChild(option);
  });

  if (!years.length) {
    yearSelect.innerHTML =
      '<option value="">No years</option>';

    selectedYear = 0;
    return;
  }

  const savedYear =
    Number(
      localStorage.getItem(
        STORAGE_YEAR
      )
    );

  if (
    savedYear &&
    years.includes(savedYear)
  ) {
    selectedYear =
      savedYear;
  } else {
    selectedYear =
      years[0];
  }

  yearSelect.value =
    String(selectedYear);
}


// ------------------------------------------------------------
// Watchword file loading
// ------------------------------------------------------------

async function loadSelectedFile() {
  const fileName =
    findFile(
      selectedLanguage,
      selectedYear
    );

  if (!fileName) {
    records = [];

    showError(
      "No Watchword file found for " +
      selectedLanguage +
      " " +
      selectedYear +
      "."
    );

    setStatus(
      "Please choose another language or year."
    );

    return false;
  }

  setStatus(
    "Loading Watchword files..."
  );

  try {
    const url =
      DATA_FOLDER +
      encodeURIComponent(fileName);

    const response =
      await fetch(
        url + "?v=" + Date.now(),
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Could not load " +
        fileName
      );
    }

    const text =
      await response.text();

    const parsed =
      parseWatchwordText(text);

    const expected =
      daysInYear(selectedYear);

    if (parsed.length !== expected) {
      records = [];

      showError(
        "Invalid Watchword file: " +
        fileName +
        "\n\n" +
        "The file contains " +
        parsed.length +
        " # sections, but " +
        selectedYear +
        " requires " +
        expected +
        " sections.\n\n" +
        "Please choose another language or year."
      );

      setStatus(
        "Watchword file validation failed."
      );

      return false;
    }

    records = parsed;

    localStorage.setItem(
      STORAGE_LANGUAGE,
      selectedLanguage
    );

    localStorage.setItem(
      STORAGE_YEAR,
      String(selectedYear)
    );

    if (
      currentDate.getFullYear() !==
      selectedYear
    ) {
      currentDate =
        new Date(
          selectedYear,
          0,
          1
        );
    } else {
      currentDate =
        clampDateToYear(
          currentDate,
          selectedYear
        );
    }

    calendarYear =
      selectedYear;

    calendarMonth =
      currentDate.getMonth();

    updateNavigationButtons();
    renderCurrentRecord();
    renderCalendar();

    setStatus("");

    return true;

  } catch (error) {
    records = [];

    showError(
      "Error loading Watchword file:\n\n" +
      String(
        error &&
        error.message
          ? error.message
          : error
      )
    );

    setStatus(
      "Could not load Watchword file."
    );

    return false;
  }
}


// ------------------------------------------------------------
// Display current Watchword
// ------------------------------------------------------------

function getCurrentRecord() {
  if (!records.length) {
    return null;
  }

  if (
    currentDate.getFullYear() !==
    selectedYear
  ) {
    return null;
  }

  const index =
    dayOfYear(currentDate) - 1;

  if (
    index < 0 ||
    index >= records.length
  ) {
    return null;
  }

  return records[index];
}

function renderCurrentRecord() {
  contentEl.innerHTML = "";

  const record =
    getCurrentRecord();

  if (!record) {
    showError(
      "No Watchword record found for " +
      formatDate(currentDate) +
      "."
    );

    return;
  }

  const entry =
    document.createElement("div");

  entry.className = "entry";

  record.lines.forEach(line => {
    const lineEl =
      document.createElement("div");

    lineEl.className =
      "txt-line";

    lineEl.innerHTML =
      escapeHtml(line);

    entry.appendChild(lineEl);
  });

  contentEl.appendChild(entry);
}


// ------------------------------------------------------------
// Navigation
// ------------------------------------------------------------

function updateNavigationButtons() {
  if (!selectedYear) {
    previousBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const day =
    dayOfYear(currentDate);

  const total =
    daysInYear(selectedYear);

  previousBtn.disabled =
    day <= 1;

  nextBtn.disabled =
    day >= total;
}

function goPrevious() {
  if (
    !records.length ||
    dayOfYear(currentDate) <= 1
  ) {
    return;
  }

  currentDate =
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - 1
    );

  calendarYear =
    selectedYear;

  calendarMonth =
    currentDate.getMonth();

  renderCurrentRecord();
  renderCalendar();
  updateNavigationButtons();
}

function goNext() {
  if (
    !records.length ||
    dayOfYear(currentDate) >=
      daysInYear(selectedYear)
  ) {
    return;
  }

  currentDate =
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1
    );

  calendarYear =
    selectedYear;

  calendarMonth =
    currentDate.getMonth();

  renderCurrentRecord();
  renderCalendar();
  updateNavigationButtons();
}

function goToday() {
  const today =
    new Date();

  if (
    today.getFullYear() ===
    selectedYear
  ) {
    currentDate =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
  } else {
    currentDate =
      new Date(
        selectedYear,
        0,
        1
      );
  }

  calendarYear =
    selectedYear;

  calendarMonth =
    currentDate.getMonth();

  renderCurrentRecord();
  renderCalendar();
  updateNavigationButtons();
}


// ------------------------------------------------------------
// Calendar
// ------------------------------------------------------------

function renderCalendar() {
  if (!selectedYear) {
    return;
  }

  calendarMonthTitle.textContent =
    new Date(
      calendarYear,
      calendarMonth,
      1
    ).toLocaleDateString(
      undefined,
      {
        month: "long",
        year: "numeric"
      }
    );

  calendarDays.innerHTML = "";

  const firstDay =
    new Date(
      calendarYear,
      calendarMonth,
      1
    ).getDay();

  const totalDays =
    new Date(
      calendarYear,
      calendarMonth + 1,
      0
    ).getDate();

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {
    const empty =
      document.createElement("div");

    empty.className =
      "empty";

    calendarDays.appendChild(empty);
  }

  for (
    let day = 1;
    day <= totalDays;
    day++
  ) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent = String(day);

    const thisDate =
      new Date(
        calendarYear,
        calendarMonth,
        day
      );

    if (
      currentDate.getFullYear() ===
        calendarYear &&
      currentDate.getMonth() ===
        calendarMonth &&
      currentDate.getDate() ===
        day
    ) {
      button.classList.add(
        "selected-day"
      );
    }

    const today =
      new Date();

    if (
      today.getFullYear() ===
        calendarYear &&
      today.getMonth() ===
        calendarMonth &&
      today.getDate() ===
        day
    ) {
      button.classList.add(
        "today-day"
      );
    }

    button.addEventListener(
      "click",
      () => {
        currentDate =
          thisDate;

        calendarYear =
          selectedYear;

        calendarMonth =
          currentDate.getMonth();

        renderCurrentRecord();
        renderCalendar();
        updateNavigationButtons();

        closeCalendar();
      }
    );

    calendarDays.appendChild(button);
  }
}

function openCalendar() {
  calendarPanel.hidden = false;

  calendarBtn.setAttribute(
    "aria-expanded",
    "true"
  );

  calendarYear =
    selectedYear;

  calendarMonth =
    currentDate.getMonth();

  renderCalendar();
}

function closeCalendar() {
  calendarPanel.hidden = true;

  calendarBtn.setAttribute(
    "aria-expanded",
    "false"
  );
}

function toggleCalendar() {
  if (calendarPanel.hidden) {
    openCalendar();
  } else {
    closeCalendar();
  }
}

function previousCalendarMonth() {
  calendarMonth--;

  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }

  if (
    calendarYear !==
    selectedYear
  ) {
    calendarYear =
      selectedYear;
    calendarMonth =
      calendarMonth < 0
        ? 0
        : calendarMonth;
  }

  renderCalendar();
}

function nextCalendarMonth() {
  calendarMonth++;

  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }

  if (
    calendarYear !==
    selectedYear
  ) {
    calendarYear =
      selectedYear;
    calendarMonth =
      calendarMonth > 11
        ? 11
        : calendarMonth;
  }

  renderCalendar();
}

function calendarGoToday() {
  const today =
    new Date();

  if (
    today.getFullYear() ===
    selectedYear
  ) {
    currentDate =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
  } else {
    currentDate =
      new Date(
        selectedYear,
        0,
        1
      );
  }

  calendarYear =
    selectedYear;

  calendarMonth =
    currentDate.getMonth();

  renderCurrentRecord();
  renderCalendar();
  updateNavigationButtons();

  closeCalendar();
}


// ------------------------------------------------------------
// Font controls
// ------------------------------------------------------------

function applyFontSize() {
  fontScale =
    Math.max(
      MIN_FONT_SCALE,
      Math.min(
        MAX_FONT_SCALE,
        fontScale
      )
    );

  const baseSize =
    18;

  const size =
    baseSize *
    (fontScale / 100);

  document.documentElement.style.setProperty(
    "--reader-size",
    size + "px"
  );

  fontSizeLabel.textContent =
    fontScale + "%";

  localStorage.setItem(
    STORAGE_FONT,
    String(fontScale)
  );
}

function decreaseFont() {
  fontScale -= FONT_STEP;
  applyFontSize();
}

function increaseFont() {
  fontScale += FONT_STEP;
  applyFontSize();
}


// ------------------------------------------------------------
// Language / Year changes
// ------------------------------------------------------------

async function changeLanguage() {
  selectedLanguage =
    languageSelect.value;

  localStorage.setItem(
    STORAGE_LANGUAGE,
    selectedLanguage
  );

  populateYearSelect();

  const availableYears =
    getYearsForLanguage(
      selectedLanguage
    );

  if (!availableYears.length) {
    records = [];

    showError(
      "No Watchword years are available for " +
      selectedLanguage +
      "."
    );

    return;
  }

  currentDate =
    new Date(
      selectedYear,
      0,
      1
    );

  calendarYear =
    selectedYear;

  calendarMonth = 0;

  await loadSelectedFile();
}

async function changeYear() {
  const newYear =
    Number(yearSelect.value);

  if (!newYear) {
    return;
  }

  selectedYear =
    newYear;

  localStorage.setItem(
    STORAGE_YEAR,
    String(selectedYear)
  );

  currentDate =
    clampDateToYear(
      currentDate,
      selectedYear
    );

  calendarYear =
    selectedYear;

  calendarMonth =
    currentDate.getMonth();

  await loadSelectedFile();
}


// ------------------------------------------------------------
// Install App
// ------------------------------------------------------------

let deferredInstallPrompt =
  null;

if (installBtn) {
  window.addEventListener(
    "beforeinstallprompt",
    event => {
      event.preventDefault();

      deferredInstallPrompt =
        event;

      installBtn.hidden =
        false;
    }
  );

  installBtn.addEventListener(
    "click",
    async () => {
      if (!deferredInstallPrompt) {
        return;
      }

      deferredInstallPrompt.prompt();

      try {
        await deferredInstallPrompt.userChoice;
      } catch (error) {
        console.log(
          "Install prompt error:",
          error
        );
      }

      deferredInstallPrompt =
        null;

      installBtn.hidden =
        true;
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      installBtn.hidden =
        true;
    }
  );
}


// ------------------------------------------------------------
// Service worker
// ------------------------------------------------------------

if (
  "serviceWorker" in navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "./service-worker.js"
        )
        .catch(error => {
          console.log(
            "Service worker registration failed:",
            error
          );
        });
    }
  );
}


// ------------------------------------------------------------
// Event handlers
// ------------------------------------------------------------

languageSelect.addEventListener(
  "change",
  changeLanguage
);

yearSelect.addEventListener(
  "change",
  changeYear
);

previousBtn.addEventListener(
  "click",
  goPrevious
);

nextBtn.addEventListener(
  "click",
  goNext
);

todayBtn.addEventListener(
  "click",
  goToday
);

calendarBtn.addEventListener(
  "click",
  toggleCalendar
);

calendarPrevMonth.addEventListener(
  "click",
  previousCalendarMonth
);

calendarNextMonth.addEventListener(
  "click",
  nextCalendarMonth
);

calendarTodayBtn.addEventListener(
  "click",
  calendarGoToday
);

fontDownBtn.addEventListener(
  "click",
  decreaseFont
);

fontUpBtn.addEventListener(
  "click",
  increaseFont
);


// ------------------------------------------------------------
// Start application
// ------------------------------------------------------------

async function startApp() {
  try {
    setStatus(
      "Loading Watchword files..."
    );

    await loadFileList();

    if (!availableFiles.length) {
      throw new Error(
        "No Watchword files were found in data/files.json."
      );
    }

    populateLanguageSelect();
    populateYearSelect();

    if (
      !selectedLanguage ||
      !selectedYear
    ) {
      throw new Error(
        "Could not determine the available language and year."
      );
    }

    const today =
      new Date();

    if (
      today.getFullYear() ===
      selectedYear
    ) {
      currentDate =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
    } else {
      currentDate =
        new Date(
          selectedYear,
          0,
          1
        );
    }

    calendarYear =
      selectedYear;

    calendarMonth =
      currentDate.getMonth();

    applyFontSize();

    await loadSelectedFile();

  } catch (error) {
    showError(
      "Application loading error:\n\n" +
      String(
        error &&
        error.message
          ? error.message
          : error
      )
    );

    setStatus(
      "Could not load Watchword files."
    );
  }
}

startApp();
