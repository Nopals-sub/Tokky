const providerSelect = document.getElementById("provider");
const modelSelect = document.getElementById("model");
const contextInfo = document.getElementById("context-info");
const resultsModal = document.getElementById("results-modal");
const modalContent = document.getElementById("modal-content");
const closeModalBtn = document.getElementById("close-modal-btn");
const modalDoneBtn = document.getElementById("modal-done-btn");

function updateModelOptions() {
    const provider = providerSelect.value;
    const models = MODELS[provider] || [];
    modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join("");
    updateContextInfo();
}

function updateContextInfo() {
    const model = modelSelect.value;
    const limit = MODEL_LIMITS[model] || 128000;
    const provider = providerSelect.value;
    
    let subtext = "";
    if (provider === "Universal Mode") {
        subtext = "Heuristic range (chars/4) + images.";
    } else if (provider === "BPE") {
        subtext = "Byte Pair Encoding via tiktoken.";
    } else if (provider === "OpenAI") {
        subtext = "Native OpenAI tiktoken encoding.";
    } else if (provider === "Anthropic") {
        subtext = "Official Anthropic API counting.";
    } else if (provider === "Google Gemini") {
        subtext = "Character-based approximation.";
    }
    
    let html = `
        <div class="flex flex-col gap-1 text-text-muted">
            <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span>Context Limit</span>
                <span class="text-text-primary font-mono">${limit.toLocaleString()}</span>
            </div>
            <div class="text-[10px] leading-tight opacity-70">${subtext}</div>
        </div>
    `;
    
    contextInfo.innerHTML = html;
}

function openModal(html) {
    modalContent.innerHTML = html;
    resultsModal.classList.remove("opacity-0", "pointer-events-none");
    if (window.lucide) lucide.createIcons();
}

function closeModal() {
    resultsModal.classList.add("opacity-0", "pointer-events-none");
}

closeModalBtn.addEventListener("click", closeModal);
modalDoneBtn.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
    if (e.target === resultsModal) closeModal();
});

function getSettings() {
    return {
        provider: providerSelect.value,
        model: modelSelect.value,
    };
}

function renderResults(container, data) {
    const pct = Math.min(data.usage_pct, 100);
    const fillClass = data.warning === "exceed" ? "bg-danger" : data.warning === "approach" ? "bg-warning" : "bg-accent";
    const textClass = data.warning === "exceed" ? "text-danger" : data.warning === "approach" ? "text-warning" : "text-accent";

    let rows = "";
    if (data.rows) {
        if (data.message_count !== undefined) {
            rows = data.rows.map(r => `
                <tr class="border-b border-border-subtle hover:bg-bg-elevated/50 transition-colors">
                    <td class="px-4 py-3 text-center text-text-muted font-mono text-xs">#${r.index}</td>
                    <td class="px-4 py-3"><span class="text-[9px] font-bold uppercase tracking-widest bg-bg-elevated border border-border-subtle px-1.5 py-0.5 rounded ${r.role === 'user' ? 'text-text-primary' : 'text-accent'}">${r.role_label}</span></td>
                    <td class="px-4 py-3 max-w-[250px] truncate text-text-secondary text-xs">${escapeHtml(r.text_preview) || '<em class="opacity-30">(files only)</em>'}</td>
                    <td class="px-4 py-3">
                        <div class="flex flex-wrap gap-1.5">
                            ${r.files.length ? r.files.map(f => `<span class="flex items-center gap-1 px-1.5 py-0.5 bg-bg-primary border border-border-subtle rounded text-[9px] font-bold text-text-muted"><i data-lucide="file-text" class="w-3 h-3 text-accent/50"></i>${escapeHtml(f)}</span>`).join("") : '<span class="opacity-20 text-[10px]">—</span>'}
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center text-text-primary font-mono text-xs">${r.images}</td>
                    <td class="px-4 py-3 text-right text-text-secondary font-mono text-xs">${r.words.toLocaleString()}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-sm text-accent">${r.tokens}</td>
                </tr>
            `).join("");
        } else {
            rows = data.rows.map(r => `
                <tr class="border-b border-border-subtle hover:bg-bg-elevated/50 transition-colors">
                    <td class="px-4 py-3 text-text-primary text-xs font-medium">${escapeHtml(r.file_name)}</td>
                    <td class="px-4 py-3"><span class="bg-bg-elevated border border-border-subtle px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase text-text-muted">${r.type}</span></td>
                    <td class="px-4 py-3 text-center text-text-primary font-mono text-xs">${r.images}</td>
                    <td class="px-4 py-3 text-right text-text-secondary font-mono text-xs">${r.words.toLocaleString()}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-sm text-accent">${r.tokens}</td>
                </tr>
            `).join("");
        }
    }

    const tableHead = data.message_count !== undefined
        ? `<tr><th class="px-4 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">#</th><th class="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Role</th><th class="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Preview</th><th class="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Files</th><th class="px-4 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Images</th><th class="px-4 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Words</th><th class="px-4 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Tokens</th></tr>`
        : `<tr><th class="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">File Name</th><th class="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Type</th><th class="px-4 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Images</th><th class="px-4 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Words</th><th class="px-4 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-widest border-b border-border-default bg-bg-elevated/30">Tokens</th></tr>`;

    let alert = "";
    if (data.warning === "exceed") {
        alert = `<div class="mt-6 flex items-center justify-center gap-3 p-3 bg-danger/10 border border-danger rounded-lg text-danger font-bold text-sm uppercase tracking-wide"><i data-lucide="alert-octagon" class="w-4 h-4"></i> <span>Limit Exceeded (${data.total_max.toLocaleString()})</span></div>`;
    } else if (data.warning === "approach") {
        alert = `<div class="mt-6 flex items-center justify-center gap-3 p-3 bg-warning/10 border border-warning rounded-lg text-warning font-bold text-sm uppercase tracking-wide"><i data-lucide="alert-triangle" class="w-4 h-4"></i> <span>Approaching context limit</span></div>`;
    }

    const html = `
        <div class="overflow-x-auto border border-border-subtle rounded-lg mb-6 bg-bg-surface max-h-[400px] custom-scrollbar">
            <table class="w-full whitespace-nowrap">
                <thead class="sticky top-0 z-10">${tableHead}</thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-6 bg-bg-elevated border border-border-subtle rounded-xl flex flex-col justify-center shadow-inner">
                <div class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total Tokens${data.total_min !== data.total_max ? " (Range)" : ""}</div>
                <div class="text-4xl font-bold text-text-primary tracking-tighter ${data.warning === 'exceed' ? 'text-danger' : ''}">${data.total_display}</div>
            </div>
            
            <div class="p-6 bg-bg-elevated border border-border-subtle rounded-xl flex flex-col justify-center shadow-inner">
                <div class="flex justify-between items-end mb-4">
                    <div class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Context Usage</div>
                    <div class="text-2xl font-bold font-mono ${textClass}">${data.usage_pct}%</div>
                </div>
                <div class="h-2.5 bg-bg-primary rounded-full overflow-hidden border border-border-subtle w-full">
                    <div class="h-full ${fillClass} transition-all duration-500" style="width:${pct}%"></div>
                </div>
            </div>
        </div>
        ${alert}
    `;
    
    openModal(html);
}

function escapeHtml(str) {
    if (!str) return "";
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function showError(container, message) {
    const html = `<div class="flex items-center gap-3 p-4 bg-danger/10 border border-danger rounded-lg text-danger font-bold text-sm uppercase tracking-wide"><i data-lucide="x-circle" class="w-5 h-5"></i> <span>${escapeHtml(message)}</span></div>`;
    openModal(html);
}

providerSelect.addEventListener("change", updateModelOptions);
modelSelect.addEventListener("change", updateContextInfo);
updateModelOptions();
