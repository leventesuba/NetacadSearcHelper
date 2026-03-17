(() => {
  if (window.__quickSearchProInjected) return;
  window.__quickSearchProInjected = true;

  const isNetacad = location.hostname.includes("netacad.com");
  const isItExam = location.hostname.includes("itexamanswers.net");

  if (!isNetacad && !isItExam) return;

  const panel = document.createElement("div");
  panel.id = "qsp-panel";

  const DEFAULT_ITEXAM_URL =
    "https://itexamanswers.net/";

  const style = document.createElement("style");
  style.textContent = `
    #qsp-panel{
      position:fixed;
      top:130px;
      right:30px;
      width:250px;
      background:#fff;
      border:1px solid #d1d5db;
      border-radius:14px;
      box-shadow:0 10px 24px rgba(0,0,0,0.18);
      z-index:2147483647;
      font-family:Arial,sans-serif;
      overflow:hidden;
      user-select:none;
      pointer-events:auto;
    }

    #qsp-header{
      background:#111827;
      color:white;
      padding:10px 12px;
      font-size:14px;
      font-weight:bold;
      display:flex;
      justify-content:space-between;
      align-items:center;
      cursor:move;
      pointer-events:auto;
    }

    #qsp-title{
      pointer-events:none;
    }

    #qsp-toggle{
      width:34px;
      height:34px;
      min-width:34px;
      border-radius:8px;
      background:rgba(255,255,255,0.12);
      color:white;
      border:1px solid rgba(255,255,255,0.15);
      cursor:pointer;
      font-size:18px;
      line-height:1;
      display:flex;
      align-items:center;
      justify-content:center;
      position:relative;
      z-index:2;
    }

    #qsp-body{
      padding:12px;
      background:#fff;
      pointer-events:auto;
    }

    #qsp-panel button{
      width:100%;
      min-height:38px;
      margin-bottom:8px;
      border:none;
      border-radius:9px;
      cursor:pointer;
      font-size:14px;
      pointer-events:auto;
    }

    #qsp-open{
      background:#7c3aed;
      color:white;
    }

    #qsp-search{
      background:#E4D00A;
      color:white;
    }

    #qsp-first{
      background:#e5e7eb;
      color:#111827;
    }

    #qsp-back{
      background:#10b981;
      color:white;
    }

    #qsp-copyhint{
      background:#f3f4f6;
      color:#111827;
      cursor:default;
    }

    #qsp-status{
      font-size:12px;
      color:#374151;
      line-height:1.4;
      word-break:break-word;
      margin-top:4px;
    }

    #qsp-panel.collapsed{
      width:64px;
      border-radius:16px;
    }

    #qsp-panel.collapsed #qsp-body{
      display:none;
    }

    #qsp-panel.collapsed #qsp-header{
      justify-content:center;
      padding:10px;
    }

    #qsp-panel.collapsed #qsp-title{
      display:none;
    }

    #qsp-panel.collapsed #qsp-toggle{
      width:42px;
      height:42px;
      min-width:42px;
      border-radius:12px;
      font-size:22px;
      margin:0;
    }
  `;

  document.documentElement.appendChild(style);

  function buildNetacadPanel() {
    panel.innerHTML = `
      <div id="qsp-header">
        <span id="qsp-title">Netacad Searcher</span>
        <button id="qsp-toggle" type="button">−</button>
      </div>
      <div id="qsp-body">
        <button id="qsp-search" type="button">KERESÉS</button>
        <button id="qsp-first" type="button">ELSŐ SOR</button>
        <button id="qsp-copyhint" type="button">Használat: kijelölés → Ctrl+C → KERESÉS</button>
        <button id="qsp-open" type="button">ITEXAM MEGNYITÁSA</button>
        <div id="qsp-status">Megnyitja vagy előhozza az itexam oldalt.</div>
      </div>
    `;
  }

  function buildItExamPanel() {
    panel.innerHTML = `
      <div id="qsp-header">
        <span id="qsp-title">Netacad Searcher</span>
        <button id="qsp-toggle" type="button">−</button>
      </div>
      <div id="qsp-body">
        <button id="qsp-back" type="button">VISSZA A NETACADHOZ</button>
        <div id="qsp-status">Visszaugrás az eredeti NetAcad tabra.</div>
      </div>
    `;
  }

  if (isNetacad) buildNetacadPanel();
  if (isItExam) buildItExamPanel();

  document.body.appendChild(panel);

  const statusEl = () => document.getElementById("qsp-status");

  function setStatus(text) {
    const el = statusEl();
    if (el) el.textContent = text;
  }

  function cleanText(text) {
    return (text || "")
      .replace(/\u00A0/g, " ")
      .replace(/\r/g, "")
      .replace(/\n+/g, " ")
      .replace(/\t+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function getClipboardText() {
    const text = await navigator.clipboard.readText();
    return cleanText(text);
  }

  function openItExam() {
    chrome.runtime.sendMessage(
      { action: "openItExam", url: DEFAULT_ITEXAM_URL },
      (response) => {
        if (!response) {
          setStatus("Nem jött válasz.");
          return;
        }

        if (!response.ok) {
          setStatus("Hiba: " + response.error);
          return;
        }

        setStatus(
          response.reused
            ? "A megnyitott itexam tabra ugrottam."
            : "Megnyitottam az itexam oldalt."
        );
      }
    );
  }

  async function runSearch(mode) {
    try {
      let text = await getClipboardText();

      if (!text) {
        setStatus("A vágólap üres. Jelöld ki a kérdést és másold ki Ctrl+C-vel.");
        return;
      }

      if (mode === "first") {
        text = text.split(" ").slice(0, 15).join(" ").trim();
      }

      if (!text) {
        setStatus("Nincs használható szöveg.");
        return;
      }

      setStatus(`Keresés: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`);

      chrome.runtime.sendMessage({ action: "searchItExam", text }, (response) => {
        if (!response) {
          setStatus("Nem jött válasz.");
          return;
        }

        if (!response.ok) {
          setStatus("Hiba: " + response.error);
          return;
        }

        if (response.found) {
          setStatus("Találat megnyitva.");
        } else {
          setStatus("Nem talált egyezést.");
        }
      });
    } catch (e) {
      setStatus("Hiba: " + e.message);
    }
  }

  function goBack() {
    chrome.runtime.sendMessage({ action: "goBackToNetacad" }, (response) => {
      if (!response) {
        setStatus("Nem jött válasz.");
        return;
      }

      if (!response.ok) {
        setStatus("Hiba: " + response.error);
        return;
      }

      setStatus("Visszatértem a NetAcad tabra.");
    });
  }

  const openBtn = document.getElementById("qsp-open");
  const searchBtn = document.getElementById("qsp-search");
  const firstBtn = document.getElementById("qsp-first");
  const backBtn = document.getElementById("qsp-back");
  const toggleBtn = document.getElementById("qsp-toggle");
  const header = document.getElementById("qsp-header");

  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openItExam();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      runSearch("full");
    });
  }

  if (firstBtn) {
    firstBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      runSearch("first");
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      goBack();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.toggle("collapsed");
      toggleBtn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
    });
  }

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener("mousedown", (e) => {
    if (e.target === toggleBtn) return;

    dragging = true;

    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    panel.style.right = "auto";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
})();