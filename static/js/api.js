function extractTextFromHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readResponsePayload(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    try {
      return {
        type: "json",
        value: await response.json(),
      };
    } catch (error) {
      return {
        type: "invalid-json",
        value: null,
      };
    }
  }

  try {
    const text = await response.text();
    return {
      type: "text",
      value: text,
    };
  } catch (error) {
    return {
      type: "empty",
      value: "",
    };
  }
}

function buildHttpErrorMessage(response, payload) {
  if (response.status === 413) {
    return "ไฟล์หรือข้อมูลที่อัปโหลดมีขนาดใหญ่เกินกำหนดของระบบ";
  }

  if (payload.type === "json" && payload.value && payload.value.message) {
    return payload.value.message;
  }

  if (payload.type === "text") {
    const normalizedText = extractTextFromHtml(payload.value);
    if (normalizedText) {
      return normalizedText;
    }
  }

  if (payload.type === "invalid-json") {
    return "เซิร์ฟเวอร์ตอบกลับ JSON ไม่สมบูรณ์";
  }

  return response.statusText
    ? `คำขอล้มเหลว (${response.status} ${response.statusText})`
    : `คำขอล้มเหลว (HTTP ${response.status})`;
}

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${error.message}`,
    };
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    return {
      success: false,
      message: buildHttpErrorMessage(response, payload),
      status: response.status,
    };
  }

  if (payload.type === "json" && payload.value && typeof payload.value === "object") {
    return payload.value;
  }

  return {
    success: false,
    message: "เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ระบบไม่รองรับ",
    status: response.status,
  };
}

export async function fetchHistory() {
  return requestJson("/api/get-history");
}

export async function submitInspection(formData) {
  return requestJson("/api/save-inspection", {
    method: "POST",
    body: formData,
  });
}

export async function deleteInspectionRecord(id) {
  return requestJson(`/api/delete/${id}`, {
    method: "DELETE",
  });
}

export function buildExportUrl(filters) {
  const params = new URLSearchParams();

  if (filters.machine) {
    params.set("machine", filters.machine);
  }

  if (filters.severity) {
    params.set("severity", filters.severity);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  return `/api/export-excel${params.toString() ? `?${params.toString()}` : ""}`;
}
