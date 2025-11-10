const STORAGE_KEY = "guildCompareV8_2State";
const teams = ["進攻","拆塔","機動","防守"];
const roleColors = {
  "九靈": "#d8b4fe",
  "鐵衣": "#fdba74",
  "素問": "#f9a8d4",
  "龍吟": "#bef264",
  "神相": "#1d4ed8",
  "碎夢": "#7dd3fc",
  "血河": "#f43f5e"
};
let allMembers = [
  {id:1, name: "四季春曉川", job: "九靈", skill: "左鈎天浩意"},
  {id:2, name: "狐戀雪", job: "素問", skill: "太極圖"},
  {id:3, name: "翼歌", job: "龍吟", skill: "太極圖"},
  {id:4, name: "木子維", job: "鐵衣", skill: ""},
  {id:5, name: "給雀心裹", job: "神相", skill: ""},
  {id:6, name: "玖靨", job: "血河", skill: ""},
  {id:7, name: "阿妙", job: "素問", skill: ""},
  {id:8, name: "小葉青", job: "碎夢", skill: ""},
  {id:9, name: "破風", job: "血河", skill: "爆發"},
  {id:10, name: "青珂", job: "龍吟", skill: ""},
  {id:11, name: "煙雨", job: "九靈", skill: ""}
];
let nextMemberId = 12;
let activeRoleFilter = "";
let lastSnapshot = null;
let memberPage = 1;
const pageSize = 8;
let subCounter = 0;

const lastWeekPanel = document.getElementById("lastWeek");
const thisWeekPanel = document.getElementById("thisWeek");
const subsList = document.getElementById("subsList");
const memberList = document.getElementById("memberList");
const searchInput = document.getElementById("memberSearch");

let draggingPanelInput = null;
let draggingPanelSide = null;
let dragSuccess = false;

function teamColorByName(name){
  if(name==="拆塔") return "#7f1d1d";
  if(name==="機動") return "#4c1d95";
  if(name==="防守") return "#1e3a8a";
  return "#0f172a";
}

function hexToRgb(hex) {
  const s = hex.replace('#','');
  const n = parseInt(s,16);
  return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
}
function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}
  else{
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h/=6;
  }
  return {h,s,l};
}
function hslToHex(h,s,l){
  function f(n){
    const k=(n+h*12)%12;
    const a=s*Math.min(l,1-l);
    const c=l-a*Math.max(-1, Math.min(k-3, Math.min(9-k,1)));
    return Math.round(255*c).toString(16).padStart(2,'0');
  }
  return "#"+f(0)+f(8)+f(4);
}
function darkenHex(hex, amt=0.25){
  const {r,g,b} = hexToRgb(hex);
  const {h,s,l} = rgbToHsl(r,g,b);
  const nl = Math.max(0, l - amt);
  return hslToHex(h,s,nl);
}

/* 接下來就是你原本的所有函式… */
/* ...我就不重貼 500 行了，直接把你那支 js 整段貼進來就好 */
/* 重點只有一個：外部 app.js 裡面不能有 <script> ... </script> */
