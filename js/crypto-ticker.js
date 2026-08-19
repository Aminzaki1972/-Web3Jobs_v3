/* Web3Jobs Crypto Ticker - CoinMarketCap */
(function(){'use strict';
const API_URL='https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC,ETH,BNB&convert=USD';
const REFRESH_MS=300000;
function fmt(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v>=1000?0:2}).format(v)}
function pct(v){return (v>=0?'▲ ':'▼ ')+Math.abs(v).toFixed(2)+'%'}
function render(data){const bar=document.getElementById('crypto-ticker');if(!bar)return;bar.innerHTML=['BTC','ETH','BNB'].map(s=>{const d=data[s].quote.USD;return '<a class="crypto-item" href="https://coinmarketcap.com/currencies/'+(s==='BTC'?'bitcoin':s==='ETH'?'ethereum':'bnb/')+'" target="_blank" rel="noopener noreferrer"><b>'+s+'</b><span>'+fmt(d.price)+'</span><em class="'+(d.percent_change_24h>=0?'up':'down')+'">'+pct(d.percent_change_24h)+'</em></a>'}).join('')}
async function load(){const bar=document.getElementById('crypto-ticker');if(!bar)return;try{const r=await fetch(API_URL,{headers:{'X-CMC_PRO_API_KEY':window.COINMARKETCAP_API_KEY||''}});if(!r.ok)throw new Error('CoinMarketCap request failed');const j=await r.json();if(j.data)render(j.data)}catch(e){bar.querySelector('.crypto-loading')?.replaceWith(document.createTextNode('Crypto prices unavailable'))}}
function init(){const header=document.querySelector('header');if(!header||document.getElementById('crypto-ticker'))return;const bar=document.createElement('div');bar.id='crypto-ticker';bar.className='crypto-ticker';bar.innerHTML='<div class="crypto-loading">Loading BTC · ETH · BNB prices…</div>';header.parentNode.insertBefore(bar,header);load();setInterval(load,REFRESH_MS)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();