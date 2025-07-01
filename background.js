chrome.runtime.onInstalled.addListener(() => {
  console.log("Tab Historian installed");
});

let sessionTabs = [];

async function generateSessionNameFromOpenAI(tabs) {
  const tabTitles = tabs.map((tab) => tab.title).join("; ");
  const prompt = `Give a short, descriptive name for a browser session based on these tab titles: ${tabTitles}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer <token>",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes browsing sessions.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 20,
      }),
    });

    const data = await response.json();
    const name = data.choices?.[0]?.message?.content?.trim();
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
