/* Web3Jobs v3 - Live Company Subscription UI */
"use strict";
(() => {
  const CODES=["starter","professional","enterprise"];
  const api=()=>window.Web3JobsCompanySubscription;
  function codeFrom(el){
    let n=el;
    for(let i=0;i<6&&n;i++,n=n.parentElement){
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
      document.querySelectorAll(`.plan-button[data-plan="${code}"]`).forEach(e=>e.title=`${formatPrice(p)} — Connect wallet to pay`);
      document.querySelectorAll(`[data-pay-plan="${code}"]`).forEach(e=>{e.disabled=false;e.textContent="Connect Wallet & Pay";});
    });
  }
  function ensureStyles(){
    if(document.getElementById("web3jobs-payment-modal-style"))return;
    const s=document.createElement("style");s.id="web3jobs-payment-modal-style";s.textContent=`#web3jobs-payment-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px)}#web3jobs-payment-modal .wj-payment-card{width:min(100%,520px);padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:#081423;color:#f5f8ff;box-shadow:0 25px 80px rgba(0,0,0,.5)}#web3jobs-payment-modal h3{margin:0 0 8px;font-size:20px}#web3jobs-payment-modal p{margin:0 0 16px;color:#9cafc5;font-size:12px}.wj-payment-row{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px}.wj-payment-row strong{color:#6ee7b7}.wj-payment-address{font-family:monospace;font-size:11px;word-break:break-all;text-align:right}.wj-payment-actions{display:flex;gap:10px;margin-top:18px}.wj-payment-actions button{flex:1;min-height:44px;border:0;border-radius:10px;font-weight:800;cursor:pointer}.wj-payment-confirm{background:#1c765a;color:#fff}.wj-payment-cancel{background:#17263a;color:#dbe7f5}`;document.head.appendChild(s);
  }
  function modal(){
    let m=document.getElementById("web3jobs-payment-modal");if(m)return m;
    m=document.createElement("div");m.id="web3jobs-payment-modal";m.innerHTML=`<div class="wj-payment-card"><h3 id="wj-payment-title">Monthly subscription</h3><p>Review the payment details before opening your wallet.</p><div id="wj-payment-details"></div><div class="wj-payment-actions"><button type="button" class="wj-payment-cancel" id="wj-payment-cancel">Cancel</button><button type="button" class="wj-payment-confirm" id="wj-payment-confirm">Connect Wallet & Pay</button></div></div>`;document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target===m)m.style.display="none"});m.querySelector("#wj-payment-cancel").onclick=()=>m.style.display="none";return m;
  }
  function showPaymentDetails(code,p,button){
    ensureStyles();const m=modal();const cfg=api()?.CONFIG||{};const token=cfg.usdtAddress||"0x55d398326f99059fF775485246999027B3197955";const treasury=cfg.paymentWallet||cfg.receivingWallet||"Not configured";const currency=String(p.currency||"USDT").toUpperCase();
    m.querySelector("#wj-payment-title").textContent=`${p.plan_name||code} — monthly subscription`;
    m.querySelector("#wj-payment-details").innerHTML=`<div class="wj-payment-row"><span>Amount</span><strong>${formatPrice(p)}</strong></div><div class="wj-payment-row"><span>Network</span><strong>BNB Smart Chain (BSC)</strong></div><div class="wj-payment-row"><span>Token</span><strong>${currency}</strong></div><div class="wj-payment-row"><span>USDT token contract</span><span class="wj-payment-address">${token}</span></div><div class="wj-payment-row"><span>Payment wallet</span><span class="wj-payment-address">${treasury}</span></div><div class="wj-payment-row"><span>Duration</span><strong>${Number(p.duration_days||30)} days</strong></div>`;
    m.style.display="flex";
    const confirm=m.querySelector("#wj-payment-confirm");confirm.disabled=false;confirm.textContent="Connect Wallet & Pay";confirm.onclick=async()=>{confirm.disabled=true;confirm.textContent="Processing...";m.style.display="none";await pay(code,button).catch(()=>{});confirm.disabled=false;confirm.textContent="Connect Wallet & Pay"};
  }
  async function pay(code,button){
    const a=api();const p=findPlan(code);
    if(!a||!p){alert("The selected company plan is not available.");return;}
    const old=button?.textContent||"Connect Wallet & Pay";if(button){button.disabled=true;button.textContent="Processing...";}
    try{
      const result=await a.pay(code);
      alert(`${p.plan_name} activated successfully.\n\n${formatPrice(p)}\nTransaction: ${result.transactionHash}`);
      location.reload();
    }catch(e){console.error(e);alert(e?.message||String(e));}
    finally{if(button){button.disabled=false;button.textContent=old;}}
  }
  function capturePaymentClick(event){
    const button=event.target.closest?.("[data-pay-plan], .plan-pay-button, button, a");if(!button)return;
    const container=button.closest(".subscription-section,.plan-details,[data-plan-details]");if(!container)return;
    const label=String(button.textContent||"").toLowerCase();
    if(!button.matches("[data-pay-plan],.plan-pay-button")&&!/(pay|upgrade|subscribe|purchase|choose|select|connect wallet)/.test(label))return;
    const code=button.dataset?.payPlan||codeFrom(button);if(!code||!CODES.includes(code))return;
    event.preventDefault();event.stopImmediatePropagation();
    const p=findPlan(code);if(!p){alert("The selected company plan is not available yet. Please wait for plans to load.");return;}
    showPaymentDetails(code,p,button);
  }
  function initialize(){syncPrices();ensureStyles();document.addEventListener("click",capturePaymentClick,true);window.addEventListener("web3jobs:company-plans-loaded",syncPrices);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();