chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.action === "searchItExam") {
        const sourceTabId = sender.tab?.id;

        const tabs = await chrome.tabs.query({});
        const targetTab = tabs.find(
          (t) => t.url && t.url.includes("itexamanswers.net")
        );

        if (!targetTab) {
          sendResponse({
            ok: false,
            error: "Nincs megnyitva itexamanswers.net tab."
          });
          return;
        }

        const cleanText = (msg.text || "")
          .replace(/\u00A0/g, " ")
          .replace(/\r/g, "")
          .replace(/\n+/g, " ")
          .replace(/\t+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        await chrome.storage.local.set({
          lastNetacadTabId: sourceTabId || null,
          lastSearchText: cleanText
        });

        await chrome.tabs.update(targetTab.id, { active: true });

        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: (query) => {
            const clean = (query || "")
              .replace(/\u00A0/g, " ")
              .replace(/\r/g, "")
              .replace(/\n+/g, " ")
              .replace(/\t+/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (!clean) return { found: false };

            let found = window.find(
              clean,
              false,
              false,
              true,
              false,
              false,
              false
            );

            if (!found) {
              const shorter = clean.split(" ").slice(0, 15).join(" ").trim();
              if (shorter) {
                found = window.find(
                  shorter,
                  false,
                  false,
                  true,
                  false,
                  false,
                  false
                );
              }
            }

            return { found };
          },
          args: [cleanText]
        });

        sendResponse({ ok: true, found: !!result?.found });
        return;
      }

      if (msg.action === "openItExam") {
        const defaultUrl =
          msg.url ||
          "https://itexamanswers.net/";

        const tabs = await chrome.tabs.query({});
        const existingTab = tabs.find(
          (t) => t.url && t.url.includes("itexamanswers.net")
        );

        if (existingTab) {
          await chrome.tabs.update(existingTab.id, { active: true });
          sendResponse({ ok: true, reused: true });
          return;
        }

        await chrome.tabs.create({ url: defaultUrl, active: true });
        sendResponse({ ok: true, reused: false });
        return;
      }

      if (msg.action === "goBackToNetacad") {
        const { lastNetacadTabId } = await chrome.storage.local.get("lastNetacadTabId");

        if (!lastNetacadTabId) {
          sendResponse({
            ok: false,
            error: "Nincs eltárolt NetAcad tab."
          });
          return;
        }

        try {
          await chrome.tabs.update(lastNetacadTabId, { active: true });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({
            ok: false,
            error: "A korábbi NetAcad tab már nem elérhető."
          });
        }

        return;
      }

      if (msg.action === "getState") {
        const data = await chrome.storage.local.get([
          "lastNetacadTabId",
          "lastSearchText"
        ]);
        sendResponse({ ok: true, data });
        return;
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();

  return true;
});