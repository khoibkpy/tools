(() => {
  const $ = (s) => document.querySelector(s);

  const qrText = $("#qrText");
  const generateBtn = $("#generateBtn");
  const qrPreview = $("#qrPreview");
  const downloadQr = $("#downloadQr");
  const clearText = $("#clearText");
  const copyText = $("#copyText");

  let latestQrCanvas = null;

  function setButtonLabel(button, label) {
    const original = button.dataset.original || button.textContent;
    button.dataset.original = original;
    button.textContent = label;
    setTimeout(() => button.textContent = original, 1000);
  }

  function generateQr() {
    const text = qrText.value;
    qrPreview.innerHTML = "";
    latestQrCanvas = null;

    if (!text.trim()) {
      qrPreview.innerHTML = "<span>Nhập nội dung để tạo QR</span>";
      downloadQr.disabled = true;
      return;
    }

    if (typeof QRCode === "undefined") {
      qrPreview.innerHTML = "<span>Không thể tải thư viện QRCode.</span>";
      downloadQr.disabled = true;
      return;
    }

    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, text, {
      errorCorrectionLevel: "M",
      width: 500,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" }
    }, (error) => {
      if (error) {
        qrPreview.innerHTML = "<span>Không thể tạo QR.</span>";
        downloadQr.disabled = true;
        return;
      }
      qrPreview.appendChild(canvas);
      latestQrCanvas = canvas;
      downloadQr.disabled = false;
    });
  }

  generateBtn?.addEventListener("click", generateQr);

  let timer;
  qrText.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(generateQr, 120);
  });

  clearText.addEventListener("click", () => {
    qrText.value = "";
    generateQr();
  });

  copyText.addEventListener("click", async () => {
    if (!qrText.value) return;
    try {
      await navigator.clipboard.writeText(qrText.value);
      setButtonLabel(copyText, "Đã copy!");
    } catch {
      setButtonLabel(copyText, "Không copy được");
    }
  });

  downloadQr.addEventListener("click", () => {
    if (!latestQrCanvas) return;
    const a = document.createElement("a");
    a.download = "qr-code.png";
    a.href = latestQrCanvas.toDataURL("image/png");
    a.click();
  });

  const tabs = [...document.querySelectorAll(".tab")];
  const panels = {
    generate: $("#generatePanel"),
    scan: $("#scanPanel")
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      Object.entries(panels).forEach(([name, panel]) => {
        panel.classList.toggle("active-panel", name === target);
      });
    });
  });

  const dropZone = $("#dropZone");
  const fileInput = $("#fileInput");
  const chooseFile = $("#chooseFile");
  const scanImage = $("#scanImage");
  const scanPlaceholder = $("#scanPlaceholder");
  const scanResult = $("#scanResult");
  const scanStatus = $("#scanStatus");
  const copyResult = $("#copyResult");
  const clearScan = $("#clearScan");

  chooseFile.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) processImage(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", e => {
    const file = [...e.dataTransfer.files].find(f => f.type.startsWith("image/"));
    if (file) processImage(file);
    else scanStatus.textContent = "Vui lòng thả một file ảnh.";
  });

  document.addEventListener("paste", e => {
    const items = [...(e.clipboardData?.items || [])];
    const imageItem = items.find(item => item.type.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        const scanTab = document.querySelector('.tab[data-tab="scan"]');
        scanTab.click();
        processImage(file);
      }
    }
  });

  function processImage(file) {
    scanStatus.textContent = "Đang đọc QR...";
    scanResult.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      scanImage.src = reader.result;
      scanImage.hidden = false;
      scanPlaceholder.hidden = true;

      const image = new Image();
      image.onload = () => decodeImage(image);
      image.onerror = () => {
        scanStatus.textContent = "Không thể đọc ảnh.";
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function decodeImage(image) {
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, width, height, {
      inversionAttempts: "attemptBoth"
    });

    if (!code) {
      scanStatus.textContent = "Không tìm thấy mã QR trong ảnh. Thử ảnh rõ hơn hoặc crop sát QR.";
      return;
    }

    scanResult.value = code.data;
    scanStatus.textContent = "Đã đọc QR thành công.";
  }

  copyResult.addEventListener("click", async () => {
    if (!scanResult.value) return;
    try {
      await navigator.clipboard.writeText(scanResult.value);
      setButtonLabel(copyResult, "Đã copy!");
    } catch {
      setButtonLabel(copyResult, "Không copy được");
    }
  });

  clearScan.addEventListener("click", () => {
    scanImage.removeAttribute("src");
    scanImage.hidden = true;
    scanPlaceholder.hidden = false;
    scanResult.value = "";
    scanStatus.textContent = "";
    fileInput.value = "";
  });

  generateQr();
})();
