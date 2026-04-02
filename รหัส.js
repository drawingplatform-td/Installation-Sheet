const SHEET_NAME = "Data";
const FOLDER_ID = "1fKeFzTr2_KgrVj9eS_k2cGBeFWKMlmzWt1uCC55oOSc";

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Machine Inspection System")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function ensureSheet_(ss) {
  let ws = ss.getSheetByName(SHEET_NAME);
  if (!ws) {
    ws = ss.insertSheet(SHEET_NAME);
    ws.appendRow(["ID", "Timestamp", "Machine", "Image Link", "Issue", "Remark"]);
  }
  return ws;
}

function resolveUploadFolder_() {
  const configuredId = String(FOLDER_ID || "").trim();

  if (configuredId) {
    try {
      return DriveApp.getFolderById(configuredId);
    } catch (folderError) {
      console.warn("Configured upload folder is invalid: " + folderError.toString());
    }
  }

  console.warn("Falling back to My Drive root folder for uploads.");
  return DriveApp.getRootFolder();
}

function createDriveFile_(blob) {
  const configuredId = String(FOLDER_ID || "").trim();

  if (configuredId) {
    try {
      const folder = resolveUploadFolder_();
      return folder.createFile(blob);
    } catch (folderUploadError) {
      console.warn("Folder upload failed, falling back to My Drive root: " + folderUploadError.toString());
    }
  }

  return DriveApp.createFile(blob);
}

function uploadImageAndGetUrl_(fileData) {
  if (!fileData || !fileData.data || !fileData.type || !fileData.name) {
    throw new Error("Invalid file payload.");
  }

  const bytes = Utilities.base64Decode(fileData.data);
  const safeName = String(fileData.name).replace(/[^\w.\-() ]/g, "_");
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const blob = Utilities.newBlob(bytes, fileData.type, timestamp + "-" + safeName);
  const file = createDriveFile_(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function processForm(obj) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ws = ensureSheet_(ss);
    let imageUrl = obj.existingUrl || "";

    if (obj.fileData && obj.fileData.data && obj.fileData.type && obj.fileData.name) {
      try {
        imageUrl = uploadImageAndGetUrl_(obj.fileData);
      } catch (err) {
        console.error("File Upload Error: " + err.toString());
        throw new Error("Image upload failed: " + err.message);
      }
    }

    if (obj.rowId) {
      const data = ws.getDataRange().getValues();
      for (let i = 1; i < data.length; i += 1) {
        if (data[i][0] === obj.rowId) {
          ws.getRange(i + 1, 3, 1, 4).setValues([[obj.machine, imageUrl, obj.issue, obj.remark]]);
          return "Record updated successfully.";
        }
      }

      throw new Error("Record ID not found.");
    }

    ws.appendRow([Utilities.getUuid(), new Date(), obj.machine, imageUrl, obj.issue, obj.remark]);
    return "Saved successfully.";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function getHistory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ws = ss.getSheetByName(SHEET_NAME);
    if (!ws) {
      return [];
    }

    const data = ws.getDataRange().getValues();
    if (data.length <= 1) {
      return [];
    }

    data.shift();
    return data.map(function(row) {
      row[1] = row[1] instanceof Date ? row[1].toISOString() : row[1];
      return row;
    });
  } catch (e) {
    return [];
  }
}
