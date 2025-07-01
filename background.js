chrome.runtime.onInstalled.addListener(() => {
  console.log("Tab Historian installed");
});

let sessionTabs = [];

async function generateSessionNameFromOpenAI(tabs) {
  const tabTitles = tabs.map((tab) => tab.title).join("; ");
  const prompt = `Give a short, descriptive name for a browser session based on these tab titles: ${tabTitles}. Don't return any other text except the name. It can be funny.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log(data);
    console.log(data.candidates[0].content.parts);
    const name = data.candidates[0].content.parts[0].text;
    console.log(name);
    return name || "Unnamed Session";
  } catch (err) {
    console.error("Failed to generate name from OpenAI:", err);
    return "Unnamed Session";
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    sessionTabs.push({
      id: tabId,
      url: tab.url,
      title: tab.title,
      time: Date.now(),
    });
    chrome.storage.local.set({ sessionTabs });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SESSION_TABS") {
    chrome.storage.local.get(["sessionTabs"], (result) => {
      sendResponse(result.sessionTabs || []);
    });
    return true;
  }

  if (request.type === "ARCHIVE_SESSION") {
    chrome.storage.local.get(
      ["sessionTabs", "archivedSessions"],
      async (result) => {
        const archived = result.archivedSessions || [];
        const tabs = result.sessionTabs || [];
        const name = await generateSessionNameFromOpenAI(tabs);

        const newArchive = {
          timestamp: Date.now(),
          name,
          tabs,
        };
        archived.push(newArchive);
        chrome.storage.local.set(
          { archivedSessions: archived, sessionTabs: [] },
          () => {
            sendResponse({ success: true });
          }
        );
      }
    );
    return true;
  }

  if (request.type === "GET_ARCHIVED_SESSIONS") {
    chrome.storage.local.get(["archivedSessions"], (result) => {
      sendResponse(result.archivedSessions || []);
    });
    return true;
  }

  if (request.type === "DELETE_SESSION") {
    chrome.storage.local.get(["archivedSessions"], (result) => {
      const archived = result.archivedSessions || [];
      archived.splice(request.index, 1);
      chrome.storage.local.set({ archivedSessions: archived }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
