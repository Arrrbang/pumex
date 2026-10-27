/** field: UI data collection and navigation only. */
function moveToQuotation(searchParams,resultData) {
 const data=window.QuotationState.build(searchParams,resultData,Object.fromEntries(['q_customer_name','q_customer_email','q_origin_add','q_pdate'].map(id=>[id,document.getElementById(id)?.value||''])));
 window.QuotationState.set(data);
 window.location.href='/pumex/4_pages/quotation/field/result.html';
}
