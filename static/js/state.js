export function createAppState() {
  return {
    selectedFiles: [],
    localPreviewUrls: [],
    removedExistingImages: [],
    projects: [],
    currentProjectId: "",
    machineHistory: [],
    historyData: [],
    historyFilteredData: [],
    historyPageSize: 15,
    historyVisibleCount: 15,
  };
}
