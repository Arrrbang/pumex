const API_BASE = "https://notion-api-hub.vercel.app";

const poeSelect = document.getElementById("poeSelect");
const forwarderSelect = document.getElementById("forwarderSelect");
const contactBox = document.getElementById("contactBox");
const polSelect = document.getElementById("polSelect");

const shipperInput = document.getElementById("shipperInput");
const containerSelect = document.getElementById("containerSelect");

const subjectInput = document.getElementById("subjectInput");
const bodyInput = document.getElementById("bodyInput");
const openMailBtn = document.getElementById("openMailBtn");
const statusBox = document.getElementById("status");

// ⭐️ 표 내용이 들어갈 tbody
const rateTbody = document.getElementById("rateTbody");

let selectedContactText = "";
let selectedForwarderName = "";
let selectedPoeCode = "";
let selectedPoeName = "";

let poeDataList = [];
// ⭐️ 운임표 원본 데이터를 저장해둘 배열
let currentRatesData = [];

function setStatus(msg) {
  statusBox.textContent = msg || "";
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "API 요청 실패");
  }
  return data;
}

function extractEmails(text) {
  const matches = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return matches ? [...new Set(matches)] : [];
}

function updateMailContent() {
  const pol = polSelect.value || "";
  const shipper = shipperInput.value || "";
  const size = containerSelect.value || "";
  const podName = selectedPoeName || "";

  subjectInput.value = `[퓨멕스/부킹요청] ${pol} TO ${podName} C/${shipper}`;

  bodyInput.value =
`하기와 같이 부킹 디테일 전달 드리오니 부킹 진행 부탁 드립니다.

${pol} TO ${podName}
화주명 : ${shipper}
SIZE : ${size}
픽업지 : 
운송사 : 
픽업일 : 
서류마감가능일 : 
선사 : 
BL TYPE : `;
}

function updateMailButtonState() {
  const emails = extractEmails(selectedContactText);
  openMailBtn.disabled = !emails.length;
}

// ⭐️ 표를 정렬하고 화면에 그리는 함수
function renderRatesTable() {
  if (!currentRatesData || currentRatesData.length === 0) {
    if (rateTbody) rateTbody.innerHTML = `<tr><td colspan="5" class="empty-msg">해당 POE의 운임 정보가 없습니다.</td></tr>`;
    return;
  }

  // 원본 데이터는 건드리지 않고 복사본으로 정렬 진행
  let sortedData = [...currentRatesData];
  const size = containerSelect.value;

  // 사이즈 선택에 따른 오름차순 정렬 로직 (값이 0이거나 없으면 무조건 맨 아래로)
  if (size.includes("20DR")) {
    sortedData.sort((a, b) => {
      const valA = a.dr20 || Infinity;
      const valB = b.dr20 || Infinity;
      return valA - valB;
    });
  } else if (size.includes("40HC")) {
    sortedData.sort((a, b) => {
      const valA = a.hc40 || Infinity;
      const valB = b.hc40 || Infinity;
      return valA - valB;
    });
  }

  // 기존 표 내용 지우기
  rateTbody.innerHTML = "";

  // 정렬된 데이터로 표 다시 그리기
  sortedData.forEach(rate => {
    const tr = document.createElement("tr");

    // 0원이거나 값이 없으면 하이픈(-) 처리
    const dr20 = rate.dr20 ? rate.dr20.toLocaleString() : "-";
    const hc40 = rate.hc40 ? rate.hc40.toLocaleString() : "-";

    tr.innerHTML = `
      <td>${rate.forwarder}</td>
      <td>${rate.carrier}</td>
      <td>${dr20}</td>
      <td>${hc40}</td>
      <td>${rate.validity}</td>
    `;
    rateTbody.appendChild(tr);
  });
}

// ⭐️ 선택된 POE에 해당하는 운임표 로드
async function loadRatesByPoe(poe) {
  try {
    rateTbody.innerHTML = `<tr><td colspan="5" class="empty-msg">운임표 로딩 중...</td></tr>`;

    const data = await fetchJson(`${API_BASE}/api/mail/booking/rates?poe=${encodeURIComponent(poe)}`);

    // 불러온 데이터를 변수에 저장
    currentRatesData = data.rates || [];
    
    // 표 그리기 함수 호출
    renderRatesTable();

  } catch (err) {
    rateTbody.innerHTML = `<tr><td colspan="5" class="empty-msg" style="color:red;">운임표 로드 실패</td></tr>`;
    console.error("운임표 로드 에러:", err);
  }
}

async function loadPoeOptions() {
  try {
    setStatus("POE 목록 불러오는 중...");
    const data = await fetchJson(`${API_BASE}/api/mail/booking/poe-options`);
    
    poeDataList = data.options; 

    poeSelect.innerHTML = `<option value="">POE 검색 또는 선택...</option>`;
    
    data.options.forEach(item => {
      const option = document.createElement("option");
      option.value = item.code;
      option.textContent = item.label || item.name || item.code;
      poeSelect.appendChild(option);
    });

    new TomSelect("#poeSelect", {
      create: false,
      maxOptions: null,
      placeholder: "POE를 입력해서 검색하세요",
    });

    setStatus(`POE ${data.options.length}개 로드 완료`);
  } catch (err) {
    poeSelect.innerHTML = `<option value="">POE 로드 실패</option>`;
    setStatus(err.message);
  }
}

async function loadForwardersByPoe(poe) {
  try {
    forwarderSelect.disabled = true;
    forwarderSelect.innerHTML = `<option value="">포워딩 로딩 중...</option>`;
    selectedContactText = "";
    selectedForwarderName = "";
    contactBox.value = "";
    resetPolSelect();

    setStatus("포워딩 목록 불러오는 중...");

    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/forwarders?poe=${encodeURIComponent(poe)}`
    );

    forwarderSelect.innerHTML = `<option value="">포워딩을 선택하세요</option>`;

    data.forwarders.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      forwarderSelect.appendChild(option);
    });

    forwarderSelect.disabled = false;
    setStatus(`포워딩 ${data.forwarders.length}개 로드 완료`);
  } catch (err) {
    forwarderSelect.innerHTML = `<option value="">포워딩 로드 실패</option>`;
    setStatus(err.message);
  }
}

async function loadForwarderContact(id) {
  try {
    contactBox.value = "";
    selectedContactText = "";
    selectedForwarderName = "";
    updateMailButtonState();
    setStatus("연락처 불러오는 중...");

    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/forwarder-contact?id=${encodeURIComponent(id)}`
    );

    selectedForwarderName = data.contact?.name || "";
    selectedContactText = data.contact?.contact || "";
    contactBox.value = selectedContactText;

    const emails = extractEmails(selectedContactText);
    setStatus(
      emails.length
        ? `연락처 로드 완료 / 이메일 ${emails.length}개 발견`
        : "연락처는 로드됐지만 이메일 주소를 찾지 못했습니다."
    );

    updateMailButtonState();
  } catch (err) {
    contactBox.value = "";
    selectedContactText = "";
    updateMailButtonState();
    setStatus(err.message);
  }
}

function resetPolSelect() {
  polSelect.disabled = true;
  polSelect.innerHTML = `<option value="">먼저 POE와 포워딩을 선택하세요</option>`;
  updateMailContent();
}

async function loadPolOptions() {
  const poe = selectedPoeCode;
  const forwarderId = forwarderSelect.value;

  if (!poe || !forwarderId) {
    resetPolSelect();
    return;
  }

  try {
    polSelect.disabled = true;
    polSelect.innerHTML = `<option value="">POL 로딩 중...</option>`;

    const data = await fetchJson(
      `${API_BASE}/api/mail/booking/pol-options?poe=${encodeURIComponent(poe)}&forwarderId=${encodeURIComponent(forwarderId)}`
    );

    polSelect.innerHTML = `<option value="">POL을 선택하세요</option>`;

    data.options.forEach(pol => {
      const option = document.createElement("option");
      option.value = pol;
      option.textContent = pol;
      polSelect.appendChild(option);
    });

    polSelect.disabled = false;
    setStatus(`POL ${data.options.length}개 로드 완료`);
  } catch (err) {
    polSelect.innerHTML = `<option value="">POL 로드 실패</option>`;
    setStatus(err.message);
  }
}

function openOutlookMail() {
  const emails = extractEmails(selectedContactText);
  if (!emails.length) {
    alert("연락처에서 이메일 주소를 찾을 수 없습니다.");
    return;
  }
  updateMailContent();
  const to = emails.join(";");
  const subject = subjectInput.value || "";
  const body = bodyInput.value || "";

  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

// ⭐️ 이벤트 리스너
poeSelect.addEventListener("change", () => {
  selectedPoeCode = poeSelect.value;
  
  const matchedPoe = poeDataList.find(p => p.code === selectedPoeCode);
  selectedPoeName = matchedPoe ? (matchedPoe.name || matchedPoe.code) : selectedPoeCode;

  forwarderSelect.innerHTML = `<option value="">먼저 POE를 선택하세요</option>`;
  forwarderSelect.disabled = true;

  selectedContactText = "";
  selectedForwarderName = "";
  contactBox.value = "";

  resetPolSelect();
  updateMailButtonState();
  updateMailContent();

  if (selectedPoeCode) {
    loadForwardersByPoe(selectedPoeCode);
    loadRatesByPoe(selectedPoeCode); // 표 데이터 불러오기
  } else {
    rateTbody.innerHTML = `<tr><td colspan="5" class="empty-msg">POE를 선택하면 운임 정보가 표시됩니다.</td></tr>`;
    currentRatesData = [];
  }
});

forwarderSelect.addEventListener("change", async () => {
  const id = forwarderSelect.value;
  selectedContactText = "";
  contactBox.value = "";
  updateMailButtonState();
  resetPolSelect();
  if (id) {
    await loadForwarderContact(id);
    await loadPolOptions();
  }
});

polSelect.addEventListener("change", updateMailContent);

shipperInput.addEventListener("input", updateMailContent);
shipperInput.addEventListener("change", updateMailContent);

// ⭐️ 컨테이너 타입이 변경될 때마다 메일 내용 업데이트 및 표 정렬 새로 실행
containerSelect.addEventListener("change", () => {
  updateMailContent();
  renderRatesTable(); 
});

openMailBtn.addEventListener("click", openOutlookMail);

// 초기화 시작
loadPoeOptions();
updateMailContent();