(function () {
  "use strict";

  const DATA_FOLDER = "data/";

  const languageEl = document.getElementById("language");
  const yearEl = document.getElementById("year");
  const previousBtn = document.getElementById("previousBtn");
  const todayBtn = document.getElementById("todayBtn");
  const nextBtn = document.getElementById("nextBtn");
  const fontDownBtn = document.getElementById("fontDownBtn");
  const fontUpBtn = document.getElementById("fontUpBtn");
  const fontSizeLabel = document.getElementById("fontSizeLabel");
  const offlineBtn = document.getElementById("offlineBtn");
  const statusEl = document.getElementById("status");
  const contentEl = document.getElementById("watchwordContent");

  let files = [];
  let records = [];
  let selectedLanguage = "";
  let selectedYear = "";
  let currentDate = new Date();

  const DEFAULT_FONT = 18;
  const MIN_FONT = 14;
  const MAX_FONT = 28;

  let fontSize =
    Number(localStorage.getItem("moravianFontSize")) || DEFAULT_FONT;

  const MONTHS = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
  };

  /*
   * ------------------------------------------------------------
   * BASIC HELPERS
   * ------------------------------------------------------------
   */

  function setStatus(text) {
    statusEl.textContent = text || "";
  }

  function showError(text) {
    statusEl.innerHTML = "";

    const error = document.createElement("div");
    error.className = "error";
    error.textContent = text;

    statusEl.appendChild(error);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return y + "-" + m + "-" + d;
  }

  function daysInYear(year) {
    return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
  }

  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const target = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return Math.floor((target - start) / 86400000) + 1;
  }

  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  }

  /*
   * ------------------------------------------------------------
   * FILE NAME DETECTION
   * ------------------------------------------------------------
   *
   * Examples:
   *
   * 2026 English.txt
   * 2026 Rongmei.txt
   * 2027 Hindi.txt
   * 2027 Nepali.txt
   */

  function fileInfo(filename) {
    const name = String(filename || "").trim();

    if (!name.toLowerCase().endsWith(".txt")) {
      return null;
    }

    const yearMatch = name.match(/\b(20\d{2})\b/);

    if (!yearMatch) {
      return null;
    }

    const year = Number(yearMatch[1]);

    const languagePart = name
      .replace(/\.txt$/i, "")
      .replace(String(year), "")
      .trim();

    if (!languagePart) {
      return null;
    }

    return {
      name: name,
      year: year,
      language: languagePart
    };
  }

  /*
   * ------------------------------------------------------------
   * LOAD AVAILABLE TXT FILES
   * ------------------------------------------------------------
   *
   * GitHub Pages cannot list a folder automatically.
   *
   * Therefore we use a small index file:
   *
   * data/files.json
   *
   * This is created automatically later from the files we add.
   */

  async function loadFileList() {
    const response = await fetch(
      DATA_FOLDER + "files.json",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "Could not read data/files.json (" +
        response.status +
        ")."
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("data/files.json must contain a list of TXT files.");
    }

    files = data
      .map(fileInfo)
      .filter(Boolean);

    if (!files.length) {
      throw new Error(
        "No TXT Watchword files were found in data/files.json."
      );
    }

    populateSelectors();
  }

  /*
   * ------------------------------------------------------------
   * LANGUAGE / YEAR SELECTORS
   * ------------------------------------------------------------
   */

  function populateSelectors() {
    const languages = Array.from(
      new Set(files.map(function (file) {
        return file.language;
      }))
    ).sort(function (a, b) {
      return a.localeCompare(b);
    });

    const years = Array.from(
      new Set(files.map(function (file) {
        return file.year;
      }))
    ).sort(function (a, b) {
      return a - b;
    });

    languageEl.innerHTML = "";
    yearEl.innerHTML = "";

    languages.forEach(function (language) {
      const option = document.createElement("option");
      option.value = language;
      option.textContent = language;
      languageEl.appendChild(option);
    });

    years.forEach(function (year) {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      yearEl.appendChild(option);
    });

    const savedLanguage =
      localStorage.getItem("moravianLanguage");

    const savedYear =
      localStorage.getItem("moravianYear");

    if (
      savedLanguage &&
      languages.indexOf(savedLanguage) !== -1
    ) {
      selectedLanguage = savedLanguage;
    } else {
      selectedLanguage = languages[0];
    }

    const currentYear = new Date().getFullYear();

    if (years.indexOf(currentYear) !== -1) {
      selectedYear = String(currentYear);
    } else if (
      savedYear &&
      years.indexOf(Number(savedYear)) !== -1
    ) {
      selectedYear = savedYear;
    } else {
      selectedYear = String(years[years.length - 1]);
    }

    languageEl.value = selectedLanguage;
    yearEl.value = selectedYear;

    languageEl.disabled = false;
    yearEl.disabled = false;
  }

  /*
   * ------------------------------------------------------------
   * FIND SELECTED FILE
   * ------------------------------------------------------------
   */

  function getSelectedFile() {
    return files.find(function (file) {
      return (
        file.language === selectedLanguage &&
        String(file.year) === String(selectedYear)
      );
    });
  }

  /*
   * ------------------------------------------------------------
   * LOAD TXT FILE
   * ------------------------------------------------------------
   */

  async function loadSelectedFile() {
    const file = getSelectedFile();

    if (!file) {
      showError(
        "No Watchword TXT file was found for " +
        selectedLanguage +
        " " +
        selectedYear +
        "."
      );

      return;
    }

    setStatus("Reading " + file.name + "...");

    try {
      const url =
        DATA_FOLDER +
        encodeURIComponent(file.name);

      const response = await fetch(url, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          "Could not read " +
          file.name +
          " (" +
          response.status +
          ")."
        );
      }

      const text = await response.text();

      records = parseRecords(text, Number(selectedYear));

      if (!records.length) {
        throw new Error(
          "No Watchword records were found in " +
          file.name +
          "."
        );
      }

      localStorage.setItem(
        "moravianLanguage",
        selectedLanguage
      );

      localStorage.setItem(
        "moravianYear",
        String(selectedYear)
      );

      setStatus("");

      showCurrentRecord();

    } catch (error) {
      showError(
        "Could not load " +
        file.name +
        ".\n\n" +
        String(error.message || error)
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * SPLIT # RECORDS
   * ------------------------------------------------------------
   */

  function splitRecords(text) {
    const normalized = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const lines = normalized.split("\n");

    const result = [];
    let current = [];

    lines.forEach(function (line) {
      if (line.trim().startsWith("#")) {

        if (current.length) {
          result.push(current.join("\n"));
        }

        current = [line.trim()];

      } else if (current.length) {

        current.push(line);

      }
    });

    if (current.length) {
      result.push(current.join("\n"));
    }

    return result;
  }

  /*
   * ------------------------------------------------------------
   * PARSE DATES
   * ------------------------------------------------------------
   */

  function parseDate(text, year) {
    const value = String(text || "");

    /*
     * English:
     *
     * Sunday, September 27
     * Sunday, September 27, 2026
     */

    let match = value.match(
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*(20\d{2}))?/i
    );

    if (match) {
      const month =
        MONTHS[match[1].toLowerCase()];

      const day = Number(match[2]);

      const actualYear =
        match[3] ? Number(match[3]) : year;

      if (
        month !== undefined &&
        day >= 1 &&
        day <= 31
      ) {
        return new Date(
          actualYear,
          month,
          day
        );
      }
    }

    /*
     * Simple fallback:
     *
     * Look for Month Day even if the weekday
     * is missing.
     */

    match = value.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\b/i
    );

    if (match) {
      const month =
        MONTHS[match[1].toLowerCase()];

      const day = Number(match[2]);

      if (
        month !== undefined &&
        day >= 1 &&
        day <= 31
      ) {
        return new Date(
          year,
          month,
          day
        );
      }
    }

    /*
     * Day-of-year formats such as:
     *
     * 1/365
     * 27/365
     * 366/366
     */

    match = value.match(
      /\b(\d{1,3})\s*\/\s*(365|366)\b/
    );

    if (match) {
      const dayNumber = Number(match[1]);

      if (
        dayNumber >= 1 &&
        dayNumber <= daysInYear(year)
      ) {
        return new Date(
          year,
          0,
          dayNumber
        );
      }
    }

    return null;
  }

  /*
   * ------------------------------------------------------------
   * PARSE RECORDS
   * ------------------------------------------------------------
   */

  function parseRecords(text, year) {
    const rawRecords = splitRecords(text);

    const result = [];

    rawRecords.forEach(function (raw, index) {

      const lines = raw
        .split("\n")
        .map(function (line) {
          return line.trim();
        })
        .filter(function (line) {
          return line.length > 0;
        });

      if (!lines.length) {
        return;
      }

      const heading =
        lines[0].replace(/^#\s*/, "");

      const parsedDate =
        parseDate(
          lines.join("\n"),
          year
        );

      /*
       * If the record doesn't contain a readable
       * date, use its position in the year.
       */

      let date = parsedDate;

      if (!date && index < daysInYear(year)) {
        date = new Date(
          year,
          0,
          index + 1
        );
      }

      result.push({
        heading: heading,
        date: date,
        lines: lines,
        raw: raw
      });
    });

    return result;
  }

  /*
   * ------------------------------------------------------------
   * FORMAT BIBLE REFERENCES
   * ------------------------------------------------------------
   */

  function formatReferences(text) {
    let html = escapeHtml(text);

    /*
     * References commonly appearing at the end
     * of Bible quotations.
     *
     * This intentionally keeps the Bible text normal.
     */

    const referencePattern =
      /(\b(?:[1-3]\s*)?[A-Za-zÀ-ž]+(?:\s+[A-Za-zÀ-ž]+)*\s+\d+(?::\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)?(?:;\s*)?)/g;

    html = html.replace(
      referencePattern,
      function (match) {

        /*
         * Don't aggressively format ordinary words.
         * Only format strings containing a chapter/verse
         * number.
         */

        if (/\d/.test(match)) {
          return (
            '<span class="reference">' +
            match +
            "</span>"
          );
        }

        return match;
      }
    );

    return html;
  }

  /*
   * ------------------------------------------------------------
   * DISPLAY RECORD
   * ------------------------------------------------------------
   */

  function displayRecord(record) {

    if (!record) {
      contentEl.innerHTML = "";
      return;
    }

    const lines = record.lines.slice();

    let html =
      '<div class="entry">';

    /*
     * # heading
     */

    html +=
      '<div class="date">' +
      escapeHtml(record.heading) +
      "</div>";

    /*
     * Find special lines and the actual date.
     */

    let dateIndex = -1;

    for (let i = 1; i < lines.length; i++) {

      if (
        parseDate(
          lines[i],
          Number(selectedYear)
        )
      ) {
        dateIndex = i;
        break;
      }
    }

    /*
     * If the second line is a Watchword line,
     * display it prominently.
     */

    for (let i = 1; i < lines.length; i++) {

      const line = lines[i];

      if (
        /^Watchword for the Week\s*:/i.test(line)
      ) {

        const parts =
          line.match(
            /^(Watchword for the Week\s*:)\s*(.*)$/i
          );

        if (parts) {

          html +=
            '<div class="watchword">' +
            '<span class="watch-label">' +
            escapeHtml(parts[1]) +
            "</span> " +
            formatReferences(parts[2]) +
            "</div>";

        } else {

          html +=
            '<div class="watchword">' +
            escapeHtml(line) +
            "</div>";
        }

        continue;
      }

      /*
       * Special title lines such as:
       *
       * Good Friday
       * Pentecost
       */

      if (
        i !== dateIndex &&
        (
          /^Good Friday\b/i.test(line) ||
          /^Holy Week\b/i.test(line) ||
          /^Pentecost\b/i.test(line) ||
          /^Easter\b/i.test(line)
        )
      ) {

        html +=
          '<div class="watchword">' +
          '<span class="watch-label">' +
          escapeHtml(line) +
          "</span>" +
          "</div>";
      }
    }

    /*
     * Actual date
     */

    if (dateIndex !== -1) {

      html +=
        '<div class="date">' +
        escapeHtml(lines[dateIndex]) +
        "</div>";

      /*
       * Scripture readings are normally
       * immediately after the date.
       */

      if (lines[dateIndex + 1]) {

        html +=
          '<div class="readings">' +
          formatReferences(lines[dateIndex + 1]) +
          "</div>";
      }

      /*
       * Bible paragraphs
       */

      html +=
        '<div class="reader">';

      for (
        let i = dateIndex + 2;
        i < lines.length;
        i++
      ) {

        const line = lines[i];

        /*
         * Avoid displaying duplicate special
         * heading lines.
         */

        if (
          /^Watchword for the Week\s*:/i.test(line)
        ) {
          continue;
        }

        html +=
          '<p class="reader-paragraph">' +
          formatReferences(line) +
          "</p>";
      }

      html += "</div>";

    } else {

      /*
       * Ordinary record:
       *
       * # Heading
       * Readings
       * Bible text
       */

      if (lines[1]) {

        html +=
          '<div class="readings">' +
          formatReferences(lines[1]) +
          "</div>";
      }

      html +=
        '<div class="reader">';

      for (let i = 2; i < lines.length; i++) {

        html +=
          '<p class="reader-paragraph">' +
          formatReferences(lines[i]) +
          "</p>";
      }

      html += "</div>";
    }

    html += "</div>";

    contentEl.innerHTML = html;
  }

  /*
   * ------------------------------------------------------------
   * SHOW RECORD FOR CURRENT DATE
   * ------------------------------------------------------------
   */

  function showCurrentRecord() {

    if (!records.length) {
      return;
    }

    let record = null;

    /*
     * First try exact date.
     */

    const key =
      dateKey(currentDate);

    record = records.find(function (item) {

      return (
        item.date &&
        dateKey(item.date) === key
      );
    });

    /*
     * If the selected year differs from
     * today's year, match by day-of-year.
     */

    if (!record) {

      const targetDay =
        dayOfYear(currentDate);

      record = records.find(function (item) {

        return (
          item.date &&
          dayOfYear(item.date) === targetDay
        );
      });
    }

    if (!record) {

      contentEl.innerHTML =
        '<div class="error">' +
        "No Watchword record found for " +
        escapeHtml(formatDate(currentDate)) +
        "." +
        "</div>";

      return;
    }

    displayRecord(record);
  }

  /*
   * ------------------------------------------------------------
   * SELECTOR EVENTS
   * ------------------------------------------------------------
   */

  languageEl.addEventListener(
    "change",
    async function () {

      selectedLanguage =
        languageEl.value;

      localStorage.setItem(
        "moravianLanguage",
        selectedLanguage
      );

      await loadSelectedFile();
    }
  );

  yearEl.addEventListener(
    "change",
    async function () {

      selectedYear =
        yearEl.value;

      localStorage.setItem(
        "moravianYear",
        selectedYear
      );

      currentDate =
        new Date(
          Number(selectedYear),
          new Date().getMonth(),
          new Date().getDate()
        );

      await loadSelectedFile();
    }
  );

  /*
   * ------------------------------------------------------------
   * NAVIGATION
   * ------------------------------------------------------------
   */

  previousBtn.addEventListener(
    "click",
    function () {

      currentDate =
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() - 1
        );

      showCurrentRecord();
    }
  );

  nextBtn.addEventListener(
    "click",
    function () {

      currentDate =
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() + 1
        );

      showCurrentRecord();
    }
  );

  todayBtn.addEventListener(
    "click",
    async function () {

      currentDate = new Date();

      const todayYear =
        String(currentDate.getFullYear());

      if (
        Array.from(
          yearEl.options
        ).some(function (option) {
          return option.value === todayYear;
        })
      ) {

        selectedYear = todayYear;
        yearEl.value = todayYear;

        localStorage.setItem(
          "moravianYear",
          todayYear
        );

        await loadSelectedFile();

      } else {

        showCurrentRecord();
      }
    }
  );

  /*
   * ------------------------------------------------------------
   * FONT SIZE
   * ------------------------------------------------------------
   */

  function updateFontSize() {

    document.documentElement.style.setProperty(
      "--reader-size",
      fontSize + "px"
    );

    const percent =
      Math.round(
        (fontSize / DEFAULT_FONT) * 100
      );

    fontSizeLabel.textContent =
      percent + "%";

    localStorage.setItem(
      "moravianFontSize",
      String(fontSize)
    );
  }

  fontDownBtn.addEventListener(
    "click",
    function () {

      fontSize =
        Math.max(
          MIN_FONT,
          fontSize - 1
        );

      updateFontSize();
    }
  );

  fontUpBtn.addEventListener(
    "click",
    function () {

      fontSize =
        Math.min(
          MAX_FONT,
          fontSize + 1
        );

      updateFontSize();
    }
  );

  /*
   * ------------------------------------------------------------
   * SAVE OFFLINE
   * ------------------------------------------------------------
   */

  offlineBtn.addEventListener(
    "click",
    async function () {

      const file = getSelectedFile();

      if (!file) {
        return;
      }

      try {

        const url =
          DATA_FOLDER +
          encodeURIComponent(file.name);

        const response =
          await fetch(url);

        if (!response.ok) {
          throw new Error(
            "Could not download the Watchword file."
          );
        }

        const text =
          await response.text();

        localStorage.setItem(
          "offline_" + file.name,
          text
        );

        offlineBtn.textContent =
          "✓ Saved Offline";

        offlineBtn.classList.add(
          "saved"
        );

      } catch (error) {

        showError(
          "Could not save the file offline.\n\n" +
          String(error.message || error)
        );
      }
    }
  );

  /*
   * ------------------------------------------------------------
   * START APPLICATION
   * ------------------------------------------------------------
   */

  async function start() {

    updateFontSize();

    try {

      await loadFileList();

      currentDate = new Date();

      /*
       * If today's year isn't available,
       * use the selected year.
       */

      if (
        !files.some(function (file) {
          return (
            String(file.year) ===
            String(currentDate.getFullYear())
          );
        })
      ) {

        currentDate =
          new Date(
            Number(selectedYear),
            currentDate.getMonth(),
            currentDate.getDate()
          );
      }

      await loadSelectedFile();

    } catch (error) {

      showError(
        "Could not start the Watchword application.\n\n" +
        String(error.message || error)
      );
    }
  }

  start();

})();
