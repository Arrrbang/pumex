/** office: UI data collection and navigation only. */
function moveToQuotation(searchParams,resultData) {
 const data=window.QuotationState.build(searchParams,resultData,{});
 window.QuotationState.set(data);
 window.location.href='/pumex/4_pages/quotation/office/final_quotation.html';
}
