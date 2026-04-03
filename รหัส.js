const SHEET_NAME = "Data";
const FOLDER_ID = "17JcA2T0cJ0LEXNUWs-hpFOTveZ1VT5tR";

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

function normalizeImageUrls_(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map(function(item) {
      return item.trim();
    })
    .filter(Boolean);
}

function extractUploadBlobs_(obj) {
  const uploadBlobs = [];

  if (obj && obj.imageFile) {
    const imageFiles = Array.isArray(obj.imageFile) ? obj.imageFile : [obj.imageFile];
    imageFiles.forEach(function(file) {
      if (file && typeof file.getBytes === "function") {
        uploadBlobs.push(file);
      }
    });
  }

  if (uploadBlobs.length > 0) {
    return uploadBlobs;
  }

  if (obj) {
    Object.keys(obj).forEach(function(key) {
      if (key.indexOf("imageFile_") === 0) {
        const file = obj[key];
        if (file && typeof file.getBytes === "function") {
          uploadBlobs.push(file);
        }
      }
    });
  }

  if (uploadBlobs.length > 0) {
    return uploadBlobs;
  }

  if (obj && obj.fileData) {
    const legacyFiles = Array.isArray(obj.fileData) ? obj.fileData : [obj.fileData];
    legacyFiles.forEach(function(fileData) {
      if (fileData && fileData.data && fileData.type && fileData.name) {
        const bytes = Utilities.base64Decode(fileData.data);
        uploadBlobs.push(Utilities.newBlob(bytes, fileData.type, fileData.name));
      }
    });
  }

  return uploadBlobs;
}

function uploadImageAndGetUrl_(uploadBlob) {
  if (!uploadBlob || typeof uploadBlob.getBytes !== "function") {
    throw new Error("Invalid file payload.");
  }

  const safeName = String(uploadBlob.getName() || "image.jpg").replace(/[^\w.\-() ]/g, "_");
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const blob = uploadBlob.copyBlob().setName(timestamp + "-" + safeName);
  const file = createDriveFile_(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function uploadImagesAndGetUrls_(uploadBlobs) {
  return uploadBlobs.map(function(uploadBlob) {
    return uploadImageAndGetUrl_(uploadBlob);
  });
}

function processForm(obj) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ws = ensureSheet_(ss);
    let imageUrls = normalizeImageUrls_(obj.existingUrl);
    const uploadBlobs = extractUploadBlobs_(obj);

    if (uploadBlobs.length > 0) {
      try {
        imageUrls = uploadImagesAndGetUrls_(uploadBlobs);
      } catch (err) {
        console.error("File Upload Error: " + err.toString());
        throw new Error("Image upload failed: " + err.message);
      }
    }

    const imageUrlValue = imageUrls.join("\n");

    if (obj.rowId) {
      const data = ws.getDataRange().getValues();
      for (let i = 1; i < data.length; i += 1) {
        if (data[i][0] === obj.rowId) {
          ws.getRange(i + 1, 3, 1, 4).setValues([[obj.machine, imageUrlValue, obj.issue, obj.remark]]);
          return "Record updated successfully.";
        }
      }

      throw new Error("Record ID not found.");
    }

    ws.appendRow([Utilities.getUuid(), new Date(), obj.machine, imageUrlValue, obj.issue, obj.remark]);
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
