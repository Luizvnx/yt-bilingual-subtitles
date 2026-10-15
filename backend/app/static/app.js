/**
 * YT Bilingual Subtitles - Minimalist Gemini-Style Application Engine
 */

let currentVideo = null;
let currentSegments = [];
let activeSegmentIndex = -1;
let autoScroll = true;
let subtitleMode = "bilingual"; // 'bilingual', 'en', 'pt', 'off'
let searchFilter = "";

document.addEventListener("DOMContentLoaded", () => {
  initElements();
  loadHistory();
  checkInitialVideo();
  setupKeyboardShortcuts();
});

// UI Elements
let videoEl, overlayEn, overlayPt, overlayContainer;
let transcriptBody, searchInput, autoscrollCheck;
let stepperCard, studioSection, heroSection;
let step1, step2, step3, step4, progressFill, progressStatusText;
let processBtn, urlInput, modelSelect;

function initElements() {
  videoEl = document.getElementById("video-player");
  overlayContainer = document.getElementById("subtitle-overlay");
  overlayEn = document.getElementById("overlay-en");
  overlayPt = document.getElementById("overlay-pt");
  transcriptBody = document.getElementById("transcript-body");
  searchInput = document.getElementById("search-input");
  autoscrollCheck = document.getElementById("autoscroll-toggle");

  stepperCard = document.getElementById("stepper-card");
  studioSection = document.getElementById("studio-section");
  heroSection = document.getElementById("hero-section");

  step1 = document.getElementById("step-1");
  step2 = document.getElementById("step-2");
  step3 = document.getElementById("step-3");
  step4 = document.getElementById("step-4");
  progressFill = document.getElementById("progress-fill");
  progressStatusText = document.getElementById("progress-status-text");

  processBtn = document.getElementById("process-btn");
  urlInput = document.getElementById("youtube-url");
  modelSelect = document.getElementById("whisper-model");

  if (videoEl) {
    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("seeked", handleTimeUpdate);
  }

  if (autoscrollCheck) {
    autoscrollCheck.addEventListener("change", (e) => {
      autoScroll = e.target.checked;
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchFilter = e.target.value.toLowerCase().trim();
      filterTranscript();
    });
  }

  if (urlInput) {
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        processVideo();
      }
    });
  }
}

// Verifica se há vídeo inicial no contexto da página ou query param ?v=...
function checkInitialVideo() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramId = urlParams.get("v");

  if (window.INITIAL_VIDEO_DATA && window.INITIAL_VIDEO_DATA.id) {
    loadVideoData(window.INITIAL_VIDEO_DATA);
  } else if (paramId) {
    fetchVideoById(paramId);
  }
}

// Sincronização em tempo real das legendas com o vídeo
function handleTimeUpdate() {
  if (!videoEl || !currentSegments.length) return;
  const currentTime = videoEl.currentTime;

  let foundIndex = -1;
  for (let i = 0; i < currentSegments.length; i++) {
    const seg = currentSegments[i];
    if (currentTime >= seg.start && currentTime <= seg.end) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex !== activeSegmentIndex) {
    activeSegmentIndex = foundIndex;
    updateActiveCueUI(foundIndex);
  }

  updateVideoOverlay(foundIndex);
}

function updateActiveCueUI(index) {
  const allCards = transcriptBody.querySelectorAll(".cue-item");
  allCards.forEach((c) => c.classList.remove("active"));

  if (index === -1) return;

  const targetCard = document.getElementById(`cue-${index}`);
  if (targetCard) {
    targetCard.classList.add("active");

    if (autoScroll) {
      targetCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }
}

function updateVideoOverlay(index) {
  if (!overlayContainer || index === -1 || subtitleMode === "off") {
    if (overlayContainer) overlayContainer.style.display = "none";
    return;
  }

  const seg = currentSegments[index];
  if (!seg) {
    overlayContainer.style.display = "none";
    return;
  }

  overlayContainer.style.display = "flex";

  if (subtitleMode === "bilingual") {
    overlayEn.style.display = "inline-block";
    overlayPt.style.display = "inline-block";
    overlayEn.innerText = seg.text_en || "";
    overlayPt.innerText = seg.text_pt || "";
  } else if (subtitleMode === "en") {
    overlayEn.style.display = "inline-block";
    overlayPt.style.display = "none";
    overlayEn.innerText = seg.text_en || "";
  } else if (subtitleMode === "pt") {
    overlayEn.style.display = "none";
    overlayPt.style.display = "inline-block";
    overlayPt.innerText = seg.text_pt || "";
  }
}

// Renderiza a lista de legendas sincronizadas (estilo limpo)
function renderTranscript(segments) {
  if (!transcriptBody) return;
  transcriptBody.innerHTML = "";

  segments.forEach((seg, index) => {
    const card = document.createElement("div");
    card.className = "cue-item";
    card.id = `cue-${index}`;
    card.dataset.index = index;
    card.dataset.start = seg.start;
    card.dataset.end = seg.end;

    card.innerHTML = `
      <div class="cue-header">
        <span class="cue-time-badge">${seg.time_display || formatTime(seg.start)}</span>
        <div class="cue-buttons">
          <button class="cue-mini-btn" title="Repetir frase" onclick="event.stopPropagation(); replaySegment(${index})">
            <i class="bi bi-arrow-repeat"></i>
          </button>
          <button class="cue-mini-btn" title="Copiar frase bilíngue" onclick="event.stopPropagation(); copyCueText(${index})">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
      <div class="cue-text-en">${escapeHtml(seg.text_en || "")}</div>
      <div class="cue-text-pt">${escapeHtml(seg.text_pt || "")}</div>
    `;

    card.addEventListener("click", () => {
      seekTo(seg.start);
    });

    transcriptBody.appendChild(card);
  });
}

function filterTranscript() {
  const allCards = transcriptBody.querySelectorAll(".cue-item");
  allCards.forEach((card) => {
    const textEn = card.querySelector(".cue-text-en").innerText.toLowerCase();
    const textPt = card.querySelector(".cue-text-pt").innerText.toLowerCase();
    if (!searchFilter || textEn.includes(searchFilter) || textPt.includes(searchFilter)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

function seekTo(seconds) {
  if (videoEl) {
    videoEl.currentTime = seconds;
    videoEl.play();
  }
}

function replaySegment(index) {
  const seg = currentSegments[index];
  if (seg && videoEl) {
    videoEl.currentTime = seg.start;
    videoEl.play();
  }
}

function copyCueText(index) {
  const seg = currentSegments[index];
  if (!seg) return;
  const content = `EN: ${seg.text_en}\nPT: ${seg.text_pt}\n[${seg.time_display}]`;
  navigator.clipboard.writeText(content).then(() => {
    showToast("Frase copiada para a área de transferência", "success");
  });
}

function copyShareLink() {
  if (!currentVideo) return;
  const shareUrl = `${window.location.origin}/watch/${currentVideo.id}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast("Link do vídeo copiado", "success");
  });
}

function setPlaybackSpeed(speed) {
  if (videoEl) {
    videoEl.playbackRate = speed;
    document.querySelectorAll(".speed-pill").forEach((p) => {
      p.classList.toggle("active", parseFloat(p.dataset.speed) === speed);
    });
    showToast(`Velocidade ajustada para ${speed}x`, "success");
  }
}

function setSubtitleMode(mode) {
  subtitleMode = mode;
  document.querySelectorAll(".sub-mode-pill").forEach((p) => {
    p.classList.toggle("active", p.dataset.mode === mode);
  });
  handleTimeUpdate();
}

function skipTime(seconds) {
  if (videoEl) {
    videoEl.currentTime = Math.max(0, videoEl.currentTime + seconds);
  }
}

function toggleDropdown(id) {
  const dd = document.getElementById(id);
  if (dd) dd.classList.toggle("open");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
  }
});

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

    if (e.code === "Space") {
      e.preventDefault();
      if (videoEl) videoEl.paused ? videoEl.play() : videoEl.pause();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      skipTime(-5);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      skipTime(5);
    } else if (e.code === "KeyL") {
      if (activeSegmentIndex >= 0) replaySegment(activeSegmentIndex);
    }
  });
}

// Processamento de Vídeo
async function processVideo() {
  const url = urlInput.value.trim();
  const model = modelSelect ? modelSelect.value : "base";

  if (!url) {
    showToast("Insira um link do YouTube.", "error");
    urlInput.focus();
    return;
  }

  setProcessingState(true);
  updateStepProgress(1, "Baixando vídeo e áudio...");

  try {
    const progressTimer = simulateProgressSteps();

    const response = await fetch("/subtitles/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, model })
    });

    clearInterval(progressTimer);

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Falha ao processar vídeo.");
    }

    updateStepProgress(4, "Processamento concluído com sucesso!", true);
    setTimeout(() => {
      setProcessingState(false);
      loadVideoData(data.video);
      loadHistory();
      showToast("Vídeo processado com sucesso", "success");
    }, 500);

  } catch (err) {
    setProcessingState(false);
    showToast("Erro: " + err.message, "error");
  }
}

function simulateProgressSteps() {
  let cur = 1;
  const messages = [
    "Baixando vídeo MP4 via yt-dlp...",
    "Transcrevendo áudio em inglês com IA (Whisper)...",
    "Traduzindo legendas em lote para português...",
    "Sincronizando arquivos finais..."
  ];
  return setInterval(() => {
    if (cur < 3) {
      cur++;
      updateStepProgress(cur, messages[cur - 1]);
    }
  }, 4500);
}

function updateStepProgress(activeStepNum, statusMsg = "", isAllDone = false) {
  const steps = [step1, step2, step3, step4];
  const percentages = [25, 55, 80, 100];

  if (progressFill) {
    progressFill.style.width = `${percentages[activeStepNum - 1] || 100}%`;
  }
  if (progressStatusText && statusMsg) {
    progressStatusText.innerText = statusMsg;
  }

  steps.forEach((step, idx) => {
    if (!step) return;
    const num = idx + 1;
    step.classList.remove("active", "completed");

    if (isAllDone || num < activeStepNum) {
      step.classList.add("completed");
    } else if (num === activeStepNum) {
      step.classList.add("active");
    }
  });
}

function setProcessingState(isProcessing) {
  if (isProcessing) {
    stepperCard.classList.add("active");
    processBtn.disabled = true;
    processBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite; display: inline-block;"></i>`;
  } else {
    stepperCard.classList.remove("active");
    processBtn.disabled = false;
    processBtn.innerHTML = `<i class="bi bi-arrow-up-short"></i>`;
  }
}

function loadVideoData(video) {
  if (!video) return;
  currentVideo = video;
  currentSegments = video.segments || [];

  document.getElementById("video-display-title").innerText = video.title || "Vídeo";
  document.getElementById("video-display-channel").innerText = video.uploader ? `Canal: ${video.uploader}` : "";
  document.getElementById("video-display-segments").innerText = `${currentSegments.length} frases sincronizadas`;

  document.getElementById("dl-bilingual-srt").href = video.srt_bilingual_url || "#";
  document.getElementById("dl-bilingual-vtt").href = video.vtt_bilingual_url || "#";
  document.getElementById("dl-en-srt").href = video.srt_en_url || "#";
  document.getElementById("dl-en-vtt").href = video.vtt_en_url || "#";
  document.getElementById("dl-pt-srt").href = video.srt_pt_url || "#";
  document.getElementById("dl-pt-vtt").href = video.vtt_pt_url || "#";

  videoEl.src = video.video_url;
  videoEl.load();

  renderTranscript(currentSegments);

  studioSection.classList.add("active");
  studioSection.scrollIntoView({ behavior: "smooth" });

  const newUrl = `/watch/${video.id}`;
  window.history.pushState({ videoId: video.id }, video.title, newUrl);
}

async function fetchVideoById(videoId) {
  try {
    const res = await fetch(`/subtitles/video/${videoId}`);
    const data = await res.json();
    if (data.success && data.video) {
      loadVideoData(data.video);
    }
  } catch (err) {
    console.error("Erro ao buscar vídeo:", err);
  }
}

async function loadHistory() {
  const container = document.getElementById("history-grid");
  if (!container) return;

  try {
    const res = await fetch("/subtitles/history");
    const data = await res.json();

    if (!data.videos || !data.videos.length) {
      container.innerHTML = `<p style="color: var(--gm-text-muted); grid-column: 1/-1; font-size: 0.85rem;">Nenhum vídeo processado ainda.</p>`;
      return;
    }

    container.innerHTML = "";
    data.videos.forEach((vid) => {
      const card = document.createElement("div");
      card.className = "history-card";
      card.innerHTML = `
        <div class="history-thumb-box" onclick="fetchVideoById('${vid.id}')">
          <img class="history-thumb-img" src="${vid.thumbnail || 'https://via.placeholder.com/320x180?text=Video'}" alt="${escapeHtml(vid.title)}" loading="lazy">
          <span class="history-time-tag">${formatTime(vid.duration || 0)}</span>
        </div>
        <div class="history-content">
          <h4 class="history-video-name" onclick="fetchVideoById('${vid.id}')" title="${escapeHtml(vid.title)}">${escapeHtml(vid.title)}</h4>
          <div class="history-bottom-row">
            <span>${vid.segments_count || (vid.segments ? vid.segments.length : 0)} frases</span>
            <button class="history-del-icon" title="Excluir vídeo" onclick="deleteHistoryVideo('${vid.id}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Erro ao carregar histórico:", err);
  }
}

async function deleteHistoryVideo(videoId) {
  if (!confirm("Deseja realmente remover este vídeo e suas legendas?")) return;

  try {
    const res = await fetch(`/subtitles/video/${videoId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Vídeo excluído com sucesso", "success");
      loadHistory();
      if (currentVideo && currentVideo.id === videoId) {
        studioSection.classList.remove("active");
        videoEl.pause();
        videoEl.src = "";
      }
    }
  } catch (err) {
    showToast("Erro ao excluir vídeo", "error");
  }
}

async function pasteUrl() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text;
      showToast("Link colado", "success");
    }
  } catch (err) {
    urlInput.focus();
  }
}

function fillDemo(url) {
  urlInput.value = url;
  processVideo();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.className = `toast-msg show ${type}`;
  setTimeout(() => {
    toast.className = "toast-msg";
  }, 3200);
}
