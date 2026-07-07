const RADAR_CONFIG = {
  width: 1800,
  height: 1200,
  padding: 120,
  chartCenterX: 760,
  chartCenterY: 620,
  radius: 350,
  levels: 6,
  maxValue: 6,
  labelOffset: 118,
  axisLineOffset: 28,
};

const PART2_CONFIG = {
  width: 1800,
  height: 1200,
  minValue: 1,
  maxValue: 6,
  chartLeft: 210,
  chartRight: 1440,
  chartTop: 132,
  chartBottom: 860,
  boxWidth: 70,
  boxHeight: 53,
  capWidth: 56,
  axisTickStart: 1,
  axisTickEnd: 6,
};

const state = {
  hotspotConfig: null,
  radarRows: [],
  part2Rows: [],
  activeModes: {
    part1: 'config',
    part2: 'default',
    part3: 'default',
  },
  tooltipTimer: null,
};

const tooltipPanel = document.getElementById('tooltip-panel');
const tooltipContent = document.getElementById('tooltip-content');
const tooltipClose = document.getElementById('tooltip-close');
const tooltipShell = tooltipPanel.querySelector('.tooltip-shell');
const tooltipLabel = tooltipPanel.querySelector('.tooltip-label');
const hotspotTemplate = document.getElementById('hotspot-template');

const part1ModeLabel = document.getElementById('part1-mode-label');
const part1Caption = document.getElementById('part1-caption');
const part1RadarSvg = document.getElementById('part1-radar-svg');
const part1RadarHotspots = document.getElementById('part1-radar-hotspots');
const part1RadarLegend = document.getElementById('part1-radar-legend');
const part2BoxSvg = document.getElementById('part2-box-svg');
const part2BoxHotspots = document.getElementById('part2-box-hotspots');
const part2Caption = document.getElementById('part2-caption');

init();

async function init() {
  bindModeButtons();
  bindTooltipEvents();

  await Promise.all([
    loadHotspotConfig(),
    loadPart1RadarData(),
    loadPart2ChartData(),
  ]);

  updateModeCopy('part1', state.activeModes.part1);
  renderAllStages();
}

function renderAllStages() {
  renderPart1Radar();
  renderPart2Chart();
  renderHotspotsForStage('part3');
}

async function loadHotspotConfig() {
  try {
    const response = await fetch('data/hotspots.json');
    if (!response.ok) throw new Error('Failed to load hotspots.json');
    state.hotspotConfig = await response.json();
  } catch (error) {
    console.error(error);
  }
}

async function loadPart1RadarData() {
  try {
    const response = await fetch('data/csv/xinhai-part01-radar-clean-long.csv');
    if (!response.ok) throw new Error('Failed to load xinhai-part01-radar-clean-long.csv');
    const csvText = await response.text();
    state.radarRows = parseRadarCsv(csvText);
  } catch (error) {
    console.error(error);
    state.radarRows = [];
  }
}

async function loadPart2ChartData() {
  try {
    const response = await fetch('data/csv/xinhai-part02-box-clean-long.csv');
    if (!response.ok) throw new Error('Failed to load xinhai-part02-box-clean-long.csv');
    const csvText = await response.text();
    state.part2Rows = parsePart2Csv(csvText);
  } catch (error) {
    console.error(error);
    state.part2Rows = [];
  }
}

function bindModeButtons() {
  document.querySelectorAll('.mode-button').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.modeTarget;
      const mode = button.dataset.mode;
      state.activeModes[target] = mode;

      const siblings = document.querySelectorAll(`.mode-button[data-mode-target="${target}"]`);
      siblings.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('active', isActive);
        item.classList.toggle('ghost', !isActive);
        item.setAttribute('aria-selected', String(isActive));
      });

      updateModeCopy(target, mode);
      if (target === 'part1') {
        renderPart1Radar();
      } else if (target === 'part2') {
        renderPart2Chart();
      } else {
        renderHotspotsForStage(target);
      }
      hideTooltip();
    });
  });
}

function bindTooltipEvents() {
  tooltipClose.addEventListener('click', hideTooltip);

  tooltipPanel.addEventListener('mouseenter', () => {
    clearTimeout(state.tooltipTimer);
  });

  tooltipPanel.addEventListener('mouseleave', () => {
    scheduleTooltipHide();
  });

  window.addEventListener('resize', () => {
    hideTooltip();
    renderPart1Radar();
    renderPart2Chart();
  });
  window.addEventListener('scroll', hideTooltip, { passive: true });
}

function updateModeCopy(target, mode) {
  if (target !== 'part1') return;

  const copyMap = {
    config: {
      label: '目前模式：配置',
      caption: '目前顯示校內學習支持的配置視角。hover可查看各向度的完整統計數值。',
    },
    access: {
      label: '目前模式：獲取',
      caption: '目前顯示學生實際獲取的視角。hover可查看各向度的完整統計數值。',
    },
    both: {
      label: '目前模式：配置與獲取',
      caption: '目前同步顯示配置與獲取兩組資料，可直接比較各向度在制度支持與實際感受之間的差異。',
    },
  };

  const copy = copyMap[mode];
  if (!copy) return;
  part1ModeLabel.textContent = copy.label;
  part1Caption.textContent = copy.caption;
}

function renderHotspotsForStage(stageName) {
  if (!state.hotspotConfig) return;

  const layer = document.querySelector(`[data-hotspot-layer="${stageName}"]`);
  if (!layer) return;
  layer.innerHTML = '';

  const stageConfig = state.hotspotConfig[stageName];
  if (!stageConfig) return;

  const hotspots = stageConfig.default || [];
  hotspots.forEach((item) => {
    const fragment = hotspotTemplate.content.cloneNode(true);
    const button = fragment.querySelector('.hotspot-point');
    button.style.left = `${item.x}%`;
    button.style.top = `${item.y}%`;
    button.dataset.md = item.md;
    button.dataset.title = item.title || '資料說明';
    button.dataset.stage = stageName;
    button.dataset.tooltipLabel = '資料說明';
    button.setAttribute('aria-label', item.title || '資料說明');

    bindTooltipTarget(button);
    layer.appendChild(fragment);
  });
}

function renderPart1Radar() {
  if (!part1RadarSvg || !part1RadarHotspots || !part1RadarLegend) return;

  part1RadarSvg.innerHTML = '';
  part1RadarHotspots.innerHTML = '';

  if (!state.radarRows.length) {
    renderRadarFallback();
    return;
  }

  const currentMode = state.activeModes.part1 || 'config';
  const visibleKeys = currentMode === 'config'
    ? ['conf']
    : currentMode === 'access'
      ? ['get']
      : ['conf', 'get'];

  const allRows = [...state.radarRows].sort((a, b) => a.order - b.order || a.series_key.localeCompare(b.series_key));
  const axisRows = allRows.filter((row) => row.series_key === 'conf');
  const bySeries = {
    conf: allRows.filter((row) => row.series_key === 'conf'),
    get: allRows.filter((row) => row.series_key === 'get'),
  };

  part1RadarSvg.setAttribute('viewBox', `0 0 ${RADAR_CONFIG.width} ${RADAR_CONFIG.height}`);
  part1RadarSvg.innerHTML = buildRadarSvgMarkup(axisRows, bySeries, visibleKeys);
  buildRadarHotspots(bySeries, visibleKeys);
  updateRadarLegend(visibleKeys);
}

function renderRadarFallback() {
  const ns = 'http://www.w3.org/2000/svg';
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', '900');
  text.setAttribute('y', '600');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('class', 'radar-empty-copy');
  text.textContent = '目前無法載入PART 01雷達圖資料';
  part1RadarSvg.appendChild(text);
}

function buildRadarSvgMarkup(axisRows, bySeries, visibleKeys) {
  const cfg = RADAR_CONFIG;
  const count = axisRows.length;
  const centerX = cfg.chartCenterX;
  const centerY = cfg.chartCenterY;
  const radius = cfg.radius;

  const ringPolygons = [];
  const axisLines = [];
  const levelLabels = [];
  const axisLabels = [];
  const dataLayers = [];

  for (let level = cfg.levels; level >= 1; level -= 1) {
    const ratio = level / cfg.levels;
    const points = axisRows.map((row, index) => {
      const angle = getAxisAngle(index, count);
      return polarToCartesian(centerX, centerY, radius * ratio, angle);
    });
    const fillOpacity = level % 2 === 0 ? '0.28' : '0.12';
    ringPolygons.push(
      `<polygon class="radar-grid-level" fill="rgba(255,255,255,${fillOpacity})" points="${pointsToString(points)}"></polygon>`
    );

    const labelPoint = polarToCartesian(centerX, centerY, radius * ratio, -Math.PI / 2);
    levelLabels.push(
      `<text class="radar-scale-label" x="${centerX - 18}" y="${labelPoint.y + 5}" text-anchor="end">${level}</text>`
    );
  }

  axisRows.forEach((row, index) => {
    const angle = getAxisAngle(index, count);
    const lineEnd = polarToCartesian(centerX, centerY, radius + cfg.axisLineOffset, angle);
    axisLines.push(
      `<line class="radar-axis-line" x1="${centerX}" y1="${centerY}" x2="${lineEnd.x}" y2="${lineEnd.y}"></line>`
    );

    const labelPoint = polarToCartesian(centerX, centerY, radius + cfg.labelOffset, angle);
    axisLabels.push(buildAxisLabel(row.axis, labelPoint.x, labelPoint.y, angle));
  });

  visibleKeys.forEach((seriesKey) => {
    const seriesRows = bySeries[seriesKey];
    if (!seriesRows.length) return;

    const stroke = seriesRows[0].stroke_hex;
    const fill = seriesRows[0].fill_rgba;
    const points = seriesRows.map((row, index) => {
      const angle = getAxisAngle(index, count);
      return polarToCartesian(centerX, centerY, valueToRadius(row.mean), angle);
    });

    dataLayers.push(`
      <polygon class="radar-area radar-area-${seriesKey}" points="${pointsToString(points)}" fill="${fill}" stroke="${stroke}"></polygon>
      ${points.map((point) => `
        <circle class="radar-point-dot radar-point-dot-${seriesKey}" cx="${point.x}" cy="${point.y}" r="8"></circle>
        <circle class="radar-point-halo radar-point-halo-${seriesKey}" cx="${point.x}" cy="${point.y}" r="15"></circle>
      `).join('')}
    `);
  });

  return `
    <defs>
      <filter id="radarSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#5f554d" flood-opacity="0.15"></feDropShadow>
      </filter>
    </defs>
    <rect class="radar-bg-plate" x="28" y="28" width="1744" height="1144" rx="36"></rect>
    <g class="radar-chart-group" filter="url(#radarSoftGlow)">
      <circle class="radar-center-wash" cx="${centerX}" cy="${centerY}" r="${radius + 48}"></circle>
      ${ringPolygons.join('')}
      ${axisLines.join('')}
      ${levelLabels.join('')}
      ${dataLayers.join('')}
      <circle class="radar-center-dot" cx="${centerX}" cy="${centerY}" r="6"></circle>
      ${axisLabels.join('')}
    </g>
  `;
}

function buildAxisLabel(text, x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle';
  const xOffset = cos > 0.35 ? 8 : cos < -0.35 ? -8 : 0;
  const yShift = sin > 0.6 ? 8 : sin < -0.6 ? -8 : 0;

  return `
    <text class="radar-axis-label" x="${x + xOffset}" y="${y + yShift}" text-anchor="${anchor}">${escapeHtml(text)}</text>
  `;
}
function buildPart2AxisLabel(text, x, y) {
  const columns = splitLabel(text, 7);
  const rowGap = 30;
  const columnGap = 34;

  const chars = columns.map((columnText, columnIndex) => {
    return Array.from(columnText).map((char, charIndex) => {
      const charX = x + (columnIndex * columnGap);
      const charY = y + (charIndex * rowGap);
      return `<text class="part2-x-label" x="${charX}" y="${charY}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(char)}</text>`;
    }).join('');
  }).join('');

  return `
    <g class="part2-x-label-group">${chars}</g>
  `;
}


function buildRadarHotspots(bySeries, visibleKeys) {
  const count = bySeries.conf.length || bySeries.get.length;

  visibleKeys.forEach((seriesKey) => {
    const rows = bySeries[seriesKey] || [];
    rows.forEach((row, index) => {
      const angle = getAxisAngle(index, count);
      const point = polarToCartesian(
        RADAR_CONFIG.chartCenterX,
        RADAR_CONFIG.chartCenterY,
        valueToRadius(row.mean),
        angle,
      );

      const button = document.createElement('button');
      button.className = `radar-point radar-point-${seriesKey}`;
      button.type = 'button';
      button.style.left = `${(point.x / RADAR_CONFIG.width) * 100}%`;
      button.style.top = `${(point.y / RADAR_CONFIG.height) * 100}%`;
      button.dataset.tooltipType = 'stats';
      button.dataset.tooltipLabel = '數據節點';
      button.dataset.title = row.axis;
      button.dataset.axis = row.axis;
      button.dataset.pointName = row.point_name;
      button.dataset.seriesLabel = row.series_label;
      button.dataset.seriesKey = row.series_key;
      button.dataset.n = String(row.n);
      button.dataset.min = String(row.min);
      button.dataset.max = String(row.max);
      button.dataset.mean = String(row.mean);
      button.dataset.sd = String(row.sd);
      button.setAttribute('aria-label', `${row.point_name} 數據說明`);
      button.innerHTML = '<span class="radar-point-ring"></span><span class="radar-point-core"></span>';

      bindTooltipTarget(button);
      part1RadarHotspots.appendChild(button);
    });
  });
}

function updateRadarLegend(visibleKeys) {
  const items = part1RadarLegend.querySelectorAll('.radar-legend-item');
  items.forEach((item) => {
    const isConf = item.classList.contains('radar-legend-conf');
    const key = isConf ? 'conf' : 'get';
    item.classList.toggle('is-active', visibleKeys.includes(key));
    item.classList.toggle('is-muted', !visibleKeys.includes(key));
  });
}


function renderPart2Chart() {
  if (!part2BoxSvg || !part2BoxHotspots) return;

  part2BoxSvg.innerHTML = '';
  part2BoxHotspots.innerHTML = '';

  if (!state.part2Rows.length) {
    const ns = 'http://www.w3.org/2000/svg';
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', '900');
    text.setAttribute('y', '600');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'radar-empty-copy');
    text.textContent = '目前無法載入PART 02圖表資料';
    part2BoxSvg.appendChild(text);
    return;
  }

  part2BoxSvg.setAttribute('viewBox', `0 0 ${PART2_CONFIG.width} ${PART2_CONFIG.height}`);
  part2BoxSvg.innerHTML = buildPart2SvgMarkup(state.part2Rows);
  buildPart2Hotspots(state.part2Rows);
}

function buildPart2SvgMarkup(rows) {
  const cfg = PART2_CONFIG;
  const chartWidth = cfg.chartRight - cfg.chartLeft;
  const slot = chartWidth / rows.length;
  const yForValue = (value) => {
    const ratio = (Number(value) - cfg.minValue) / (cfg.maxValue - cfg.minValue);
    return cfg.chartBottom - (ratio * (cfg.chartBottom - cfg.chartTop));
  };

  const gridLines = [];
  const yLabels = [];
  for (let value = cfg.axisTickStart; value <= cfg.axisTickEnd; value += 1) {
    const y = yForValue(value);
    gridLines.push(`<line class="part2-grid-line" x1="${cfg.chartLeft}" y1="${y}" x2="${cfg.chartRight}" y2="${y}"></line>`);
    yLabels.push(`<text class="part2-y-label" x="${cfg.chartLeft - 28}" y="${y + 7}" text-anchor="end">${value}</text>`);
  }

  const baseAxis = `
    <line class="part2-axis-line" x1="${cfg.chartLeft}" y1="${cfg.chartTop - 20}" x2="${cfg.chartLeft}" y2="${cfg.chartBottom + 20}"></line>
    <line class="part2-axis-line axis-bottom" x1="${cfg.chartLeft}" y1="${cfg.chartBottom}" x2="${cfg.chartRight + 40}" y2="${cfg.chartBottom}"></line>
  `;

  const groups = rows.map((row, index) => {
    const x = cfg.chartLeft + slot * index + slot / 2;
    const yMean = yForValue(row.mean);
    const yMin = yForValue(row.min);
    const yMax = yForValue(row.max);
    const labelY = cfg.chartBottom + 34;
    const labelX = x;
    return `
      <g class="part2-series-group" data-order="${row.order}">
        <line class="part2-whisker-line" x1="${x}" y1="${yMax}" x2="${x}" y2="${yMin}" stroke="${row.whisker_hex}"></line>
        <line class="part2-whisker-cap" x1="${x - cfg.capWidth / 2}" y1="${yMax}" x2="${x + cfg.capWidth / 2}" y2="${yMax}" stroke="${row.whisker_hex}"></line>
        <line class="part2-whisker-cap" x1="${x - cfg.capWidth / 2}" y1="${yMin}" x2="${x + cfg.capWidth / 2}" y2="${yMin}" stroke="${row.whisker_hex}"></line>
        <rect class="part2-mean-box" x="${x - cfg.boxWidth / 2}" y="${yMean - cfg.boxHeight / 2}" width="${cfg.boxWidth}" height="${cfg.boxHeight}" rx="20"
          fill="${row.marker_fill_hex}" stroke="${row.marker_stroke_hex}"></rect>
        <text class="part2-mean-text" x="${x}" y="${yMean + 7}" text-anchor="middle">${formatStatNumber(row.mean, 2)}</text>
        <line class="part2-x-tick" x1="${x}" y1="${cfg.chartBottom}" x2="${x}" y2="${cfg.chartBottom + 14}"></line>
        ${buildPart2AxisLabel(row.axis, labelX, labelY)}
      </g>
    `;
  });

  return `
    <defs>
      <filter id="part2SoftGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#5f554d" flood-opacity="0.14"></feDropShadow>
      </filter>
      <linearGradient id="part2PlateFill" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.48)"></stop>
        <stop offset="100%" stop-color="rgba(244,236,231,0.42)"></stop>
      </linearGradient>
    </defs>
    <rect class="part2-bg-plate" x="28" y="28" width="1744" height="1144" rx="36"></rect>
    <g class="part2-chart-group" filter="url(#part2SoftGlow)">
      <rect class="part2-chart-area" x="${cfg.chartLeft - 34}" y="${cfg.chartTop - 34}" width="${(cfg.chartRight - cfg.chartLeft) + 88}" height="${(cfg.chartBottom - cfg.chartTop) + 86}" rx="34"></rect>
      ${gridLines.join('')}
      ${yLabels.join('')}
      ${baseAxis}
      ${groups.join('')}
    </g>
  `;
}

function buildPart2Hotspots(rows) {
  const cfg = PART2_CONFIG;
  const chartWidth = cfg.chartRight - cfg.chartLeft;
  const slot = chartWidth / rows.length;
  const yForValue = (value) => {
    const ratio = (Number(value) - cfg.minValue) / (cfg.maxValue - cfg.minValue);
    return cfg.chartBottom - (ratio * (cfg.chartBottom - cfg.chartTop));
  };

  rows.forEach((row, index) => {
    const x = cfg.chartLeft + slot * index + slot / 2;
    const y = yForValue(row.mean);
    const button = document.createElement('button');
    button.className = 'part2-box-hit';
    button.type = 'button';
    button.style.left = `${(x / cfg.width) * 100}%`;
    button.style.top = `${(y / cfg.height) * 100}%`;
    button.style.width = `${(cfg.boxWidth / cfg.width) * 100}%`;
    button.style.height = `${(cfg.boxHeight / cfg.height) * 100}%`;
    button.dataset.tooltipType = 'part2stats';
    button.dataset.tooltipLabel = '數據說明';
    button.dataset.title = row.axis;
    button.dataset.pointName = row.point_name;
    button.dataset.n = String(row.n);
    button.dataset.min = String(row.min);
    button.dataset.max = String(row.max);
    button.dataset.mean = String(row.mean);
    button.dataset.sd = String(row.sd);
    button.setAttribute('aria-label', `${row.point_name} 數據說明`);
    bindTooltipTarget(button);
    part2BoxHotspots.appendChild(button);
  });
}

function bindTooltipTarget(button) {
  button.addEventListener('mouseenter', (event) => {
    clearTimeout(state.tooltipTimer);
    showTooltipForPoint(event.currentTarget);
  });

  button.addEventListener('focus', (event) => {
    clearTimeout(state.tooltipTimer);
    showTooltipForPoint(event.currentTarget);
  });

  button.addEventListener('mouseleave', scheduleTooltipHide);
  button.addEventListener('blur', scheduleTooltipHide);
}

function scheduleTooltipHide() {
  clearTimeout(state.tooltipTimer);
  state.tooltipTimer = window.setTimeout(hideTooltip, 120);
}

async function showTooltipForPoint(button) {
  document.querySelectorAll('.hotspot-point, .radar-point, .part2-box-hit').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');

  const label = button.dataset.tooltipLabel || '資料說明';
  tooltipLabel.textContent = label;
  tooltipPanel.hidden = false;

  if (button.dataset.tooltipType === 'stats') {
    tooltipContent.innerHTML = renderStatsTooltip(button.dataset);
    positionTooltip(button);
    return;
  }

  if (button.dataset.tooltipType === 'part2stats') {
    tooltipContent.innerHTML = renderPart2StatsTooltip(button.dataset);
    positionTooltip(button);
    return;
  }

  const title = button.dataset.title || '資料說明';
  const mdPath = button.dataset.md;
  tooltipContent.innerHTML = '<p>載入中…</p>';

  try {
    const response = await fetch(mdPath);
    if (!response.ok) throw new Error(`Failed to load ${mdPath}`);
    const markdown = await response.text();
    tooltipContent.innerHTML = renderMarkdown(markdown, title);
  } catch (error) {
    console.error(error);
    tooltipContent.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>無法讀取Markdown內容，請確認檔案是否存在：</p>
      <p><code>${escapeHtml(mdPath)}</code></p>
    `;
  }

  positionTooltip(button);
}

function positionTooltip(button) {
  const rect = button.getBoundingClientRect();
  const shellWidth = Math.min(360, window.innerWidth - 32);
  const gap = 16;
  let left = rect.right + gap;
  let top = rect.top - 10;

  if (left + shellWidth > window.innerWidth - 16) {
    left = rect.left - shellWidth - gap;
  }

  if (left < 16) {
    left = 16;
  }

  const maxTop = window.innerHeight - 120;
  if (top > maxTop) top = maxTop;
  if (top < 16) top = 16;

  tooltipShell.style.left = `${left}px`;
  tooltipShell.style.top = `${top}px`;
}

function hideTooltip() {
  tooltipPanel.hidden = true;
  document.querySelectorAll('.hotspot-point, .radar-point, .part2-box-hit').forEach((item) => item.classList.remove('active'));
}

function renderStatsTooltip(data) {
  return `
    <div class="tooltip-series-meta">
      <span class="tooltip-series-swatch tooltip-series-${escapeHtml(data.seriesKey || '')}"></span>
      <span>${escapeHtml(data.seriesLabel)}</span>
    </div>
    <h3>${escapeHtml(data.axis || data.title || '數據節點')}</h3>
    <p class="tooltip-subtitle">名稱：${escapeHtml(data.pointName || data.axis || '')}</p>
    <div class="tooltip-stat-grid">
      ${renderStatBox('N', formatStatNumber(data.n, 0))}
      ${renderStatBox('最小值', formatStatNumber(data.min, 2))}
      ${renderStatBox('最大值', formatStatNumber(data.max, 2))}
      ${renderStatBox('平均值', formatStatNumber(data.mean, 2))}
      ${renderStatBox('標準偏差', formatStatNumber(data.sd, 2), true)}
    </div>
  `;
}


function renderPart2StatsTooltip(data) {
  return `
    <h3>${escapeHtml(data.title || '數據節點')}</h3>
    <p class="tooltip-subtitle">點名稱：${escapeHtml(data.pointName || data.title || '')}</p>
    <div class="tooltip-stat-grid part2-tooltip-grid">
      ${renderStatBox('N', formatStatNumber(data.n, 0))}
      ${renderStatBox('平均值', formatStatNumber(data.mean, 2))}
      ${renderStatBox('最大值', formatStatNumber(data.max, 2))}
      ${renderStatBox('最小值', formatStatNumber(data.min, 2))}
      ${renderStatBox('標準偏差', formatStatNumber(data.sd, 2), true)}
    </div>
  `;
}

function renderStatBox(label, value, spanFull = false) {
  return `
    <div class="tooltip-stat-box${spanFull ? ' full' : ''}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderMarkdown(markdown, fallbackTitle = '資料說明') {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const html = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.join('')}</ul>`);
    listItems = [];
  };

  let hasHeading = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    if (/^#{1,4}\s/.test(line)) {
      flushList();
      const level = Math.min(line.match(/^#+/)[0].length + 1, 4);
      const content = inlineMarkdown(line.replace(/^#{1,4}\s*/, ''));
      html.push(`<h${level}>${content}</h${level}>`);
      hasHeading = true;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      listItems.push(`<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    flushList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  flushList();

  if (!hasHeading) {
    html.unshift(`<h3>${escapeHtml(fallbackTitle)}</h3>`);
  }

  return html.join('');
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function parseRadarCsv(csvText) {
  const rows = parseCsvRows(csvText.replace(/^\uFEFF/, ''));
  return rows.map((row) => ({
    school: row.school,
    part: row.part,
    order: Number(row.order),
    axis: row.axis,
    series_key: row.series_key,
    series_label: row.series_label,
    point_name: row.point_name,
    n: Number(row.n),
    min: Number(row.min),
    max: Number(row.max),
    mean: Number(row.mean),
    sd: Number(row.sd),
    stroke_hex: row.stroke_hex,
    fill_rgba: row.fill_rgba,
    raw_name: row.raw_name,
  }));
}


function parsePart2Csv(csvText) {
  const rows = parseCsvRows(csvText.replace(/^﻿/, ''));
  return rows.map((row) => ({
    school: row.school,
    part: row.part,
    order: Number(row.order),
    axis: row.axis,
    point_name: row.point_name,
    n: Number(row.n),
    min: Number(row.min),
    max: Number(row.max),
    mean: Number(row.mean),
    sd: Number(row.sd),
    marker_fill_hex: row.marker_fill_hex,
    marker_stroke_hex: row.marker_stroke_hex,
    whisker_hex: row.whisker_hex,
    text_hex: row.text_hex,
  })).sort((a, b) => a.order - b.order);
}

function parseCsvRows(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current);
      current = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  const [header = [], ...body] = rows;
  return body.map((cells) => {
    const entry = {};
    header.forEach((key, index) => {
      entry[key] = (cells[index] || '').trim();
    });
    return entry;
  });
}

function getAxisAngle(index, count) {
  return (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
}

function valueToRadius(value) {
  return (Number(value) / RADAR_CONFIG.maxValue) * RADAR_CONFIG.radius;
}

function polarToCartesian(centerX, centerY, radius, angle) {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function pointsToString(points) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

function splitLabel(text, chunkSize = 6) {
  if (!text) return [''];
  if (text.length <= chunkSize) return [text];
  const lines = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    lines.push(text.slice(index, index + chunkSize));
  }
  return lines;
}

function formatStatNumber(value, decimals = 2) {
  const number = Number(value);
  if (Number.isNaN(number)) return '—';
  return number.toFixed(decimals);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
