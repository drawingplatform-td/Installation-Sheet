export function createHistoryController({
  elements,
  state,
  escapeHtml,
  getSeverityBadge,
  parseImageLinks,
  severityRank,
  api,
  showStatus,
  showToast,
  onEditRecord,
  onSetMachineHistory,
}) {
  const pageSize = Number(state.historyPageSize) > 0 ? Number(state.historyPageSize) : 8;

  initializeImageModal();

  function confirmEditAction(machineName) {
    const label = String(machineName || "").trim();
    return confirm(
      label
        ? `Are you sure you want to edit the record for "${label}"?`
        : "Are you sure you want to edit this record?"
    );
  }

  function confirmDeleteAction() {
    return confirm("Are you sure you want to delete this record?");
  }

  function confirmExportExcelAction() {
    return confirm("คุณแน่ใจหรือว่าต้องการ Export Excel?");
  }


  function initializeImageModal() {
    if (!elements.imageModal) {
      return;
    }

    elements.imageModalBackdrop.addEventListener("click", closeImageModal);
    elements.imageModalCloseBtn.addEventListener("click", closeImageModal);
    elements.imageModalImage.addEventListener("error", handleModalImageError);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.imageModal.classList.contains("hidden")) {
        closeImageModal();
      }
    });
  }

  function normalizeImageSrc(src) {
    const value = String(src || "").trim();
    if (!value) {
      return "";
    }

    try {
      return encodeURI(value);
    } catch (error) {
      return value;
    }
  }

  function handleModalImageError() {
    const currentSrc = String(elements.imageModalImage.getAttribute("src") || "");
    const fallbackSrc = currentSrc.replace(/%25/g, "%");

    if (fallbackSrc && fallbackSrc !== currentSrc) {
      elements.imageModalImage.setAttribute("src", fallbackSrc);
      return;
    }

    elements.imageModalCaption.textContent = "Unable to preview this image";
    showToast("error", "Preview image could not be loaded");
  }

  function openImageModal(src, caption) {
    if (!elements.imageModal) {
      return;
    }

    elements.imageModalImage.setAttribute("src", normalizeImageSrc(src));
    elements.imageModalCaption.textContent = caption || "";
    elements.imageModal.classList.remove("hidden");
    elements.imageModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeImageModal() {
    if (!elements.imageModal) {
      return;
    }

    elements.imageModal.classList.add("hidden");
    elements.imageModal.setAttribute("aria-hidden", "true");
    elements.imageModalImage.removeAttribute("src");
    elements.imageModalCaption.textContent = "";
    document.body.classList.remove("modal-open");
  }

  function updateHistoryMachineFilterOptions(data) {
    const currentValue = elements.historyMachineFilter.value;
    const seen = {};
    const machineNames = []
      .concat(data || [])
      .reduce((result, item) => {
        const machineName = String((item && item.machine) || "").trim();
        const key = machineName.toLowerCase();
        if (!machineName || seen[key]) {
          return result;
        }

        seen[key] = true;
        result.push(machineName);
        return result;
      }, [])
      .sort((left, right) => left.localeCompare(right, "th"));

    elements.historyMachineFilter.innerHTML = '<option value="">All</option>';
    machineNames.forEach((machineName) => {
      const option = document.createElement("option");
      option.value = machineName;
      option.textContent = machineName;
      elements.historyMachineFilter.appendChild(option);
    });

    elements.historyMachineFilter.value = machineNames.indexOf(currentValue) !== -1 ? currentValue : "";
  }

  function getFilteredAndSortedHistory() {
    const machineFilterValue = String(elements.historyMachineFilter.value || "").trim().toLowerCase();
    const severityFilterValue = String(elements.historySeverityFilter.value || "").trim();
    const sortOrderValue = elements.historySortOrder.value || "latest";

    const filtered = state.historyData.filter((item) => {
      const machineName = String((item && item.machine) || "").trim().toLowerCase();
      const severity = String((item && item.severity) || "").trim();

      if (machineFilterValue && machineName !== machineFilterValue) {
        return false;
      }

      if (severityFilterValue && severity !== severityFilterValue) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      const leftMachine = String((left && left.machine) || "");
      const rightMachine = String((right && right.machine) || "");
      const leftSeverity = severityRank(left && left.severity);
      const rightSeverity = severityRank(right && right.severity);
      const leftTime = left && left.timestamp ? new Date(left.timestamp).getTime() : 0;
      const rightTime = right && right.timestamp ? new Date(right.timestamp).getTime() : 0;

      if (sortOrderValue === "machine-asc") {
        return (
          leftMachine.localeCompare(rightMachine, "th") ||
          (rightSeverity - leftSeverity) ||
          (rightTime - leftTime)
        );
      }

      if (sortOrderValue === "machine-desc") {
        return (
          rightMachine.localeCompare(leftMachine, "th") ||
          (rightSeverity - leftSeverity) ||
          (rightTime - leftTime)
        );
      }

      if (sortOrderValue === "severity-asc") {
        return (leftSeverity - rightSeverity) || (rightTime - leftTime);
      }

      if (sortOrderValue === "severity-desc") {
        return (rightSeverity - leftSeverity) || (rightTime - leftTime);
      }

      return rightTime - leftTime;
    });

    return filtered;
  }

  function getSeverityBucket(severity) {
    const rank = severityRank(severity);
    if (rank === 3) {
      return "high";
    }
    if (rank === 2) {
      return "medium";
    }
    if (rank === 1) {
      return "low";
    }
    return "other";
  }

  function buildMachineSeveritySummary(data) {
    const summaryMap = {};

    [].concat(data || []).forEach((item) => {
      const machineName = String((item && item.machine) || "-").trim() || "-";
      const key = machineName.toLowerCase();

      if (!summaryMap[key]) {
        summaryMap[key] = {
          machine: machineName,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
          other: 0,
        };
      }

      const entry = summaryMap[key];
      const severityKey = getSeverityBucket(item && item.severity);
      entry.total += 1;
      entry[severityKey] += 1;
    });

    const summaryItems = Object.keys(summaryMap).map((key) => summaryMap[key]);
    const sortOrderValue = elements.historySortOrder.value || "latest";
    summaryItems.sort((left, right) => {
      const comparison = left.machine.localeCompare(right.machine, "th");
      return sortOrderValue === "machine-desc" ? -comparison : comparison;
    });

    return summaryItems;
  }

  function renderMachineSeveritySummary(data) {
    if (!elements.machineSeveritySummary) {
      return;
    }

    const summaryItems = buildMachineSeveritySummary(data);
    if (summaryItems.length === 0) {
      elements.machineSeveritySummary.innerHTML =
        '<div class="machine-summary-empty">No records to summarize</div>';
      return;
    }

    const totalRecords = summaryItems.reduce((sum, item) => sum + item.total, 0);
    const cardsHtml = summaryItems
      .map((item) => {
        const otherHtml =
          item.other > 0
            ? `<span class="machine-summary-pill machine-summary-other">Other ${item.other}</span>`
            : "";
        const safeMachine = escapeHtml(item.machine);

        return `
          <button type="button" class="machine-summary-card" data-summary-machine="${safeMachine}">
            <div class="machine-summary-machine">${safeMachine}</div>
            <div class="machine-summary-count">Total ${item.total}</div>
            <div class="machine-summary-pills">
              <span class="machine-summary-pill machine-summary-high">High ${item.high}</span>
              <span class="machine-summary-pill machine-summary-medium">Medium ${item.medium}</span>
              <span class="machine-summary-pill machine-summary-low">Low ${item.low}</span>
              ${otherHtml}
            </div>
          </button>
        `;
      })
      .join("");

    elements.machineSeveritySummary.innerHTML = `
      <div class="machine-summary-header">
        <div>
          <div class="machine-summary-title">Machine Summary</div>
          <div class="machine-summary-subtitle">Counts by severity from current filters</div>
        </div>
        <div class="machine-summary-total">${totalRecords} record(s)</div>
      </div>
      <div class="machine-summary-grid">${cardsHtml}</div>
    `;

    elements.machineSeveritySummary.querySelectorAll(".machine-summary-card").forEach((card) => {
      card.addEventListener("click", () => {
        elements.historyMachineFilter.value = card.getAttribute("data-summary-machine") || "";
        applyHistoryFilters();
      });
    });
  }

  function buildImageGalleryHtml(urls, imageClass, wrapperClass, maxVisible, machineName, groupId) {
    if (!urls || urls.length === 0) {
      return '<div class="rounded-xl border border-dashed border-slate-200 p-4 text-xs italic text-slate-300">No images</div>';
    }

    const safeGroupId = escapeHtml(groupId || "history-images");
    const itemsHtml = urls
      .map((url, index) => {
        const safeUrl = escapeHtml(url);
        const extraClass = index >= maxVisible ? " history-extra-image hidden" : "";
        const caption = escapeHtml(`${machineName || "Inspection"} - image ${index + 1}`);
        return (
          `<button type="button" class="${wrapperClass} history-image-trigger${extraClass}" data-image-group="${safeGroupId}" data-preview-src="${safeUrl}" data-preview-caption="${caption}">` +
          `<img src="${safeUrl}" alt="Inspection image ${index + 1}" class="${imageClass}" loading="lazy">` +
          "</button>"
        );
      })
      .join("");

    const showAllButton =
      urls.length > maxVisible
        ? `<button type="button" class="history-show-all-images flex min-h-20 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100" data-image-group="${safeGroupId}">Show all<br>+${urls.length - maxVisible}</button>`
        : "";

    return itemsHtml + showAllButton;
  }

  function attachImagePreviewActions() {
    document.querySelectorAll(".history-show-all-images").forEach((button) => {
      button.addEventListener("click", () => {
        const groupId = button.getAttribute("data-image-group") || "";
        document.querySelectorAll(".history-extra-image").forEach((imageButton) => {
          if (imageButton.getAttribute("data-image-group") === groupId) {
            imageButton.classList.remove("hidden");
          }
        });
        button.remove();
      });
    });

    document.querySelectorAll(".history-image-trigger").forEach((button) => {
      button.addEventListener("click", () => {
        openImageModal(
          button.getAttribute("data-preview-src") || "",
          button.getAttribute("data-preview-caption") || ""
        );
      });
    });
  }

  function attachRowActions() {
    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const machine = button.getAttribute("data-machine");
        if (!confirmEditAction(machine)) {
          return;
        }

        onEditRecord(
          button.getAttribute("data-id"),
          button.getAttribute("data-machine"),
          button.getAttribute("data-links"),
          button.getAttribute("data-issue"),
          button.getAttribute("data-severity"),
          button.getAttribute("data-remark")
        );
      });
    });

    document.querySelectorAll(".history-delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirmDeleteAction()) {
          return;
        }

        const machineName = String(button.getAttribute("data-machine") || "").trim();

        try {
          const result = await api.deleteInspectionRecord(button.getAttribute("data-id"), state.currentProjectId);
          if (result.success) {
            showStatus("success", "Record deleted successfully");
            showToast(
              "success",
              machineName ? `Deleted "${machineName}" successfully` : "Deleted record successfully"
            );
            await loadHistory();
            return;
          }

          showStatus("error", `Unable to delete record: ${result.message}`);
          showToast("error", `Delete failed: ${result.message}`);
        } catch (error) {
          showStatus("error", `An error occurred: ${error.message}`);
          showToast("error", `Delete failed: ${error.message}`);
        }
      });
    });
  }

  function renderHistory(data) {
    elements.historyList.innerHTML = "";
    elements.historyCards.innerHTML = "";

    if (!data || data.length === 0) {
      elements.historyList.innerHTML =
        '<tr><td colspan="7" class="p-10 text-center text-slate-400">No saved records found</td></tr>';
      elements.historyCards.innerHTML =
        '<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">No saved records found</div>';
      updateLoadMoreControls(0, 0);
      return;
    }

    data.forEach((item, index) => {
      const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString("th-TH") : "-";
      const machineRaw = String(item.machine || "-");
      const machineText = escapeHtml(machineRaw);
      const imageUrls = parseImageLinks(item.image_links || "");
      const issueText = escapeHtml(item.issue || "-");
      const severityText = item.severity || "";
      const remarkText = escapeHtml(item.remark || "-");
      const itemId = item.id;
      const imageGroupId = `history-images-${index}`;

      const row = document.createElement("tr");
      row.className = "hover:bg-blue-50 transition-colors align-top";
      row.innerHTML = `
        <td class="history-cell-machine p-4 font-semibold text-slate-800">${machineText}</td>
        <td class="p-4">
          <div class="w-40">
            <div class="grid grid-cols-2 gap-2">
              ${buildImageGalleryHtml(imageUrls, "h-20 w-full object-cover", "history-image-tile block overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-300", 4, machineRaw, imageGroupId)}
            </div>
            <div class="mt-2 text-[11px] font-bold text-slate-400">${imageUrls.length > 0 ? `${imageUrls.length} image(s)` : "No images"}</div>
          </div>
        </td>
        <td class="history-cell-issue p-4 text-slate-600 font-medium">${issueText}</td>
        <td class="p-4">${getSeverityBadge(severityText)}</td>
        <td class="history-cell-note p-4 text-slate-500 text-xs">${remarkText}</td>
        <td class="p-4 text-slate-500 text-xs font-medium">${dateStr}</td>
        <td class="p-4 text-center whitespace-nowrap">
          <div class="flex flex-col items-center justify-center gap-2">
            <button
              class="bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 transition inline-block edit-btn"
              data-id="${escapeHtml(itemId)}"
              data-machine="${escapeHtml(item.machine || "")}"
              data-links="${escapeHtml(item.image_links || "")}"
              data-issue="${escapeHtml(item.issue || "")}"
              data-severity="${escapeHtml(item.severity || "")}"
              data-remark="${escapeHtml(item.remark || "")}"
            >
              Edit
            </button>
            <button
              class="bg-rose-100 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-200 transition inline-block history-delete-btn"
              data-id="${escapeHtml(itemId)}"
              data-machine="${machineText}"
            >
              Delete
            </button>
          </div>
        </td>
      `;
      elements.historyList.appendChild(row);

      const card = document.createElement("div");
      card.className = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Machine</div>
            <div class="mt-1 text-sm font-semibold text-slate-800 break-words">${machineText}</div>
          </div>
          <div class="flex items-center gap-2 whitespace-nowrap">
            <button
              class="shrink-0 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700 edit-btn"
              data-id="${escapeHtml(itemId)}"
              data-machine="${escapeHtml(item.machine || "")}"
              data-links="${escapeHtml(item.image_links || "")}"
              data-issue="${escapeHtml(item.issue || "")}"
              data-severity="${escapeHtml(item.severity || "")}"
              data-remark="${escapeHtml(item.remark || "")}"
            >
              Edit
            </button>
            <button
              class="shrink-0 rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 history-delete-btn"
              data-id="${escapeHtml(itemId)}"
              data-machine="${machineText}"
            >
              Delete
            </button>
          </div>
        </div>
        <div class="mt-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Images</div>
            <div class="text-[11px] font-bold text-slate-400">${imageUrls.length > 0 ? `${imageUrls.length} image(s)` : "No images"}</div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2">
            ${buildImageGalleryHtml(imageUrls, "h-28 w-full object-cover", "history-image-tile block overflow-hidden rounded-xl border border-slate-200 bg-white", 6, machineRaw, `${imageGroupId}-card`)}
          </div>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-3">
          <div>
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Issue</div>
            <div class="mt-1 text-sm text-slate-700 break-words">${issueText}</div>
          </div>
          <div>
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Severity</div>
            <div class="mt-1">${getSeverityBadge(severityText)}</div>
          </div>
          <div>
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Note</div>
            <div class="mt-1 text-sm text-slate-500 break-words">${remarkText}</div>
          </div>
          <div>
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Date</div>
            <div class="mt-1 text-xs font-medium text-slate-600">${dateStr}</div>
          </div>
        </div>
      `;
      elements.historyCards.appendChild(card);
    });

    attachRowActions();
    attachImagePreviewActions();
    updateLoadMoreControls(data.length, state.historyFilteredData.length);
  }

  function updateLoadMoreControls(visibleCount, totalCount) {
    if (!elements.loadMoreWrap || !elements.loadMoreBtn || !elements.loadMoreSummary) {
      return;
    }

    if (!totalCount) {
      elements.loadMoreWrap.classList.add("hidden");
      elements.loadMoreSummary.textContent = "";
      return;
    }

    elements.loadMoreWrap.classList.remove("hidden");
    elements.loadMoreSummary.textContent = `Showing ${visibleCount} of ${totalCount} record(s)`;

    if (visibleCount >= totalCount) {
      elements.loadMoreBtn.classList.add("hidden");
      return;
    }

    elements.loadMoreBtn.classList.remove("hidden");
    elements.loadMoreBtn.textContent = `Load More (${Math.min(pageSize, totalCount - visibleCount)} more)`;
  }

  function renderVisibleHistory() {
    const visibleItems = state.historyFilteredData.slice(0, state.historyVisibleCount);
    renderMachineSeveritySummary(state.historyFilteredData);
    renderHistory(visibleItems);
  }

  function applyHistoryFilters(resetVisibleCount = true) {
    state.historyFilteredData = getFilteredAndSortedHistory();
    if (resetVisibleCount) {
      state.historyVisibleCount = pageSize;
    }

    renderVisibleHistory();
  }

  function loadMoreHistory() {
    state.historyVisibleCount += pageSize;
    renderVisibleHistory();
  }

  function resetHistoryFilters() {
    elements.historyMachineFilter.value = "";
    elements.historySeverityFilter.value = "";
    elements.historySortOrder.value = "latest";
    applyHistoryFilters(true);
  }

  function renderHistoryLoadError() {
    elements.historyList.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-slate-400">Unable to load records</td></tr>';
    elements.historyCards.innerHTML =
      '<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Unable to load records</div>';
    updateLoadMoreControls(0, 0);
  }

  async function loadHistory() {
    elements.historyList.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-slate-400 italic">Loading records...</td></tr>';
    elements.historyCards.innerHTML =
      '<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Loading records...</div>';
    updateLoadMoreControls(0, 0);

    try {
      const result = await api.fetchHistory(state.currentProjectId);
      if (result.success) {
        state.historyData = [].concat(result.data || []);
        state.historyVisibleCount = pageSize;
        updateHistoryMachineFilterOptions(state.historyData);
        applyHistoryFilters(true);
        onSetMachineHistory(result.data);
        return;
      }

      renderHistoryLoadError();
      showStatus("error", `Unable to load records: ${result.message}`);
      showToast("error", `Unable to load records: ${result.message}`);
    } catch (error) {
      console.error("Error loading history:", error);
      renderHistoryLoadError();
      showToast("error", `Unable to load records: ${error.message}`);
    }
  }

  function exportToExcel() {
    if (!confirmExportExcelAction()) {
      return;
    }

    const totalCount = state.historyFilteredData.length;
    if (totalCount === 0) {
      showToast("warning", "No records available to export");
      return;
    }

    showToast("success", `Export started for ${totalCount} filtered record(s)`);
    window.location.href = api.buildExportUrl({
      machine: elements.historyMachineFilter.value,
      project_id: state.currentProjectId,
      severity: elements.historySeverityFilter.value,
      sort: elements.historySortOrder.value,
    });
  }

  return {
    applyHistoryFilters,
    exportToExcel,
    loadHistory,
    loadMoreHistory,
    resetHistoryFilters,
  };
}
