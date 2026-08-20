import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.mjs";

const dropZone = document.getElementById("dropZone");
const pdfInput = document.getElementById("pdfInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileMeta = document.getElementById("fileMeta");
const clearFile = document.getElementById("clearFile");
const loading = document.getElementById("loading");
const currencyBox = document.getElementById("currencyBox");
const exchangeRateElement = document.getElementById("exchangeRate");
const exchangeRateSubElement = document.getElementById("exchangeRateSub");
const emptyState = document.getElementById("emptyState");
const tableWrap = document.getElementById("tableWrap");
const extractTableBody = document.getElementById("extractTableBody");
const resultCount = document.getElementById("resultCount");

dropZone.addEventListener("click", () => pdfInput.click());

dropZone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pdfInput.click();
  }
});

pdfInput.addEventListener("change", event => {
  const file = event.target.files[0];

  if (file) {
    readPDF(file);
  }
});

dropZone.addEventListener("dragover", event => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", event => {
  event.preventDefault();

  dropZone.classList.remove("dragover");

  const file = event.dataTransfer.files[0];

  if (!file) return;

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    alert("PDF 파일만 업로드할 수 있습니다.");
    return;
  }

  readPDF(file);
});

clearFile.addEventListener("click", event => {
  event.stopPropagation();

  resetUI();

  pdfInput.value = "";
});


/* =========================================================
   PDF READ
========================================================= */

async function readPDF(file) {
  try {
    setLoading(true);

    resetResultOnly();

    fileInfo.classList.remove("is-hidden");

    fileName.textContent = file.name;

    fileMeta.textContent =
      `${(file.size / 1024 / 1024).toFixed(2)} MB · 분석 중`;

    const buffer =
      await file.arrayBuffer();

    const pdf =
      await pdfjsLib.getDocument({
        data: buffer
      }).promise;

    fileMeta.textContent =
      `${(file.size / 1024 / 1024).toFixed(2)} MB · ${pdf.numPages} page(s)`;

    const extractedProducts = [];

    const allLines = [];


    /* =========================================================
       PAGE LOOP
    ========================================================= */

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page =
        await pdf.getPage(pageNumber);

      const textContent =
        await page.getTextContent();


      /* =========================================================
         PDF TEXT ITEMS
      ========================================================= */

      const items =
        textContent.items

          .filter(item =>
            item.str.trim() !== ""
          )

          .map(item => ({
            text:
              item.str.trim(),

            x:
              item.transform[4],

            y:
              item.transform[5],

            width:
              item.width,

            height:
              item.height,

            dir:
              item.dir || "ltr"
          }));


      /* =========================================================
         좌표 기준 LINE 생성
      ========================================================= */

      const lines =
        groupItemsIntoLines(items);


      allLines.push(
        ...lines
      );


      /* =========================================================
         PRODUCT 추출
      ========================================================= */

      extractedProducts.push(
        ...extractProductRows(lines)
      );
    }


    /* =========================================================
       SAR / USD TOTAL 추출
    ========================================================= */

    const currency =
      extractCurrencyTotals(
        allLines
      );


    /* =========================================================
       환율 계산
       1 SAR = ? USD
    ========================================================= */

    const exchangeRate =
      currency.sar !== null &&
      currency.usd !== null &&
      currency.sar !== 0

        ? currency.usd / currency.sar

        : null;


    /* =========================================================
       UI 출력
    ========================================================= */

    renderExchangeRate(
      exchangeRate
    );

    renderExtractedProducts(
      extractedProducts,
      exchangeRate,
      currency
    );


    currencyBox.classList.remove(
      "is-hidden"
    );


    /* =========================================================
       다른 JS에서 사용할 수 있도록 저장
    ========================================================= */

    window.pdfExtractedProducts =
      extractedProducts;

    window.pdfCurrency = {
      ...currency,
      exchangeRate
    };


    console.log(
      "EXTRACTED PRODUCTS",
      extractedProducts
    );

    console.log(
      "CURRENCY",
      window.pdfCurrency
    );

  }

  catch (error) {
    console.error(error);

    alert(
      "PDF를 읽는 중 오류가 발생했습니다."
    );

    resetResultOnly();
  }

  finally {
    setLoading(false);
  }
}


/* =========================================================
   PDF TEXT → LINE
========================================================= */

function groupItemsIntoLines(items) {

  const Y_TOLERANCE = 3;


  /*
  Y 높은 순서,
  같은 줄이면 X 낮은 순서
  */

  items.sort((a, b) => {

    if (
      Math.abs(
        b.y - a.y
      ) > Y_TOLERANCE
    ) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });


  const lines = [];


  items.forEach(item => {

    let targetLine = null;


    for (
      const line of lines
    ) {

      if (
        Math.abs(
          line.y - item.y
        ) <= Y_TOLERANCE
      ) {

        targetLine = line;

        break;
      }
    }


    /*
    같은 Y줄이 없다면
    새로운 line 생성
    */

    if (!targetLine) {

      targetLine = {
        y: item.y,
        items: []
      };

      lines.push(
        targetLine
      );
    }


    targetLine.items.push(
      item
    );
  });


  /*
  페이지 전체
  위 → 아래
  */

  lines.sort(
    (a, b) =>
      b.y - a.y
  );


  /*
  같은 줄
  왼쪽 → 오른쪽
  */

  lines.forEach(line => {

    line.items.sort(
      (a, b) =>
        a.x - b.x
    );

  });


  return lines;
}


/* =========================================================
   PRODUCT ROW 추출
========================================================= */

function extractProductRows(lines) {

  const products = [];


  lines.forEach(line => {

    const items =
      line.items;


    /*
    최소:
    NO / PRODUCT CODE / DESCRIPTION
    */

    if (
      items.length < 3
    ) {
      return;
    }


    /* =========================
       NO
    ========================= */

    const serialNumber =
      items[0]
        .text
        .trim();


    /*
    1,2,3,4...
    */

    if (
      !/^\d+$/.test(
        serialNumber
      )
    ) {
      return;
    }


    /* =========================
       PRODUCT CODE
    ========================= */

    const productCode =
      items[1]
        ?.text
        .trim();


    /*
    100019 같은
    6자리 숫자
    */

    if (
      !/^\d{6}$/.test(
        productCode
      )
    ) {
      return;
    }


    /* =========================
       DESCRIPTION
    ========================= */

    const description =
      items[2]
        ?.text
        .trim()
      || "";


    /* =========================
       마지막 숫자 = TOTAL SAR
    ========================= */

    let total = "";


    for (
      let i = items.length - 1;
      i >= 0;
      i--
    ) {

      const value =
        items[i]
          .text
          .trim();


      if (
        /^-?[\d,]+(?:\.\d+)?$/
          .test(value)
      ) {

        total = value;

        break;
      }
    }


    if (!total) {
      return;
    }


    products.push({

      no:
        serialNumber,

      productCode:
        productCode,

      description:
        description,

      totalSAR:
        total

    });

  });


  return products;
}


/* =========================================================
   SAR / USD GRAND TOTAL 추출
========================================================= */

function extractCurrencyTotals(lines) {

  let sar = null;

  let usd = null;


  lines.forEach(line => {

    const text =
      line.items

        .map(item =>
          item.text
        )

        .join(" ")

        .trim();


    /*
    SAR 3716.61
    SAR 3,716.61
    */

    const sarMatch =
      text.match(
        /\bSAR\s*([\d,]+(?:\.\d+)?)/i
      );


    /*
    USD 988.46
    */

    const usdMatch =
      text.match(
        /\bUSD\s*([\d,]+(?:\.\d+)?)/i
      );


    if (
      sarMatch &&
      sar === null
    ) {

      sar =
        parseMoney(
          sarMatch[1]
        );
    }


    if (
      usdMatch &&
      usd === null
    ) {

      usd =
        parseMoney(
          usdMatch[1]
        );
    }

  });


  return {
    sar,
    usd
  };
}


/* =========================================================
   환율 표시
========================================================= */

function renderExchangeRate(
  exchangeRate
) {

  if (
    exchangeRate === null
  ) {

    exchangeRateElement.textContent =
      "환율 계산 불가";

    exchangeRateSubElement.textContent =
      "";

    return;
  }


  /*
  1 SAR = ? USD
  */

  const reverseRate =
    1 / exchangeRate;


  exchangeRateElement.textContent =
    `SAR / USD = ${exchangeRate.toFixed(6)}`;


  exchangeRateSubElement.textContent =
    `1 SAR = ${exchangeRate.toFixed(6)} USD · 1 USD = ${reverseRate.toFixed(4)} SAR`;
}


/* =========================================================
   결과표 출력
========================================================= */

function renderExtractedProducts(
  products,
  exchangeRate,
  currency
) {

  extractTableBody.innerHTML =
    "";


  resultCount.textContent =
    `${products.length} ITEM${products.length === 1 ? "" : "S"}`;


  /*
  아무 데이터도 없는 경우
  */

  if (
    products.length === 0 &&
    currency.sar === null &&
    currency.usd === null
  ) {

    emptyState.classList.remove(
      "is-hidden"
    );

    tableWrap.classList.add(
      "is-hidden"
    );

    return;
  }


  /* =========================================================
     PRODUCT ROWS
  ========================================================= */

  products.forEach(product => {

    const sarValue =
      parseMoney(
        product.totalSAR
      );


    const usdValue =

      exchangeRate !== null &&
      sarValue !== null

        ? sarValue * exchangeRate

        : null;


    /*
    데이터에도 USD 저장
    */

    product.totalUSD =
      usdValue;


    const row =
      document.createElement(
        "tr"
      );


    row.innerHTML = `

      <td>
        ${escapeHTML(product.no)}
      </td>

      <td>
        ${escapeHTML(product.productCode)}
      </td>

      <td>
        ${escapeHTML(product.description)}
      </td>

      <td>
        ${escapeHTML(product.totalSAR)}
      </td>

      <td>
        ${
          usdValue !== null

            ? formatNumber(
                usdValue,
                2
              )

            : "-"
        }
      </td>

    `;


    extractTableBody.appendChild(
      row
    );

  });


  /* =========================================================
     TOTAL ROW
  ========================================================= */

  const totalRow =
    document.createElement(
      "tr"
    );


  totalRow.className =
    "total-row";


  totalRow.innerHTML = `

    <td
      colspan="3"
      class="total-label"
    >
      TOTAL
    </td>

    <td
      class="total-sar"
    >
      ${
        currency.sar !== null

          ? formatNumber(
              currency.sar,
              2
            )

          : "-"
      }
    </td>

    <td
      class="total-usd"
    >
      ${
        currency.usd !== null

          ? formatNumber(
              currency.usd,
              2
            )

          : "-"
      }
    </td>

  `;


  extractTableBody.appendChild(
    totalRow
  );


  /*
  결과 화면 표시
  */

  emptyState.classList.add(
    "is-hidden"
  );

  tableWrap.classList.remove(
    "is-hidden"
  );
}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
  isLoading
) {

  loading.classList.toggle(
    "is-hidden",
    !isLoading
  );
}


/* =========================================================
   RESULT RESET
========================================================= */

function resetResultOnly() {

  extractTableBody.innerHTML =
    "";

  resultCount.textContent =
    "0 ITEMS";

  exchangeRateElement.textContent =
    "-";

  exchangeRateSubElement.textContent =
    "";

  currencyBox.classList.add(
    "is-hidden"
  );

  tableWrap.classList.add(
    "is-hidden"
  );

  emptyState.classList.remove(
    "is-hidden"
  );
}


/* =========================================================
   FULL RESET
========================================================= */

function resetUI() {

  resetResultOnly();

  fileInfo.classList.add(
    "is-hidden"
  );

  fileName.textContent =
    "-";

  fileMeta.textContent =
    "-";
}


/* =========================================================
   MONEY → NUMBER
========================================================= */

function parseMoney(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  const number =
    Number(
      String(value)
        .replaceAll(",", "")
    );


  return Number.isNaN(number)
    ? null
    : number;
}


/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(
  value,
  decimals = 2
) {

  return Number(value)
    .toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals
      }
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}