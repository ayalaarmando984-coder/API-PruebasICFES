// ── Configuración ───────────────────────────────────────
const API_URL = "https://www.datos.gov.co/resource/hk5x-635y.json";

// Mapeo de columnas por año (2017-2019 tienen prefijo distinto)
const COLUMNA_ANIO = {
  "2014": "a_o_2014", "2015": "a_o_2015", "2016": "a_o_2016",
  "2017": "_2017",    "2018": "_2018",    "2019": "_2019",
  "2020": "a_o_2020", "2021": "a_o_2021", "2022": "a_o_2022",
  "2023": "a_o_2023", "2024": "a_o_2024"
};

// Conversión de categoría a número
const PUNTAJE = { "A+": 5, "A": 4, "B": 3, "C": 2, "D": 1 };

// Conversión de promedio numérico a categoría legible
function promedioACategoria(prom) {
  if (prom >= 4.5) return "A+";
  if (prom >= 3.5) return "A";
  if (prom >= 2.5) return "B";
  if (prom >= 1.5) return "C";
  return "D";
}

// ── Función principal ────────────────────────────────────
async function consultarDatos() {
  const anio = document.getElementById("year-select").value;
  const msgEl = document.getElementById("mensaje");
  const resEl = document.getElementById("resultados");
  const btn   = document.getElementById("btn-consultar");

  if (!anio) {
    msgEl.className = "error";
    msgEl.textContent = "Por favor selecciona un año.";
    return;
  }

  // Estado de carga
  btn.disabled = true;
  msgEl.className = "loading";
  msgEl.textContent = `Consultando datos del año ${anio}...`;
  resEl.innerHTML = "";

  try {
    // 1. Fetch a la API SODA
    const url = `${API_URL}?$limit=200`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Error al conectar con la API");
    const datos = await resp.json();

    // 2. Obtener el nombre real de la columna para ese año
    const columna = COLUMNA_ANIO[anio];

    // 3. Agrupar por municipio y acumular puntajes
    const grupos = {};
    datos.forEach(inst => {
      const mun = inst.municipio?.trim() || "Desconocido";
      const cat = (inst[columna] || "").trim().toUpperCase();
      const pts = PUNTAJE[cat]; // undefined si es NR o NA → se ignora

      if (pts !== undefined) {
        if (!grupos[mun]) grupos[mun] = { suma: 0, total: 0 };
        grupos[mun].suma  += pts;
        grupos[mun].total += 1;
      }
    });

    // 4. Calcular promedio y ordenar de mayor a menor
    const ranking = Object.entries(grupos)
      .map(([mun, { suma, total }]) => ({
        municipio: mun,
        promedio: suma / total,
        instituciones: total,
        categoria: promedioACategoria(suma / total)
      }))
      .sort((a, b) => b.promedio - a.promedio);

    // 5. Renderizar el ranking
    renderizarRanking(ranking, anio);
    msgEl.className = "";
    msgEl.style.display = "none";

  } catch (err) {
    msgEl.className = "error";
    msgEl.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

// ── Renderizado ──────────────────────────────────────────
function renderizarRanking(ranking, anio) {
  const el = document.getElementById("resultados");
  const maxProm = ranking[0]?.promedio || 1;
  const medallas = ["gold", "silver", "bronze"];

  el.innerHTML = `<p class="ranking-header">
    ${ranking.length} municipios con datos para ${anio}
  </p>`
  + ranking.map((item, i) => {
    const pct = ((item.promedio / maxProm) * 100).toFixed(1);
    const medalla = medallas[i] || "";
    return `
    <div class="ranking-item">
      <div class="rank-pos ${medalla}">#${i+1}</div>
      <div class="rank-info">
        <div class="rank-municipio">${item.municipio}</div>
        <div class="rank-detalle">
          ${item.instituciones} institución(es) · 
          Promedio: ${item.promedio.toFixed(2)}
        </div>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="rank-score">
        <span class="score-badge badge-${item.categoria}">
          ${item.categoria}
        </span>
      </div>
    </div>`;
  }).join("");
}