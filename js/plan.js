document.addEventListener("DOMContentLoaded", async () => {
  const planSelector = document.getElementById("plan-selector");
  const uploadInput = document.getElementById("upload-plan");
  const activeStatus = document.getElementById("active-plan-status");

  // =================== AUTO LOAD DO PLANO ATIVO ===================
  const currentPlan = localStorage.getItem("currentPlan");
  const currentPlanKey = localStorage.getItem("currentPlanKey");

  if (currentPlan) {
    console.log("📘 Carregando plano ativo do localStorage:", currentPlanKey);
    renderPlan(JSON.parse(currentPlan));
    initPlanSelector(currentPlanKey);
  } else if (currentPlanKey && localStorage.getItem(currentPlanKey)) {
    console.log("📗 Carregando plano salvo via chave:", currentPlanKey);
    const plan = JSON.parse(localStorage.getItem(currentPlanKey));
    renderPlan(plan);
    initPlanSelector(currentPlanKey);
    localStorage.setItem("currentPlan", JSON.stringify(plan));
  } else {
    console.log("📙 Nenhum plano ativo encontrado. Usando plano default.");
    const defaultPlan = await loadDefaultPlan();
    renderPlan(defaultPlan);
    initPlanSelector();
    localStorage.setItem("currentPlan", JSON.stringify(defaultPlan));
    localStorage.setItem("currentPlanKey", "default");
  }

  // Mostra o nome do plano ativo na UI
  updateActivePlanStatus();

  // =================== UPLOAD DE PLANO CUSTOMIZADO ===================
  uploadInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
      const customPlan = JSON.parse(text);

      if (!Array.isArray(customPlan) || customPlan.length === 0) {
        alert("O JSON deve conter um array com ao menos uma semana.");
        return;
      }

      const planName = customPlan[0].planName || `Plano Customizado (${new Date().toLocaleString()})`;
      const key = `plan:${planName}`;

      // 🔹 Salva no localStorage
      localStorage.setItem(key, JSON.stringify(customPlan));

      // Pergunta se o usuário quer torná-lo ativo
      const makeActive = confirm(`Plano "${planName}" carregado.\nDeseja torná-lo o plano ativo?`);
      if (makeActive) {
        localStorage.setItem("currentPlan", JSON.stringify(customPlan));
        localStorage.setItem("currentPlanKey", key);
        alert(`Plano "${planName}" definido como ativo.`);
      }

      // Atualiza seletor e renderiza
      initPlanSelector(key);
      renderPlan(customPlan);
      updateActivePlanStatus();
    } catch (err) {
      alert("Arquivo inválido. Certifique-se de que é um JSON válido.");
    }
  });

  // =================== TROCA ENTRE PLANOS ===================
  planSelector.addEventListener("change", async (e) => {
    const key = e.target.value;

    if (key === "default") {
      const defaultPlan = await loadDefaultPlan();
      renderPlan(defaultPlan);
      localStorage.setItem("currentPlan", JSON.stringify(defaultPlan));
      localStorage.setItem("currentPlanKey", "default");
      updateActivePlanStatus("Boost 12dB (Default)");
      alert("Plano default ativado.");
      renderSavedPlansList();
      return;
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      const plan = JSON.parse(saved);
      renderPlan(plan);
      localStorage.setItem("currentPlan", saved);
      localStorage.setItem("currentPlanKey", key);
      updateActivePlanStatus(plan[0]?.planName || key.replace("plan:", ""));
      alert(`Plano "${plan[0]?.planName || key.replace('plan:', '')}" agora é o plano ativo.`);
      renderSavedPlansList();
    }
  });


  // Renderiza lista de planos salvos no carregamento
  renderSavedPlansList();
});

// =================== FUNÇÕES AUXILIARES ===================

// Atualiza o texto do plano ativo
function updateActivePlanStatus(customName = null) {
  const activeStatus = document.getElementById("active-plan-status");
  if (!activeStatus) return;

  const planName =
    customName ||
    JSON.parse(localStorage.getItem("currentPlan"))?.[0]?.planName ||
    "Boost 12dB (Default)";

  activeStatus.textContent = `Plano ativo: ${planName}`;
}

// Inicializa seletor de planos
function initPlanSelector(selectedKey = null) {
  const selector = document.getElementById("plan-selector");
  selector.innerHTML = "";

  // Adiciona opção default
  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "Boost 12dB (Default)";
  selector.appendChild(defaultOption);

  // Adiciona opções customizadas do localStorage
  Object.keys(localStorage)
    .filter((key) => key.startsWith("plan:"))
    .forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key.replace("plan:", "");
      if (selectedKey && selectedKey === key) option.selected = true;
      selector.appendChild(option);
    });
}

// Carregar plano default do servidor
async function loadDefaultPlan() {
  const res = await fetch("./json/semana-drills.json");
  return await res.json();
}

// Renderiza o plano
function renderPlan(weeks) {
  const selector = document.getElementById("week-selector");
  const content = document.getElementById("week-content");
  const title = document.getElementById("plan-title");

  selector.innerHTML = "";
  content.innerHTML = "";

  title.textContent = weeks[0]?.planName || "Plano de Estudos";

  weeks.forEach((week, idx) => {
    const btn = document.createElement("button");
    btn.innerText = week.drillName || `Semana ${idx + 1}`;

    btn.onclick = () => {
      selector.querySelectorAll("button").forEach((b) => b.classList.remove("active-week"));
      btn.classList.add("active-week");

      content.innerHTML = `
        <div class="week-card">
          <h2>${week.drillName}</h2>
          <p><b>Total de sessões no SineWave Trainer:</b> ${week.totalSineSessionsNeeded}</p>
          <p><b>Modo do SineWave Trainer:</b> ${week.sineWaveTrainerMode}</p>
          <p><b>Frequências usadas no SineWave Trainer:</b> ${
            week.sineWaveTrainerCustomFreq.length > 0
              ? week.sineWaveTrainerCustomFreq.join(", ")
              : "Nenhuma"
          }</p>
          <p><b>Resolução de Frequência:</b> ${week.frequencyResolution || "Não definido"}</p>
          <p><b>Total de sessões de EQ Fitness:</b> ${week.totalEQSessionsNeeded}</p>
          <p><b>Preset de EQ Fitness:</b> ${week.EQFitnessPresetUsed}</p>
          <p><b>Modo EQ Fitness:</b> ${week.EQFitnessPlaybackMode}</p>
          <p><b>Ganho utilizado:</b> ${week.EQFitnessGainCombination}</p>
        </div>
      `;
    };

    selector.appendChild(btn);
  });

  // Auto-seleciona a primeira semana
  if (selector.querySelector("button")) selector.querySelector("button").click();
}

// Renderiza lista de planos salvos
function renderSavedPlansList() {
  const container = document.getElementById("savedPlansList");
  if (!container) return;

  container.innerHTML = "<h3>Planos salvos no navegador:</h3>";
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("plan:"));

  if (keys.length === 0) {
    container.innerHTML += "<p>Nenhum plano salvo ainda.</p>";
    return;
  }

  keys.forEach((key) => {
    const planData = JSON.parse(localStorage.getItem(key));
    const planName = planData[0]?.planName || key.replace("plan:", "");
    const isActive = localStorage.getItem("currentPlanKey") === key;

    const div = document.createElement("div");
    div.classList.add("plan-entry");
    div.style.background = isActive ? "#e0f2fe" : "#fafafa";

    div.innerHTML = `
      <b>${planName}</b> ${isActive ? "⭐ (ativo)" : ""}
      <div class="plan-buttons">
        <button onclick="setActivePlan('${key}')" class="primary">Ativar</button>
        <button onclick="deletePlan('${key}')" class="danger">Excluir</button>
      </div>
    `;

    container.appendChild(div);
  });
}

// Define um plano salvo como ativo
  function setActivePlan(key) {
    const planData = JSON.parse(localStorage.getItem(key));
    if (!planData) return alert("Plano não encontrado.");

    localStorage.setItem("currentPlan", JSON.stringify(planData));
    localStorage.setItem("currentPlanKey", key);

    alert(`Plano "${key.replace("plan:", "")}" agora é o plano ativo.`);

    // 🔹 Atualiza UI imediatamente
    renderPlan(planData);
    updateActivePlanStatus(planData[0]?.planName);
    renderSavedPlansList();
  }


// Exclui um plano salvo
function deletePlan(key) {
  const confirmDelete = confirm(`Deseja realmente excluir o plano "${key.replace("plan:", "")}"?`);
  if (!confirmDelete) return;

  localStorage.removeItem(key);

  if (localStorage.getItem("currentPlanKey") === key) {
    localStorage.removeItem("currentPlan");
    localStorage.removeItem("currentPlanKey");
  }

  renderSavedPlansList();
  updateActivePlanStatus();
}

function saveCurrentPlan() {
  const selector = document.getElementById("plan-selector");
  const selectedKey = selector.value;

  if (selectedKey === "default") {
    alert("⚠️ Nenhum plano customizado carregado.\nEnvie ou selecione um plano antes de salvar.");
    return;
  }

  const rawPlan = localStorage.getItem(selectedKey);
  if (!rawPlan) {
    alert("⚠️ Nenhum plano encontrado no navegador.\nCarregue um plano antes de salvar.");
    return;
  }

  // ✅ Plano existe — salva de forma segura
  const planData = JSON.parse(rawPlan);
  window.plan = planData;
  savePlanToLocalStorage();
}

// 🔹 Torna acessível globalmente para o botão onclick no HTML
window.saveCurrentPlan = saveCurrentPlan;

function savePlanToLocalStorage() {
  // Verifica se há um plano carregado
  const currentPlanKey = localStorage.getItem("currentPlanKey");
  const currentPlanRaw = localStorage.getItem("currentPlan");

  if (!currentPlanKey || !currentPlanRaw) {
    alert("⚠️ Nenhum plano ativo encontrado. Carregue um plano antes de salvar.");
    return;
  }

  const planData = JSON.parse(currentPlanRaw);
  const planName = planData[0]?.planName?.trim() || "Plano sem nome";
  const key = `plan:${planName}`;

  // Se já existe, confirmar sobrescrita
  if (localStorage.getItem(key)) {
    const overwrite = confirm(`Já existe um plano chamado "${planName}". Deseja sobrescrever?`);
    if (!overwrite) return;
  }

  // 🔹 Salva o plano com sua chave
  localStorage.setItem(key, JSON.stringify(planData));
  localStorage.setItem("currentPlanKey", key);
  localStorage.setItem("currentPlan", JSON.stringify(planData));

  alert(`💾 Plano "${planName}" foi salvo com sucesso no navegador!`);
  renderSavedPlansList();
  updateActivePlanStatus(planName);
}
