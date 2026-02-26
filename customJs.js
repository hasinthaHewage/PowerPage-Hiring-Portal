// ---- Configuration ----
const POWER_AUTOMATE_URL =
  "https://5735f8ecc25ce1c99959712e4327b8.d8.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/b2c6e9b6f0b2423caf45fe95e40bd9af/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=uX3qpJWApwDTD302HVQSua88ZJq_TFgO3OpWsoVAjVg";

// ---- Full Document Master List ----
const items = [
  { name: "Resume / CV", required: true, formats: ["pdf", "docx"], maxSize: 5 },
  { name: "PAN Card", required: true, maxSize: 2 },
  { name: "Aadhaar Card / Address Proof", required: true, maxSize: 2 },
  { name: "Educational Certificates", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: true },
  { name: "Experience Letters", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: true },
  { name: "Pay Slips (Last 3 months)", required: true, formats: ["pdf", "docx"], maxSize: 2, multiple: true },
  { name: "Passport Photograph(For HR)", required: true, formats: ["jpg", "jpeg", "png"], maxSize: 1 },
  { name: "Offer in Hand", required: true, formats: ["pdf", "docx"], maxSize: 5 },
  { name: "UAN Screenshot", required: true, maxSize: 1 },
  { name: "Passport Photograph", required: true, formats: ["jpg", "jpeg", "png"], maxSize: 1 },
  { name: "LWD Confirmation", required: true, formats: ["pdf", "docx"], maxSize: 5 },
  { name: "Bank Details / Cancelled Cheque", required: true, formats: ["pdf", "jpg", "jpeg"], maxSize: 2 },
  { name: "Others (Optional)", required: false, formats: ["pdf", "docx"], maxSize: 5 }
];

// ---- DOM helpers ----
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
var emailID = "sivamadhavreddyc@gmail.com";
let emailID2 = "sivamadhavreddyc@gmail.com";


async function setCandidateDetails(emailID) {
  const email = emailID;
 

  const candidate = await getCandidateByEmail(email);


  if (candidate) {
    setTextById("candidateName", candidate.cra3f_lastname);
    setTextById("applicationId", candidate.cra3f_candidatecode);
    setTextById("jobTitle", candidate.cra3f_requirementtitle);
  }
};

async function getCandidateByEmail(email) {
  if (!email) {
    console.error("Email is required");
    return null;
  }

  const apiUrl =
    "/_api/cra3f_candidateprofiles" +
    "?$select=cra3f_requirementtitle,cra3f_candidatecode,cra3f_lastname" +
    "&$filter=cra3f_emailid eq '" + email + "'";

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
      }
    });

    if (!response.ok) {
      throw new Error("API call failed: " + response.status);
    }

    const data = await response.json();

    if (data.value && data.value.length > 0) {
      // Return first matching record
      return data.value[0];
    } else {
      console.warn("No candidate found for email:", email);
      alert("No candidate found for email");
      return null;
    }
  } catch (error) {
    console.error("Error fetching candidate:", error);
    alert("Error fetching candidate");
    return null;
  }
}



function toast(message, variant = "ok", timeout = 2500) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = message;
  t.className = `toast show ${variant}`;
  setTimeout(() => {
    t.classList.remove("show");
  }, timeout);
}

function setButtonLoading(isLoading) {
  const btn = $("#uploadAllBtn");
  if (!btn) return;

  btn.disabled = isLoading;
}

// ---- Build table ----


function toAcceptAttr(formats) {
  if (!formats || formats.length === 0) return "";
  return formats.map(ext => "." + String(ext).toLowerCase()).join(",");
}

function buildTable() {
  const tbody = $("#docTable tbody");
  tbody.innerHTML = "";

  items.forEach((item, idx) => {
    const index = idx + 1;
    const accept = toAcceptAttr(item.formats);
    const allowMultiple = !item.required;  // <-- key rule: required = single, optional = multiple

    const helperBits = [];
    if (item.formats?.length) helperBits.push(`Allowed: ${item.formats.join(", ").toUpperCase()}`);
    if (item.maxSize) helperBits.push(`Max: ${item.maxSize} MB`);
    helperBits.push(item.required ? "Required" : "Optional");
    if (allowMultiple) helperBits.push("Multiple files allowed");
    const helper = helperBits.join(" • ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index}</td>
      <td>
        <span>
          <span><strong>${item.name}</strong>${item.required ? '<span class="req-asterisk">*</span>' : ''}
        </span>
        <div style="font-size:12px; color: var(--muted); margin-top:4px;">${helper}</div>
      </td>
      <td>
        <input 
          type="file"
          id="file_upload_${index}"
          class="input-file"
          data-index="${index}"
          data-doc="${item.name}"
          data-required="${item.required ? "1" : "0"}"
          data-maxsize="${item.maxSize ?? ""}"
          data-formats='${JSON.stringify(item.formats ?? [])}'
          ${allowMultiple ? "multiple" : ""}
          ${accept ? `accept="${accept}"` : ""}
        />
      
      <td>
        <span id="status_${index}" class="pill pill--idle">
          <span class="pill__dot"></span> Pending
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // (optional) rewire input changes to re-check readiness
  $$(".input-file").forEach(input => {
    input.addEventListener("change", refreshUploadButtonState);
  });
}


function getExt(name = "") {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function mb(bytes) {
  return bytes / (1024 * 1024);
}

function collectSelectionsAndValidate() {
  const selections = [];
  const errors = [];

  $$(".input-file").forEach(el => el.classList.remove("input-error"));

  $$(".input-file").forEach((input) => {
    const files = input.files;
    const docName = input.getAttribute("data-doc") || "";
    const required = input.getAttribute("data-required") === "1";
    const maxSize = Number(input.getAttribute("data-maxsize")) || 0;
    let formats = [];
    try { formats = JSON.parse(input.getAttribute("data-formats") || "[]").map(f => String(f).toLowerCase()); } catch { }

    // Required → must have at least one
    if (required) {

      if ((!files || files.length === 0)) {
        input.classList.add("input-error");
        errors.push(`"${docName}" is required.`);
        return;
      }


    } else {

      if ((!files || files.length === 0)) {
        input.classList.add("input-error");

      }


    }

    if (!files || files.length === 0) return;

    const allowMultiple = !required; // core rule
    const chosen = allowMultiple ? Array.from(files) : [files[0]];

    const id = input.id;
    const index = Number(id.split("_").pop());

    chosen.forEach(file => {
      const ext = getExt(file.name);
      const sizeMB = mb(file.size);

      if (formats.length && !formats.includes(ext)) {
        input.classList.add("input-error");
        errors.push(`"${docName}" → ${file.name}: invalid type ".${ext}". Allowed: ${formats.join(", ").toUpperCase()}`);
        return;
      }
      if (maxSize && sizeMB > maxSize) {
        input.classList.add("input-error");
        errors.push(`"${docName}" → ${file.name}: ${sizeMB.toFixed(2)} MB exceeds ${maxSize} MB.`);
        return;
      }

      selections.push({ index, docName, file });
    });
  });

  return { selections, errors };
}

function allRequiredSatisfied() {
  let ok = true;
  $$(".input-file").forEach((input) => {
    const required = input.getAttribute("data-required") === "1";
    if (!required) return;
    const files = input.files;
    if (!files || files.length === 0) ok = false;
  });
  return ok;
}

function refreshUploadButtonState() {
  const btn = $("#uploadAllBtn");
  if (!btn) return;

  const { errors } = collectSelectionsAndValidate();
  btn.disabled = !allRequiredSatisfied() || errors.length > 0;
}

// ---- Upload logic ----
function uploadOne({ docName, file, index }) {
  const filename = file.name;
  const form = new FormData();
  // MUST match Power Automate trigger parameter names
  form.append("file", file);
  form.append("filename", filename);
  // Optional: send document type to Flow
  form.append("documentType", docName);

  const statusEl = $(`#status_${index}`);
  if (statusEl) {
    statusEl.className = "pill pill--warn";
    statusEl.innerHTML = `<span class="pill__dot"></span> Uploading…`;
  }

  return new Promise((resolve) => {
    // Using jQuery AJAX per your existing approach
    window.jQuery.ajax({
      type: "POST",
      url: POWER_AUTOMATE_URL,
      processData: false,
      contentType: false,
      data: form,
      success: function (result) {
        if (result === "Uploaded") {
          if (statusEl) {
            statusEl.className = "pill pill--ok";
            statusEl.innerHTML = `<span class="pill__dot"></span> Success`;
          }
          resolve({ ok: true, docName, filename, index });
        } else {
          if (statusEl) {
            statusEl.className = "pill pill--err";
            statusEl.innerHTML = `<span class="pill__dot"></span> Unexpected response`;
          }
          resolve({
            ok: false,
            docName,
            filename,
            index,
            error: "Unexpected response: " + String(result),
          });
        }
      },
      error: function (xhr, status, error) {
        if (statusEl) {
          statusEl.className = "pill pill--err";
          statusEl.innerHTML = `<span class="pill__dot"></span> Failed`;
        }
        resolve({
          ok: false,
          docName,
          filename,
          index,
          error: `${status}: ${error}`,
        });
      },
    });
  });
}
async function uploadAll() {
  const resultsEl = $("#results");
  resultsEl.innerHTML = "";

  const btn = $("#uploadAllBtn");
  btn.disabled = true;

  const { selections, errors } = collectSelectionsAndValidate();

  if (errors.length > 0) {
    toast(errors[0], "err");
    const summary = document.createElement("div");
    const h3err = document.createElement("h3");
    h3err.textContent = `Please fix the following:`;
    summary.appendChild(h3err);
    const ulErr = document.createElement("ul");
    errors.forEach((msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      ulErr.appendChild(li);
    });
    summary.appendChild(ulErr);
    resultsEl.appendChild(summary);
    btn.disabled = false;
    return;
  }

  if (selections.length === 0) {
    toast("Please choose at least one file to upload.", "err");
    btn.disabled = false;
    return;
  }

  const uploadingIndexes = new Set(selections.map(s => s.index));
  uploadingIndexes.forEach(i => {
    const el = document.getElementById(`status_${i}`);
    if (el) {
      el.className = "pill pill--warn";
      el.innerHTML = `<span class="pill__dot"></span> Uploading…`;
    }
  });

  const results = await Promise.all(selections.map(uploadOne));

  const successes = results.filter(r => r.ok);
  const failures = results.filter(r => !r.ok);

  const rowOutcome = new Map();
  results.forEach(r => {
    const prev = rowOutcome.get(r.index);
    rowOutcome.set(r.index, prev === "err" ? "err" : (r.ok ? "ok" : "err"));
  });
  rowOutcome.forEach((state, idx) => {
    const el = document.getElementById(`status_${idx}`);
    if (!el) return;
    if (state === "ok") {
      el.className = "pill pill--ok";
      el.innerHTML = `<span class="pill__dot"></span> Success`;
    } else {
      el.className = "pill pill--err";
      el.innerHTML = `<span class="pill__dot"></span> Failed`;
    }
  });

  const summary = document.createElement("div");
  if (failures.length === 0) {
    const h3 = document.createElement("h3");
    h3.textContent = `All ${successes.length} file(s) uploaded successfully.`;
    summary.appendChild(h3);
    const ul = document.createElement("ul");
    successes.forEach(s => {
      const li = document.createElement("li");
      li.textContent = `${s.docName} — ${s.filename}`;
      ul.appendChild(li);
    });
    summary.appendChild(ul);
    toast("All files uploaded successfully ✅", "ok");
  } else {
    if (successes.length) {
      const h3ok = document.createElement("h3");
      h3ok.textContent = `${successes.length} file(s) uploaded successfully:`;
      summary.appendChild(h3ok);
      const ulOk = document.createElement("ul");
      successes.forEach(s => {
        const li = document.createElement("li");
        li.textContent = `${s.docName} — ${s.filename}`;
        ulOk.appendChild(li);
      });
      summary.appendChild(ulOk);
    }
    const h3err = document.createElement("h3");
    h3err.textContent = `${failures.length} file(s) failed to upload:`;
    summary.appendChild(h3err);
    const ulErr = document.createElement("ul");
    failures.forEach(f => {
      const li = document.createElement("li");
      li.textContent = `${f.docName} — ${f.filename} → ${f.error}`;
      ulErr.appendChild(li);
    });
    summary.appendChild(ulErr);
    toast("Some uploads failed ", "err");
  }

  $("#results").appendChild(summary);
  btn.disabled = false;
  refreshUploadButtonState();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  buildTable();
  addAddressRow();
  refreshUploadButtonState();
  document.getElementById("uploadAllBtn").addEventListener("click", uploadAll);
  createEmailVariaible();
  setCandidateDetails(emailID);
});

// Function to extract email and username and store as global variables
function createEmailVariaible() {
  // Get the profile link element
  const profileLink = document.getElementById('emailExtractor');
  emailID = profileLink ? profileLink.innerText.trim() : '';


  // Hide the element
  if (profileLink) {
    profileLink.style.display = 'none';
  }
  // alert("element-"+window.loggedInUserNameFromElement);

}



/**
 * Appends a required "Present and Permanent address" row as the LAST row in #docTable.
 * - Textarea with maxlength=1000 and a live "0/1000" counter.
 * - Required field (adds .input-error when empty).
 * - Hooks into refreshUploadButtonState() so the Upload All button state updates.
 */
function addAddressRow() {
  const tbody = document.querySelector('#docTable tbody');
  if (!tbody) {
    console.warn('tbody not found: #docTable tbody');
    return;
  }

  const index = tbody.children.length + 1; // append as the last row
  const name = 'Present and Permanent address';
  const required = true;
  const maxChars = 1000;

  const helper = [
    'Address verification document',
    'Text area',
    required ? 'Yes' : 'No',
    `0/${maxChars} characters limit`
  ].join(' • ');

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${index}</td>
    <td>
      <span><strong>${name}</strong>${required ? ' <span class="req-asterisk">*</span>' : ''}</span>
      <div style="font-size:12px; color: var(--muted); margin-top:4px;">${helper}</div>
    </td>
    <td>
      <!-- Address input (textarea) -->
      <div class="address-field">
        <textarea
          id="address_text_${index}"
          class="input-textarea"
          data-doc="${name}"
          data-required-text="${required ? '1' : '0'}"
          maxlength="${maxChars}"
          rows="3"
          placeholder="Type your address here (required)"
          aria-describedby="address_counter_${index}"
        ></textarea>
        <div id="address_counter_${index}" class="char-counter">0/${maxChars}</div>
      </div>
    </td>
    <td>
      <!-- Status cell kept consistent with other rows (optional for text row) -->
      <span id="status_${index}" class="pill pill--idle">
        <span class="pill__dot"></span> Pending
      </span>
    </td>
  `;

  tbody.appendChild(tr);

  // Wire up counter + validation + button state refresh
  const ta = tr.querySelector('textarea.input-textarea');
  const counter = tr.querySelector(`#address_counter_${index}`);

  const updateCounterAndValidity = () => {
    const len = ta.value.length;
    if (counter) counter.textContent = `${len}/${maxChars}`;
    // required check
    if (required && len === 0) {
      ta.classList.add('input-error');
    } else {
      ta.classList.remove('input-error');
    }
    // update the Upload All button state (if function exists)
    if (typeof refreshUploadButtonState === 'function') {
      refreshUploadButtonState();
    }
  };

  ta.addEventListener('input', updateCounterAndValidity);
  ta.addEventListener('blur', updateCounterAndValidity);
  // Initialize state
  counter.textContent = `0/${maxChars}`;
}


function setTextById(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  const span = el.querySelector("span");
  if (span) {
    span.textContent = value ?? "-";
  }
}


