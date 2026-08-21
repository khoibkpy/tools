(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // DOM Elements
  const canvas = $("#wheelCanvas");
  const ctx = canvas.getContext("2d");
  const spinBtn = $("#spinBtn");
  const centerSpinBtn = $("#centerSpinBtn");
  const soundToggle = $("#soundToggle");
  const autoRemoveToggle = $("#autoRemoveToggle");
  const entryCount = $("#entryCount");
  const entryList = $("#entryList");
  const newEntryInput = $("#newEntryInput");
  const newEntryWeight = $("#newEntryWeight");
  const addEntryBtn = $("#addEntryBtn");
  const shuffleBtn = $("#shuffleBtn");
  const equalizeBtn = $("#equalizeBtn");
  const toggleBulkBtn = $("#toggleBulkBtn");
  const bulkArea = $("#bulkArea");
  const bulkInput = $("#bulkInput");
  const applyBulkBtn = $("#applyBulkBtn");
  const cancelBulkBtn = $("#cancelBulkBtn");
  const historyList = $("#historyList");
  const clearHistoryBtn = $("#clearHistoryBtn");

  // Modal Elements
  const winnerModal = $("#winnerModal");
  const winnerNameEl = $("#winnerName");
  const winnerMetaEl = $("#winnerMeta");
  const modalSpinAgainBtn = $("#modalSpinAgainBtn");
  const modalRemoveBtn = $("#modalRemoveBtn");
  const modalCloseBtn = $("#modalCloseBtn");
  const confettiCanvas = $("#confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");

  // Pre-defined vibrant colors
  const PALETTE = [
    "#4f46e5", "#06b6d4", "#10b981", "#f59e0b",
    "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
    "#f97316", "#3b82f6", "#84cc16", "#a855f7"
  ];

  // Default entries: "1" and "2"
  let entries = [
    { id: "e-1", text: "1", weight: 1, color: PALETTE[0] },
    { id: "e-2", text: "2", weight: 1, color: PALETTE[5] }
  ];

  let history = [];
  let isSpinning = false;
  let currentRotation = 0; // In radians
  let lastWinningIndex = -1;
  let lastWinningEntry = null;

  // Web Audio Context for ticks & victory fanfare
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTickSound() {
    if (!soundToggle.checked) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520 + Math.random() * 80, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  function playFanfareSound() {
    if (!soundToggle.checked) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.09);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.5);
      });
    } catch (e) {}
  }

  // Cryptographically secure random float in [0, 1) using Web Crypto API
  function getSecureRandomFloat() {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    // 53 bits of randomness
    const high = array[0] >>> 5;
    const low = array[1] >>> 6;
    return (high * 67108864 + low) / 9007199254740992;
  }

  function getTotalWeight() {
    return entries.reduce((sum, e) => sum + Math.max(0.001, Number(e.weight) || 1), 0);
  }

  function getSliceAngles() {
    const total = getTotalWeight();
    let current = 0;
    return entries.map(entry => {
      const weight = Math.max(0.001, Number(entry.weight) || 1);
      const angle = (weight / total) * 2 * Math.PI;
      const start = current;
      const end = current + angle;
      current = end;
      return { start, end, angle, percentage: (weight / total) * 100 };
    });
  }

  function getEntryColor(index) {
    return PALETTE[index % PALETTE.length];
  }

  // Draw Wheel on Canvas
  function drawWheel(rotation = currentRotation) {
    const dpr = window.devicePixelRatio || 1;
    const size = 600;
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 12;

    if (entries.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Không có mục nào", cx, cy);
      ctx.restore();
      return;
    }

    const slices = getSliceAngles();

    // Wheel outer shadow / border ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Draw Slices
    slices.forEach((slice, i) => {
      const entry = entries[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, slice.start, slice.end);
      ctx.closePath();

      ctx.fillStyle = entry.color || getEntryColor(i);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text along the slice
      ctx.save();
      const midAngle = slice.start + slice.angle / 2;
      ctx.rotate(midAngle);

      ctx.fillStyle = "#ffffff";
      ctx.font = entries.length > 20 ? "bold 13px Inter, sans-serif" : "bold 18px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;

      // Truncate text if too long
      let text = entry.text;
      const maxTextWidth = radius * 0.65;
      if (ctx.measureText(text).width > maxTextWidth) {
        while (text.length > 1 && ctx.measureText(text + "...").width > maxTextWidth) {
          text = text.slice(0, -1);
        }
        text += "...";
      }

      ctx.fillText(text, radius - 24, 0);
      ctx.restore();
    });

    ctx.restore();

    // Center hub overlay
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Render entry list in UI
  function renderEntryList() {
    entryCount.textContent = entries.length;
    const slices = getSliceAngles();
    entryList.innerHTML = "";

    entries.forEach((entry, i) => {
      const slice = slices[i] || { percentage: 0 };
      const item = document.createElement("div");
      item.className = "entry-item";
      item.dataset.id = entry.id;

      item.innerHTML = `
        <div class="entry-color-badge" style="background-color: ${entry.color || getEntryColor(i)};"></div>
        <input class="entry-name-input" type="text" value="${escapeHtml(entry.text)}" maxlength="50" aria-label="Tên mục">
        <div class="entry-weight-wrap">
          <input class="entry-weight-input" type="number" min="0.1" max="1000" step="any" value="${entry.weight}" title="Hệ số tỉ lệ" aria-label="Hệ số">
          <span class="entry-percent-badge">${slice.percentage.toFixed(1)}%</span>
        </div>
        <button class="entry-delete-btn" type="button" title="Xóa" aria-label="Xóa">✕</button>
      `;

      // Name change listener
      const nameInput = item.querySelector(".entry-name-input");
      nameInput.addEventListener("change", () => {
        entry.text = nameInput.value.trim() || `Mục ${i + 1}`;
        nameInput.value = entry.text;
        drawWheel();
        saveState();
      });

      // Weight change listener
      const weightInput = item.querySelector(".entry-weight-input");
      weightInput.addEventListener("change", () => {
        const val = parseFloat(weightInput.value);
        entry.weight = (!isNaN(val) && val > 0) ? val : 1;
        weightInput.value = entry.weight;
        renderEntryList();
        drawWheel();
        saveState();
      });

      // Delete button listener
      const deleteBtn = item.querySelector(".entry-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (entries.length <= 1) {
          alert("Vòng quay cần ít nhất 1 mục.");
          return;
        }
        entries.splice(i, 1);
        renderEntryList();
        drawWheel();
        saveState();
      });

      entryList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[m]);
  }

  // Add a single new entry
  function addEntry(name, weight = 1) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const w = parseFloat(weight) > 0 ? parseFloat(weight) : 1;
    entries.push({
      id: "e-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      text: trimmed,
      weight: w,
      color: getEntryColor(entries.length)
    });
    renderEntryList();
    drawWheel();
    saveState();
  }

  // Spin the wheel with cryptographic randomness & physics
  function spin() {
    if (isSpinning) return;
    if (entries.length === 0) {
      alert("Vui lòng thêm ít nhất 1 mục để quay.");
      return;
    }

    initAudio();
    isSpinning = true;
    spinBtn.disabled = true;
    centerSpinBtn.disabled = true;

    // Pick winner index based on cryptographic randomness and weights
    const totalWeight = getTotalWeight();
    const rand = getSecureRandomFloat() * totalWeight;
    const slices = getSliceAngles();
    let winningIndex = 0;
    let cumulative = 0;

    for (let i = 0; i < entries.length; i++) {
      cumulative += Math.max(0.001, Number(entries[i].weight) || 1);
      if (rand < cumulative || i === entries.length - 1) {
        winningIndex = i;
        break;
      }
    }

    lastWinningIndex = winningIndex;
    lastWinningEntry = { ...entries[winningIndex], percentage: slices[winningIndex].percentage };

    // The pointer is at the TOP (12 o'clock / angle = 3*PI/2 or -PI/2)
    // We want the wheel rotation R such that:
    // ( -PI/2 - R ) mod 2PI lands inside winning slice [start, end]
    const winSlice = slices[winningIndex];
    // Add jitter inside the winning slice (15% to 85% range) so it doesn't always hit exact center
    const sliceInnerRatio = 0.15 + getSecureRandomFloat() * 0.7;
    const sliceTargetAngle = winSlice.start + winSlice.angle * sliceInnerRatio;

    // Calculate final target rotation:
    // 6 to 9 full spins + exact stop offset
    const extraSpins = 6 + Math.floor(getSecureRandomFloat() * 4);
    const pointerAngle = -Math.PI / 2;
    const targetDelta = pointerAngle - sliceTargetAngle;
    
    // Normalize target angle ahead of current rotation
    let finalRotation = currentRotation + (extraSpins * 2 * Math.PI);
    const currentMod = currentRotation % (2 * Math.PI);
    const targetMod = (targetDelta % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const diff = (targetMod - currentMod + 2 * Math.PI) % (2 * Math.PI);
    finalRotation += diff;

    const startRotation = currentRotation;
    const totalRotationDistance = finalRotation - startRotation;
    const duration = 4500 + Math.floor(getSecureRandomFloat() * 800); // 4.5s - 5.3s
    const startTime = performance.now();

    let lastTickSlice = -1;

    function easeOutQuint(t) {
      return 1 - Math.pow(1 - t, 5);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutQuint(progress);

      currentRotation = startRotation + totalRotationDistance * eased;
      drawWheel(currentRotation);

      // Check pointer slice for tick sound
      const normRot = ((-Math.PI / 2 - currentRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentSliceIdx = slices.findIndex(s => normRot >= s.start && normRot < s.end);
      if (currentSliceIdx !== -1 && currentSliceIdx !== lastTickSlice) {
        lastTickSlice = currentSliceIdx;
        playTickSound();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin finished
        isSpinning = false;
        spinBtn.disabled = false;
        centerSpinBtn.disabled = false;
        currentRotation = finalRotation % (2 * Math.PI);
        drawWheel(currentRotation);
        onSpinComplete(lastWinningEntry, lastWinningIndex);
      }
    }

    requestAnimationFrame(animate);
  }

  // Handle spin completion
  function onSpinComplete(winner, winnerIndex) {
    playFanfareSound();
    addHistory(winner.text);

    // If auto-remove is enabled, remove from pool immediately
    if (autoRemoveToggle.checked) {
      if (entries.length > 1) {
        entries.splice(winnerIndex, 1);
        renderEntryList();
        drawWheel();
        saveState();
      }
    }

    showWinnerModal(winner);
  }

  // Confetti Particle System
  let confettiParticles = [];
  let confettiAnimationId = null;

  function launchConfetti() {
    const dpr = window.devicePixelRatio || 1;
    const w = confettiCanvas.clientWidth || 440;
    const h = confettiCanvas.clientHeight || 300;
    confettiCanvas.width = w * dpr;
    confettiCanvas.height = h * dpr;

    confettiParticles = [];
    for (let i = 0; i < 70; i++) {
      confettiParticles.push({
        x: (w / 2) * dpr,
        y: (h * 0.4) * dpr,
        vx: (Math.random() - 0.5) * 14 * dpr,
        vy: (Math.random() - 0.8) * 16 * dpr,
        size: (Math.random() * 7 + 5) * dpr,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.35 * dpr,
        alpha: 1
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

    function renderConfetti() {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let alive = false;

      confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          alive = true;
          confettiCtx.save();
          confettiCtx.globalAlpha = Math.max(0, p.alpha);
          confettiCtx.translate(p.x, p.y);
          confettiCtx.rotate((p.rotation * Math.PI) / 180);
          confettiCtx.fillStyle = p.color;
          confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          confettiCtx.restore();
        }
      });

      if (alive) {
        confettiAnimationId = requestAnimationFrame(renderConfetti);
      }
    }

    renderConfetti();
  }

  function showWinnerModal(winner) {
    winnerNameEl.textContent = winner.text;
    winnerMetaEl.textContent = `Tỉ lệ trúng: ${winner.percentage ? winner.percentage.toFixed(1) : "50"}%`;
    winnerModal.classList.remove("hidden");
    launchConfetti();
  }

  function closeWinnerModal() {
    winnerModal.classList.add("hidden");
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
  }

  // History List Management
  function addHistory(winnerName) {
    const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    history.unshift({ text: winnerName, time: timeStr });
    if (history.length > 50) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<span class="empty-hint">Chưa có kết quả nào.</span>';
      return;
    }
    historyList.innerHTML = history.map(item => `
      <div class="history-chip">
        <span>🏆 ${escapeHtml(item.text)}</span>
        <span class="time">${item.time}</span>
      </div>
    `).join("");
  }

  // Local Storage Save / Load
  function saveState() {
    try {
      localStorage.setItem("wheel_of_names_entries", JSON.stringify(entries));
      localStorage.setItem("wheel_of_names_settings", JSON.stringify({
        sound: soundToggle.checked,
        autoRemove: autoRemoveToggle.checked
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const savedEntries = localStorage.getItem("wheel_of_names_entries");
      if (savedEntries) {
        const parsed = JSON.parse(savedEntries);
        if (Array.isArray(parsed) && parsed.length > 0) {
          entries = parsed;
        }
      }
      const savedSettings = localStorage.getItem("wheel_of_names_settings");
      if (savedSettings) {
        const s = JSON.parse(savedSettings);
        if (typeof s.sound === "boolean") soundToggle.checked = s.sound;
        if (typeof s.autoRemove === "boolean") autoRemoveToggle.checked = s.autoRemove;
      }
    } catch (e) {}
  }

  // Event Listeners
  spinBtn.addEventListener("click", spin);
  centerSpinBtn.addEventListener("click", spin);
  canvas.addEventListener("click", spin);

  // Keyboard shortcut: Spacebar to spin
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !winnerModal.classList.contains("hidden")) {
      e.preventDefault();
      closeWinnerModal();
      spin();
      return;
    }
    if (e.code === "Space" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      spin();
    }
  });

  // Add Entry Button & Enter key in input
  function handleAdd() {
    const text = newEntryInput.value.trim();
    if (!text) return;
    const weight = parseFloat(newEntryWeight.value) || 1;
    addEntry(text, weight);
    newEntryInput.value = "";
    newEntryWeight.value = 1;
    newEntryInput.focus();
  }

  addEntryBtn.addEventListener("click", handleAdd);
  newEntryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdd();
  });
  newEntryWeight.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdd();
  });

  // Shuffle button
  shuffleBtn.addEventListener("click", () => {
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(getSecureRandomFloat() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    renderEntryList();
    drawWheel();
    saveState();
  });

  // Equalize weights
  equalizeBtn.addEventListener("click", () => {
    entries.forEach(e => e.weight = 1);
    renderEntryList();
    drawWheel();
    saveState();
  });

  // Bulk import
  toggleBulkBtn.addEventListener("click", () => {
    bulkArea.classList.toggle("hidden");
    if (!bulkArea.classList.contains("hidden")) {
      bulkInput.value = entries.map(e => e.text).join("\n");
      bulkInput.focus();
    }
  });

  cancelBulkBtn.addEventListener("click", () => {
    bulkArea.classList.add("hidden");
  });

  applyBulkBtn.addEventListener("click", () => {
    const lines = bulkInput.value
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      alert("Vui lòng nhập ít nhất 1 dòng.");
      return;
    }

    entries = lines.map((text, i) => ({
      id: "e-" + Date.now() + "-" + i,
      text,
      weight: 1,
      color: getEntryColor(i)
    }));

    bulkArea.classList.add("hidden");
    renderEntryList();
    drawWheel();
    saveState();
  });

  // Clear history
  clearHistoryBtn.addEventListener("click", () => {
    history = [];
    renderHistory();
  });

  // Modal actions
  modalCloseBtn.addEventListener("click", closeWinnerModal);
  modalSpinAgainBtn.addEventListener("click", () => {
    closeWinnerModal();
    setTimeout(spin, 150);
  });

  modalRemoveBtn.addEventListener("click", () => {
    if (lastWinningIndex >= 0 && lastWinningIndex < entries.length) {
      entries.splice(lastWinningIndex, 1);
      renderEntryList();
      drawWheel();
      saveState();
    }
    closeWinnerModal();
  });

  winnerModal.addEventListener("click", (e) => {
    if (e.target === winnerModal) closeWinnerModal();
  });

  soundToggle.addEventListener("change", saveState);
  autoRemoveToggle.addEventListener("change", saveState);

  // Responsive redraw
  window.addEventListener("resize", () => drawWheel());

  // Initialization
  loadState();
  renderEntryList();
  drawWheel();
})();
