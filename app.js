<script>
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

    /* v8.2 小隊寬調整：1~4 隊固定 23.5%，5+ 平均 */
    function adjustSquadWidths(block) {
      const squadsContainer = block.querySelector('.squads');
      if (!squadsContainer) return;
      const squads = squadsContainer.querySelectorAll('.squad');
      const count = squads.length || 1;

      if (count <= 4) {
        squads.forEach(sq => {
          sq.style.flex = "0 0 calc(23.5% - 6px)";  // 預留邊線空間
        });
      } else {
        const pct = 100 / count;
    squads.forEach(sq => {
      sq.style.flex = "0 0 calc(" + (pct - 2.3) + "%)"; // 微調 -0.5% 保留間距
    });
      }
    }

    function createMemberInputs(side){
      let html = "";
      for(let i=1;i<=6;i++){
        if(side === "last"){
          html += `
            <div class="member-row">
              <input data-role="name" data-side="last" class="locked-input" placeholder="成員${i}" readonly>
            </div>
            <div class="member-row">
              <input data-role="skill" class="readonly-skill locked-input" placeholder="" readonly>
            </div>
          `;
        } else {
          const uid = "p-" + side + "-" + Math.random().toString(36).slice(2,8);
          html += `
            <div class="member-row">
              <input data-role="name" data-side="${side}" data-uid="${uid}" draggable="true"
                ondragstart="dragFromPanel(event)" ondragover="allowDrop(event)" ondrop="dropMember(event)"
                oncontextmenu="clearPanelCell(event)" oninput="clearHighlightOnEdit(this); saveState();" placeholder="成員${i}">
            </div>
            <div class="member-row">
              <input data-role="skill" class="readonly-skill" placeholder="" readonly>
            </div>
          `;
        }
      }
      return html;
    }

    function createSquad(idx, side, teamName){
      const sq = document.createElement("div");
      sq.className = "squad";
      sq.dataset.squad = idx;
      sq.innerHTML = `
        <div class="squad-title">第${idx}小隊</div>
        ${side==="this" ? `<button class="squad-del-btn" onclick="deleteThisSquad(this)">🗑</button>` : ""}
        ${createMemberInputs(side)}
      `;
      return sq;
    }

    function createTeamBlock(side, teamName){
      const block = document.createElement("div");
      block.className = "team-block";
      block.dataset.team = teamName;
      block.dataset.side = side;
      const headColor = teamColorByName(teamName);
      block.innerHTML = `
        <div class="team-head" style="background:${headColor}">
          <span class="th-title">${side==="last"?"上週－":"本週－"}${teamName}</span>
          <div class="head-actions">
            ${side==="this"
              ? `<button class="head-add-btn" onclick="addSquadToTeamFromHead(this)">＋ 新增小隊</button>`
              : `<button class="head-add-btn disabled" disabled>＋ 新增小隊</button>`
            }
          </div>
        </div>
        <div class="squads"></div>
      `;
      const sqs = block.querySelector(".squads");
      for(let s=1;s<=3;s++){
        sqs.appendChild(createSquad(s, side, teamName));
      }
      adjustSquadWidths(block);
      return block;
    }

    teams.forEach(t => {
      const lastBlock = createTeamBlock("last", t);
      lastWeekPanel.appendChild(lastBlock);

      const thisBlock = createTeamBlock("this", t);
      thisWeekPanel.appendChild(thisBlock);
    });

    function renumberSquads(block){
      const sqs = block.querySelectorAll(".squad");
      sqs.forEach((sq,idx)=>{
        sq.dataset.squad = idx+1;
        const title = sq.querySelector(".squad-title");
        if(title) title.textContent = `第${idx+1}小隊`;
      });
    }

    function addSquadToTeamFromHead(btn){
      const block = btn.closest(".team-block");
      const sqs = block.querySelector(".squads");
      const side = block.dataset.side;
      const teamName = block.dataset.team;
      const count = sqs.children.length;
      sqs.appendChild(createSquad(count+1, side, teamName));
      adjustSquadWidths(block);
      saveState();
    }

    function deleteThisSquad(btn){
      const squad = btn.closest(".squad");
      const block = btn.closest(".team-block");
      const parent = squad.parentElement;
      if(confirm("確定要刪除這個小隊嗎？")){
        parent.removeChild(squad);
        renumberSquads(block);
        adjustSquadWidths(block);
        saveState();
      }
    }

    function clearPanelCell(e){
      e.preventDefault();
      const input = e.target;
      if(input.dataset.role === "name" && input.dataset.side !== "last"){
        clearInputAndSkill(input);
        saveState();
      }
    }
    function clearInputAndSkill(input){
      input.value = "";
      input.style.borderLeft = "";
      input.style.color = "";
      input.dataset.job = "";
      const skillRow = input.parentElement.nextElementSibling;
      if(skillRow && skillRow.querySelector("input[data-role='skill']")){
        skillRow.querySelector("input[data-role='skill']").value = "";
      }
      input.classList.remove("highlight-new","highlight-missing");
    }
    function clearHighlightOnEdit(input){
      input.classList.remove("highlight-new","highlight-missing");
    }

    function createSubRow(name="", skill=""){
      const row = document.createElement("div");
      row.className = "substitute-row";
      row.draggable = true;
      row.dataset.subIndex = subCounter++;
      row.ondragstart = dragFromSub;
      row.innerHTML = `
        <input class="sub-name" placeholder="替補成員" value="${name}"
          ondragover="allowDrop(event)" ondrop="dropMember(event)" onblur="applyColorByName(this); saveState();">
        <input class="sub-skill" placeholder="技能" value="${skill}" oninput="saveState()">
        <button class="del-btn" onclick="deleteSub(this)">刪</button>
        <span class="sub-status"></span>
      `;
      applyColorByName(row.querySelector(".sub-name"));
      subsList.appendChild(row);
    }
    function addSub(){ createSubRow(); saveState(); }
    function deleteSub(btn){ subsList.removeChild(btn.parentElement); saveState(); }
    for(let i=0;i<4;i++) createSubRow();

    const roleTabs = document.getElementById("roleTabs");
    function renderRoleTabs(){
      roleTabs.innerHTML = "";
      const allTab = document.createElement("div");
      allTab.className = "role-tab" + (activeRoleFilter==="" ? " active" : "");
      allTab.textContent = "全部";
      allTab.style.background = "#e2e8f0";
      allTab.onclick = ()=>{activeRoleFilter=""; memberPage=1; renderMemberList();};
      roleTabs.appendChild(allTab);
      Object.keys(roleColors).forEach(r=>{
        const tab = document.createElement("div");
        tab.className = "role-tab" + (activeRoleFilter===r ? " active" : "");
        tab.textContent = r;
        tab.style.background = roleColors[r];
        tab.onclick = ()=>{activeRoleFilter=r; memberPage=1; renderMemberList();};
        roleTabs.appendChild(tab);
      });
    }

    function getFilteredMembers(){
      const keyword = searchInput.value.trim();
      return allMembers.filter(m=>{
        const matchRole = !activeRoleFilter || m.job===activeRoleFilter;
        const matchText = !keyword || m.name.includes(keyword) || (m.skill && m.skill.includes(keyword));
        return matchRole && matchText;
      });
    }

    function renderMemberList(){
      const filtered = getFilteredMembers();
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if(memberPage>totalPages) memberPage = totalPages;
      const start = (memberPage-1)*pageSize;
      const pageItems = filtered.slice(start, start+pageSize);

      memberList.innerHTML = "";
      pageItems.forEach(m=>{
        const item = document.createElement("div");
        item.className = "member-item";
        item.draggable = true;
        item.ondragstart = e => dragFromMemberList(e, m);
        const darkColor = m.job && roleColors[m.job] ? darkenHex(roleColors[m.job],0.25) : "#e2e8f0";
        item.style.borderLeft = "4px solid " + darkColor;
        item.innerHTML = `
          <div class="member-left" data-id="${m.id}">
            <div class="member-name" style="color:${darkColor}">${m.name}</div>
            <div class="member-skill">${m.skill || ""}</div>
          </div>
          <div class="member-actions" id="member-actions-${m.id}">
            <button onclick="startInlineEdit(${m.id})">編</button>
            <button onclick="deleteMember(${m.id})">刪</button>
          </div>
        `;
        memberList.appendChild(item);
      });

      const sel = document.getElementById("pageSelect");
      sel.innerHTML = "";
      for(let p=1;p<=totalPages && p<=8;p++){
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = "第 " + p + " 頁";
        if(p===memberPage) opt.selected = true;
        sel.appendChild(opt);
      }
    }
    function prevPage(){ if(memberPage>1){ memberPage--; renderMemberList(); } }
    function nextPage(){
      const totalPages = Math.max(1, Math.ceil(getFilteredMembers().length / pageSize));
      if(memberPage<totalPages){ memberPage++; renderMemberList(); }
    }
    function jumpPage(p){ memberPage = parseInt(p,10); renderMemberList(); }

    function toggleAddMember(){
      const form = document.getElementById("addMemberForm");
      form.style.display = form.style.display==="flex" ? "none" : "flex";
    }
    function addMember(){
      const name = document.getElementById("newName").value.trim();
      const job = document.getElementById("newJob").value;
      const skill = document.getElementById("newSkill").value.trim();
      if(!name || !job){ alert("成員名稱與職業必填"); return; }
      allMembers.push({id: ++nextMemberId, name, job, skill});
      document.getElementById("newName").value = "";
      document.getElementById("newJob").value = "";
      document.getElementById("newSkill").value = "";
      renderMemberList();
      document.getElementById("addMemberForm").style.display = "none";
      saveState();
    }

    function startInlineEdit(id){
      const item = [...memberList.querySelectorAll(".member-left")].find(div=>parseInt(div.dataset.id,10)===id);
      if(!item) return;
      const m = allMembers.find(x=>x.id===id);
      const actionArea = document.getElementById(`member-actions-${id}`);
      if(actionArea) actionArea.style.display = "none";
      item.innerHTML = `
        <input class="edit-input" id="edit-name-${id}" value="${m.name}">
        <select class="edit-input" id="edit-job-${id}">
          <option value="九靈" ${m.job==="九靈"?"selected":""}>九靈</option>
          <option value="鐵衣" ${m.job==="鐵衣"?"selected":""}>鐵衣</option>
          <option value="素問" ${m.job==="素問"?"selected":""}>素問</option>
          <option value="龍吟" ${m.job==="龍吟"?"selected":""}>龍吟</option>
          <option value="神相" ${m.job==="神相"?"selected":""}>神相</option>
          <option value="碎夢" ${m.job==="碎夢"?"selected":""}>碎夢</option>
          <option value="血河" ${m.job==="血河"?"selected":""}>血河</option>
        </select>
        <input class="edit-input" id="edit-skill-${id}" value="${m.skill||""}">
        <div style="display:flex;gap:.3rem;">
          <button class="float-btn" style="font-size:.65rem;padding:.2rem .4rem;" onclick="saveInlineEdit(${id})">儲存</button>
          <button class="float-btn secondary" style="font-size:.65rem;padding:.2rem .4rem;" onclick="renderMemberList()">取消</button>
        </div>
      `;
    }
    function saveInlineEdit(id){
      const name = document.getElementById("edit-name-"+id).value.trim();
      const job = document.getElementById("edit-job-"+id).value.trim();
      const skill = document.getElementById("edit-skill-"+id).value.trim();
      const idx = allMembers.findIndex(x=>x.id===id);
      if(idx>-1){
        allMembers[idx] = {id, name, job, skill};
        renderMemberList();
        saveState();
      }
    }
    function deleteMember(id){
      const idx = allMembers.findIndex(x=>x.id===id);
      if(idx>-1){ allMembers.splice(idx,1); renderMemberList(); saveState(); }
    }

    renderRoleTabs();
    renderMemberList();

    let dragPreviewEl = null;
    function showDragPreview(text, color){
      dragPreviewEl = document.createElement("div");
      dragPreviewEl.className = "drag-preview";
      dragPreviewEl.textContent = text;
      dragPreviewEl.style.background = color || "#0f172a";
      document.body.appendChild(dragPreviewEl);
      document.addEventListener("dragover", movePreview);
    }
    function movePreview(e){
      if(dragPreviewEl){
        dragPreviewEl.style.left = e.pageX + 10 + "px";
        dragPreviewEl.style.top = e.pageY + 10 + "px";
      }
    }
    function hideDragPreview(){
      if(dragPreviewEl){
        document.body.removeChild(dragPreviewEl);
        dragPreviewEl = null;
        document.removeEventListener("dragover", movePreview);
      }
    }

    function dragFromMemberList(e, m){
      e.dataTransfer.setData("text/plain", JSON.stringify(m));
      const color = m.job && roleColors[m.job] ? darkenHex(roleColors[m.job],0.25) : "#0f172a";
      showDragPreview(`${m.name} (${m.job||""})`, color);
    }
    function dragFromSub(e){
      const row = e.currentTarget;
      const name = row.querySelector(".sub-name").value.trim();
      const skill = row.querySelector(".sub-skill").value.trim();
      if(!name){ e.preventDefault(); return; }
      const job = getJobByName(name) || row.querySelector(".sub-name").dataset.job || "";
      e.dataTransfer.setData("text/plain", JSON.stringify({name, skill, job, fromSub: row.dataset.subIndex}));
      const color = job && roleColors[job] ? darkenHex(roleColors[job],0.25) : "#0f172a";
      showDragPreview(`${name} (${job||""})`, color);
    }
    function dragFromPanel(e){
      const input = e.target;
      if(input.dataset.side === "last") {
        e.preventDefault();
        return;
      }
      const side = input.dataset.side;
      const name = input.value.trim();
      let skill = "";
      const skillRow = input.parentElement.nextElementSibling;
      if(skillRow && skillRow.querySelector('input[data-role="skill"]')){
        skill = skillRow.querySelector('input[data-role="skill"]').value;
      }
      const job = input.dataset.job || getJobByName(name) || "";
      draggingPanelInput = input;
      draggingPanelSide = side;
      dragSuccess = false;
      e.dataTransfer.setData("text/plain", JSON.stringify({name, skill, job, fromPanel: true, side}));
      const color = job && roleColors[job] ? darkenHex(roleColors[job],0.25) : "#0f172a";
      showDragPreview(`${name || "空欄位"} ${job? "(" + job + ")":""}`, color);
    }
    document.addEventListener("dragend", function(){
      hideDragPreview();
      if(draggingPanelInput && !dragSuccess){
        clearInputAndSkill(draggingPanelInput);
        saveState();
      }
      draggingPanelInput = null;
      draggingPanelSide = null;
    });

    function allowDrop(ev){ ev.preventDefault(); }

    function getJobByName(name){
      const m = allMembers.find(x=>x.name===name);
      return m ? m.job : "";
    }
    function applyJobColor(input, job){
      if(!input) return;
      if(job && roleColors[job]){
        const dark = darkenHex(roleColors[job],0.25);
        input.style.borderLeft = "6px solid " + dark;
        input.style.color = dark;
        input.style.fontWeight = "700";
        input.dataset.job = job;
      } else {
        input.style.borderLeft = "";
        input.style.color = "";
        input.dataset.job = "";
        input.style.fontWeight = "700";
      }
    }
    function applyColorByName(input){
      const name = input.value.trim();
      const job = getJobByName(name);
      applyJobColor(input, job);
    }
    function clearDuplicateInPanel(panelEl, name, exceptInput){
      panelEl.querySelectorAll("input[data-role='name']").forEach(inp=>{
        if(inp !== exceptInput && inp.value.trim() === name){
          clearInputAndSkill(inp);
        }
      });
    }

    function dropMember(ev){
      ev.preventDefault();
      dragSuccess = true;
      const data = ev.dataTransfer.getData("text/plain");
      if(!data) return;
      const member = JSON.parse(data);
      const target = ev.target;

      if(target.classList.contains("sub-name")){
        target.value = member.name;
        applyJobColor(target, member.job);
        const sk = target.parentElement.querySelector(".sub-skill");
        if(sk) sk.value = member.skill ? member.skill : "";
        saveState();
        return;
      }

      if(target.dataset && target.dataset.role === "name"){
        const targetSide = target.dataset.side;
        if(targetSide === "last") return;
        const targetPanel = targetSide === "this" ? thisWeekPanel : lastWeekPanel;

        if(member.fromPanel && member.side === targetSide && draggingPanelInput){
          const src = draggingPanelInput;
          if(src === target) return;
          const srcName = src.value.trim();
          const srcJob = src.dataset.job || getJobByName(srcName) || "";
          let srcSkill = "";
          const srcSkillRow = src.parentElement.nextElementSibling;
          if(srcSkillRow && srcSkillRow.querySelector('input[data-role="skill"]')){
            srcSkill = srcSkillRow.querySelector('input[data-role="skill"]').value;
          }

          const tgtName = target.value.trim();
          const tgtJob = target.dataset.job || getJobByName(tgtName) || "";
          let tgtSkill = "";
          const tgtSkillRow = target.parentElement.nextElementSibling;
          if(tgtSkillRow && tgtSkillRow.querySelector('input[data-role="skill"]')){
            tgtSkill = tgtSkillRow.querySelector('input[data-role="skill"]').value;
          }

          src.value = tgtName;
          applyJobColor(src, tgtJob);
          if(srcSkillRow) srcSkillRow.querySelector('input[data-role="skill"]').value = tgtSkill || "";
          src.classList.remove("highlight-new","highlight-missing");

          target.value = srcName;
          applyJobColor(target, srcJob);
          if(tgtSkillRow) tgtSkillRow.querySelector('input[data-role="skill"]').value = srcSkill || "";
          target.classList.remove("highlight-new","highlight-missing");
          saveState();
          return;
        }

        if(member.fromSub !== undefined && target.value.trim() !== ""){
          const oldName = target.value.trim();
          const oldJob = target.dataset.job || getJobByName(oldName) || "";
          let oldSkill = "";
          const skillRow = target.parentElement.nextElementSibling;
          if(skillRow && skillRow.querySelector('input[data-role="skill"]')){
            oldSkill = skillRow.querySelector('input[data-role="skill"]').value;
          }
          const subRow = subsList.querySelector(`[data-sub-index="${member.fromSub}"]`);
          if(subRow){
            subRow.querySelector(".sub-name").value = oldName;
            applyJobColor(subRow.querySelector(".sub-name"), oldJob);
            subRow.querySelector(".sub-skill").value = oldSkill;
          }
        }

        if(member.fromPanel && member.side !== targetSide){
          return;
        }

        target.value = member.name;
        applyJobColor(target, member.job);
        const srow = target.parentElement.nextElementSibling;
        if(srow && srow.querySelector('input[data-role="skill"]')){
          srow.querySelector('input[data-role="skill"]').value = member.skill ? member.skill : "";
        }
        target.classList.remove("highlight-new","highlight-missing");
        clearDuplicateInPanel(targetPanel, member.name, target);
        saveState();
      }
    }

    function getPanelData(panelEl){
      const data = [];
      panelEl.querySelectorAll(".team-block").forEach(block=>{
        const team = block.dataset.team;
        const squads = [];
        block.querySelectorAll(".squads .squad").forEach(sq=>{
          const members = [];
          sq.querySelectorAll("input[data-role='name']").forEach(nameInput=>{
            const skillRow = nameInput.parentElement.nextElementSibling;
            const skillInput = skillRow ? skillRow.querySelector("input[data-role='skill']") : null;
            members.push({
              name: nameInput.value.trim(),
              job: nameInput.dataset.job || "",
              skill: skillInput ? (skillInput.value.trim() || "") : ""
            });
          });
          squads.push({members});
        });
        data.push({team, squads});
      });
      return data;
    }

    function setPanelData(panelEl, data, side){
      data.forEach(teamData=>{
        const block = panelEl.querySelector(`.team-block[data-team="${teamData.team}"]`);
        if(!block) return;
        const squadsContainer = block.querySelector(".squads");
        let currentCount = squadsContainer.children.length;
        const neededCount = teamData.squads.length;
        while(currentCount < neededCount){
          squadsContainer.appendChild(createSquad(currentCount+1, side, teamData.team));
          currentCount++;
        }
        while(squadsContainer.children.length > neededCount){
          squadsContainer.removeChild(squadsContainer.lastElementChild);
        }
        teamData.squads.forEach((sqData, idx)=>{
          const sqEl = squadsContainer.children[idx];
          const nameInputs = sqEl.querySelectorAll("input[data-role='name']");
          nameInputs.forEach((inp, mIdx)=>{
            const member = sqData.members[mIdx];
            if(member){
              inp.value = member.name || "";
              if(side==="last"){
                inp.classList.add("locked-input");
                inp.readOnly = true;
              }
              if(member.job){
                applyJobColor(inp, member.job);
              } else {
                applyColorByName(inp);
              }
              const skillRow = inp.parentElement.nextElementSibling;
              if(skillRow && skillRow.querySelector("input[data-role='skill']")){
                skillRow.querySelector("input[data-role='skill']").value = member.skill ? member.skill : "";
                if(side==="last"){
                  const si = skillRow.querySelector("input[data-role='skill']");
                  si.readOnly = true;
                  si.classList.add("locked-input");
                }
              }
            } else {
              clearInputAndSkill(inp);
            }
          });
        });
        renumberSquads(block);
        adjustSquadWidths(block);
      });
    }

    function getSubsData(){
      const arr = [];
      subsList.querySelectorAll(".substitute-row").forEach(row=>{
        arr.push({
          name: row.querySelector(".sub-name").value.trim(),
          skill: row.querySelector(".sub-skill").value.trim()
        });
      });
      return arr;
    }

// 這段只要出現一次就好
const REMOTE_API = "https://script.google.com/macros/s/AKfycbxI39kkO1P02H-ozH3r8zD1m13ACuzcKY1db3f0wSssrooNeYLcNADntmvglirjz6Al/exec";

// 存在地端（localStorage）
function saveState() {
  const state = {
    allMembers,
    lastWeek: getPanelData(lastWeekPanel),
    thisWeek: getPanelData(thisWeekPanel),
    subs: getSubsData()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

// 按鈕「儲存」要呼叫這個，才會丟到 Google
function saveToBackend() {
  const state = {
    allMembers,
    lastWeek: getPanelData(lastWeekPanel),
    thisWeek: getPanelData(thisWeekPanel),
    subs: getSubsData()
  };

  // 先也存一份本機
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}

  fetch(REMOTE_API, {
  method: "POST",
  body: JSON.stringify({
    action: "save",
    payload: state
  })
})
  .then(res => res.json())
  .then(data => {
    if (data && data.success) {
      alert("已儲存到後台");
    } else {
      alert("後台有回應但不是 success，請看 console");
      console.log(data);
    }
  })
  .catch(err => {
    alert("無法連到後台，請檢查 Apps Script 部署權限");
    console.error(err);
  });
}

// 載入時先讀本機，再讀雲端
async function loadState() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) {
    try {
      applyStateToPage(JSON.parse(s));
    } catch (e) {}
  } else {
    renderRoleTabs();
    renderMemberList();
  }

  try {
    const res = await fetch(REMOTE_API + "?action=get");
    const data = await res.json();
    if (data && data.success && data.payload) {
      applyStateToPage(data.payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload));
    }
  } catch (err) {
    console.warn("讀取後台失敗", err);
  }
}

// 把抓回來的 state 塞回畫面
function applyStateToPage(state) {
  if (state.allMembers && Array.isArray(state.allMembers)) {
    allMembers = state.allMembers;
    const maxId = allMembers.reduce((m, c) => Math.max(m, c.id || 0), 12);
    nextMemberId = maxId + 1;
  }
  renderRoleTabs();
  renderMemberList();

  if (state.lastWeek) {
    setPanelData(lastWeekPanel, state.lastWeek, "last");
    lastWeekPanel.querySelectorAll(".team-block").forEach(adjustSquadWidths);
  }
  if (state.thisWeek) {
    setPanelData(thisWeekPanel, state.thisWeek, "this");
    thisWeekPanel.querySelectorAll(".team-block").forEach(adjustSquadWidths);
  }
  if (state.subs) {
    subsList.innerHTML = "";
    state.subs.forEach(su => createSubRow(su.name, su.skill));
  }
}
// 讓人眼睛變色的比對
  function compare(){
    // 先清掉舊的標記
    document.querySelectorAll("input[data-role='name']").forEach(inp=>{
      inp.classList.remove("highlight-new","highlight-missing");
    });

    // 收集上週
    const lastNames = [];
    lastWeekPanel.querySelectorAll("input[data-role='name']").forEach(inp=>{
      const v = inp.value.trim();
      if(v) lastNames.push(v);
    });
    const lastSet = new Set(lastNames);

    // 收集本週
    const thisNames = [];
    thisWeekPanel.querySelectorAll("input[data-role='name']").forEach(inp=>{
      const v = inp.value.trim();
      if(v) thisNames.push({val:v, el:inp});
    });
    const thisSet = new Set(thisNames.map(x=>x.val));

    // 本週有、上週沒有 → 綠
    thisNames.forEach(obj=>{
      if (obj.val && !lastSet.has(obj.val)) {
        obj.el.classList.add("highlight-new");
      }
    });

    // 上週有、本週沒有 → 要去上週那邊標紅
    lastWeekPanel.querySelectorAll("input[data-role='name']").forEach(inp=>{
      const v = inp.value.trim();
      if (v && !thisSet.has(v)) {
        inp.classList.add("highlight-missing");
      }
    });

    // 替補那邊顯示「有沒有上場」
    subsList.querySelectorAll(".substitute-row").forEach(row=>{
      const name = row.querySelector(".sub-name").value.trim();
      const status = row.querySelector(".sub-status");
      if(!name){ status.textContent = ""; return; }
      if(thisSet.has(name)){
        status.textContent = "本週已上場 ✅";
        status.style.color = "#16a34a";
      } else {
        status.textContent = "本週未上場";
        status.style.color = "#b91c1c";
      }
    });
  }

  // 把本週整包覆蓋到上週
 
  function copyThisToLast(){
    if(!confirm("確定要用『本週名單』覆蓋『上週名單』嗎？")) return;

    // 先存一份目前上週，等一下可以還原
    lastSnapshot = JSON.stringify(getPanelData(lastWeekPanel));

    // 取本週資料，塞進上週
    const thisData = getPanelData(thisWeekPanel);
    setPanelData(lastWeekPanel, thisData, "last");

    // 存一下狀態（本機 + 你前面那個 saveState 會做的事）
    saveState();

    alert("已將本週名單的內容覆蓋到上週。");
  }

  // 還原成覆蓋前
  function undoCopy(){
    if(!lastSnapshot){
      alert("沒有可還原的內容。");
      return;
    }
    const data = JSON.parse(lastSnapshot);
    setPanelData(lastWeekPanel, data, "last");
    saveState();
    alert("已還原到覆蓋前的上週名單。");
  }

  // 最後一行保持不變
loadState();
  </script>
