const form = document.getElementById("input-form");
const fileInput = document.getElementById("file-input");
const uploadZone = document.getElementById("upload-zone");
const fileList = document.getElementById("file-list");
const fileCountLabel = document.getElementById("file-count");
const fileListEmpty = document.getElementById("file-list-empty");
const analyzeBtn = document.getElementById("analyze-btn");
const results = document.getElementById("results");

let selectedFiles = [];

function renderFileList() {
    if (selectedFiles.length === 0) {
        fileListEmpty.classList.remove("hidden");
        fileListEmpty.classList.add("flex");
        fileList.innerHTML = "";
    } else {
        fileListEmpty.classList.add("hidden");
        fileListEmpty.classList.remove("flex");
        fileList.innerHTML = selectedFiles.map((f, i) => `
            <li class="flex items-center justify-between p-3 bg-bg-primary/50 border border-border-subtle rounded-xl group hover:border-accent/50 transition-all">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 shrink-0 bg-bg-elevated rounded-lg flex items-center justify-center border border-border-subtle group-hover:border-accent/30 transition-all">
                        <i data-lucide="file-text" class="w-4 h-4 text-text-muted group-hover:text-accent"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="font-bold text-text-primary text-xs truncate">${escapeHtml(f.name)}</span>
                        <span class="text-[10px] text-text-muted font-mono uppercase">${(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
                <button type="button" class="file-remove p-1.5 text-text-muted hover:text-danger transition-colors" data-index="${i}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </li>
        `).join("");
    }
    
    fileCountLabel.textContent = `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`;
    analyzeBtn.disabled = selectedFiles.length === 0;
    if (window.lucide) lucide.createIcons();
}

function addFiles(files) {
    for (const f of files) {
        if (!selectedFiles.some(s => s.name === f.name && s.size === f.size)) {
            selectedFiles.push(f);
        }
    }
    renderFileList();
}

fileInput.addEventListener("change", () => {
    addFiles([...fileInput.files]);
    fileInput.value = "";
});

uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("bg-bg-elevated", "border-accent");
});

uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("bg-bg-elevated", "border-accent");
});

uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("bg-bg-elevated", "border-accent");
    addFiles([...e.dataTransfer.files]);
});

fileList.addEventListener("click", (e) => {
    const btn = e.target.closest(".file-remove");
    if (btn) {
        selectedFiles.splice(Number(btn.dataset.index), 1);
        renderFileList();
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) return;

    analyzeBtn.disabled = true;
    const originalContent = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Analyzing...</span>`;
    if (window.lucide) lucide.createIcons();

    const fd = new FormData();
    const { provider, model } = getSettings();
    fd.append("provider", provider);
    fd.append("model", model);
    selectedFiles.forEach(f => fd.append("files", f));

    try {
        const res = await fetch("/api/analyze/files", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        renderResults(results, data);
    } catch (err) {
        showError(results, err.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();
    }
});

renderFileList();
