export function createHistoryController({
  elements,
  state,
  escapeHtml,
  getSeverityBadge,
  parseImageLinks,
  severityRank,
  api,
  showStatus,
  onEditRecord,
  onSetMachineHistory,
}) {
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

  function confirmExportAction() {
    return confirm("คุณแน่ใจหรือว่าต้องการ Export Excel?");
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
        return leftMachine.localeCompare(rightMachine, "th") || (rightTime - leftTime);
      }

      if (sortOrderValue === "machine-desc") {
        return rightMachine.localeCompare(leftMachine, "th") || (rightTime - leftTime);
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

  function buildImageGalleryHtml(urls, imageClass, wrapperClass, maxVisible) {
    if (!urls || urls.length === 0) {
      return '<div class="rounded-xl border border-dashed border-slate-200 p-4 text-xs italic text-slate-300">No images</div>';
    }

    const visibleUrls = urls.slice(0, maxVisible);
    const itemsHtml = visibleUrls
      .map((url, index) => {
        const safeUrl = escapeHtml(url);
        return (
          `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="${wrapperClass}">` +
          `<img src="${safeUrl}" alt="Inspection image ${index + 1}" class="${imageClass}" loading="lazy">` +
          "</a>"
        );
      })
      .join("");

    const moreBadge =
      urls.length > maxVisible
        ? `<div class="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">+${urls.length - maxVisible}</div>`
        : "";

    return itemsHtml + moreBadge;
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

        try {
          const result = await api.deleteInspectionRecord(button.getAttribute("data-id"));
          if (result.success) {
            showStatus("success", "Record deleted successfully");
            await loadHistory();
            return;
          }

          showStatus("error", `Unable to delete record: ${result.message}`);
        } catch (error) {
          showStatus("error", `An error occurred: ${error.message}`);
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
      return;
    }

    data.forEach((item) => {
      const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString("th-TH") : "-";
      const machineText = escapeHtml(item.machine || "-");
      const imageUrls = parseImageLinks(item.image_links || "");
      const issueText = escapeHtml(item.issue || "-");
      const severityText = item.severity || "";
      const remarkText = escapeHtml(item.remark || "-");
      const itemId = item.id;

      const row = document.createElement("tr");
      row.className = "hover:bg-blue-50 transition-colors align-top";
      row.innerHTML = `
        <td class="p-4 font-semibold text-slate-800">${machineText}</td>
        <td class="p-4">
          <div class="w-40">
            <div class="grid grid-cols-2 gap-2">
              ${buildImageGalleryHtml(imageUrls, "h-20 w-full object-cover", "block overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-300", 4)}
            </div>
            <div class="mt-2 text-[11px] font-bold text-slate-400">${imageUrls.length > 0 ? `${imageUrls.length} image(s)` : "No images"}</div>
          </div>
        </td>
        <td class="p-4 text-slate-600 font-medium">${issueText}</td>
        <td class="p-4">${getSeverityBadge(severityText)}</td>
        <td class="p-4 text-slate-500 text-xs">${remarkText}</td>
        <td class="p-4 text-slate-400 text-[10px]">${dateStr}</td>
        <td class="p-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-2">
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
            ${buildImageGalleryHtml(imageUrls, "h-28 w-full object-cover", "block overflow-hidden rounded-xl border border-slate-200 bg-white", 6)}
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
            <div class="mt-1 text-xs text-slate-500">${dateStr}</div>
          </div>
        </div>
      `;
      elements.historyCards.appendChild(card);
    });

    attachRowActions();
  }

  function applyHistoryFilters() {
    renderHistory(getFilteredAndSortedHistory());
  }

  function resetHistoryFilters() {
    elements.historyMachineFilter.value = "";
    elements.historySeverityFilter.value = "";
    elements.historySortOrder.value = "latest";
    applyHistoryFilters();
  }

  function renderHistoryLoadError() {
    elements.historyList.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-slate-400">Unable to load records</td></tr>';
    elements.historyCards.innerHTML =
      '<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Unable to load records</div>';
  }

  async function loadHistory() {
    elements.historyList.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-slate-400 italic">Loading records...</td></tr>';
    elements.historyCards.innerHTML =
      '<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Loading records...</div>';

    try {
      const result = await api.fetchHistory();
      if (result.success) {
        state.historyData = [].concat(result.data || []);
        updateHistoryMachineFilterOptions(state.historyData);
        applyHistoryFilters();
        onSetMachineHistory(result.data);
        return;
      }

      renderHistoryLoadError();
      showStatus("error", `Unable to load records: ${result.message}`);
    } catch (error) {
      console.error("Error loading history:", error);
      renderHistoryLoadError();
    }
  }

  function exportToExcel() {
    if (!confirmExportAction()) {
      return;
    }

    window.location.href = api.buildExportUrl({
      machine: elements.historyMachineFilter.value,
      severity: elements.historySeverityFilter.value,
      sort: elements.historySortOrder.value,
    });
  }

  return {
    applyHistoryFilters,
    exportToExcel,
    loadHistory,
    resetHistoryFilters,
  };
}
