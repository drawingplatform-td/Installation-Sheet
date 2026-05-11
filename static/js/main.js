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

function showToast(type, message, duration = 2800) {
  const styles = {
    info: "toast-info",
    success: "toast-success",
    error: "toast-error",
    warning: "toast-warning",
  };

  if (!elements.toastStack) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast-item ${styles[type] || styles.info}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("toast-exit");
    window.setTimeout(() => {
      toast.remove();
    }, 220);
  }, duration);
}

const imageController = createImageController({
  elements,
  state,
  formatFileSize,
  parseImageLinks,
  showStatus,
  clearStatus,
  showToast,
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
  showToast,
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
  showToast,
  onEditRecord: (...args) => formController.editMode(...args),
  onSetMachineHistory: (data) => formController.setMachineHistory(data),
});

imageController.initialize();

function getCurrentProject() {
  return state.projects.find((project) => project.id === state.currentProjectId) || null;
}

function updateProjectTitle() {
  const currentProject = getCurrentProject();
  const projectName = currentProject ? currentProject.name : "Project";
  elements.pageTitle.textContent = `Machine Inspection - ${projectName}`;
  document.title = `Machine Inspection - ${projectName}`;
  elements.projectCurrentName.textContent = projectName;
}

function closeProjectDropdown() {
  elements.projectDropdownMenu.classList.add("hidden");
  elements.projectDropdownButton.setAttribute("aria-expanded", "false");
}

function toggleProjectDropdown() {
  const isOpen = !elements.projectDropdownMenu.classList.contains("hidden");
  elements.projectDropdownMenu.classList.toggle("hidden", isOpen);
  elements.projectDropdownButton.setAttribute("aria-expanded", String(!isOpen));
}

function renderProjectOptions() {
  elements.projectOptionsList.innerHTML = "";
  state.projects.forEach((project) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "project-option-btn";
    optionButton.dataset.projectId = project.id;
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("aria-selected", String(project.id === state.currentProjectId));
    optionButton.textContent = project.name;
    optionButton.addEventListener("click", () => {
      closeProjectDropdown();
      setCurrentProject(project.id);
    });
    elements.projectOptionsList.appendChild(optionButton);
  });
}

function setCurrentProject(projectId, reloadHistory = true) {
  state.currentProjectId = projectId || (state.projects[0] && state.projects[0].id) || "";
  updateProjectTitle();
  renderProjectOptions();

  if (reloadHistory) {
    formController.resetForm();
    elements.projectIdInput.value = state.currentProjectId;
    historyController.resetHistoryFilters();
    historyController.loadHistory();
    return;
  }

  elements.projectIdInput.value = state.currentProjectId;
}

async function loadProjects(preferredProjectId = "") {
  const result = await api.fetchProjects();
  if (!result.success) {
    showToast("error", `Unable to load projects: ${result.message}`);
    return;
  }

  state.projects = [].concat(result.data || []);
  const preferredExists = state.projects.some((project) => project.id === preferredProjectId);
  const currentExists = state.projects.some((project) => project.id === state.currentProjectId);
  const defaultExists = state.projects.some((project) => project.id === result.current_project_id);
  const nextProjectId = preferredExists
    ? preferredProjectId
    : currentExists
      ? state.currentProjectId
      : defaultExists
        ? result.current_project_id
        : (state.projects[0] && state.projects[0].id) || "";

  renderProjectOptions();
  setCurrentProject(nextProjectId, false);
}

async function createNewProject() {
  const projectName = prompt("Project name?");
  if (!projectName || !projectName.trim()) {
    return;
  }

  const result = await api.createProject(projectName.trim());
  if (!result.success) {
    showToast("error", `Unable to create project: ${result.message}`);
    return;
  }

  showToast("success", `Created project "${result.project.name}"`);
  await loadProjects(result.project.id);
  setCurrentProject(result.project.id);
}

async function renameCurrentProject() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    return;
  }

  const projectName = prompt("New project name?", currentProject.name);
  if (!projectName || !projectName.trim()) {
    return;
  }

  const nextProjectName = projectName.trim();
  if (nextProjectName === currentProject.name) {
    return;
  }

  const result = await api.renameProject(currentProject.id, nextProjectName);
  if (!result.success) {
    showToast("error", `Unable to rename project: ${result.message}`);
    return;
  }

  showToast("success", `Renamed project to "${result.project.name}"`);
  await loadProjects(result.project.id);
  setCurrentProject(result.project.id, false);
}

async function deleteCurrentProject() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    return;
  }

  if (!confirm(`Delete project "${currentProject.name}"?`)) {
    return;
  }

  const result = await api.deleteProject(currentProject.id);
  if (!result.success) {
    showToast("error", `Unable to delete project: ${result.message}`);
    return;
  }

  showToast("success", `Deleted project "${currentProject.name}"`);
  await loadProjects();
  setCurrentProject(state.currentProjectId);
}

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

elements.projectDropdownButton.addEventListener("click", () => {
  toggleProjectDropdown();
});

document.addEventListener("click", (event) => {
  const clickedInsideProjectPicker =
    elements.projectDropdownButton.contains(event.target) || elements.projectDropdownMenu.contains(event.target);
  if (!clickedInsideProjectPicker) {
    closeProjectDropdown();
  }
});

elements.addProjectBtn.addEventListener("click", () => {
  createNewProject();
});

elements.renameProjectBtn.addEventListener("click", () => {
  closeProjectDropdown();
  renameCurrentProject();
});

elements.deleteProjectBtn.addEventListener("click", () => {
  closeProjectDropdown();
  deleteCurrentProject();
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

elements.loadMoreBtn.addEventListener("click", () => {
  historyController.loadMoreHistory();
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
  loadProjects().then(() => historyController.loadHistory());
});
