const API_BASE = "https://notion-api-hub.vercel.app";
const $ = id => document.getElementById(id);

// 선적 정보
const poeSelect = $("poeSelect");
const polSelect = $("polSelect");
const containerSelect = $("containerSelect");

// 파트너 / BL TYPE
const bookingPartnerSelect = $("bookingPartnerSelect");
const blTypeSelect = $("blTypeSelect");
const partnerStatus = $("partnerStatus");

// 메일
const bodyInput = $("bodyInput");
const contactBox = $("contactBox");
const customerField = $("subjectCustomerName");
const subjectPrefix = $("subjectPrefix");
const openMailBtn = $("openMailBtn");

// 참조
const ccSelect = $("ccSelect");
const ccInput = $("ccInput");

// 운임표
const rateTbody = $("rateTbody");

// 문서 팝업
const partnerDocList = $("partnerDocList");
const partnerDocStatus = $("partnerDocStatus");
const partnerDocDialog = $("partnerDocDialog");
const partnerDocTitle = $("partnerDocTitle");
const partnerDocUpdated = $("partnerDocUpdated");
const partnerDocContent = $("partnerDocContent");
const partnerDocLink = $("partnerDocLink");
const partnerDocClose = $("partnerDocClose");

// 상태
let poeOptions = [];
let partners = [];
let rates = [];
let ccStaffList = [];
let ccTomSelect = null;
let manualForwarders = null;
let manualRateLookupFailed = false;

let selectedRows = new Set();
let lockedForwarderId = "";
let selectedForwarderName = "";
let selectedPoeName = "";

let poeVersion = 0;
let contactVersion = 0;
let selectedForwarderPersonName = "";
let inquiryOpening = false;
let contactLoading = false;

let documentListVersion = 0;
let documentDetailVersion = 0;

// 공통
function setStatus(message) {
  $("status").textContent = message || "";
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.ok === false) {
    const detail =
      data.details?.message ||
      (
        typeof data.details === "string"
          ? data.details
          : ""
      );

    throw new Error(
      [
        data.error || `조회 실패 (HTTP ${response.status})`,
        detail
      ]
        .filter(Boolean)
        .join(": ")
    );
  }

  return data;
}

function placeholder(select, text, disabled = true) {
  select.replaceChildren(new Option(text, ""));
  select.disabled = disabled;
}

function addOption(select, text, value) {
  select.add(new Option(text, value));
}

function getCustomerName() {
  const value = customerField.textContent
    .replace(/\u200B/g, "")
    .trim();

  return value === "[고객명]" ? "" : value;
}

// 선택정보 표시
function updateSummary() {
  const partner = partners.find(
    item => item.id === bookingPartnerSelect.value
  );

  const values = {
    summaryPoe: selectedPoeName,
    summaryPol: polSelect.value,
    summaryContainer: containerSelect.value,
    summaryPartner: partner?.name,
    summaryBlType: blTypeSelect.value,
    summaryForwarder: selectedForwarderName
  };

  Object.entries(values).forEach(([id, value]) => {
    if ($(id)) {
      $(id).textContent = value || "—";
    }
  });
}

// 서식 있는 본문의 자동 입력 필드 갱신
function replaceBodyLine(label, value) {
  const ids = {
    "화주명": "bodyCustomerName",
    "SIZE": "bodySize",
    "선사": "bodyCarriers",
    "BL TYPE": "bodyBlType"
  };

  const field = $(ids[label]);

  if (!field || field === document.activeElement) {
    return;
  }

  field.textContent = value;

  if (label === "화주명") {
    field.classList.toggle(
      "filled",
      !!value && value !== "[고객명]"
    );
  }
}

function syncBlType() {
  replaceBodyLine("BL TYPE", blTypeSelect.value || "");
  updateSummary();
}

function updateMailFields() {
  const pol = polSelect.value || "";
  const destination = selectedPoeName || "";

  subjectPrefix.textContent =
    `[퓨멕스/부킹요청] ${pol} TO ${destination} C/`;

  $("bodyPol").textContent = pol;
  $("bodyDestination").textContent = destination;

  replaceBodyLine(
    "화주명",
    getCustomerName() || "[고객명]"
  );

  replaceBodyLine(
    "SIZE",
    containerSelect.value || ""
  );

  syncBlType();
  syncRateInquiry();
}

// 본문 클릭 입력 필드
function setupBodyEditableFields() {
  bodyInput.querySelectorAll(".mail-field").forEach(field => {
    const placeholderText =
      field.dataset.placeholder || "[클릭하여 입력]";

    const valueOf = () =>
      field.textContent.replace(/\u200B/g, "").trim();

    function syncCustomer() {
      if (field.id !== "bodyCustomerName") return;

      const value = valueOf();

      customerField.textContent =
        !value || value === placeholderText
          ? "[고객명]"
          : value;

      customerField.classList.toggle(
        "filled",
        !!value && value !== placeholderText
      );

      customerField.classList.remove("editing");
    }

    function startEditing() {
      if (valueOf() !== placeholderText) return;

      field.textContent = "\u200B";
      field.classList.add("editing");

      const range = document.createRange();
      range.selectNodeContents(field);
      range.collapse(false);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    field.addEventListener("focus", startEditing);
    field.addEventListener("click", startEditing);

    field.addEventListener("input", () => {
      const value = valueOf();

      field.classList.toggle(
        "filled",
        !!value && value !== placeholderText
      );

      syncCustomer();
    });

    field.addEventListener("blur", () => {
      const value = valueOf();

      field.textContent = value || placeholderText;
      field.classList.remove("editing");

      field.classList.toggle(
        "filled",
        !!value && value !== placeholderText
      );

      syncCustomer();
    });

    field.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        field.blur();
      }
    });

    field.addEventListener("paste", event => {
      event.preventDefault();

      const value = event.clipboardData
        .getData("text/plain")
        .replace(/[\r\n]+/g, " ");

      const selection = window.getSelection();

      if (
        selection.rangeCount &&
        field.contains(
          selection.getRangeAt(0).commonAncestorContainer
        )
      ) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const node = document.createTextNode(value);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        field.textContent = value;
      }

      field.dispatchEvent(new Event("input"));
    });
  });
}

// 제목 고객명 입력 필드
function setupCustomerField() {
  function clearPlaceholder() {
    if (
      customerField.textContent.trim() !== "[고객명]"
    ) {
      return;
    }

    customerField.classList.add("editing");
    customerField.textContent = "\u200B";

    const range = document.createRange();
    range.selectNodeContents(customerField);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  customerField.addEventListener(
    "focus",
    clearPlaceholder
  );

  customerField.addEventListener(
    "click",
    clearPlaceholder
  );

  customerField.addEventListener("input", () => {
    customerField.classList.toggle(
      "filled",
      !!getCustomerName()
    );

    replaceBodyLine(
      "화주명",
      getCustomerName() || "[고객명]"
    );
  });

  customerField.addEventListener("blur", () => {
    const value = getCustomerName();

    customerField.textContent =
      value || "[고객명]";

    customerField.classList.remove("editing");

    customerField.classList.toggle(
      "filled",
      !!value
    );

    replaceBodyLine(
      "화주명",
      value || "[고객명]"
    );
  });

  customerField.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      customerField.blur();
    }
  });

  customerField.addEventListener("paste", event => {
    event.preventDefault();

    const value = event.clipboardData
      .getData("text/plain")
      .replace(/[\r\n]+/g, " ");

    const selection = window.getSelection();

    if (
      selection.rangeCount &&
      customerField.contains(
        selection.getRangeAt(0).commonAncestorContainer
      )
    ) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const node = document.createTextNode(value);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);

      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      customerField.textContent = value;
    }

    customerField.dispatchEvent(new Event("input"));
  });
}

// 선택한 선사를 중복 없이 본문에 반영
function syncSelectedCarriers() {
  const carriers = [...new Set(
    rates
      .filter(rate => selectedRows.has(rate.key))
      .map(rate => String(rate.carrier || "").trim())
      .filter(value => value && value !== "-")
  )];

  replaceBodyLine("선사", carriers.join(", "));
}

function updateMailButton() {
  openMailBtn.disabled =
    contactLoading || !contactBox.value.trim();

  syncRateInquiry();
}

// 운임 선택 초기화
function resetRates() {
  manualForwarders = null;
  contactVersion++;
  selectedRows.clear();
  lockedForwarderId = "";

  syncSelectedCarriers();

  selectedForwarderName = "";
  contactBox.value = "";
  selectedForwarderPersonName = "";
  contactLoading = false;

  updateMailButton();
  updateSummary();

  $("rateSelectionStatus").textContent =
    "운임 행을 클릭하거나 체크박스를 선택하세요.";
}

function showRateMessage(text) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 6;
  cell.className = "empty-msg";
  cell.textContent = text;

  row.appendChild(cell);
  rateTbody.replaceChildren(row);
}

// 운임이 없는 지역: 안내 문구와 전체 포워딩 드롭다운
function renderManualForwarders() {
  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 6;
  cell.style.padding = "20px 12px";

  const message = document.createElement("strong");

  message.textContent = "정기 운임 조사 지역 아님. 별도 문의 및 포워딩을 선택하여 부킹하세요.";
  message.style.display = "block";
  message.style.marginBottom = "12px";

  const label = document.createElement("label");

  label.htmlFor = "manualForwarderSelect";
  label.textContent = "포워딩 선택";
  label.style.display = "block";
  label.style.marginBottom = "6px";

  const select = document.createElement("select");

  select.id = "manualForwarderSelect";

  select.style.cssText =
    "width:100%;max-width:420px;min-height:40px;" +
    "padding:8px 12px;border:1px solid #cbd5e1;" +
    "border-radius:6px;background:#fff;font:inherit;";

  select.add(
    new Option(
      manualForwarders.length
        ? "포워딩을 선택하세요"
        : "등록된 포워딩이 없습니다",
      ""
    )
  );

  manualForwarders.forEach(item => {
    select.add(new Option(item.name, item.id));
  });

  select.disabled = !manualForwarders.length;
  select.value = lockedForwarderId;

  select.addEventListener("change", async () => {
    const selected = manualForwarders.find(
      item => item.id === select.value
    );

    lockedForwarderId = selected?.id || "";
    selectedForwarderName = selected?.name || "";

    updateSummary();

    $("rateSelectionStatus").textContent = selected
      ? `${selected.name} 선택`
      : "포워딩을 선택하세요.";

    await loadForwarderContact(lockedForwarderId);
  });

  cell.append(message, label, select);
  row.appendChild(cell);
  rateTbody.replaceChildren(row);
}

// 운임이 없을 때 전체 포워딩 목록 조회
async function loadManualForwarders(
  version,
  lookupFailed = false
) {
  if (version !== poeVersion) return;

  manualRateLookupFailed = lookupFailed;

  const title = "정기 운임 조사 지역 아님. 별도 문의 및 포워딩을 선택하여 부킹하세요.";

  showRateMessage(
    title + " · 포워딩 목록 불러오는 중..."
  );

  try {
    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/forwarder-options`
    );

    if (version !== poeVersion) return;

    manualForwarders = data.forwarders || [];

    renderManualForwarders();
    syncRateInquiry();

    $("rateSelectionStatus").textContent =
      "포워딩을 선택하세요.";
  } catch (error) {
    if (version !== poeVersion) return;

    showRateMessage(
      title + " · 포워딩 목록 로드 실패"
    );

    setStatus(error.message);
  }
}


// 운임표 렌더링
function renderRatesTable() {
  if (manualForwarders !== null) {
    renderManualForwarders();
    return;
  }

  if (!rates.length) {
    showRateMessage(
      "해당 POE의 운임 정보가 없습니다."
    );
    return;
  }

  const key = containerSelect.value.includes("40HC")
    ? "hc40"
    : "dr20";

  const sorted = [...rates].sort(
    (a, b) =>
      (a[key] || Infinity) - (b[key] || Infinity)
  );

  rateTbody.replaceChildren();

  for (const rate of sorted) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    const allowed =
      !!rate.forwarderId &&
      (
        !lockedForwarderId ||
        rate.forwarderId === lockedForwarderId
      );

    row.className =
      "rate-option" +
      (selectedRows.has(rate.key) ? " is-selected" : "") +
      (!allowed ? " is-locked" : "");

    row.dataset.rateKey = rate.key;
    cell.className = "rate-check-cell";

    if (allowed) {
      const check = document.createElement("input");

      check.type = "checkbox";
      check.className = "rate-check";
      check.checked = selectedRows.has(rate.key);

      check.setAttribute(
        "aria-label",
        `${rate.forwarderName} ${rate.carrier} 선택`
      );

      check.addEventListener("click", event => {
        event.stopPropagation();
      });

      check.addEventListener("change", () => {
        toggleRate(rate);
      });

      cell.appendChild(check);
      row.tabIndex = 0;

      row.addEventListener("click", () => {
        toggleRate(rate);
      });

      row.addEventListener("keydown", event => {
        if (
          event.target === row &&
          ["Enter", " "].includes(event.key)
        ) {
          event.preventDefault();
          toggleRate(rate);
        }
      });
    }

    row.appendChild(cell);

    const format = value =>
      value ? Number(value).toLocaleString() : "-";

    const values = [
      rate.forwarderName,
      rate.carrier,
      format(rate.dr20),
      format(rate.hc40),
      rate.validity
    ];

    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value || "-";
      row.appendChild(td);
    }

    rateTbody.appendChild(row);
  }
}

// 운임 선택 / 해제 및 포워딩 연락처 조회
// 운임 선택 / 해제
async function toggleRate(rate) {
  if (
    !rate.forwarderId ||
    (
      lockedForwarderId &&
      lockedForwarderId !== rate.forwarderId
    )
  ) {
    return;
  }

  if (selectedRows.has(rate.key)) {
    selectedRows.delete(rate.key);
  } else {
    selectedRows.add(rate.key);
  }

  const first = rates.find(
    item => selectedRows.has(item.key)
  );

  const nextId = first?.forwarderId || "";
  const changed = nextId !== lockedForwarderId;

  lockedForwarderId = nextId;
  selectedForwarderName = first?.forwarderName || "";

  syncSelectedCarriers();
  renderRatesTable();
  updateSummary();

  $("rateSelectionStatus").textContent = first
    ? `${selectedForwarderName} · ${selectedRows.size}개 운임 선택`
    : "운임 행을 클릭하거나 체크박스를 선택하세요.";

  if (!changed) return;

  await loadForwarderContact(nextId);
}

async function loadForwarderContact(nextId) {
  const version = ++contactVersion;

  contactBox.value = "";
  selectedForwarderPersonName = "";
  contactLoading = !!nextId;

  updateMailButton();

  if (!nextId) return;

  try {
    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/forwarder-contact?id=${encodeURIComponent(nextId)}`
    );

    if (
      version !== contactVersion ||
      lockedForwarderId !== nextId
    ) {
      return;
    }

    const matches = String(
      data.contact?.contact || ""
    ).match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];

    const emails = [
      ...new Map(
        matches.map(email => [
          email.toLowerCase(),
          email
        ])
      ).values()
    ];

    contactBox.value = emails.join(";");

    selectedForwarderPersonName = String(
      data.contact?.personName || ""
    ).trim();

    setStatus(
      emails.length
        ? "선택한 포워딩의 이메일을 불러왔습니다."
        : "선택한 포워딩 연락처에 이메일이 없습니다."
    );
  } catch (error) {
    if (version === contactVersion) {
      setStatus(
        "포워딩 연락처 조회 실패: " + error.message
      );
    }
  } finally {
    if (version === contactVersion) {
      contactLoading = false;
      updateMailButton();
    }
  }
}

// 파트너의 BL TYPE 목록
function updateBlTypeOptions() {
  const partner = partners.find(
    item => item.id === bookingPartnerSelect.value
  );

  placeholder(
    blTypeSelect,
    "먼저 파트너를 선택하세요"
  );

  syncBlType();

  if (!partner) return;

  const types = [...new Set(
    (partner.blTypes || []).filter(
      value =>
        typeof value === "string" &&
        value.trim()
    )
  )];

  placeholder(
    blTypeSelect,
    types.length
      ? "BL TYPE을 선택하세요"
      : "등록된 BL TYPE이 없습니다",
    !types.length
  );

  types.forEach(value => {
    addOption(blTypeSelect, value, value);
  });

  partnerStatus.textContent = types.length
    ? `BL TYPE ${types.length}개 중 선택해 주세요.`
    : "등록된 BL TYPE이 없습니다.";
}

// PORT CODE가 여러 개면 각각 조회한 뒤 중복 결과를 제거합니다.
// 운임과 파트너는 노션 행 ID, POL은 문자열 값을 기준으로 중복 제거합니다.
async function fetchPortMatches(route, codes) {
  const results = await Promise.all(
    codes.map(code =>
      fetchJson(
        `${API_BASE}/api/mail/booking/${route}?poe=${encodeURIComponent(code)}`
      )
    )
  );

  const key =
    route === "pol-options" ? "options" : route;

  const unique = new Map();

  results.forEach(result => {
    (result[key] || []).forEach(item => {
      const id =
        typeof item === "string" ? item : item.id;

      unique.set(id, item);
    });
  });

  return {
    ok: true,
    [key]: [...unique.values()]
  };
}

// POE 변경
async function onPoeChange() {
  const version = ++poeVersion;

  const selectedPort = poeOptions.find(
    item =>
      (item.id || item.code) === poeSelect.value
  );

  const poe = selectedPort?.code || "";

  selectedPoeName = selectedPort?.name || poe;

  resetRates();

  rates = [];
  partners = [];

  clearPartnerDocuments();
  setStatus("");

  placeholder(
    polSelect,
    "먼저 POE를 선택하세요"
  );

  placeholder(
    bookingPartnerSelect,
    "먼저 POE를 선택하세요"
  );

  placeholder(
    blTypeSelect,
    "먼저 파트너를 선택하세요"
  );

  updateMailFields();

  if (!poe) {
    showRateMessage(
      "POE를 선택하면 운임 정보가 표시됩니다."
    );

    partnerStatus.textContent =
      "POE를 선택해 주세요.";

    return;
  }

  const codes = selectedPort?.codes?.length
    ? selectedPort.codes
    : poe
        .split(",")
        .map(code => code.trim())
        .filter(Boolean);

  // POL 목록 설정
  function setPolOptions(options) {
    if (version !== poeVersion) return;

    const values = [...new Set(options)];

    placeholder(
      polSelect,
      values.length
        ? "POL을 선택하세요"
        : "등록된 POL이 없습니다",
      !values.length
    );

    values.forEach(value => {
      addOption(polSelect, value, value);
    });

    updateMailFields();
  }

  placeholder(
    polSelect,
    "POL 불러오는 중..."
  );

  placeholder(
    bookingPartnerSelect,
    "파트너 불러오는 중..."
  );

  partnerStatus.textContent =
    "파트너 목록을 불러오는 중입니다.";

  showRateMessage("운임표 불러오는 중...");

  await Promise.all([
    // 파트너 목록은 기존 방식 유지
    (async () => {
      try {
        const data = await fetchPortMatches(
          "partners",
          codes
        );

        if (version !== poeVersion) return;

        partners = data.partners || [];

        placeholder(
          bookingPartnerSelect,
          partners.length
            ? "파트너를 선택하세요"
            : "일치하는 파트너가 없습니다",
          !partners.length
        );

        partners.forEach(item => {
          addOption(
            bookingPartnerSelect,
            item.name,
            item.id
          );
        });

        partnerStatus.textContent =
          `파트너 ${partners.length}개를 불러왔습니다.`;
      } catch (error) {
        if (version !== poeVersion) return;

        placeholder(
          bookingPartnerSelect,
          "파트너 로드 실패"
        );

        partnerStatus.textContent =
          "파트너 목록 조회 실패";

        console.error(
          "파트너 조회 실패:",
          error
        );
      }
    })(),

    // 운임 결과를 먼저 확인한 다음 POL과 포워딩 처리
    (async () => {
      let rateData;

      try {
        rateData = await fetchPortMatches(
          "rates",
          codes
        );
      } catch (error) {
        if (version !== poeVersion) return;

        // 조회 오류가 발생해도 포워딩 직접 선택 허용
        setPolOptions([
          "INCHEON",
          "BUSAN"
        ]);

        await loadManualForwarders(
          version,
          true
        );

        if (version !== poeVersion) return;

        setStatus("");

        console.error(
          "운임 조회 실패:",
          error
        );

        return;
      }

      if (version !== poeVersion) return;

      const rawRates = rateData.rates || [];

      // 운임이 없으면 기본 POL과 전체 포워딩 표시
      if (!rawRates.length) {
        setPolOptions([
          "INCHEON",
          "BUSAN"
        ]);

        await loadManualForwarders(version);

        return;
      }

      // 운임이 있으면 기존 운임표 표시
      rates = rawRates.flatMap(rate => {
        const linked = (
          rate.linkedForwarders || []
        ).filter(Boolean);

        if (linked.length) {
          return linked.map(item => ({
            ...rate,
            key: `${rate.id}|${item.id}`,
            forwarderId: item.id,
            forwarderName: item.name
          }));
        }

        return [{
          ...rate,
          key: rate.id,
          forwarderId: "",
          forwarderName:
            rate.forwarder || "-"
        }];
      });

      renderRatesTable();

      // 운임이 있는 지역은 기존 POL 조회 방식 사용
      try {
        const data = await fetchPortMatches(
          "pol-options",
          codes
        );

        if (version !== poeVersion) return;

        setPolOptions(data.options || []);
      } catch (error) {
        if (version !== poeVersion) return;

        placeholder(
          polSelect,
          "POL 로드 실패"
        );

        setStatus(
          "POL 조회 실패: " + error.message
        );
      }
    })()
  ]);
}

// 참조 직원 목록
async function loadCcStaffOptions() {
  placeholder(
    ccSelect,
    "직원 목록 불러오는 중..."
  );

  ccInput.value = "";

  try {
    const result = await fetchJson(
      `${API_BASE}/api/sales-info`
    );

    ccStaffList = (
      Array.isArray(result.data) ? result.data : []
    )
      .filter(staff =>
        String(staff.korean_name || "").trim()
      )
      .sort((a, b) =>
        a.korean_name.localeCompare(
          b.korean_name,
          "ko"
        )
      );

    placeholder(
      ccSelect,
      ccStaffList.length
        ? "참조 직원을 선택하세요"
        : "등록된 직원이 없습니다",
      !ccStaffList.length
    );

    for (const staff of ccStaffList) {
      const option = new Option(
        staff.korean_name,
        staff.id
      );

      option.disabled =
        !String(staff.email || "").trim();

      ccSelect.add(option);
    }

    ccTomSelect = new TomSelect("#ccSelect", {
      create: false,
      maxItems: 1,
      maxOptions: null,
      searchField: ["text"],
      placeholder: "참조 영업 담당 선택",
      allowEmptyOption: false,

      score: search => {
        const query = String(search || "")
          .trim()
          .toLocaleLowerCase();

        return item => {
          const name = String(item.text || "")
            .toLocaleLowerCase();

          return !query || name.includes(query) ? 1 : 0;
        };
      },

      render: {
        no_results: () =>
          '<div class="no-results">일치하는 직원이 없습니다.</div>'
      }
    });

    if (!ccStaffList.length) {
      ccTomSelect.disable();
    }
  } catch (error) {
    placeholder(
      ccSelect,
      "직원 목록 로드 실패"
    );

    setStatus(
      "참조 직원 목록 조회 실패: " + error.message
    );
  }
}

// 클립보드에 넣을 HTML / 일반 텍스트 생성
function getMailClipboardContent(source = bodyInput) {
  const clone = source.cloneNode(true);

  clone.querySelectorAll(".mail-field").forEach(field => {
    const value = field.textContent
      .replace(/\u200B/g, "")
      .trim();

    if (
      field.dataset.placeholder === "[클릭하여 입력]" &&
      value === "[클릭하여 입력]"
    ) {
      field.textContent = "";
    }

    // 입력칸 스타일만 제거하고 경로 서식은 유지
    field.style.cssText =
      "background:transparent;" +
      "color:inherit;" +
      "border:none;" +
      "padding:0;" +
      "margin:0;" +
      "font-weight:inherit;";
  });

  clone.querySelectorAll("*").forEach(element => {
    [
      "contenteditable",
      "class",
      "id",
      "role",
      "aria-label",
      "data-placeholder"
    ].forEach(attribute => {
      element.removeAttribute(attribute);
    });
  });

  const text = Array.from(clone.children)
    .map(line => line.textContent)
    .join("\n")
    .replace(/\u200B/g, "");

  const html =
    `<div style="font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:10pt;line-height:1.5;">` +
    clone.innerHTML.replace(/\u200B/g, "") +
    `</div>`;

  return { text, html };
}

// 본문 서식 포함 복사
async function copyMailBody(source = bodyInput) {
  const { text, html } = getMailClipboardContent(source);

  if (
    navigator.clipboard &&
    window.ClipboardItem
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob(
            [html],
            { type: "text/html" }
          ),
          "text/plain": new Blob(
            [text],
            { type: "text/plain" }
          )
        })
      ]);

      return;
    } catch {
      // 대체 복사 방식으로 진행
    }
  }

  const temp = document.createElement("div");

  temp.innerHTML = html;
  temp.contentEditable = "true";
  temp.style.cssText =
    "position:fixed;left:-9999px;top:0";

  document.body.appendChild(temp);

  const selection = window.getSelection();
  const saved = [];

  for (let i = 0; i < selection.rangeCount; i++) {
    saved.push(
      selection.getRangeAt(i).cloneRange()
    );
  }

  try {
    const range = document.createRange();
    range.selectNodeContents(temp);

    selection.removeAllRanges();
    selection.addRange(range);

    if (!document.execCommand("copy")) {
      throw new Error("본문 복사 실패");
    }
  } finally {
    temp.remove();
    selection.removeAllRanges();

    saved.forEach(range => {
      selection.addRange(range);
    });
  }
}

// Outlook 신규 메일창
async function openOutlookMail() {
  if (
    !contactBox.value.trim() ||
    contactLoading
  ) {
    return;
  }

  openMailBtn.disabled = true;

  try {
    const subject =
      subjectPrefix.textContent +
      (getCustomerName() || "[고객명]");

    await copyMailBody();

    const params = new URLSearchParams({
      subject
    });

    if (ccInput.value.trim()) {
      params.set(
        "cc",
        ccInput.value.trim()
      );
    }

    window.location.href =
      `mailto:${contactBox.value}?${params.toString()}`;

    setStatus(
      "본문이 복사되었습니다. 새 메일창에서 Ctrl + V로 붙여넣으세요."
    );
  } catch (error) {
    setStatus(
      error.message || "메일 본문 복사 실패"
    );
  } finally {
    updateMailButton();
  }
}

// 문서 목록 초기화
function clearPartnerDocuments() {
  documentListVersion++;
  documentDetailVersion++;

  partnerDocList.replaceChildren();

  partnerDocStatus.textContent =
    "파트너를 선택하면 선사 관련 문서를 표시합니다.";

  if (partnerDocDialog.open) {
    partnerDocDialog.close();
  }
}

function formatDocDate(date) {
  if (!date?.start) {
    return "업데이트일자 미등록";
  }

  return date.end
    ? `${date.start} ~ ${date.end}`
    : date.start;
}

function setDocumentLink(url) {
  partnerDocLink.hidden = true;
  partnerDocLink.removeAttribute("href");

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") return;

    partnerDocLink.href = parsed.href;
    partnerDocLink.hidden = false;
  } catch {
    // 유효하지 않은 링크는 표시하지 않음
  }
}

// 선사 관련 문서 목록
async function loadPartnerDocuments(partnerId) {
  clearPartnerDocuments();

  if (!partnerId) return;

  const version = documentListVersion;

  partnerDocStatus.textContent =
    "선사 관련 문서를 불러오는 중입니다.";

  try {
    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/partner-documents?partnerId=${encodeURIComponent(partnerId)}`
    );

    if (version !== documentListVersion) return;

    const documents = Array.isArray(data.documents)
      ? data.documents
      : [];

    partnerDocStatus.textContent = documents.length
      ? `문서 ${documents.length}개 · 제목을 누르면 내용을 볼 수 있습니다.`
      : "등록된 선사 관련 문서가 없습니다.";

    for (const doc of documents) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      const title = document.createElement("span");
      const date = document.createElement("small");

      button.type = "button";
      button.className = "partner-doc-button";

      title.className = "doc-title";
      title.textContent = doc.title || "제목 없음";

      date.textContent =
        "업데이트 " +
        formatDocDate(doc.updatedDate);

      button.append(title, date);

      button.addEventListener("click", () => {
        openPartnerDocument(doc, partnerId);
      });

      li.appendChild(button);
      partnerDocList.appendChild(li);
    }
  } catch (error) {
    if (version !== documentListVersion) return;

    partnerDocStatus.textContent =
      "문서를 불러오지 못했습니다. 파트너를 다시 선택해 주세요.";

    console.error(
      "파트너 문서 목록 조회 실패:",
      error
    );
  }
}

// 문서 본문 팝업
async function openPartnerDocument(summary, partnerId) {
  const version = ++documentDetailVersion;

  partnerDocTitle.textContent =
    summary.title || "제목 없음";

  partnerDocUpdated.textContent =
    "업데이트일자: " +
    formatDocDate(summary.updatedDate);

  partnerDocContent.textContent =
    "본문을 불러오는 중입니다.";

  setDocumentLink(summary.url);

  if (!partnerDocDialog.open) {
    partnerDocDialog.showModal();
  }

  try {
    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/partner-documents/${encodeURIComponent(summary.id)}?partnerId=${encodeURIComponent(partnerId)}`
    );

    if (
      version !== documentDetailVersion ||
      !partnerDocDialog.open
    ) {
      return;
    }

    const doc = data.document;

    partnerDocTitle.textContent =
      doc.title || "제목 없음";

    partnerDocUpdated.textContent =
      "업데이트일자: " +
      formatDocDate(doc.updatedDate);

    if (doc.html) {
      partnerDocContent.innerHTML = doc.html;
    } else {
      partnerDocContent.textContent =
        "표시할 텍스트 본문이 없습니다.";
    }

    setDocumentLink(doc.url);
  } catch (error) {
    if (
      version !== documentDetailVersion ||
      !partnerDocDialog.open
    ) {
      return;
    }

    partnerDocContent.textContent =
      "본문을 불러오지 못했습니다. 아래 버튼으로 노션 원문을 확인해 주세요.";

    console.error(
      "파트너 문서 본문 조회 실패:",
      error
    );
  }
}

// 로그인 아이디 → 운임 문의 발송자 이름
function getInquirySender() {
  const names = {
    admin: "지아름",
    opere: "지아름",
    opero: "노해원",
    dami: "소다미",
    ssy: "송소연"
  };

  const username = String(
    localStorage.getItem("username") || ""
  )
    .trim()
    .toLowerCase();

  return names[username] || "";
}

// 운임 문의 화면과 버튼 상태 갱신
function syncRateInquiry() {
  const card = $("rateInquiryCard");

  if (!card) return;

  // 운임이 없어 직접 포워딩을 선택하는 경우에 표시
  card.hidden = manualForwarders === null;

  const sender = getInquirySender();

  $("inquiryTo").value = contactBox.value;

  $("inquiryPerson").textContent =
    selectedForwarderPersonName || "[담당자 이름]";

  $("inquirySender").textContent =
    sender || "[발송자]";

  $("inquiryGreetingPerson").textContent =
  selectedForwarderPersonName || "[담당자 이름]";

  $("inquiryGreetingSender").textContent =
    sender || "[발송자]";

  $("inquiryPol").textContent =
    polSelect.value || "[POL]";

  $("inquiryPoe").textContent =
    selectedPoeName || "[POE]";

  $("inquiryContainer").textContent =
    containerSelect.value.split("*")[0].trim() || "[선택된 컨테이너]";

  const subjectField = $("inquirySubject");

  const autoSubject =
    `[퓨멕스/운임문의] ${polSelect.value || ""} TO ${selectedPoeName || ""}`;

  // 사용자가 직접 수정한 제목은 유지
  if (
    !subjectField.value ||
    subjectField.value === subjectField.dataset.autoSubject
  ) {
    subjectField.value = autoSubject;
  }

  subjectField.dataset.autoSubject = autoSubject;

  const ready =
    !!lockedForwarderId &&
    !!contactBox.value.trim() &&
    !!selectedForwarderPersonName &&
    !!sender &&
    !contactLoading;

  $("openInquiryBtn").disabled =
    !ready || inquiryOpening;

  $("inquiryStatus").textContent =
    contactLoading
      ? "포워딩 정보를 불러오는 중입니다."
      : !lockedForwarderId
        ? "위 운임표에서 포워딩을 선택하세요."
        : !contactBox.value.trim()
          ? "선택한 포워딩의 이메일을 확인해주세요."
          : !selectedForwarderPersonName
            ? "포워딩 DB의 담당자 이름을 입력해주세요."
            : !sender
              ? "로그인 아이디의 발송자 이름이 등록되어 있지 않습니다."
              : "";
}

// 본문 복사 + Outlook 신규 메일창
async function openRateInquiry() {
  const subject = $("inquirySubject").value.trim();

  // 클릭 시점의 로그인 정보와 선택 상태 확인
  syncRateInquiry();

  if ($("openInquiryBtn").disabled) return;

  $("inquirySubject").value = subject;

  if (!subject) {
    $("inquiryStatus").textContent =
      "메일 제목을 입력해주세요.";
    return;
  }

  const forwarderId = lockedForwarderId;
  const version = contactVersion;
  const username = localStorage.getItem("username");
  const recipient = contactBox.value.trim();

  inquiryOpening = true;
  $("openInquiryBtn").disabled = true;

  let resultMessage;

  try {
    // 기존 부킹메일과 같은 방식으로 서식 포함 복사
    await copyMailBody($("inquiryBody"));

    // 복사 중 포워딩이나 로그인 정보가 바뀌면 중단
    if (
      version !== contactVersion ||
      forwarderId !== lockedForwarderId ||
      username !== localStorage.getItem("username")
    ) {
      resultMessage =
        "선택 또는 로그인 정보가 변경되었습니다. 다시 눌러주세요.";
      return;
    }

    const params = new URLSearchParams({
      subject
    });

    window.location.href =
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}`;

    resultMessage =
      "본문이 복사되었습니다. 새 메일창에서 Ctrl + V로 붙여넣으세요.";
  } catch (error) {
    resultMessage =
      error.message || "운임 문의 본문 복사 실패";
  } finally {
    inquiryOpening = false;

    syncRateInquiry();

    if (resultMessage) {
      $("inquiryStatus").textContent = resultMessage;
    }
  }
}

// 운임 문의 버튼
$("openInquiryBtn").addEventListener(
  "click",
  openRateInquiry
);

// 다른 화면에서 돌아왔을 때 로그인 정보 재확인
window.addEventListener(
  "focus",
  syncRateInquiry
);

// 다른 탭에서 로그인 계정이 변경된 경우 반영
window.addEventListener("storage", event => {
  if (
    event.key === "username" ||
    event.key === null
  ) {
    syncRateInquiry();
  }
});

// 이벤트 연결
poeSelect.addEventListener(
  "change",
  onPoeChange
);

polSelect.addEventListener(
  "change",
  updateMailFields
);

containerSelect.addEventListener("change", () => {
  updateMailFields();
  renderRatesTable();
});

bookingPartnerSelect.addEventListener("change", () => {
  updateBlTypeOptions();
  updateSummary();

  loadPartnerDocuments(
    bookingPartnerSelect.value
  );
});

blTypeSelect.addEventListener(
  "change",
  syncBlType
);

openMailBtn.addEventListener(
  "click",
  openOutlookMail
);

ccSelect.addEventListener("change", () => {
  const staff = ccStaffList.find(
    item => item.id === ccSelect.value
  );

  ccInput.value = staff?.email || "";
});

partnerDocClose.addEventListener("click", () => {
  partnerDocDialog.close();
});

partnerDocDialog.addEventListener("close", () => {
  documentDetailVersion++;
});

partnerDocDialog.addEventListener("click", event => {
  if (event.target !== partnerDocDialog) return;

  const rect = partnerDocDialog.getBoundingClientRect();

  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    partnerDocDialog.close();
  }
});

// 초기화
setupCustomerField();
setupBodyEditableFields();
updateMailFields();
updateMailButton();

// POE 목록 불러오기
(async () => {
  try {
    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/poe-options`
    );

    poeOptions = data.options || [];

    placeholder(
      poeSelect,
      "POE를 선택하세요",
      false
    );

    poeOptions.forEach(item => {
      addOption(
        poeSelect,
        item.label || item.name || item.code,
        item.id || item.code
      );
    });

    new TomSelect("#poeSelect", {
      create: false,
      maxOptions: null,
      placeholder: "POE를 입력해서 검색하세요"
    });
  } catch (error) {
    placeholder(
      poeSelect,
      "POE 로드 실패"
    );

    setStatus(error.message);
  }
})();

// 참조 직원 목록 불러오기
loadCcStaffOptions();