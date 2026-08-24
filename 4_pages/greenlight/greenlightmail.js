const API_BASE = "https://notion-api-hub.vercel.app";

const partnerSelect = document.getElementById("partnerSelect");
const toInput = document.getElementById("toInput");
const ccInput = document.getElementById("ccInput");
const subjectEditor = document.getElementById("subjectEditor");
const bodyEditor = document.getElementById("bodyEditor");
const openMailBtn = document.getElementById("openMailBtn");
const statusBox = document.getElementById("status");
const languageTabs = document.querySelectorAll(".language-tab");

let selectedPartner = null;
let partnerTomSelect = null;
let currentLanguage = "en";

const templates = {
  en: `
Dear <span class="mail-field" data-placeholder="Partner Name" contenteditable="true">[Partner Name]</span>,

We have a new shipment to <span class="mail-field" data-placeholder="Destination" contenteditable="true">[Destination]</span>.
Please find the customer and local HR contact details below.

<strong style="text-decoration:underline; background-color:#fff2cc;">Customer Information</strong>
Name: <span class="mail-field" data-placeholder="Customer Name" contenteditable="true">[Customer Name]</span>
E-mail: <span class="mail-field" data-placeholder="Customer E-mail" contenteditable="true">[Customer E-mail]</span>
Tel: <span class="mail-field" data-placeholder="Customer Tel." contenteditable="true">[Customer Tel.]</span>

<strong style="text-decoration:underline; background-color:#fff2cc;">Local HR Contact Information</strong>
Name: <span class="mail-field" data-placeholder="HR Contact Name" contenteditable="true">[HR Contact Name]</span>
E-mail: <span class="mail-field" data-placeholder="HR E-mail" contenteditable="true">[HR E-mail]</span>
Tel: <span class="mail-field" data-placeholder="HR Tel." contenteditable="true">[HR Tel.]</span>
Company: <span class="mail-field" data-placeholder="Company Name" contenteditable="true">[Company Name]</span>
Office ADD: <span class="mail-field" data-placeholder="Office ADD" contenteditable="true">[Office ADD]</span>

<strong style="text-decoration:underline; background-color:#fff2cc;">Cargo Info</strong>
Volume: <span class="mail-field" data-placeholder="CBM/CT" contenteditable="true">[CBM/CT]</span>
Container Type: <span class="mail-field" data-placeholder="CTNR type" contenteditable="true">[CTNR type]</span>
Vessel Schedule: <span class="mail-field" data-placeholder="ETD - ETA" contenteditable="true">[ETD - ETA]</span>

Please contact the local HR representative and collect all necessary documents for customs clearance.
Once you have confirmed that all required documents are in order and the shipment is ready for customs clearance, please provide us with your <strong>GREEN LIGHT</strong>.
We will proceed with the shipment upon receipt of your GREEN LIGHT.

Thank you for your cooperation.`,

  ko: `
안녕하세요.
퓨멕스 수출부 <span class="mail-field" data-placeholder="Your Name" contenteditable="true">[Your Name]</span>입니다.

<span class="mail-field" data-placeholder="Destination" contenteditable="true">[Destination]</span> 지역 배송으로 신규 선적 건이 있어 안내드립니다.
하기 고객 정보 및 현지 인사담당자 정보를 확인 부탁드립니다.

<strong style="text-decoration:underline; background-color:#fff2cc;">고객 정보</strong>
이름: <span class="mail-field" data-placeholder="Customer Name" contenteditable="true">[Customer Name]</span>
E-mail: <span class="mail-field" data-placeholder="Customer E-mail" contenteditable="true">[Customer E-mail]</span>
Tel: <span class="mail-field" data-placeholder="Customer Tel." contenteditable="true">[Customer Tel.]</span>

<strong style="text-decoration:underline; background-color:#fff2cc;">현지 인사담당자 정보</strong>
이름: <span class="mail-field" data-placeholder="HR Contact Name" contenteditable="true">[HR Contact Name]</span>
E-mail: <span class="mail-field" data-placeholder="HR E-mail" contenteditable="true">[HR E-mail]</span>
Tel: <span class="mail-field" data-placeholder="HR Tel." contenteditable="true">[HR Tel.]</span>
회사명: <span class="mail-field" data-placeholder="Company Name" contenteditable="true">[Company Name]</span>
회사 주소: <span class="mail-field" data-placeholder="Office ADD" contenteditable="true">[Office ADD]</span>

<strong style="text-decoration:underline; background-color:#fff2cc;">화물 정보</strong>
물량: <span class="mail-field" data-placeholder="CBM/CT" contenteditable="true">[CBM/CT]</span>
컨테이너 타입: <span class="mail-field" data-placeholder="CTNR type" contenteditable="true">[CTNR type]</span>
선박 스케줄: <span class="mail-field" data-placeholder="ETD - ETA" contenteditable="true">[ETD - ETA]</span>

현지 인사담당자에게 연락하여 통관에 필요한 모든 서류를 수취해주시기 바랍니다.
통관에 필요한 서류를 수취하시고 <strong>GREEN LIGHT</strong>를 주시면 선적을 진행하도록 하겠습니다.`
};

function setupSubjectFields() {
  subjectEditor.querySelectorAll(".subject-field").forEach(field => {
    const placeholder = `[${field.dataset.placeholder}]`;

    field.addEventListener("click", () => {
      if (field.textContent.replace(/\u200B/g, "").trim() === placeholder) {
        field.textContent = "\u200B";
        field.classList.add("editing");
        placeCaretAtEnd(field);
      }
    });

    field.addEventListener("focus", () => {
      if (field.textContent.replace(/\u200B/g, "").trim() === placeholder) {
        field.textContent = "\u200B";
        field.classList.add("editing");
        placeCaretAtEnd(field);
      }
    });

    field.addEventListener("input", () => {
    const value = getFieldValue(field);
    field.classList.toggle("filled", value !== "" && value !== placeholder);

    if (field.dataset.placeholder === "CUSTOMER NAME") syncCustomerNameFromSubject(field);
    if (field.dataset.placeholder === "ADD") syncDestinationFromSubject(field);
    });

    field.addEventListener("blur", () => {
    const value = getFieldValue(field);

    if (!value) {
        field.textContent = placeholder;
        field.classList.remove("filled", "editing");
    } else {
        field.textContent = value;
        field.classList.add("filled");
        field.classList.remove("editing");

        if (field.dataset.placeholder === "CUSTOMER NAME") syncCustomerNameFromSubject(field);
        if (field.dataset.placeholder === "ADD") syncDestinationFromSubject(field);
    }
    });

    field.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        field.blur();
      }
    });
  });
}

function getSubjectText() {
  return subjectEditor.innerText
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function placeCaretAtEnd(element) {
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setStatus(message) { statusBox.textContent = message || ""; }

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "API 요청 실패");
  return data;
}

function normalizeEmail(email) { return String(email || "").trim(); }
function updateMailButtonState() { openMailBtn.disabled = !normalizeEmail(toInput.value); }

function clearEmailFields() {
  selectedPartner = null;
  toInput.value = "";
  ccInput.value = "";
  updateMailButtonState();
}

async function loadPartnerOptions() {
  try {
    setStatus("파트너 목록 불러오는 중...");
    const data = await fetchJson(`${API_BASE}/api/mail/greenlight/partners`);
    const options = data.options || [];

    partnerSelect.innerHTML = `<option value=""></option>`;
    options.forEach(partner => {
      const option = document.createElement("option");
      option.value = partner.id;
      option.textContent = partner.name;
      partnerSelect.appendChild(option);
    });

    partnerTomSelect = new TomSelect("#partnerSelect", {
      create:false,
      maxOptions:null,
      placeholder:"파트너명을 입력해서 검색하세요",
      allowEmptyOption:true,
      searchField:["text"],
      sortField:{ field:"text", direction:"asc" }
    });

    setStatus(`파트너 ${options.length}개 로드 완료`);
  } catch (error) {
    console.error(error);
    partnerSelect.innerHTML = `<option value="">파트너 목록 로드 실패</option>`;
    setStatus(error.message);
  }
}

async function loadPartnerDetail(id) {
  if (!id) {
    clearEmailFields();
    setStatus("");
    return;
  }

  try {
    clearEmailFields();
    setStatus("파트너 이메일 불러오는 중...");

    const data = await fetchJson(`${API_BASE}/api/mail/greenlight/partner?id=${encodeURIComponent(id)}`);
    const partner = data.partner || {};
    selectedPartner = partner;

    const managerEmail = normalizeEmail(partner.managerEmail);
    const quoteEmail = normalizeEmail(partner.quoteEmail);

    if (quoteEmail) {
      toInput.value = quoteEmail;
      ccInput.value = managerEmail;
    } else {
      toInput.value = managerEmail;
      ccInput.value = "";
    }

    updatePartnerNameField();
    updateMailButtonState();

    if (toInput.value) setStatus(`${partner.name || "파트너"} 이메일 연동 완료`);
    else setStatus(`${partner.name || "파트너"}의 이메일 주소가 등록되어 있지 않습니다.`);
  } catch (error) {
    console.error(error);
    clearEmailFields();
    setStatus(error.message);
  }
}

/* 템플릿 표시 */
function renderTemplate(language) {
  currentLanguage = language;
  bodyEditor.innerHTML = templates[language];

  languageTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.lang === language));
  setupEditableFields();
  updatePartnerNameField();
}

/* 입력칸 클릭 시 [Placeholder] 전체 선택 */
function setupEditableFields() {
  bodyEditor.querySelectorAll(".mail-field").forEach(field => {
    const placeholder = `[${field.dataset.placeholder}]`;

    field.addEventListener("click", () => {
    if (field.textContent.trim() === placeholder) {
        field.textContent = "\u200B";
        field.classList.add("editing");
        placeCaretAtEnd(field);
    }
    });

    field.addEventListener("focus", () => {
    if (field.textContent.trim() === placeholder) {
        field.textContent = "\u200B";
        field.classList.add("editing");
        placeCaretAtEnd(field);
    }
    });

    field.addEventListener("input", () => {
    const value = getFieldValue(field);
    field.classList.toggle("filled", value !== "" && value !== placeholder);

    if (field.dataset.placeholder === "Customer Name") syncCustomerNameFromBody(field);
    if (field.dataset.placeholder === "Destination") syncDestinationFromBody(field);
    });

    field.addEventListener("blur", () => {
    const value = getFieldValue(field);

    if (!value) {
        field.textContent = placeholder;
        field.classList.remove("filled", "editing");
    } else {
        field.textContent = value;
        field.classList.add("filled");
        field.classList.remove("editing");

        if (field.dataset.placeholder === "Customer Name") syncCustomerNameFromBody(field);
        if (field.dataset.placeholder === "Destination") syncDestinationFromBody(field);
    }
    });

    field.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        field.blur();
      }
    });
  });
}

function placeCaretAtEnd(element) {
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
}

/* 파트너 선택하면 Partner Name도 자동 입력 */
function updatePartnerNameField() {
  if (!selectedPartner?.name) return;

  bodyEditor.querySelectorAll('.mail-field[data-placeholder="Partner Name"]').forEach(field => {
    field.textContent = selectedPartner.name;
    field.classList.add("filled");
  });
}

/* HTML 에디터 내용을 Outlook용 일반 텍스트로 변경 */
function getBodyText() {
  const clone = bodyEditor.cloneNode(true);

  clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  clone.querySelectorAll("div").forEach(div => div.append("\n"));
  clone.querySelectorAll("p").forEach(p => p.append("\n"));

  return clone.innerText
    .replace(/\u200B/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function copyMailBodyWithFormatting() {
  const html = getBodyHtmlForClipboard();
  const text = getBodyText();

  if (navigator.clipboard && window.ClipboardItem) {
    const clipboardItem = new ClipboardItem({
      "text/html": new Blob([html], { type:"text/html" }),
      "text/plain": new Blob([text], { type:"text/plain" })
    });

    await navigator.clipboard.write([clipboardItem]);
    return;
  }

  fallbackCopyHtml(html);
}

async function openOutlookMail() {
  const to = normalizeEmail(toInput.value);
  const cc = normalizeEmail(ccInput.value);
  const subject = getSubjectText();

  if (!to) {
    alert("받는 사람 이메일 주소가 없습니다.");
    return;
  }

  try {
    await copyMailBodyWithFormatting();

    const params = [];
    if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);

    const mailto = `mailto:${to}${params.length ? "?" + params.join("&") : ""}`;
    window.location.href = mailto;

    setStatus("메일 본문이 서식 포함으로 복사되었습니다. Outlook 본문에서 Ctrl + V로 붙여넣어 주세요.");
  } catch (error) {
    console.error("메일 복사 실패:", error);
    alert("메일 본문을 클립보드에 복사하지 못했습니다.");
  }
}

function getBodyHtmlForClipboard() {
  const clone = bodyEditor.cloneNode(true);

  clone.querySelectorAll(".mail-field").forEach(field => {
    field.removeAttribute("contenteditable");
    field.removeAttribute("class");
    field.removeAttribute("data-placeholder");

    field.style.background = "transparent";
    field.style.color = "inherit";
    field.style.border = "none";
    field.style.padding = "0";
    field.style.margin = "0";
    field.style.fontWeight = "inherit";
  });

  clone.querySelectorAll("*").forEach(el => {
    el.removeAttribute("contenteditable");
  });

  let html = clone.innerHTML.replace(/\u200B/g, "");

  html = html
    .replace(/\n/g, "<br>")
    .replace(/(<br>\s*){3,}/g, "<br><br>");

  return `
    <div style="font-family:'Malgun Gothic','맑은 고딕',sans-serif; font-size:10pt; line-height:1.5;">
      ${html}
    </div>
  `;
}

function fallbackCopyHtml(html) {
  const temp = document.createElement("div");

  temp.innerHTML = html;
  temp.contentEditable = "true";
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  temp.style.top = "0";

  document.body.appendChild(temp);

  const range = document.createRange();
  range.selectNodeContents(temp);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand("copy");

  selection.removeAllRanges();
  document.body.removeChild(temp);
}

function getFieldValue(field) {
  return field.textContent.replace(/\u200B/g, "").trim();
}

function syncCustomerNameFromBody(sourceField) {
  const value = getFieldValue(sourceField);
  if (!value || value === "[Customer Name]") return;

  subjectEditor.querySelectorAll('.subject-field[data-placeholder="CUSTOMER NAME"]').forEach(field => {
    if (field === document.activeElement) return;
    field.textContent = value;
    field.classList.add("filled");
    field.classList.remove("editing");
  });
}

function syncCustomerNameFromSubject(sourceField) {
  const value = getFieldValue(sourceField);
  if (!value || value === "[CUSTOMER NAME]") return;

  bodyEditor.querySelectorAll('.mail-field[data-placeholder="Customer Name"]').forEach(field => {
    if (field === document.activeElement) return;
    field.textContent = value;
    field.classList.add("filled");
    field.classList.remove("editing");
  });
}

function syncDestinationFromBody(sourceField) {
  const value = getFieldValue(sourceField);
  if (!value || value === "[Destination]") return;

  subjectEditor.querySelectorAll('.subject-field[data-placeholder="ADD"]').forEach(field => {
    if (field === document.activeElement) return;
    field.textContent = value;
    field.classList.add("filled");
    field.classList.remove("editing");
  });
}

function syncDestinationFromSubject(sourceField) {
  const value = getFieldValue(sourceField);
  if (!value || value === "[ADD]") return;

  bodyEditor.querySelectorAll('.mail-field[data-placeholder="Destination"]').forEach(field => {
    if (field === document.activeElement) return;
    field.textContent = value;
    field.classList.add("filled");
    field.classList.remove("editing");
  });
}

partnerSelect.addEventListener("change", () => loadPartnerDetail(partnerSelect.value));

languageTabs.forEach(tab => {
  tab.addEventListener("click", () => renderTemplate(tab.dataset.lang));
});

openMailBtn.addEventListener("click", openOutlookMail);

clearEmailFields();
setupSubjectFields();
renderTemplate("en");
loadPartnerOptions();