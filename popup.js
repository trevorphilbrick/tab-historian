// API Key Management
function loadApiKey() {
  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      document.getElementById("geminiApiKey").value = result.geminiApiKey;
      hideSettingsSection();
    }
  });
}

function saveApiKey() {
  const apiKey = document.getElementById("geminiApiKey").value.trim();

  if (!apiKey) {
    showStatus("Please enter a valid API key", "error");
    return;
  }

  chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
    if (chrome.runtime.lastError) {
      showStatus(
        "Failed to save API key: " + chrome.runtime.lastError.message,
        "error"
      );
    } else {
      showStatus("API key saved successfully!", "success");
      setTimeout(() => {
        hideSettingsSection();
      }, 1500); // Hide after showing success message
    }
  });
}

function showStatus(message, type) {
  const statusElement = document.getElementById("apiKeyStatus");
  statusElement.textContent = message;
  statusElement.className = `status-message status-${type}`;

  // Clear status after 3 seconds
  setTimeout(() => {
    statusElement.textContent = "";
    statusElement.className = "status-message";
  }, 3000);
}

function hideSettingsSection() {
  const settingsSection = document.querySelector(".settings-section");
  if (settingsSection) {
    settingsSection.style.display = "none";
  }
}

function renderTabs(tabs, container) {
  container.innerHTML = "";

  if (!tabs || tabs.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No pages visited yet";
    container.appendChild(emptyMessage);
    return;
  }

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

  if (!sessions || sessions.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No archived sessions yet";
    archiveList.appendChild(emptyMessage);
    return;
  }

  sessions
    .slice()
    .reverse()
    .forEach((session, i) => {
      const actualIndex = sessions.length - 1 - i;
      const li = document.createElement("li");
      li.className = "tab-item";
      const date = new Date(session.timestamp).toLocaleString();
      const sessionLabel = session.name || `Session ${i + 1}`;

      // Create h3 for session label
      const h3 = document.createElement("h3");
      h3.textContent = sessionLabel;
      li.appendChild(h3);

      // Create text for date and tab count
      const detailsText = document.createElement("div");
      detailsText.textContent = `${date} (${session.tabs.length} tabs)`;
      li.appendChild(detailsText);

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
  const archiveBtn = document.getElementById("archiveBtn");

  // Set loading state
  archiveBtn.disabled = true;
  archiveBtn.classList.add("loading");
  archiveBtn.textContent = "Archiving...";

  chrome.runtime.sendMessage({ type: "ARCHIVE_SESSION" }, (response) => {
    // Reset button state
    archiveBtn.disabled = false;
    archiveBtn.classList.remove("loading");
    archiveBtn.textContent = "Archive Session";

    if (response.success) {
      location.reload();
    }
  });
});

// Initialize API key functionality
document.addEventListener("DOMContentLoaded", () => {
  loadApiKey();

  document.getElementById("saveApiKey").addEventListener("click", saveApiKey);

  // Allow saving with Enter key
  document.getElementById("geminiApiKey").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveApiKey();
    }
  });
});
