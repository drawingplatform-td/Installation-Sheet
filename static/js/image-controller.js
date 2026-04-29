const MAX_IMAGE_DIMENSION = 1600;
const TARGET_UPLOAD_SIZE_BYTES = 350 * 1024;
const JPEG_QUALITY_STEPS = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54];
const MIN_DIMENSION_FLOOR = 720;

export function createImageController({
  elements,
  state,
  formatFileSize,
  parseImageLinks,
  showStatus,
  clearStatus,
  resetSubmitState,
}) {
  function getExistingUrls() {
    return parseImageLinks(elements.existingUrlInput.value);
  }

  function getActiveExistingUrls() {
    const removedMap = {};
    state.removedExistingImages.forEach((url) => {
      removedMap[url] = true;
    });

    return getExistingUrls().filter((url) => !removedMap[url]);
  }

  function syncRemovedImagesInput() {
    elements.removedImagesInput.value = JSON.stringify(state.removedExistingImages);
  }

  function makeFileKey(file) {
    return [file.name || "", file.size || 0, file.lastModified || 0].join("::");
  }

  function revokeLocalPreviewUrls() {
    state.localPreviewUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    state.localPreviewUrls = [];
  }

  function clearInputBuffers() {
    elements.cameraInput.value = "";
    elements.fileInput.value = "";

    if (typeof DataTransfer !== "undefined") {
      const emptyTransfer = new DataTransfer();
      elements.fileInput.files = emptyTransfer.files;
      elements.cameraInput.files = emptyTransfer.files;
    }
  }

  function renderPreviewGallery(items, title, meta, isSelectedFile) {
    if (!items || items.length === 0) {
      hidePreviewGallery();
      return;
    }

    elements.imagePreviewTitle.textContent = title;
    elements.imagePreviewMeta.textContent = meta;
    elements.imagePreviewGrid.innerHTML = "";

    items.forEach((item, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "relative overflow-hidden rounded-2xl border border-slate-200 bg-white";

      const imageHolder = document.createElement(item.fullUrl ? "a" : "div");
      imageHolder.className = "block";

      if (item.fullUrl) {
        imageHolder.href = item.fullUrl;
        imageHolder.target = "_blank";
        imageHolder.rel = "noopener noreferrer";
      }

      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.label || `Inspection image ${index + 1}`;
      image.className = "h-32 w-full object-cover";
      imageHolder.appendChild(image);
      wrapper.appendChild(imageHolder);

      if (item.badge) {
        const badge = document.createElement("div");
        badge.className = "absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600 shadow";
        badge.textContent = item.badge;
        wrapper.appendChild(badge);
      }

      if (item.onRemove) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-bold text-white shadow hover:bg-rose-700";
        removeBtn.textContent = "ลบรูป";
        removeBtn.addEventListener("click", item.onRemove);
        wrapper.appendChild(removeBtn);
      }

      elements.imagePreviewGrid.appendChild(wrapper);
    });

    elements.imagePreviewCard.classList.remove("hidden");
    elements.clearSelectedImageBtn.classList.toggle("hidden", !isSelectedFile);
  }

  function hidePreviewGallery() {
    elements.imagePreviewGrid.innerHTML = "";
    elements.imagePreviewCard.classList.add("hidden");
    elements.clearSelectedImageBtn.classList.add("hidden");
  }

  function removeExistingImage(url) {
    if (!url) {
      return;
    }

    if (state.removedExistingImages.indexOf(url) === -1) {
      state.removedExistingImages.push(url);
    }

    syncRemovedImagesInput();
    updateFileHint();
    renderSelectedPreview();

    const remainingCount = getActiveExistingUrls().length;
    showStatus(
      "warning",
      remainingCount > 0
        ? `ลบรูปเดิมออกจากรายการแล้ว เหลือ ${remainingCount} รูป`
        : "ลบรูปเดิมออกจากรายการทั้งหมดแล้ว"
    );
  }

  function renderSelectedPreview() {
    revokeLocalPreviewUrls();

    const existingItems = getActiveExistingUrls().map((url, index) => ({
      src: url,
      fullUrl: url,
      label: `รูปเดิม ${index + 1}`,
      badge: "รูปเดิม",
      onRemove: elements.inspectionIdInput.value ? () => removeExistingImage(url) : null,
    }));

    const newItems = state.selectedFiles.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      state.localPreviewUrls.push(previewUrl);
      return {
        src: previewUrl,
        fullUrl: previewUrl,
        label: file.name || `รูปใหม่ ${index + 1}`,
        badge: "รูปใหม่",
      };
    });

    const items = existingItems.concat(newItems);
    if (items.length === 0) {
      hidePreviewGallery();
      return;
    }

    const metaParts = [];
    if (existingItems.length > 0) {
      metaParts.push(`รูปเดิม ${existingItems.length} รูป`);
    }
    if (newItems.length > 0) {
      metaParts.push(`รูปใหม่ ${newItems.length} รูป`);
    }

    renderPreviewGallery(
      items,
      elements.inspectionIdInput.value ? "รูปที่จะใช้หลังบันทึก" : "ตัวอย่างรูปก่อนอัปโหลด",
      metaParts.join(" • "),
      newItems.length > 0
    );
  }

  function updateFileHint() {
    const existingCount = getActiveExistingUrls().length;

    if (state.selectedFiles.length > 0) {
      const totalSize = state.selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      elements.fileHint.textContent =
        `เลือกรูปใหม่ ${state.selectedFiles.length} รูป (${formatFileSize(totalSize)})` +
        (existingCount > 0 ? ` และจะเก็บรูปเดิมอีก ${existingCount} รูป` : "");
      elements.fileHint.className = "mt-2 text-xs text-blue-700 font-medium";
      return;
    }

    if (existingCount > 0) {
      elements.fileHint.textContent = `ยังไม่ได้เลือกรูปใหม่ ระบบจะใช้รูปเดิม ${existingCount} รูป ของรายการนี้`;
      elements.fileHint.className = "mt-2 text-xs text-slate-500";
      return;
    }

    elements.fileHint.textContent = "ยังไม่ได้เลือกรูปใหม่ สามารถบันทึกข้อมูลได้แม้ไม่มีรูป";
    elements.fileHint.className = "mt-2 text-xs text-slate-500";
  }

  async function getImageDimensionsFromFile(file) {
    return new Promise((resolve, reject) => {
      const previewUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = function onLoad() {
        URL.revokeObjectURL(previewUrl);
        resolve({
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
        });
      };

      image.onerror = function onError() {
        URL.revokeObjectURL(previewUrl);
        reject(new Error("อ่านขนาดรูปไม่สำเร็จ"));
      };

      image.src = previewUrl;
    });
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
      reader.readAsDataURL(file);
    });
  }

  async function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("โหลดรูปเพื่อย่อขนาดไม่สำเร็จ"));
      image.src = src;
    });
  }

  async function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("สร้างไฟล์รูปที่ย่อแล้วไม่สำเร็จ"));
      }, mimeType, quality);
    });
  }

  function drawResizedImageToCanvas(image, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("เบราว์เซอร์ไม่รองรับการย่อรูปในหน้านี้");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  function canvasHasTransparency(canvas) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return false;
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < imageData.length; i += 4) {
      if (imageData[i] < 255) {
        return true;
      }
    }

    return false;
  }

  function makeUploadFileName(file, extension) {
    const baseName = String(file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.\-() ]/g, "_");
    return `${baseName}.${extension}`;
  }

  async function prepareUploadFile(file) {
    if (file.type === "image/gif") {
      const gifDimensions = await getImageDimensionsFromFile(file);
      return {
        file,
        originalSize: file.size || 0,
        compressedSize: file.size || 0,
        width: gifDimensions.width || 0,
        height: gifDimensions.height || 0,
        skippedCompression: true,
        note: "ใช้ GIF ต้นฉบับเพื่อรักษาภาพเคลื่อนไหว",
      };
    }

    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImageElement(originalDataUrl);
    let targetWidth = image.naturalWidth || image.width || 1;
    let targetHeight = image.naturalHeight || image.height || 1;
    const mayContainTransparency = file.type === "image/png" || file.type === "image/webp";

    if (
      file.size <= TARGET_UPLOAD_SIZE_BYTES &&
      targetWidth <= MAX_IMAGE_DIMENSION &&
      targetHeight <= MAX_IMAGE_DIMENSION
    ) {
      return {
        file,
        originalSize: file.size || 0,
        compressedSize: file.size || 0,
        width: targetWidth,
        height: targetHeight,
        skippedCompression: true,
        note: "ไฟล์เล็กอยู่แล้ว จึงข้ามการบีบอัดเพื่อให้อัปโหลดเร็วขึ้น",
      };
    }

    if (targetWidth > MAX_IMAGE_DIMENSION || targetHeight > MAX_IMAGE_DIMENSION) {
      const scale = Math.min(MAX_IMAGE_DIMENSION / targetWidth, MAX_IMAGE_DIMENSION / targetHeight);
      targetWidth = Math.max(1, Math.round(targetWidth * scale));
      targetHeight = Math.max(1, Math.round(targetHeight * scale));
    }

    let currentWidth = targetWidth;
    let currentHeight = targetHeight;

    while (true) {
      const canvas = drawResizedImageToCanvas(image, currentWidth, currentHeight);
      const hasTransparency = mayContainTransparency && canvasHasTransparency(canvas);

      if (hasTransparency) {
        const pngBlob = await canvasToBlob(canvas, "image/png");
        if (
          pngBlob.size <= TARGET_UPLOAD_SIZE_BYTES ||
          (currentWidth <= MIN_DIMENSION_FLOOR && currentHeight <= MIN_DIMENSION_FLOOR)
        ) {
          return {
            file: new File([pngBlob], makeUploadFileName(file, "png"), {
              type: "image/png",
              lastModified: Date.now(),
            }),
            originalSize: file.size || 0,
            compressedSize: pngBlob.size || 0,
            width: currentWidth,
            height: currentHeight,
            skippedCompression: false,
            note: "เก็บ transparency ไว้โดยบันทึกเป็น PNG",
          };
        }

        currentWidth = Math.max(1, Math.round(currentWidth * 0.88));
        currentHeight = Math.max(1, Math.round(currentHeight * 0.88));
        continue;
      }

      let jpegBlob = null;
      for (let index = 0; index < JPEG_QUALITY_STEPS.length; index += 1) {
        jpegBlob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY_STEPS[index]);
        if (jpegBlob.size <= TARGET_UPLOAD_SIZE_BYTES) {
          break;
        }
      }

      if (
        jpegBlob &&
        (jpegBlob.size <= TARGET_UPLOAD_SIZE_BYTES ||
          (currentWidth <= MIN_DIMENSION_FLOOR && currentHeight <= MIN_DIMENSION_FLOOR))
      ) {
        return {
          file: new File([jpegBlob], makeUploadFileName(file, "jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
          originalSize: file.size || 0,
          compressedSize: jpegBlob.size || 0,
          width: currentWidth,
          height: currentHeight,
          skippedCompression: false,
          note: "ย่อและบีบอัดรูปก่อนอัปโหลด",
        };
      }

      currentWidth = Math.max(1, Math.round(currentWidth * 0.88));
      currentHeight = Math.max(1, Math.round(currentHeight * 0.88));
    }
  }

  function replaceFilesForSubmit(files) {
    if (typeof DataTransfer === "undefined") {
      throw new Error("เบราว์เซอร์นี้ไม่รองรับการเตรียมไฟล์หลายรูปก่อนอัปโหลด");
    }

    const transfer = new DataTransfer();
    [].concat(files || []).forEach((file) => transfer.items.add(file));
    elements.fileInput.files = transfer.files;
  }

  function appendSelectedFiles(fileList, sourceLabel) {
    const incomingFiles = Array.from(fileList || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const knownKeys = {};
    state.selectedFiles.forEach((file) => {
      knownKeys[makeFileKey(file)] = true;
    });

    const uniqueIncoming = incomingFiles.filter((file) => {
      const key = makeFileKey(file);
      if (knownKeys[key]) {
        return false;
      }

      knownKeys[key] = true;
      return true;
    });

    clearInputBuffers();

    if (uniqueIncoming.length === 0) {
      showStatus("warning", "ไฟล์ที่เลือกซ้ำกับรูปที่มีอยู่แล้ว");
      return;
    }

    state.selectedFiles = state.selectedFiles.concat(uniqueIncoming);
    elements.previewText.classList.add("hidden");
    syncRemovedImagesInput();
    updateFileHint();
    renderSelectedPreview();
    showStatus("info", `${sourceLabel} เพิ่มแล้ว ${uniqueIncoming.length} รูป รวมทั้งหมด ${state.selectedFiles.length} รูป`);
  }

  function clearSelectedImages() {
    state.selectedFiles = [];
    revokeLocalPreviewUrls();
    clearInputBuffers();
    syncRemovedImagesInput();
    updateFileHint();

    if (getActiveExistingUrls().length > 0) {
      elements.previewText.classList.remove("hidden");
      elements.previewText.textContent = "กำลังใช้รูปเดิมของรายการนี้";
    } else {
      elements.previewText.classList.add("hidden");
    }

    renderSelectedPreview();
    clearStatus();
    resetSubmitState();
  }

  async function prepareFilesForSubmit(onProgress) {
    const preparedEntries = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let skippedCompressionCount = 0;

    for (let index = 0; index < state.selectedFiles.length; index += 1) {
      if (onProgress) {
        onProgress(index + 1, state.selectedFiles.length);
      }

      const prepared = await prepareUploadFile(state.selectedFiles[index]);
      preparedEntries.push(prepared);
      totalOriginalSize += prepared.originalSize || 0;
      totalCompressedSize += prepared.compressedSize || 0;

      if (prepared.skippedCompression) {
        skippedCompressionCount += 1;
      }
    }

    replaceFilesForSubmit(preparedEntries.map((item) => item.file));
    renderSelectedPreview();

    return {
      preparedEntries,
      totalOriginalSize,
      totalCompressedSize,
      skippedCompressionCount,
    };
  }

  function setExistingImages(imageLinks) {
    state.selectedFiles = [];
    revokeLocalPreviewUrls();
    clearInputBuffers();
    elements.existingUrlInput.value = imageLinks || "";
    state.removedExistingImages = [];
    syncRemovedImagesInput();
    updateFileHint();
    renderSelectedPreview();
  }

  function resetForNewForm() {
    state.selectedFiles = [];
    state.removedExistingImages = [];
    revokeLocalPreviewUrls();
    clearInputBuffers();
    elements.existingUrlInput.value = "";
    syncRemovedImagesInput();
    elements.previewText.classList.add("hidden");
    hidePreviewGallery();
    updateFileHint();
  }

  function initialize() {
    syncRemovedImagesInput();
    updateFileHint();
  }

  return {
    appendSelectedFiles,
    clearSelectedImages,
    getActiveExistingUrls,
    initialize,
    prepareFilesForSubmit,
    renderSelectedPreview,
    resetForNewForm,
    setExistingImages,
    state,
    updateFileHint,
  };
}
