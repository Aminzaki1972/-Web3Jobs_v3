/* Web3Jobs v3 - Live Company Subscription UI */
"use strict";
(() => {
  const CODES=["starter","professional","enterprise"];
  const api=()=>window.Web3JobsCompanySubscription;
  function codeFrom(el){
    let n=el;
    for(let i=0;i<5&&n;i++,n=n.parentElement){
      const raw=String(n.dataset?.payPlan||n.dataset?.plan||"").toLowerCase();
      if(CODES.includes(raw)) return raw;
      const id=String(n.id||"").toLowerCase();
      for(const c of CODES) if(id.includes(c)) return c;
    }
    const text=String(el.textContent||"").toLowerCase();
    if(text.includes("enterprise")) return "enterprise";
    if(text.includes("professional")) return "professional";
    if(text.includes("starter")) return "starter";
    return null;
  }
  function findPlan(code){return api()?.plans?.find(p=>p.plan_code===code)||null;}
  function formatPrice(p){return `$${Number(p.price).toFixed(Number(p.price)%1?2:0)} USDT / month`;}
  function syncPrices(){
    CODES.forEach(code=>{
      const p=findPlan(code); if(!p)return;
      document.querySelectorAll(`[data-plan="${code}"] .plan-button-price,[data-plan-details="${code}"] .plan-details-price`).forEach(e=>e.textContent=formatPrice(p));
      document.querySelectorAll(`.plan-button[data-plan="${code}"]`).forEach(e=>e.title=`${formatPrice(p)}`);
    });
  }
  async function pay(code,button){
    const a=api(); const p=findPlan(code);
    if(!a||!p){alert("The selected company plan is not available.");return;}
    const old=button.textContent; button.disabled=true; button.textContent="Processing...";
    try{
      const result=await a.pay(code);
      alert(`${p.plan_name} activated successfully.\n\n${formatPrice(p)}\nTransaction: ${result.transactionHash}`);
      location.reload();
    }catch(e){console.error(e);alert(e?.message||String(e));}
    finally{button.disabled=false;button.textContent=old;}
  }
  function capturePaymentClick(event){
    const button=event.target.closest?.("button,a");
    if(!button)return;
    const container=button.closest(".subscription-section,.plan-details,[data-plan-details]");
    if(!container)return;
    const label=String(button.textContent||"").toLowerCase();
    if(!/(pay|upgrade|subscribe|purchase|choose|select)/.test(label))return;
    const code=codeFrom(button); if(!code)return;
    event.preventDefault(); event.stopImmediatePropagation();
    pay(code,button);
  }
  function initialize(){
    syncPrices();
    document.addEventListener("click",capturePaymentClick,true);
    window.addEventListener("web3jobs:company-plans-loaded",syncPrices);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initialize,{once:true}); else initialize();
})();
