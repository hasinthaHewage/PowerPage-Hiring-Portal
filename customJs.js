// ---- CONFIG ----
const POWER_AUTOMATE_URL = "PASTE_YOUR_FLOW_URL_HERE";

// ---- DOCUMENT MASTER LIST ----
const documents = [
  { name: "Resume / CV", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: false },
  { name: "PAN Card", required: true, maxSize: 2, multiple: false },
  { name: "Aadhaar Card / Address Proof", required: true, maxSize: 2, multiple: false },
  { name: "Educational Certificates", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: true },
  { name: "Experience Letters", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: true },
  { name: "Pay Slips (Last 3 months)", required: true, formats: ["pdf", "docx"], maxSize: 2, multiple: true },
  { name: "Passport Photograph", required: true, formats: ["jpg", "jpeg", "png"], maxSize: 1, multiple: false },
  { name: "Offer in Hand", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: false },
  { name: "UAN Screenshot", required: true, maxSize: 1, multiple: false },
  { name: "LWD Confirmation", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: false },
  { name: "Bank Details / Cancelled Cheque", required: true, formats: ["pdf", "jpg", "jpeg"], maxSize: 2, multiple: false },
  { name: "Others (Optional)", required: false, formats: ["pdf", "docx"], maxSize: 5, multiple: false }
];

// ---- BUILD TABLE ----
function buildTable() {
  const tbody = document.querySelector("#docTable tbody");
  tbody.innerHTML = "";

  documents.forEach((doc, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${doc.name} ${doc.required ? "<span class='required'>*</span>" : ""}</td>
      <td>
        <input type="file"
               id="file_${index}"
               ${doc.multiple ? "multiple" : ""}
               class="file-input"/>
      </td>
      <td>
        <span id="status_${index}" class="pill pill--idle">Pending</span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ---- VALIDATION ----
function validateFile(file, rule) {
  const ext = file.name.split(".").pop().toLowerCase();
  const sizeMB = file.size / (1024 * 1024);

  if (rule.formats && !rule.formats.includes(ext)) {
    return `Invalid format (.${ext})`;
  }

  if (sizeMB > rule.maxSize) {
    return `File exceeds ${rule.maxSize}MB`;
  }

  return null;
}

// ---- UPLOAD ----
async function uploadAll() {
  const address = document.getElementById("addressField").value.trim();
  if (!address) {
    toast("Address is mandatory", "err");
    return;
  }

  const formData = new FormData();
  formData.append("candidateName", document.getElementById("candidateName").innerText);
  formData.append("applicationId", document.getElementById("applicationId").innerText);
  formData.append("jobTitle", document.getElementById("jobTitle").innerText);
  formData.append("address", address);

  let hasError = false;

  documents.forEach((doc, index) => {
    const input = document.getElementById(`file_${index}`);
    const statusEl = document.getElementById(`status_${index}`);

    if (doc.required && input.files.length === 0) {
      statusEl.className = "pill pill--err";
      statusEl.innerText = "Required";
      hasError = true;
      return;
    }

    Array.from(input.files).forEach(file => {
      const validationError = validateFile(file, doc);
      if (validationError) {
        statusEl.className = "pill pill--err";
        statusEl.innerText = validationError;
        hasError = true;
      } else {
        formData.append("files", file);
        formData.append("docType", doc.name);
        statusEl.className = "pill pill--warn";
        statusEl.innerText = "Ready";
      }
    });
  });

  if (hasError) {
    toast("Please fix errors before submitting", "err");
    return;
  }

  document.getElementById("uploadAllBtn").classList.add("loading");

  try {
    const response = await fetch(POWER_AUTOMATE_URL, {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      toast("Documents submitted successfully ✅", "ok");
      document.getElementById("submissionStatus").innerText =
        "Document Submission – Completed";
      document.getElementById("submissionStatus").className =
        "status-badge completed";
    } else {
      toast("Upload failed ❌", "err");
    }
  } catch (error) {
    toast("Server error ❌", "err");
  }

  document.getElementById("uploadAllBtn").classList.remove("loading");
}

// ---- CHAR COUNTER ----
document.addEventListener("input", e => {
  if (e.target.id === "addressField") {
    document.getElementById("charCount").innerText =
      e.target.value.length;
  }
});

// ---- TOAST ----
function toast(message, type) {
  const t = document.getElementById("toast");
  t.innerText = message;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  buildTable();
  document.getElementById("uploadAllBtn")
    .addEventListener("click", uploadAll);
});
