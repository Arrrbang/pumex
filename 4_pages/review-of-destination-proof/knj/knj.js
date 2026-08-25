pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


/* =========================================================
   PDF 분석
========================================================= */

function parseInvoiceData(fullText) {

  /*
  PDF 텍스트 내부 공백 제거
  */

  const cleanText =
    fullText.replace(/\s+/g, '');

  let htmlOutput = "";


  /* =========================================================
     EXCHANGE RATE
  ========================================================= */

  const rateMatch =
    cleanText.match(
      /ExchangeRate-?([\d.]+)/i
    );


  let exchangeRate = 0;


  if (
    rateMatch &&
    rateMatch[1]
  ) {

    exchangeRate =
      parseFloat(
        rateMatch[1]
      );


    htmlOutput += `

      <div class="exchange-info">

        <span class="exchange-label">
          EXCHANGE RATE
        </span>

        <strong>
          ${exchangeRate} INR / USD
        </strong>

      </div>

    `;

  }


  /* =========================================================
     TABLE
  ========================================================= */

  htmlOutput += `

    <div class="invoice-table-wrap">

      <table class="invoice-table">

        <thead>

          <tr>

            <th>
              Item
            </th>

            <th>
              USD
            </th>

            <th>
              INR
            </th>

          </tr>

        </thead>

        <tbody>

  `;


  /* =========================================================
     TABLE DATA AREA
  ========================================================= */

  /*
  TAXRATE 다음부터
  NetAmount 전까지 추출
  */

  const tablePart =
    cleanText.match(
      /TAXRATE([\s\S]+?)NetAmount/i
    );


  if (tablePart) {

    const content =
      tablePart[1];


    /* =========================================================
       ROW 추출

       기준 SAC CODE = 996712
    ========================================================= */

    const rows =
      content.matchAll(
        /([a-zA-Z/ ]+?)996712USD[\d.]+[^0-9.]+[\d,.]+(?=[\d,.]+)[\d,.]+/g
      );


    let hasData = false;


    for (
      const row of rows
    ) {

      let itemName =
        row[1];


      /*
      DestinationCharges
      →
      Destination Charges
      */

      itemName =
        itemName
          .replace(
            /([A-Z])/g,
            ' $1'
          )
          .trim();


      /* =========================================================
         USD 금액 추출
      ========================================================= */

      const amountMatch =
        row[0].match(
          /USD[\d.]+[^0-9.]+([\d,.]+)(?=[\d,.]+)[\d,.]+/
        );


      if (amountMatch) {

        const rawAmount =
          parseFloat(
            amountMatch[1]
              .replace(
                /,/g,
                ''
              )
          );


        /*
        소수점 2자리 이하 절삭
        */

        const amount =
          Math.floor(
            rawAmount * 100
          ) / 100;


        /*
        너무 작은 잘못된 값 제외
        */

        if (
          amount > 0
        ) {

          hasData = true;


          /* =========================
             USD
          ========================= */

          const displayUsd =
            amount.toLocaleString(
              'en-US',
              {
                minimumFractionDigits:
                  2,

                maximumFractionDigits:
                  2
              }
            );


          /* =========================
             INR
          ========================= */

          const inrAmount =
            (
              amount *
              (
                exchangeRate ||
                0
              )
            )
              .toLocaleString(
                'en-US',
                {
                  minimumFractionDigits:
                    2,

                  maximumFractionDigits:
                    2
                }
              );


          /* =========================
             TABLE ROW
          ========================= */

          htmlOutput += `

            <tr>

              <td
                class="item-name"
              >
                ${escapeHTML(itemName)}
              </td>

              <td
                class="amount-usd"
              >
                ${displayUsd}
              </td>

              <td
                class="amount-inr"
              >
                ${inrAmount}
              </td>

            </tr>

          `;

        }

      }

    }


    /* =========================================================
       데이터 없음
    ========================================================= */

    if (
      !hasData
    ) {

      htmlOutput += `

        <tr>

          <td
            colspan="3"
            class="table-message"
          >
            데이터 패턴을 찾지 못했습니다.
          </td>

        </tr>

      `;

    }

  }

  else {

    htmlOutput += `

      <tr>

        <td
          colspan="3"
          class="table-message"
        >
          표 시작 지점(TAX RATE)을 찾지 못했습니다.
        </td>

      </tr>

    `;

  }


  htmlOutput += `

        </tbody>

      </table>

    </div>

  `;


  return htmlOutput;

}


/* =========================================================
   DOM
========================================================= */

const fileInput =
  document.getElementById(
    'fileInput'
  );

const uploadBox =
  document.querySelector(
    '.upload-box'
  );

const status =
  document.getElementById(
    'status'
  );

const resultArea =
  document.getElementById(
    'resultArea'
  );


/* =========================================================
   FILE PROCESS
========================================================= */

async function handleFileProcessing(
  file
) {

  /* =========================================================
     FILE CHECK
  ========================================================= */

  if (
    !file ||
    (
      file.type !==
      'application/pdf'
      &&
      !file.name
        .toLowerCase()
        .endsWith('.pdf')
    )
  ) {

    alert(
      'PDF 파일만 업로드 가능합니다.'
    );

    return;

  }


  /* =========================================================
     LOADING UI
  ========================================================= */

  status.innerHTML = `

    <span class="status-spinner"></span>

    <span>
      PDF 데이터 분석 중...
    </span>

  `;


  resultArea.innerHTML = `

    <div class="processing-state">

      <div class="processing-spinner">
      </div>

      <strong>
        인보이스를 분석하고 있습니다.
      </strong>

      <span>
        잠시만 기다려주세요.
      </span>

    </div>

  `;


  try {

    /* =========================================================
       PDF LOAD
    ========================================================= */

    const arrayBuffer =
      await file.arrayBuffer();


    const pdf =
      await pdfjsLib
        .getDocument(
          arrayBuffer
        )
        .promise;


    let fullText = "";


    /* =========================================================
       PAGE LOOP
    ========================================================= */

    for (
      let i = 1;
      i <= pdf.numPages;
      i++
    ) {

      const page =
        await pdf.getPage(i);


      const textContent =
        await page
          .getTextContent();


      const pageText =
        textContent.items

          .map(
            item =>
              item.str
          )

          .join(' ');


      fullText +=
        pageText +
        "\n";

    }


    /* =========================================================
       RESULT
    ========================================================= */

    resultArea.innerHTML =
      parseInvoiceData(
        fullText
      );


    status.innerText =
      "";

  }

  catch (error) {

    console.error(
      error
    );


    status.innerHTML = `

      <span class="status-error">
        PDF 분석 중 오류가 발생했습니다.
      </span>

    `;


    resultArea.innerHTML = `

      <div class="empty-state">

        <div
          class="empty-icon"
          aria-hidden="true"
        >

          <svg
            viewBox="0 0 24 24"
            width="34"
            height="34"
            fill="none"
          >

            <path
              d="M8 3h6l4 4v14H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              stroke-width="1.8"
            />

            <path
              d="M14 3v5h5M9 13h6M9 17h4"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />

          </svg>

        </div>

        <strong>
          PDF를 분석하지 못했습니다.
        </strong>

        <span>
          파일 형식을 확인한 후 다시 시도해주세요.
        </span>

      </div>

    `;

  }

}


/* =========================================================
   FILE SELECT
========================================================= */

fileInput.addEventListener(
  'change',
  event => {

    const file =
      event.target
        .files[0];


    if (file) {

      handleFileProcessing(
        file
      );

    }

  }
);


/* =========================================================
   CLICK
========================================================= */

uploadBox.addEventListener(
  'click',
  () => {

    fileInput.click();

  }
);


/* =========================================================
   KEYBOARD
========================================================= */

uploadBox.addEventListener(
  'keydown',
  event => {

    if (
      event.key ===
      'Enter'
      ||
      event.key ===
      ' '
    ) {

      event.preventDefault();

      fileInput.click();

    }

  }
);


/* =========================================================
   DRAG OVER
========================================================= */

uploadBox.addEventListener(
  'dragover',
  event => {

    event.preventDefault();

    uploadBox.classList.add(
      'drag-over'
    );

  }
);


/* =========================================================
   DRAG LEAVE
========================================================= */

uploadBox.addEventListener(
  'dragleave',
  () => {

    uploadBox.classList.remove(
      'drag-over'
    );

  }
);


/* =========================================================
   DROP
========================================================= */

uploadBox.addEventListener(
  'drop',
  event => {

    event.preventDefault();


    uploadBox.classList.remove(
      'drag-over'
    );


    const file =
      event.dataTransfer
        .files[0];


    if (file) {

      handleFileProcessing(
        file
      );

    }

  }
);


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(
  value
) {

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