function renderTabs(tabs, container) {
  container.innerHTML = "";
  tabs.forEach((tab) => {
    const li = document.createElement("li");
    li.className = "tab-item";
    li.textContent = `${tab.title} (${new URL(tab.url).hostname})`;
    container.appendChild(li);
  });
}

chrome.runtime.sendMessage({ type: "GET_SESSION_TABS" }, (tabs) => {
  const tabList = document.getElementById("tabList");
  renderTabs(tabs, tabList);
});

chrome.runtime.sendMessage({ type: "GET_ARCHIVED_SESSIONS" }, (sessions) => {
  const archiveList = document.getElementById("archiveList");
  const sessionDetails = document.getElementById("sessionDetails");
  sessions
    .slice()
    .reverse()
    .forEach((session, i) => {
      const actualIndex = sessions.length - 1 - i;
      const li = document.createElement("li");
      li.className = "tab-item";
      const date = new Date(session.timestamp).toLocaleString();
      const sessionLabel = session.name || `Session ${i + 1}`;
      li.textContent = `${sessionLabel} – ${date} (${session.tabs.length} tabs)`;

      const launchBtn = document.createElement("button");
      launchBtn.className = "reset-Button button";
      launchBtn.textContent = "Reopen";
      launchBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        session.tabs.forEach((tab) => {
          chrome.tabs.create({ url: tab.url });
        });
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "reset-Button button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage(
          { type: "DELETE_SESSION", index: actualIndex },
          (response) => {
            if (response.success) {
              location.reload();
            }
          }
        );
      });

      // Create a div to contain the buttons
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "button-container";
      buttonContainer.appendChild(launchBtn);
      buttonContainer.appendChild(deleteBtn);

      li.appendChild(buttonContainer);

      li.addEventListener("click", () => {
        sessionDetails.innerHTML = `<h4>Session Details</h4>`;
        const ul = document.createElement("ul");
        ul.className = "tab-list";
        session.tabs.forEach((tab) => {
          const tabLi = document.createElement("li");
          tabLi.className = "tab-item";
          tabLi.innerHTML = `${tab.title} <div class=\"tab-details\">${tab.url}</div>`;
          ul.appendChild(tabLi);
        });
        sessionDetails.appendChild(ul);
      });

      archiveList.appendChild(li);
    });
});

document.getElementById("archiveBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ARCHIVE_SESSION" }, (response) => {
    if (response.success) {
      location.reload();
    }
  });
});
