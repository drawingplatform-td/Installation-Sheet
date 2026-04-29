export function createFormController({
  elements,
  state,
  api,
  imageController,
  showStatus,
  clearStatus,
  setSubmitBusy,
  resetSubmitState,
  onReloadHistory,
}) {
  function getSubmitLabel() {
    return elements.inspectionIdInput.value ? "อัปเดตข้อมูล" : "บันทึกข้อมูล";
  }

  function updateSubmitAppearance() {
    resetSubmitState(getSubmitLabel());
  }

  function setMachineHistory(data) {
    const seen = {};
    state.machineHistory = [].concat(data || []).reduce((result, item) => {
      const machineName = String((item && item.machine) || "").trim();
      const key = machineName.toLowerCase();
      if (!machineName || seen[key]) {
        return result;
      }

      seen[key] = true;
      result.push(machineName);
      return result;
    }, []);

    renderMachineHistorySuggestions();
  }

  function renderMachineHistorySuggestions() {
    const query = String(elements.machineInput.value || "").trim().toLowerCase();
    const filteredMachines = state.machineHistory
      .filter((machineName) => !query || machineName.toLowerCase().indexOf(query) !== -1)
      .slice(0, 8);

    elements.machineHistoryList.innerHTML = "";
    if (filteredMachines.length === 0) {
      elements.machineHistoryWrap.classList.add("hidden");
      return;
    }

    filteredMachines.forEach((machineName) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";
      button.textContent = machineName;
      button.addEventListener("click", () => {
        elements.machineInput.value = machineName;
        elements.machineInput.focus();
        renderMachineHistorySuggestions();
      });
      elements.machineHistoryList.appendChild(button);
    });

    elements.machineHistoryWrap.classList.remove("hidden");
  }

  async function submitToServer() {
    const formData = new FormData(elements.form);
    const result = await api.submitInspection(formData);

    if (result.success) {
      afterSave(result.message);
      return;
    }

    handleServerFailure(new Error(result.message));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (state.selectedFiles.length > 0) {
      try {
        const preparation = await imageController.prepareFilesForSubmit((index, total) => {
          setSubmitBusy(`กำลังเตรียมรูป ${index}/${total}...`);
          showStatus("info", `กำลังเตรียมรูป ${index}/${total}`);
        });

        const { preparedEntries, totalOriginalSize, totalCompressedSize, skippedCompressionCount } = preparation;
        elements.imagePreviewMeta.textContent =
          `รูปใหม่ ${preparedEntries.length} รูป • ${formatBytes(totalOriginalSize)} -> ${formatBytes(totalCompressedSize)}` +
          (imageController.getActiveExistingUrls().length > 0
            ? ` • รูปเดิมคงไว้ ${imageController.getActiveExistingUrls().length} รูป`
            : "") +
          (skippedCompressionCount > 0 ? ` • ข้ามการบีบอัด ${skippedCompressionCount} รูป` : "");

        setSubmitBusy("กำลังอัปโหลดรูป...");
        showStatus("info", `กำลังอัปโหลดรูป ${preparedEntries.length} ไฟล์และบันทึกข้อมูล`);
        await submitToServer();
      } catch (error) {
        showStatus("error", error && error.message ? error.message : "เตรียมรูปก่อนอัปโหลดไม่สำเร็จ");
        updateSubmitAppearance();
      }
      return;
    }

    setSubmitBusy("กำลังบันทึกข้อมูล...");
    showStatus("info", "กำลังบันทึกข้อมูล");
    try {
      await submitToServer();
    } catch (error) {
      handleServerFailure(error);
    }
  }

  function formatBytes(bytes) {
    if (!bytes) {
      return "0 B";
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function afterSave(message) {
    showStatus("success", message || (elements.inspectionIdInput.value ? "อัปเดตรายการเรียบร้อยแล้ว" : "บันทึกรายการเรียบร้อยแล้ว"));
    resetForm(true);
    onReloadHistory();
  }

  function handleServerFailure(error) {
    const message = error && error.message ? error.message : String(error || "Unknown server error");
    showStatus("error", `ระบบไม่สามารถบันทึกข้อมูลได้: ${message}`);
    updateSubmitAppearance();
  }

  function editMode(id, machine, imageLinks, issue, severity, remark) {
    state.selectedFiles = [];
    elements.inspectionIdInput.value = id;
    elements.machineInput.value = machine;
    elements.issueInput.value = issue;
    elements.remarkInput.value = remark;
    document.querySelectorAll('input[name="severity"]').forEach((input) => {
      input.checked = input.value === (severity || "");
    });

    imageController.setExistingImages(imageLinks);

    elements.btnSubmit.innerText = "อัปเดตข้อมูล";
    elements.btnSubmit.className =
      "flex-1 bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-2xl font-bold text-lg shadow-lg transition";
    elements.btnCancel.classList.remove("hidden");

    if (imageController.getActiveExistingUrls().length > 0) {
      elements.previewText.classList.remove("hidden");
      elements.previewText.textContent = "เลือกลบรูปเดิมได้ หรือเพิ่มรูปใหม่เข้ามารวมกับของเดิมได้";
    } else {
      elements.previewText.classList.add("hidden");
    }

    imageController.updateFileHint();
    imageController.renderSelectedPreview();
    showStatus("warning", "กำลังแก้ไขรายการเดิม คุณสามารถลบรูปเดิมบางรูป หรือเพิ่มรูปใหม่โดยไม่ทับรูปเดิมได้");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm(preserveStatus = false) {
    elements.form.reset();
    imageController.resetForNewForm();
    elements.inspectionIdInput.value = "";
    elements.btnSubmit.innerText = "บันทึกข้อมูล";
    elements.btnSubmit.className =
      "flex-1 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold text-lg shadow-lg transition active:scale-95";
    elements.btnCancel.classList.add("hidden");
    updateSubmitAppearance();

    if (!preserveStatus) {
      clearStatus();
    }
  }

  return {
    editMode,
    handleSubmit,
    renderMachineHistorySuggestions,
    resetForm,
    setMachineHistory,
  };
}
