// ---- Configuration ----
const POWER_AUTOMATE_URL = "/_api/cloudflow/v1.0/trigger/17a831ce-3f1c-f111-8341-70a8a529124a";
const POWER_AUTOMATE_URL_COMPLETE = "/_api/cloudflow/v1.0/trigger/846cd198-db1d-f111-8341-70a8a529124a";
const POWER_AUTOMATE_URL_RESUBMISSION = "/_api/cloudflow/v1.0/trigger/913b23fa-f020-f111-88b1-70a8a529124a";
const POWER_AUTOMATE_URL_CANDIDATE = "/_api/cloudflow/v1.0/trigger/02608665-ad21-f111-88b1-70a8a529124a";

// ---- Full Document Master List ----
const items = [
  { name: "Resume / CV", required: true, formats: ["pdf", "docx"], maxSize: 5 },
  { name: "PAN Card", required: true, maxSize: 2 },
  { name: "Aadhaar Card / Address Proof", required: true, maxSize: 2 },
  { name: "Educational Certificates", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: true },
  { name: "Experience Letters", required: true, formats: ["pdf", "docx"], maxSize: 5, multiple: true },
  { name: "Pay Slips (Last 3 months)", required: true, formats: ["pdf", "docx"], maxSize: 2, multiple: true },
  { name: "Passport Photograph(For HR)", required: true, formats: ["jpg", "jpeg", "png"], maxSize: 1 },
  { name: "Offer in Hand", required: false, formats: ["pdf", "docx"], maxSize: 5 },
  { name: "UAN Screenshot", required: true, maxSize: 1 },
  { name: "Passport Photograph", required: true, formats: ["jpg", "jpeg", "png"], maxSize: 1 },
  { name: "LWD Confirmation", required: true, formats: ["pdf", "docx"], maxSize: 5 },
  { name: "Bank Details / Cancelled Cheque", required: true, formats: ["pdf", "jpg", "jpeg"], maxSize: 2 },
  { name: "Others (Optional)", required: false, formats: ["pdf", "docx"], maxSize: 5 }
];

// ---- DOM helpers ----
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
var emailID = "sivamadhavreddyc@gmail.com";// ---- A Dmmy data for testing ----
let emailID2 = "sivamadhavreddyc@gmail.com";// ---- A Dmmy data for testing ----
let isAddressEmpty;
let candidateIdGlobal;
let resubmitDataGlobal = null;
const charLength=1000;


async function setCandidateDetails(emailID) {
  const email = emailID;


  const candidate = await getCandidateByEmail(email);
  


  if (candidate) {
    setTextById("candidateName", candidate.lastname);
    setTextById("applicationId", candidate.candidatecode);
    setTextById("jobTitle", candidate.requirementtitle);
    candidateIdGlobal = candidate.candidatecode;
  }
};



async function getCandidateByEmail(email) {
  if (!email) {
    console.error("Email is required");
    return null;
  }

  const payload = {
    eventData: JSON.stringify({
      email: email
    })
  };

  return new Promise((resolve) => {

    shell.ajaxSafePost({
      type: "POST",
      url: POWER_AUTOMATE_URL_CANDIDATE,
      data: payload
    })
    .done(function (response) {

      try {
        const data = typeof response === "string" ? JSON.parse(response) : response;

        if (!data) {
          alert("No candidate found");
          resolve(null);
          return;
        }

        resolve({
          lastname: data.lastname,
          candidatecode: data.candidatecode,
          requirementtitle: data.requirementtitle
        });

      } catch (err) {
        console.error("Parse error:", err);
        resolve(null);
      }

    })
    .fail(function (err) {
      console.error("Flow call failed:", err);
      alert("Error retrieving candidate");
      resolve(null);
    });

  });
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

function buildTable(itemsToRender) {
  const tbody = $("#docTable tbody");
  tbody.innerHTML = "";

  itemsToRender.forEach((item, idx) => {
    const index = idx + 1;
    const accept = toAcceptAttr(item.formats);
    const allowMultiple = item.multiple ?? false;

    const helperBits = [];
    if (resubmitDataGlobal.length > 0) {
      helperBits.push(
        'Issue for Resubmission: ' + (item.Description && item.Description.trim() !== ""
          ? `<span style="color:red">${item.Description}</span>`
          : '-')
      );
    }

    if (item.formats?.length) helperBits.push(`Allowed: ${item.formats.join(", ").toUpperCase()}`);
    if (item.maxSize) helperBits.push(`Max: ${item.maxSize} MB`);
    helperBits.push(item.required ? "Required" : "Optional");
    if (allowMultiple) helperBits.push("Multiple files allowed");

    const helper = helperBits.join(" | ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
     <td>${index}</td>

<td>
  <span>
    <span><strong>${item.name}</strong>${item.required ? '<span class="req-asterisk">*</span>' : ''}</span>
  </span>
  <div style="font-size:12px;  margin-top:4px;">${helper}</div>
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
</td>

<td>
  <div class="address-field">
    <textarea
      id="description_${index}"
      class="input-textarea"
      data-doc="${index}"
      data-required-text="${true ? '1' : '0'}"
      maxlength="${charLength}"
      rows="3"
     placeholder="Type your Description here (Optional)"
      aria-describedby="address_counter_${index}"
    ></textarea>
    <div id="address_counter_${index}" class="char-counter">0/${charLength}</div>
  </div>
</td>

<td>
  <span id="status_${index}" class="pill pill--idle">
    <span class="pill__dot"></span> Pending
  </span>
</td>
    `;
    tbody.appendChild(tr);
  });

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
    const allowMultiplenew = input.hasAttribute('multiple');
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

    const allowMultiple = allowMultiplenew; // core rule
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

const description = document.getElementById(`description_${index}`)?.value || "";
selections.push({ index, docName, file, description });
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
  const addressField = document.querySelector("#address_text_14");

  isAddressEmpty = (addressField.value.trim() === "");

  const btn = $("#uploadAllBtn");
  if (!btn) return;

  const { errors } = collectSelectionsAndValidate();
  btn.disabled = !allRequiredSatisfied() || errors.length > 0 || isAddressEmpty;


  //Button Enable and Disable

const wrapper = document.getElementById('uploadAllWrapper');

if (btn.disabled) {
  btn.style.cursor = 'not-allowed';
  wrapper.style.cursor = 'not-allowed';
} else {
  btn.style.cursor = 'pointer';
  wrapper.style.cursor = 'pointer';
}

}

// ---- Upload logic ----
async function uploadOne({ docName, file, index, description }) {
  const filename = file.name;

  const statusEl = $(`#status_${index}`);
  if (statusEl) {
    statusEl.className = "pill pill--warn";
    statusEl.innerHTML = `<span class="pill__dot"></span> Uploading…`;
  }

  try {

    // Convert file to Base64
    const base64File = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Prepare API payload
    const data = {
      FileTest: {
        name: docName + "-" + filename,
        contentBytes: base64File
      },
      CandidateID: candidateIdGlobal || "C-000000",
      Type: docName,  Description: description 
    };

    const payload = {};
    payload.eventData = JSON.stringify(data);

    return new Promise((resolve) => {

      shell.ajaxSafePost({
        type: "POST",
        url: POWER_AUTOMATE_URL,
        data: payload
      })
        .done(function () {

          if (statusEl) {
            statusEl.className = "pill pill--ok";
            statusEl.innerHTML = `<span class="pill__dot"></span> Success`;
          }

          resolve({ ok: true, docName, filename, index });

        })
        .fail(function () {

          if (statusEl) {
            statusEl.className = "pill pill--err";
            statusEl.innerHTML = `<span class="pill__dot"></span> Failed`;
          }

          resolve({
            ok: false,
            docName,
            filename,
            index,
            error: "Upload failed"
          });

        });

    });

  } catch (error) {

    if (statusEl) {
      statusEl.className = "pill pill--err";
      statusEl.innerHTML = `<span class="pill__dot"></span> Failed`;
    }

    return {
      ok: false,
      docName,
      filename,
      index,
      error: error.message
    };

  }
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


  const addressResult = await sendAddressOnce();


  const uploadingIndexes = new Set(selections.map(s => s.index));
  uploadingIndexes.forEach(i => {
    const el = document.getElementById(`status_${i}`);
    if (el) {
      el.className = "pill pill--warn";
      el.innerHTML = `<span class="pill__dot"></span> Uploading…`;
    }
  });

  const fileResults = await Promise.all(selections.map(uploadOne));
  const results = addressResult ? [addressResult, ...fileResults] : fileResults;

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

      if (s.type === "Address") {
        li.textContent = `Address - ${s.value} submitted`;
      } else {
        li.textContent = `${s.docName} — ${s.filename}`;
      }

      ul.appendChild(li);
    });
    summary.appendChild(ul);
    toast("All files uploaded successfully ", "ok");

    // ✅ ADD THIS — trigger completion flow
    const completionResult = await triggerCompletionFlow();
    if (completionResult.ok) {
      alert("Recruiter Email Sent Successfully");
    } else {
      alert("File saved,Recruiter Email Send Failed");
    }
  } else {
    if (successes.length) {
      const h3ok = document.createElement("h3");
      h3ok.textContent = `${successes.length} file(s) uploaded successfully:`;
      summary.appendChild(h3ok);
      const ulOk = document.createElement("ul");
      successes.forEach(s => {
        const li = document.createElement("li");

        if (s.type === "Address") {
          li.textContent = `Address - ${s.value} submitted`;
        } else {
          li.textContent = `${s.docName} — ${s.filename}`;
        }

        ul.appendChild(li);
      });
      summary.appendChild(ulOk);
    }
    const h3err = document.createElement("h3");
    h3err.textContent = `${failures.length} file(s) failed to upload:`;
    summary.appendChild(h3err);
    const ulErr = document.createElement("ul");
    failures.forEach(f => {
      const li = document.createElement("li");

      if (f.type === "Address") {
        li.textContent = `Address - ${f.value} → ${f.error}`;
      } else {
        li.textContent = `${f.docName} — ${f.filename} → ${f.error}`;
      }

      ulErr.appendChild(li);
    });
    summary.appendChild(ulErr);
    toast("Some uploads failed ", "err");
  }

  $("#results").appendChild(summary);
  btn.disabled = false;
  refreshUploadButtonState();
}

//main function
document.addEventListener("DOMContentLoaded", async () => {
 // Show loading popup before buildTable
document.getElementById('loadingPopup').style.display = 'flex';

  createEmailVariaible();  // sets emailID from DOM

  await setCandidateDetails(emailID); // fetch candidate & set global candidateIdGlobal

  if (!candidateIdGlobal) {
  alert("Candidate not found.");
  return;
}

  await getResubmitData();             // fetch resubmit data & set global variable

  const itemsToRender = getItemsToRender(); // filter items if needed
  //console.log(itemsToRender);
  buildTable(itemsToRender);

  // Hide loading popup after buildTable
document.getElementById('loadingPopup').style.display = 'none';

  addAddressRow();
  refreshUploadButtonState();

  document.getElementById("uploadAllBtn").addEventListener("click", uploadAll);
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
    required ? 'Required' : 'No',
    `0/${maxChars} characters limit`
  ].join(' | ');

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
      <!-- Address input (textarea) -->
      <div class="address-field">
        <textarea
          id="address_description_${index}"
          class="input-textarea"
          data-doc="${name}"
          data-required-text="${required ? '1' : '0'}"
          maxlength="${charLength}"
          rows="3"
          placeholder="Type your Description here (Optional)"
          aria-describedby="address_counter_${index}"
        ></textarea>
        <div id="address_counter_${index}" class="char-counter">0/${charLength}</div>
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

async function sendAddressOnce() {
  const addressField = document.querySelector('textarea[id^="address_text_"]');
  const descriptionField = document.querySelector('textarea[id^="address_description_"]');
  const addressValue = addressField ? addressField.value.trim() : "";
  const descriptionValue = descriptionField ? descriptionField.value.trim() : "";

  if (!addressValue) return { ok: true, type: "Address", address: "" };

  const statusEl = addressField.closest('tr').querySelector('span[id^="status_"]');

  if (statusEl) {
    statusEl.className = "pill pill--warn";
    statusEl.innerHTML = `<span class="pill__dot"></span> Uploading…`;
  }

  const addressPayload = {
    CandidateID: candidateIdGlobal || "C-000000",
    Type: "Address",
    Address: addressValue,
    Description: descriptionValue // <-- Add this line
  };

  return new Promise((resolve) => {
    shell.ajaxSafePost({
      type: "POST",
      url: POWER_AUTOMATE_URL,
      data: { eventData: JSON.stringify(addressPayload) }
    })
      .done(() => {
        if (statusEl) {
          statusEl.className = "pill pill--ok";
          statusEl.innerHTML = `<span class="pill__dot"></span> Success`;
        }

        resolve({
          ok: true,
          type: "Address",
          value: addressValue
        });
      })
      .fail(() => {
        if (statusEl) {
          statusEl.className = "pill pill--err";
          statusEl.innerHTML = `<span class="pill__dot"></span> Failed`;
        }

        resolve({
          ok: false,
          type: "Address",
          value: addressValue,
          error: "Address submission failed"
        });
      });
  });
}

async function triggerCompletionFlow() {
  const payload = {
    eventData: JSON.stringify({
      CandidateID: candidateIdGlobal || "C-000000"

    })
  };

  return new Promise((resolve) => {
    shell.ajaxSafePost({
      type: "POST",
      url: POWER_AUTOMATE_URL_COMPLETE,
      data: payload
    })
      .done(() => resolve({ ok: true }))
      .fail(() => resolve({ ok: false }));
  });
}


async function getResubmitData() {

  // Prepare API payload
  const data = {

    candidateId: candidateIdGlobal || "C-000000"

  };

  const payload = {};
  payload.eventData = JSON.stringify(data);
  return new Promise((resolve) => {

    shell.ajaxSafePost({
      type: "POST",
      url: POWER_AUTOMATE_URL_RESUBMISSION,
      data: payload
    })
      .done(function (response) {

        console.log("Flow Raw Response:", response);

        try {

          // Parse response if needed
          const data = typeof response === "string" ? JSON.parse(response) : response;

          if (data.resubmitdata) {
            resubmitDataGlobal = JSON.parse(data.resubmitdata);
          }

          console.log("Resubmit Data Parsed:", resubmitDataGlobal);

        } catch (err) {
          console.error("Error parsing flow response", err);
        }

        resolve(resubmitDataGlobal);

      })
      .fail(function (err) {
        console.error("Flow call failed", err);
        resolve(null);
      });

  });

}


function getItemsToRender() {
  // If no API data, return all items
  if (!resubmitDataGlobal || resubmitDataGlobal.length === 0) {
    return items;
  }

  // Only include items present in resubmitDataGlobal
  const filteredItems = resubmitDataGlobal
    .map(apiItem => {
      // Find matching item in static items
      const staticItem = items.find(i => i.name === apiItem.Docutype);
      if (!staticItem) return null; // skip if no match

      return {
        ...staticItem,
        // Use API description if available, otherwise fallback
        Description: apiItem.Description && apiItem.Description.trim() !== ""
          ? apiItem.Description
          : staticItem.Description || "-"
      };
    })
    .filter(i => i !== null); // remove nulls if API doc not found in static items

  return filteredItems;
}