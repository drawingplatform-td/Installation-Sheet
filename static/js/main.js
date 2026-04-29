import { createElements } from "./dom.js";
import { createAppState } from "./state.js";
import { formatFileSize, escapeHtml, getSeverityBadge, parseImageLinks, severityRank } from "./utils.js";
import * as api from "./api.js";
import { createImageController } from "./image-controller.js";
import { createHistoryController } from "./history-controller.js";
import { createFormController } from "./form-controller.js";

const elements = createElements(document);
const state = createAppState();

function setSubmitBusy(label) {
  elements.btnSubmit.disabled = true;
  elements.btnSubmit.innerText = label;
  elements.btnSubmit.classList.add("opacity-80", "cursor-not-allowed");
}

function resetSubmitState(
  label = elements.inspectionIdInput.value ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"
) {
  elements.btnSubmit.disabled = false;
  elements.btnSubmit.innerText = label;
  elements.btnSubmit.classList.remove("opacity-80", "cursor-not-allowed");
}

function showStatus(type, message) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-green-200 bg-green-50 text-green-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };

  elements.formStatus.className = `rounded-2xl border px-4 py-3 text-sm font-medium ${styles[type] || styles.info}`;
  elements.formStatus.textContent = message;
  elements.formStatus.classList.remove("hidden");
}

function clearStatus() {
  elements.formStatus.classList.add("hidden");
  elements.formStatus.textContent = "";
}

const imageController = createImageController({
  elements,
  state,
  formatFileSize,
  parseImageLinks,
  showStatus,
  clearStatus,
  resetSubmitState,
});

let historyController;

const formController = createFormController({
  elements,
  state,
  api,
  imageController,
  showStatus,
  clearStatus,
  setSubmitBusy,
  resetSubmitState,
  onReloadHistory: () => historyController.loadHistory(),
});

historyController = createHistoryController({
  elements,
  state,
  escapeHtml,
  getSeverityBadge,
  parseImageLinks,
  severityRank,
  api,
  showStatus,
  onEditRecord: (...args) => formController.editMode(...args),
  onSetMachineHistory: (data) => formController.setMachineHistory(data),
});

imageController.initialize();

elements.btnCamera.addEventListener("click", () => {
  elements.cameraInput.click();
});

elements.btnChooseFile.addEventListener("click", () => {
  elements.fileInput.click();
});

elements.cameraInput.addEventListener("change", () => {
  imageController.appendSelectedFiles(elements.cameraInput.files, "ถ่ายรูป");
});

elements.fileInput.addEventListener("change", () => {
  imageController.appendSelectedFiles(elements.fileInput.files, "เลือกไฟล์");
});

elements.clearSelectedImageBtn.addEventListener("click", () => {
  imageController.clearSelectedImages();
});

elements.machineInput.addEventListener("input", () => {
  formController.renderMachineHistorySuggestions();
});

elements.historyMachineFilter.addEventListener("change", () => {
  historyController.applyHistoryFilters();
});

elements.historySeverityFilter.addEventListener("change", () => {
  historyController.applyHistoryFilters();
});

elements.historySortOrder.addEventListener("change", () => {
  historyController.applyHistoryFilters();
});

elements.clearHistoryFiltersBtn.addEventListener("click", () => {
  historyController.resetHistoryFilters();
});

elements.btnRefreshHistory.addEventListener("click", () => {
  historyController.loadHistory();
});

elements.btnExport.addEventListener("click", () => {
  historyController.exportToExcel();
});

elements.btnCancel.addEventListener("click", () => {
  formController.resetForm();
});

elements.form.addEventListener("submit", (event) => {
  formController.handleSubmit(event);
});

window.addEventListener("load", () => {
  historyController.loadHistory();
});
