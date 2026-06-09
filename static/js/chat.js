const messageText = document.getElementById("message-text");
const messageFiles = document.getElementById("message-files");
const composerFileList = document.getElementById("composer-file-list");
const roleSelector = document.getElementById("role-selector");
const sendBtn = document.getElementById("send-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const conversationEl = document.getElementById("conversation");
const messagesList = document.getElementById("messages-list");
const emptyHint = document.getElementById("empty-hint");
const countBtn = document.getElementById("count-btn");
const realtimeCounter = document.getElementById("realtime-counter");
const results = document.getElementById("results");

// Inspector Elements
const inspectorTotalTokens = document.getElementById("inspector-total-tokens");
const inspectorUserTokens = document.getElementById("inspector-user-tokens");
const inspectorAiTokens = document.getElementById("inspector-ai-tokens");
const inspectorMsgCount = document.getElementById("inspector-msg-count");
const inspectorAvgTokens = document.getElementById("inspector-avg-tokens");
const inspectorFileCount = document.getElementById("inspector-file-count");
const exportJsonBtn = document.getElementById("export-json-btn");
const importJsonBtn = document.getElementById("import-json-btn");
const importJsonInput = document.getElementById("import-json-input");
const copyStatsBtn = document.getElementById("copy-stats-btn");

// Context Bar Elements
const contextUsageFill = document.getElementById("context-usage-fill");
const contextUsageText = document.getElementById("context-usage-text");
const contextUsagePct = document.getElementById("context-usage-pct");

// Sidebar Session List
const sessionListEl = document.querySelector(".px-3.mt-8 .flex.flex-col.gap-1") || document.createElement("div");

let messages = [];
let composerFiles = [];
let msgIdCounter = 0;
let lastResults = null;
let currentSessionId = null;

function fileRef(msgId, filename) {
    return `${msgId}__${filename}`;
}

function updateComposer() {
    autoResize();
    updateRealtimeCount();
}

function autoResize() {
    messageText.style.height = "auto";
    messageText.style.height = (messageText.scrollHeight) + "px";
}

function updateRealtimeCount() {
    const text = messageText.value;
    const tokens = Math.ceil(text.length / 4);
    realtimeCounter.textContent = `~${tokens} tokens`;
}

messageText.addEventListener("input", () => {
    updateComposer();
});

function renderComposerFiles() {
    composerFileList.innerHTML = composerFiles.map((f, i) => `
        <li class="flex items-center gap-2 px-2 py-1 bg-bg-elevated border border-border-subtle rounded text-[10px] font-bold text-text-secondary transition-all">
            <i data-lucide="file-text" class="w-3 h-3 text-accent"></i>
            <span class="truncate max-w-[150px]">${escapeHtml(f.name)}</span>
            <button type="button" class="file-remove ml-1 hover:text-danger transition-colors" data-index="${i}">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </li>
    `).join("");
    if (window.lucide) lucide.createIcons();
}

messageFiles.addEventListener("change", () => {
    composerFiles.push(...messageFiles.files);
    messageFiles.value = "";
    renderComposerFiles();
});

composerFileList.addEventListener("click", (e) => {
    const btn = e.target.closest(".file-remove");
    if (btn) {
        composerFiles.splice(Number(btn.dataset.index), 1);
        renderComposerFiles();
    }
});

function attachMessage() {
    const text = messageText.value.trim();
    if (!text && !composerFiles.length) return;

    // messages array stores serializable info
    // We add a non-serializable _fileObjects for immediate calculation
    messages.push({
        id: ++msgIdCounter,
        role: roleSelector.value,
        text,
        files: [...composerFiles].map(f => ({ name: f.name, size: f.size })),
        _fileObjects: [...composerFiles]
    });

    messageText.value = "";
    composerFiles = [];
    renderComposerFiles();
    renderConversation();
    
    if (roleSelector.value === "user") {
        roleSelector.value = "assistant";
    } else if (roleSelector.value === "assistant") {
        roleSelector.value = "user";
    }
    
    updateComposer();
    messageText.focus();
    saveSession();
}

sendBtn.addEventListener("click", attachMessage);

// --- MARKDOWN CONFIG ---
if (window.marked && window.hljs) {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true
    });
}

function renderConversation() {
    if (!messages.length) {
        emptyHint.style.display = "flex";
        countBtn.disabled = true;
        messagesList.innerHTML = "";
        updateContextBar(0, 128000);
        updateInspector(null);
        return;
    }

    emptyHint.style.display = "none";
    messagesList.innerHTML = "";

    messages.forEach(msg => {
        const isUser = msg.role === "user";
        const isSystem = msg.role === "system";
        
        const row = document.createElement("div");
        row.className = `flex w-full ${isUser ? 'justify-end' : 'justify-start'}`;
        row.dataset.id = msg.id;

        const filesHtml = msg.files.length
            ? `<div class="flex flex-wrap gap-2 mt-3">${msg.files.map(f => `<span class="flex items-center gap-1.5 px-2 py-1 bg-bg-primary/50 border border-border-subtle rounded text-[10px] font-bold text-text-secondary"><i data-lucide="paperclip" class="w-3 h-3 text-accent"></i>${escapeHtml(f.name)}</span>`).join("")}</div>`
            : "";
            
        let textHtml = "";
        if (msg.text) {
            if (window.marked) {
                textHtml = `<div class="prose-chat ${isUser ? 'text-text-primary' : 'text-text-primary'}">${marked.parse(msg.text)}</div>`;
            } else {
                textHtml = `<div class="whitespace-pre-wrap leading-relaxed text-sm font-medium ${isUser ? 'text-text-primary' : 'text-text-primary'}">${escapeHtml(msg.text)}</div>`;
            }
        }
            
        const label = msg.role.toUpperCase();
        
        let bubbleClass = "";
        if (isUser) {
            bubbleClass = "bg-accent-soft border border-accent/20 rounded-2xl rounded-tr-sm";
        } else if (isSystem) {
            bubbleClass = "bg-bg-surface border border-border-subtle rounded-lg italic opacity-80";
        } else {
            bubbleClass = "bg-bg-elevated border border-border-subtle rounded-2xl rounded-tl-sm";
        }

        let tokenBadge = "";
        if (lastResults && lastResults.rows) {
            const rowData = lastResults.rows.find(r => r.index === msg.id);
            if (rowData) {
                const colorClass = rowData.tokens > 500 ? 'text-token-high' : rowData.tokens > 100 ? 'text-token-mid' : 'text-token-low';
                tokenBadge = `<div class="mt-2 flex justify-end"><span class="text-[9px] font-mono font-bold ${colorClass} bg-black/20 px-1.5 py-0.5 rounded flex items-center gap-1"><i data-lucide="hash" class="w-2.5 h-2.5"></i>${rowData.tokens} tokens</span></div>`;
            }
        }

        row.innerHTML = `
            <div class="max-w-[85%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} group">
                <div class="flex items-center gap-2 px-1">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-text-muted">${label}</span>
                    <button type="button" class="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all msg-remove" data-id="${msg.id}">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                </div>
                <div class="p-4 ${bubbleClass} shadow-sm">
                    ${textHtml || '<span class="text-text-muted italic text-xs">(files only)</span>'}
                    ${filesHtml}
                    ${tokenBadge}
                </div>
            </div>
        `;
        messagesList.appendChild(row);
    });

    countBtn.disabled = false;
    conversationEl.scrollTop = conversationEl.scrollHeight;
    if (window.lucide) lucide.createIcons();
}

function updateContextBar(total, limit) {
    const pct = Math.min(Math.round((total / limit) * 100), 100);
    contextUsageFill.style.width = `${pct}%`;
    contextUsageText.textContent = `${total.toLocaleString()} / ${limit.toLocaleString()} tokens`;
    contextUsagePct.textContent = `${pct}%`;
    contextUsageFill.className = "h-full transition-all duration-500 " + 
        (pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-success");
}

function updateInspector(data) {
    if (!data) {
        inspectorTotalTokens.textContent = "0";
        inspectorMsgCount.textContent = "0";
        inspectorAvgTokens.textContent = "0";
        inspectorFileCount.textContent = "0";
        return;
    }

    inspectorTotalTokens.textContent = data.total_max.toLocaleString();
    
    let fileCount = 0;
    data.rows.forEach(r => {
        fileCount += r.files.length;
    });
    
    inspectorMsgCount.textContent = messages.length;
    inspectorAvgTokens.textContent = Math.round(data.total_max / messages.length).toLocaleString();
    inspectorFileCount.textContent = fileCount;
}

messagesList.addEventListener("click", (e) => {
    const btn = e.target.closest(".msg-remove");
    if (btn) {
        const id = Number(btn.dataset.id);
        messages = messages.filter(m => m.id !== id);
        renderConversation();
        saveSession();
    }
});

messageText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        attachMessage();
    }
});

clearChatBtn.addEventListener("click", () => {
    if (messages.length && !confirm("Clear entire conversation?")) return;
    messages = [];
    messageText.value = "";
    composerFiles = [];
    lastResults = null;
    currentSessionId = null;
    document.getElementById("session-name").textContent = "New Session";
    renderComposerFiles();
    renderConversation();
    updateComposer();
});

countBtn.addEventListener("click", async () => {
    if (!messages.length) return;

    countBtn.disabled = true;
    const originalContent = countBtn.innerHTML;
    countBtn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> <span>Calculating...</span>`;
    if (window.lucide) lucide.createIcons();

    const fd = new FormData();
    const { provider, model } = getSettings();
    fd.append("provider", provider);
    fd.append("model", model);

    const conversation = messages.map(msg => ({
        role: msg.role,
        text: msg.text,
        file_refs: msg.files.map(f => fileRef(msg.id, f.name)),
    }));
    fd.append("conversation", JSON.stringify(conversation));

    for (const msg of messages) {
        if (msg._fileObjects) {
            for (const f of msg._fileObjects) {
                fd.append("files", f, fileRef(msg.id, f.name));
            }
        }
    }

    try {
        const res = await fetch("/api/analyze/chat", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Count failed");
        
        lastResults = data;
        renderConversation();
        updateInspector(data);
        
        const limit = MODEL_LIMITS[model] || 128000;
        updateContextBar(data.total_max, limit);
        
        renderResults(results, data);
        saveSession();
    } catch (err) {
        showError(results, err.message);
    } finally {
        countBtn.disabled = false;
        countBtn.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();
    }
});

// --- SESSION MANAGEMENT ---

function saveSession() {
    if (!messages.length) return;
    
    if (!currentSessionId) {
        currentSessionId = "session_" + Date.now();
    }
    
    const firstMsg = messages.find(m => m.text);
    const title = firstMsg ? firstMsg.text.substring(0, 30) + (firstMsg.text.length > 30 ? "..." : "") : "New Session";
    document.getElementById("session-name").textContent = title;
    
    const sessions = JSON.parse(localStorage.getItem("tc_sessions") || "{}");
    sessions[currentSessionId] = {
        id: currentSessionId,
        title: title,
        messages: messages,
        lastResults: lastResults,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem("tc_sessions", JSON.stringify(sessions));
    renderSessionList();
}

function renderSessionList() {
    const sessions = JSON.parse(localStorage.getItem("tc_sessions") || "{}");
    const sorted = Object.values(sessions).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    const listContainer = document.querySelector(".px-3.mt-8 div:last-child");
    if (!listContainer) return;
    
    if (sorted.length === 0) {
        listContainer.innerHTML = '<div class="text-[11px] text-text-muted px-3 italic">No saved sessions yet.</div>';
        return;
    }
    
    listContainer.innerHTML = sorted.map(s => `
        <div class="flex items-center justify-between group sidebar-link cursor-pointer ${currentSessionId === s.id ? 'active' : ''}" onclick="loadSession('${s.id}')">
            <span class="truncate flex-1">${escapeHtml(s.title)}</span>
            <button onclick="event.stopPropagation(); deleteSession('${s.id}')" class="opacity-0 group-hover:opacity-100 hover:text-danger p-1">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>
    `).join("");
    if (window.lucide) lucide.createIcons();
}

window.loadSession = function(id) {
    const sessions = JSON.parse(localStorage.getItem("tc_sessions") || "{}");
    const s = sessions[id];
    if (!s) return;
    
    currentSessionId = s.id;
    messages = s.messages;
    lastResults = s.lastResults;
    
    document.getElementById("session-name").textContent = s.title;
    renderConversation();
    if (lastResults) {
        const { model } = getSettings();
        const limit = MODEL_LIMITS[model] || 128000;
        updateContextBar(lastResults.total_max, limit);
        updateInspector(lastResults);
    }
    renderSessionList();
};

window.deleteSession = function(id) {
    const sessions = JSON.parse(localStorage.getItem("tc_sessions") || "{}");
    delete sessions[id];
    localStorage.setItem("tc_sessions", JSON.stringify(sessions));
    if (currentSessionId === id) {
        messages = [];
        lastResults = null;
        currentSessionId = null;
        document.getElementById("session-name").textContent = "New Session";
        renderConversation();
    }
    renderSessionList();
};

exportJsonBtn.addEventListener("click", () => {
    if (!messages.length) return;
    const data = {
        messages: messages,
        results: lastResults,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `token-counter-session-${new Date().getTime()}.json`;
    a.click();
});

importJsonBtn.addEventListener("click", () => {
    importJsonInput.click();
});

importJsonInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.messages || !Array.isArray(data.messages)) {
                throw new Error("Invalid JSON format: missing messages array.");
            }

            // Restore session
            messages = data.messages;
            lastResults = data.results || null;
            currentSessionId = "session_" + Date.now(); // Create a new session from import

            // Update UI
            const firstMsg = messages.find(m => m.text);
            const title = firstMsg ? firstMsg.text.substring(0, 30) + (firstMsg.text.length > 30 ? "..." : "") : "Imported Session";
            document.getElementById("session-name").textContent = title;

            renderConversation();
            if (lastResults) {
                const { model } = getSettings();
                const limit = MODEL_LIMITS[model] || 128000;
                updateContextBar(lastResults.total_max, limit);
                updateInspector(lastResults);
            } else {
                updateInspector(null);
                updateContextBar(0, 128000);
            }
            
            saveSession();
            alert("Chat imported successfully!");
        } catch (err) {
            alert("Error importing JSON: " + err.message);
        } finally {
            importJsonInput.value = "";
        }
    };
    reader.readAsText(file);
});

copyStatsBtn.addEventListener("click", () => {
    if (!lastResults) {
        alert("Calculate tokens first to copy statistics.");
        return;
    }
    const stats = `Token Counter Analysis
Tokenizer: ${lastResults.model}
Total Tokens: ${lastResults.total_display}
Messages: ${messages.length}
Context Usage: ${lastResults.usage_pct}%`;
    navigator.clipboard.writeText(stats).then(() => {
        const originalText = copyStatsBtn.querySelector('span').textContent;
        copyStatsBtn.querySelector('span').textContent = "Copied!";
        setTimeout(() => {
            copyStatsBtn.querySelector('span').textContent = originalText;
        }, 2000);
    });
});

renderSessionList();
updateComposer();
renderConversation();
messageText.focus();
