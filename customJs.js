// ---- Configuration ----
const POWER_AUTOMATE_URL =
  "https://5735f8ecc25ce1c99959712e4327b8.d8.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/b2c6e9b6f0b2423caf45fe95e40bd9af/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=uX3qpJWApwDTD302HVQSua88ZJq_TFgO3OpWsoVAjVg";

// The list that drives table rows
const items = ["ID", "Driving License", "Birth Certificate"];

// ---- DOM helpers ----
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
function buildTable() {
  const tbody = $("#docTable tbody");
  tbody.innerHTML = "";

  items.forEach((item, idx) => {
    const index = idx + 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index}</td>
      <td>${item}</td>
      <td>
        <input 
          type="file" 
          id="file_upload_${index}" 
          class="input-file"
          data-doc="${item}"
        />
      </td>
      <td>
        <span id="status_${index}" class="pill pill--idle">
          <span class="pill__dot"></span> Pending
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
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
  setButtonLoading(true);

  // Collect selected files only
  const selections = $$(".input-file")
    .filter((input) => input.files && input.files.length > 0)
    .map((input) => {
      const id = input.id;
      const index = Number(id.split("_").pop());
      return {
        index,
        docName: input.getAttribute("data-doc"),
        file: input.files[0],
      };
    });

  if (selections.length === 0) {
    setButtonLoading(false);
    toast("Please choose at least one file to upload.", "err");
    return;
  }

  // Kick off uploads in parallel
  const promises = selections.map((s) => uploadOne(s));
  const results = await Promise.all(promises);

  // Aggregate
  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  // Render summary
  const summary = document.createElement("div");
  const title = document.createElement("h3");

  if (failures.length === 0) {
    title.textContent = `All ${successes.length} file(s) uploaded successfully.`;
    summary.appendChild(title);

    const ul = document.createElement("ul");
    successes.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = `${s.docName} — ${s.filename}`;
      ul.appendChild(li);
    });
    summary.appendChild(ul);

    resultsEl.appendChild(summary);
    toast("All files uploaded successfully ✅", "ok");
  } else {
    // Success list (if any)
    if (successes.length > 0) {
      const h3ok = document.createElement("h3");
      h3ok.textContent = `${successes.length} file(s) uploaded successfully:`;
      summary.appendChild(h3ok);
      const ulOk = document.createElement("ul");
      successes.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = `${s.docName} — ${s.filename}`;
        ulOk.appendChild(li);
      });
      summary.appendChild(ulOk);
    }

    // Failure list
    const h3err = document.createElement("h3");
    h3err.textContent = `${failures.length} file(s) failed to upload:`;
    summary.appendChild(h3err);

    const ulErr = document.createElement("ul");
    failures.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = `${f.docName} — ${f.filename} → ${f.error}`;
      ulErr.appendChild(li);
    });
    summary.appendChild(ulErr);

    resultsEl.appendChild(summary);
    toast("Some uploads failed ❌", "err");
  }

  setButtonLoading(false);
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  buildTable();
  const btn = document.getElementById("uploadAllBtn");
  btn.addEventListener("click", uploadAll);
});