/* ============================================================
   证件照制作器 - ID Photo Maker
   应用逻辑 | Application Logic
   ============================================================ */

(function () {
  "use strict";

  // ---------- 常量定义 ----------
  // 标准证件照尺寸（像素 @300dpi）
  const PHOTO_SIZES = {
    "one-inch":    { name: "一寸",   w: 295, h: 413, mmW: 25, mmH: 35 },
    "two-inch":    { name: "二寸",   w: 413, h: 579, mmW: 35, mmH: 49 },
    "small-one":   { name: "小一寸", w: 260, h: 378, mmW: 22, mmH: 32 },
    "small-two":   { name: "小二寸", w: 413, h: 531, mmW: 35, mmH: 45 },
    passport:      { name: "护照",   w: 390, h: 567, mmW: 33, mmH: 48 },
    visa:          { name: "签证",   w: 600, h: 600, mmW: 50, mmH: 50 },
    custom:        { name: "自定义", w: 295, h: 413, mmW: 25, mmH: 35 },
  };

  // A4 纸尺寸（像素 @300dpi）
  const A4_W = 2480;
  const A4_H = 3508;

  // 背景色预设
  const BG_COLORS = {
    transparent: null,
    white:       { r: 255, g: 255, b: 255 },
    blue:        { r: 67,  g: 142, b: 219 },
    red:         { r: 208, g: 12,  b: 12  },
    "grad-blue": { r: 67,  g: 142, b: 219, grad: true },
    "grad-gray": { r: 224, g: 224, b: 224, grad: true },
  };

  // ---------- 应用状态 ----------
  const state = {
    originalImage: null,      // 原始图片 Image 对象
    originalCanvas: null,     // 原始图片 canvas（用于重置）
    processedCanvas: null,    // 处理后 canvas（背景已移除）
    previewCanvas: null,      // 预览 canvas（合成最终效果）
    currentSize: "one-inch",  // 当前选中的尺寸
    currentBg: "white",       // 当前背景色
    tolerance: 30,            // 背景移除容差
    bgRemoved: false,         // 是否已移除背景
    customW: 295,             // 自定义宽度
    customH: 413,             // 自定义高度
  };

  // ---------- DOM 引用 ----------
  let els = {};

  // ---------- 初始化 ----------
  function init() {
    cacheElements();
    bindEvents();
    loadTheme();
    updateSteps();
  }

  // 缓存 DOM 元素
  function cacheElements() {
    els = {
      // 主题
      themeToggle: document.getElementById("themeToggle"),

      // 上传
      uploadZone: document.getElementById("uploadZone"),
      fileInput: document.getElementById("fileInput"),

      // 画布
      canvasWrapper: document.getElementById("canvasWrapper"),
      canvasContainer: document.getElementById("canvasContainer"),
      previewCanvas: document.getElementById("previewCanvas"),
      canvasInfo: document.getElementById("canvasInfo"),

      // 工具栏
      canvasToolbar: document.getElementById("canvasToolbar"),
      btnReupload: document.getElementById("btnReupload"),
      btnRemoveBg: document.getElementById("btnRemoveBg"),
      btnReset: document.getElementById("btnReset"),

      // 侧栏 - 尺寸
      sizeGrid: document.getElementById("sizeGrid"),
      customSizePanel: document.getElementById("customSizePanel"),
      customWidth: document.getElementById("customWidth"),
      customHeight: document.getElementById("customHeight"),
      btnApplyCustom: document.getElementById("btnApplyCustom"),

      // 侧栏 - 背景色
      colorBtns: document.querySelectorAll(".color-btn"),
      toleranceSlider: document.getElementById("toleranceSlider"),
      toleranceValue: document.getElementById("toleranceValue"),

      // 操作按钮
      btnDownloadPng: document.getElementById("btnDownloadPng"),
      btnDownloadJpg: document.getElementById("btnDownloadJpg"),
      btnPrintLayout: document.getElementById("btnPrintLayout"),

      // 弹窗
      printModal: document.getElementById("printModal"),
      printCanvas: document.getElementById("printCanvas"),
      printInfo: document.getElementById("printInfo"),
      btnModalClose: document.getElementById("btnModalClose"),
      btnDownloadPrint: document.getElementById("btnDownloadPrint"),

      // 步骤
      steps: document.querySelectorAll(".step-item"),

      // Toast
      toastContainer: document.getElementById("toastContainer"),

      // 加载
      loadingOverlay: document.getElementById("loadingOverlay"),
      loadingText: document.getElementById("loadingText"),
    };
  }

  // 绑定事件
  function bindEvents() {
    // 主题切换
    els.themeToggle.addEventListener("click", toggleTheme);

    // 上传
    els.uploadZone.addEventListener("click", () => els.fileInput.click());
    els.fileInput.addEventListener("change", handleFileSelect);
    els.uploadZone.addEventListener("dragover", handleDragOver);
    els.uploadZone.addEventListener("dragleave", handleDragLeave);
    els.uploadZone.addEventListener("drop", handleDrop);

    // 工具栏
    els.btnReupload.addEventListener("click", () => els.fileInput.click());
    els.btnRemoveBg.addEventListener("click", removeBackground);
    els.btnReset.addEventListener("click", resetImage);

    // 尺寸选择
    els.sizeGrid.addEventListener("click", handleSizeSelect);
    els.btnApplyCustom.addEventListener("click", applyCustomSize);
    els.customWidth.addEventListener("input", handleCustomSizeInput);
    els.customHeight.addEventListener("input", handleCustomSizeInput);

    // 背景色
    els.colorBtns.forEach((btn) => {
      btn.addEventListener("click", () => handleColorSelect(btn));
    });
    els.toleranceSlider.addEventListener("input", handleToleranceChange);

    // 操作按钮
    els.btnDownloadPng.addEventListener("click", () => downloadPhoto("png"));
    els.btnDownloadJpg.addEventListener("click", () => downloadPhoto("jpg"));
    els.btnPrintLayout.addEventListener("click", openPrintLayout);

    // 弹窗
    els.btnModalClose.addEventListener("click", closePrintModal);
    els.btnDownloadPrint.addEventListener("click", downloadPrintLayout);
    els.printModal.addEventListener("click", (e) => {
      if (e.target === els.printModal) closePrintModal();
    });

    // 键盘快捷键
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePrintModal();
    });
  }

  // ---------- 主题管理 ----------
  function loadTheme() {
    const saved = localStorage.getItem("idphoto-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("idphoto-theme", next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    els.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  // ---------- 文件上传 ----------
  function handleDragOver(e) {
    e.preventDefault();
    els.uploadZone.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    els.uploadZone.classList.remove("drag-over");
  }

  function handleDrop(e) {
    e.preventDefault();
    els.uploadZone.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) processFile(files[0]);
    e.target.value = ""; // 允许重复选择同一文件
  }

  function processFile(file) {
    // 验证文件类型
    if (!file.type.match(/^image\/(jpeg|png|webp|bmp)$/)) {
      showToast("请上传 JPG、PNG、WebP 或 BMP 格式的图片", "error");
      return;
    }

    // 验证文件大小 (最大 20MB)
    if (file.size > 20 * 1024 * 1024) {
      showToast("图片大小不能超过 20MB", "error");
      return;
    }

    showLoading("正在加载图片...");

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        state.originalImage = img;
        state.bgRemoved = false;
        initCanvases(img);
        hideLoading();
        updateSteps();
        showToast("图片加载成功！", "success");
      };
      img.onerror = function () {
        hideLoading();
        showToast("图片加载失败，请重试", "error");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- 画布初始化 ----------
  function initCanvases(img) {
    // 创建原始图片 canvas
    state.originalCanvas = document.createElement("canvas");
    state.originalCanvas.width = img.width;
    state.originalCanvas.height = img.height;
    const ctx = state.originalCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // 创建处理后 canvas（初始为原始图）
    state.processedCanvas = document.createElement("canvas");
    state.processedCanvas.width = img.width;
    state.processedCanvas.height = img.height;
    const pCtx = state.processedCanvas.getContext("2d");
    pCtx.drawImage(img, 0, 0);

    // 显示画布区域
    els.uploadZone.style.display = "none";
    els.canvasWrapper.classList.add("visible");
    els.canvasToolbar.style.display = "flex";

    // 更新预览
    updatePreview();

    // 启用按钮
    els.btnRemoveBg.disabled = false;
    els.btnReset.disabled = false;
    els.btnDownloadPng.disabled = false;
    els.btnDownloadJpg.disabled = false;
    els.btnPrintLayout.disabled = false;
  }

  // ---------- 预览更新 ----------
  function updatePreview() {
    const size = getSize();
    const targetW = size.w;
    const targetH = size.h;

    // 设置预览 canvas 尺寸
    els.previewCanvas.width = targetW;
    els.previewCanvas.height = targetH;
    const ctx = els.previewCanvas.getContext("2d");
    ctx.clearRect(0, 0, targetW, targetH);

    // 填充背景色
    if (state.currentBg !== "transparent") {
      const bgColor = BG_COLORS[state.currentBg];
      if (bgColor) {
        if (bgColor.grad) {
          // 渐变背景
          const grad = ctx.createLinearGradient(0, 0, 0, targetH);
          if (state.currentBg === "grad-blue") {
            grad.addColorStop(0, "rgb(67, 142, 219)");
            grad.addColorStop(1, "rgb(107, 163, 230)");
          } else {
            grad.addColorStop(0, "rgb(224, 224, 224)");
            grad.addColorStop(1, "rgb(255, 255, 255)");
          }
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = `rgb(${bgColor.r},${bgColor.g},${bgColor.b})`;
        }
        ctx.fillRect(0, 0, targetW, targetH);
      }
    }

    // 计算裁剪区域（居中裁剪）
    const srcW = state.processedCanvas.width;
    const srcH = state.processedCanvas.height;
    const srcRatio = srcW / srcH;
    const targetRatio = targetW / targetH;

    let sx, sy, sw, sh;
    if (srcRatio > targetRatio) {
      // 原图更宽，裁剪左右
      sh = srcH;
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
      sy = 0;
    } else {
      // 原图更高，裁剪上下
      sw = srcW;
      sh = srcW / targetRatio;
      sx = 0;
      sy = (srcH - sh) / 2;
    }

    // 绘制照片
    ctx.drawImage(
      state.processedCanvas,
      sx, sy, sw, sh,
      0, 0, targetW, targetH
    );

    // 更新尺寸信息
    els.canvasInfo.textContent =
      `${size.name} · ${targetW}×${targetH}px · ${size.mmW}×${size.mmH}mm`;
  }

  // ---------- 背景移除核心算法 ----------
  function removeBackground() {
    if (!state.processedCanvas) return;

    showLoading("正在智能移除背景...");

    // 使用 setTimeout 让 UI 有时间更新
    setTimeout(() => {
      try {
        performBackgroundRemoval();
        state.bgRemoved = true;
        hideLoading();
        updatePreview();
        updateSteps();
        showToast("背景移除成功！", "success");
      } catch (err) {
        hideLoading();
        console.error("背景移除失败:", err);
        showToast("背景移除时出错，请重试", "error");
      }
    }, 50);
  }

  function performBackgroundRemoval() {
    const canvas = state.processedCanvas;
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const tolerance = state.tolerance;

    // 第1步：采样边框像素，确定背景色
    const bgColor = sampleBorderColor(data, w, h);

    // 第2步：使用 flood-fill 从边缘开始标记背景像素
    const visited = new Uint8Array(w * h);
    const isBackground = new Uint8Array(w * h);
    const queue = [];

    // 从四条边的所有像素开始 flood-fill
    for (let x = 0; x < w; x++) {
      queue.push(x);                   // 上边
      queue.push((h - 1) * w + x);     // 下边
    }
    for (let y = 0; y < h; y++) {
      queue.push(y * w);               // 左边
      queue.push(y * w + (w - 1));     // 右边
    }

    // BFS flood-fill
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      if (visited[idx]) continue;
      visited[idx] = 1;

      const px = idx * 4;
      const r = data[px];
      const g = data[px + 1];
      const b = data[px + 2];

      // 计算与背景色的距离
      const dist = colorDistance(r, g, b, bgColor.r, bgColor.g, bgColor.b);

      if (dist <= tolerance) {
        isBackground[idx] = 1;

        // 获取坐标并添加邻居
        const x = idx % w;
        const y = (idx - x) / w;

        // 4-邻域
        if (x > 0) queue.push(idx - 1);
        if (x < w - 1) queue.push(idx + 1);
        if (y > 0) queue.push(idx - w);
        if (y < h - 1) queue.push(idx + w);
      }
    }

    // 第3步：将背景像素设为透明
    for (let i = 0; i < w * h; i++) {
      if (isBackground[i]) {
        const px = i * 4;
        data[px + 3] = 0; // alpha = 0
      }
    }

    // 第4步：边缘羽化（让抠图边缘更自然）
    featherEdges(data, isBackground, w, h, 2);

    ctx.putImageData(imageData, 0, 0);
  }

  // 采样边框像素颜色
  function sampleBorderColor(data, w, h) {
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    const sampleStep = Math.max(1, Math.floor(Math.min(w, h) / 100));

    // 采样四条边的像素
    for (let x = 0; x < w; x += sampleStep) {
      // 上边
      addPixelColor(data, x, 0, w);
      // 下边
      addPixelColor(data, x, h - 1, w);
    }
    for (let y = 0; y < h; y += sampleStep) {
      // 左边
      addPixelColor(data, 0, y, w);
      // 右边
      addPixelColor(data, w - 1, y, w);
    }

    function addPixelColor(data, x, y, w) {
      const idx = (y * w + x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }

    return {
      r: Math.round(totalR / count),
      g: Math.round(totalG / count),
      b: Math.round(totalB / count),
    };
  }

  // 颜色距离（欧几里得距离）
  function colorDistance(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // 边缘羽化
  function featherEdges(data, isBackground, w, h, radius) {
    // 简单羽化：对背景与非背景交界处的像素进行半透明处理
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!isBackground[idx]) {
          // 检查是否在背景边缘附近
          let nearBg = false;
          let bgCount = 0;
          let total = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                total++;
                if (isBackground[ny * w + nx]) {
                  bgCount++;
                }
              }
            }
          }

          if (bgCount > 0 && bgCount < total) {
            // 边缘像素，根据周围背景比例降低透明度
            const ratio = bgCount / total;
            const px = idx * 4;
            data[px + 3] = Math.round(255 * (1 - ratio * 0.5));
          }
        }
      }
    }
  }

  // ---------- 重置图片 ----------
  function resetImage() {
    if (!state.originalImage || !state.originalCanvas) return;

    // 恢复处理后 canvas 为原始图
    const ctx = state.processedCanvas.getContext("2d");
    ctx.clearRect(0, 0, state.processedCanvas.width, state.processedCanvas.height);
    ctx.drawImage(state.originalImage, 0, 0);

    state.bgRemoved = false;
    updatePreview();
    updateSteps();
    showToast("已重置为原始图片", "success");
  }

  // ---------- 尺寸选择 ----------
  function handleSizeSelect(e) {
    const option = e.target.closest(".size-option");
    if (!option) return;

    const sizeKey = option.dataset.size;
    if (!sizeKey || !PHOTO_SIZES[sizeKey]) return;

    // 更新选中状态
    document.querySelectorAll(".size-option").forEach((el) => el.classList.remove("active"));
    option.classList.add("active");

    state.currentSize = sizeKey;

    // 自定义尺寸面板
    if (sizeKey === "custom") {
      els.customSizePanel.classList.add("visible");
    } else {
      els.customSizePanel.classList.remove("visible");
    }

    updatePreview();
  }

  function handleCustomSizeInput() {
    const w = parseInt(els.customWidth.value) || 295;
    const h = parseInt(els.customHeight.value) || 413;
    PHOTO_SIZES.custom.w = Math.max(10, Math.min(2000, w));
    PHOTO_SIZES.custom.h = Math.max(10, Math.min(2000, h));
  }

  function applyCustomSize() {
    handleCustomSizeInput();
    updatePreview();
    showToast("自定义尺寸已应用", "success");
  }

  // 获取当前尺寸
  function getSize() {
    return PHOTO_SIZES[state.currentSize] || PHOTO_SIZES["one-inch"];
  }

  // ---------- 背景色选择 ----------
  function handleColorSelect(btn) {
    const color = btn.dataset.color;
    if (!color || !BG_COLORS.hasOwnProperty(color)) return;

    els.colorBtns.forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");

    state.currentBg = color;
    updatePreview();
  }

  function handleToleranceChange() {
    state.tolerance = parseInt(els.toleranceSlider.value);
    els.toleranceValue.textContent = state.tolerance;
  }

  // ---------- 下载照片 ----------
  function downloadPhoto(format) {
    if (!state.processedCanvas) return;

    const size = getSize();
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size.w;
    exportCanvas.height = size.h;
    const ctx = exportCanvas.getContext("2d");

    // 填充背景色
    if (format === "jpg") {
      // JPG 不支持透明，用白色背景
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.w, size.h);
    }

    if (state.currentBg !== "transparent") {
      const bgColor = BG_COLORS[state.currentBg];
      if (bgColor) {
        if (bgColor.grad) {
          const grad = ctx.createLinearGradient(0, 0, 0, size.h);
          if (state.currentBg === "grad-blue") {
            grad.addColorStop(0, "rgb(67, 142, 219)");
            grad.addColorStop(1, "rgb(107, 163, 230)");
          } else {
            grad.addColorStop(0, "rgb(224, 224, 224)");
            grad.addColorStop(1, "rgb(255, 255, 255)");
          }
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = `rgb(${bgColor.r},${bgColor.g},${bgColor.b})`;
        }
        ctx.fillRect(0, 0, size.w, size.h);
      }
    } else if (format === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.w, size.h);
    }

    // 绘制照片（居中裁剪）
    const srcW = state.processedCanvas.width;
    const srcH = state.processedCanvas.height;
    const srcRatio = srcW / srcH;
    const targetRatio = size.w / size.h;

    let sx, sy, sw, sh;
    if (srcRatio > targetRatio) {
      sh = srcH;
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
      sy = 0;
    } else {
      sw = srcW;
      sh = srcW / targetRatio;
      sx = 0;
      sy = (srcH - sh) / 2;
    }

    ctx.drawImage(state.processedCanvas, sx, sy, sw, sh, 0, 0, size.w, size.h);

    // 导出
    const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
    const quality = format === "jpg" ? 0.95 : undefined;
    const dataUrl = exportCanvas.toDataURL(mimeType, quality);

    const link = document.createElement("a");
    link.download = `证件照_${size.name}_${size.w}x${size.h}.${format}`;
    link.href = dataUrl;
    link.click();

    showToast(`${format.toUpperCase()} 下载成功！`, "success");
  }

  // ---------- 打印排版 ----------
  function openPrintLayout() {
    if (!state.processedCanvas) return;

    const size = getSize();
    const photoW = size.w;
    const photoH = size.h;

    // 计算在 A4 上能排列多少张
    const gap = 20; // 间距（像素，约 1.7mm）
    const margin = 60; // 页边距（约 5mm）
    const availW = A4_W - margin * 2;
    const availH = A4_H - margin * 2;

    const cols = Math.floor((availW + gap) / (photoW + gap));
    const rows = Math.floor((availH + gap) / (photoH + gap));
    const total = cols * rows;

    // 设置打印 canvas
    els.printCanvas.width = A4_W;
    els.printCanvas.height = A4_H;
    const ctx = els.printCanvas.getContext("2d");

    // 白色背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, A4_W, A4_H);

    // 计算居中偏移
    const totalW = cols * photoW + (cols - 1) * gap;
    const totalH = rows * photoH + (rows - 1) * gap;
    const offsetX = margin + (availW - totalW) / 2;
    const offsetY = margin + (availH - totalH) / 2;

    // 准备单张照片
    const photoCanvas = document.createElement("canvas");
    photoCanvas.width = photoW;
    photoCanvas.height = photoH;
    const pCtx = photoCanvas.getContext("2d");

    // 填充背景
    if (state.currentBg !== "transparent") {
      const bgColor = BG_COLORS[state.currentBg];
      if (bgColor) {
        if (bgColor.grad) {
          const grad = pCtx.createLinearGradient(0, 0, 0, photoH);
          if (state.currentBg === "grad-blue") {
            grad.addColorStop(0, "rgb(67, 142, 219)");
            grad.addColorStop(1, "rgb(107, 163, 230)");
          } else {
            grad.addColorStop(0, "rgb(224, 224, 224)");
            grad.addColorStop(1, "rgb(255, 255, 255)");
          }
          pCtx.fillStyle = grad;
        } else {
          pCtx.fillStyle = `rgb(${bgColor.r},${bgColor.g},${bgColor.b})`;
        }
        pCtx.fillRect(0, 0, photoW, photoH);
      }
    } else {
      pCtx.fillStyle = "#ffffff";
      pCtx.fillRect(0, 0, photoW, photoH);
    }

    // 绘制照片到单张 canvas
    const srcW = state.processedCanvas.width;
    const srcH = state.processedCanvas.height;
    const srcRatio = srcW / srcH;
    const targetRatio = photoW / photoH;

    let sx, sy, sw, sh;
    if (srcRatio > targetRatio) {
      sh = srcH;
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
      sy = 0;
    } else {
      sw = srcW;
      sh = srcW / targetRatio;
      sx = 0;
      sy = (srcH - sh) / 2;
    }

    pCtx.drawImage(state.processedCanvas, sx, sy, sw, sh, 0, 0, photoW, photoH);

    // 排列到 A4
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * (photoW + gap);
        const y = offsetY + row * (photoH + gap);
        ctx.drawImage(photoCanvas, x, y);
      }
    }

    // 更新信息
    els.printInfo.textContent =
      `A4 纸排版：${cols}×${rows} = ${total} 张 · ${size.name} (${size.mmW}×${size.mmH}mm) · 300dpi`;

    // 显示弹窗
    els.printModal.classList.add("visible");
  }

  function closePrintModal() {
    els.printModal.classList.remove("visible");
  }

  function downloadPrintLayout() {
    const dataUrl = els.printCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "证件照_A4排版_300dpi.png";
    link.href = dataUrl;
    link.click();
    showToast("A4 排版图下载成功！", "success");
  }

  // ---------- 步骤指引 ----------
  function updateSteps() {
    if (!state.originalImage) {
      setActiveStep(0);
    } else if (!state.bgRemoved) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  }

  function setActiveStep(n) {
    els.steps.forEach((el, i) => {
      el.classList.toggle("active", i <= n);
    });
  }

  // ---------- Toast 通知 ----------
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---------- 加载状态 ----------
  function showLoading(text) {
    els.loadingText.textContent = text || "处理中...";
    els.loadingOverlay.classList.add("visible");
  }

  function hideLoading() {
    els.loadingOverlay.classList.remove("visible");
  }

  // ---------- 启动 ----------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
