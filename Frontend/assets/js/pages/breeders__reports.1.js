// Reports & Farm Intelligence page module.
(function () {
  let reportData = null;
  let reportAnimals = [];
  let reportEvents = [];

  // Handles text behavior for this page.
  function text(value, fallback = '—') {
    return value === null || value === undefined || value === '' ? fallback : String(value);
  }

  // Handles title behavior for this page.
  function title(value, fallback = '—') {
    return text(value, fallback).replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase());
  }

  // Handles date text behavior for this page.
  function dateText(value, fallback = '—') {
    if (!value) return fallback;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
  }

  // Handles number behavior for this page.
  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  // Handles pct behavior for this page.
  function pct(value) {
    const n = number(value, 0);
    return `${n}%`;
  }

  // Handles set html behavior for this page.
  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // Handles safe array behavior for this page.
  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  // Handles download csv behavior for this page.
  function downloadCsv(filename, headers, rows) {
    const escape = value => `"${text(value, '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(row => row.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Shows empty feedback to the user.
  function showEmpty(message = 'No data recorded yet.') {
    return `<div class="empty-state">${message}</div>`;
  }

  // Renders kpis content in the page.
  function renderKpis(summary) {
    const kpis = [
      { icon: 'fa-paw', value: summary.total_animals || 0, label: 'Animals Registered', note: `${summary.males || 0} male · ${summary.females || 0} female`, color: '#2563eb', bg: '#eff6ff' },
      { icon: 'fa-heartbeat', value: summary.active_pregnancies || 0, label: 'Active Pregnancies', note: `${summary.due_soon || 0} due soon · ${summary.overdue_pregnancies || 0} overdue`, color: '#db2777', bg: '#fdf2f8' },
      { icon: 'fa-baby', value: summary.live_offspring_total || 0, label: 'Live Offspring', note: `${summary.offspring_survival_rate || 0}% recorded survival`, color: '#16a34a', bg: '#dcfce7' },
      { icon: 'fa-chart-line', value: pct(summary.closed_success_rate || 0), label: 'Closed Success Rate', note: `${summary.breeding_events || 0} breeding records`, color: '#7c3aed', bg: '#f3e8ff' },
    ];
    setHtml('reportKpiGrid', kpis.map(k => `
      <div class="kpi-card" style="--kpi-color:${k.color};--kpi-bg:${k.bg};">
        <div class="kpi-icon"><i class="fa ${k.icon}"></i></div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-note">${k.note}</div>
      </div>
    `).join(''));
  }

  // Renders horizontal bars content in the page.
  function renderHorizontalBars(id, entries, emptyMessage) {
    const list = Array.isArray(entries) ? entries : Object.entries(entries || {}).map(([label, value]) => ({ label, value }));
    if (!list.length) return setHtml(id, showEmpty(emptyMessage));
    const max = Math.max(...list.map(item => number(item.value, 0)), 1);
    setHtml(id, list.slice(0, 8).map(item => {
      const value = number(item.value, 0);
      return `<div class="hbar-row">
        <div class="hbar-label" title="${text(item.label)}">${text(item.label)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(6, (value / max) * 100)}%;"></div></div>
        <div class="hbar-value">${value}</div>
      </div>`;
    }).join(''));
  }

  // Renders trend chart content in the page.
  function renderTrendChart() {
    const trends = Object.entries(reportData?.birth_trends || {});
    if (!trends.length) return setHtml('birthTrendChart', showEmpty('No live-birth trend data yet.'));
    const last = trends.slice(-8);
    const max = Math.max(...last.map(([, value]) => number(value, 0)), 1);
    setHtml('birthTrendChart', last.map(([month, value]) => {
      const height = Math.max(8, (number(value, 0) / max) * 140);
      return `<div class="trend-col" title="${month}: ${value}">
        <div class="trend-value">${value}</div>
        <div class="trend-bar" style="height:${height}px"></div>
        <div class="trend-label">${month.slice(5)}</div>
      </div>`;
    }).join(''));
  }

  // Renders actions content in the page.
  function renderActions(actions) {
    const items = safeArray(actions);
    if (!items.length) return setHtml('recommendedActions', showEmpty('No recommended actions at the moment.'));
    setHtml('recommendedActions', items.map(item => {
      const priority = text(item.priority, 'normal').toLowerCase();
      const icon = priority === 'urgent' ? 'fa-exclamation-triangle' : priority === 'high' ? 'fa-bell' : priority === 'medium' ? 'fa-clipboard-list' : 'fa-check-circle';
      return `<div class="action-item ${priority}">
        <div class="action-dot"><i class="fa ${icon}"></i></div>
        <div><div class="action-title">${text(item.title)}</div><div class="action-desc">${text(item.description)}</div></div>
      </div>`;
    }).join(''));
  }

  // Renders method performance content in the page.
  function renderMethodPerformance() {
    const rows = safeArray(reportData?.reproductive_report?.method_performance);
    setHtml('methodPerformanceBody', rows.length ? rows.map(row => `<tr>
      <td>${text(row.method)}</td>
      <td>${row.attempts || 0}</td>
      <td>${row.successes || 0}</td>
      <td>${row.failures || 0}</td>
      <td><span class="rate-pill">${row.success_rate ?? 0}%</span></td>
    </tr>`).join('') : `<tr><td colspan="5">No breeding method data yet.</td></tr>`);
  }

  // Renders quality content in the page.
  function renderQuality() {
    const score = number(reportData?.data_quality?.overall_score, 0);
    const ring = document.getElementById('dataQualityRing');
    if (ring) {
      ring.style.setProperty('--score-deg', `${Math.min(100, Math.max(0, score)) * 3.6}deg`);
      ring.innerHTML = `<span>${score}%</span>`;
    }
    const items = safeArray(reportData?.data_quality?.items);
    setHtml('dataQualityList', items.length ? items.map(item => `<div class="quality-item">
      <div class="quality-top"><span>${text(item.label)}</span><span>${item.rate || 0}%</span></div>
      <div class="quality-track"><div class="quality-fill" style="width:${item.rate || 0}%"></div></div>
      <div class="quality-why">${text(item.complete, 0)}/${text(item.total, 0)} complete · ${text(item.why)}</div>
    </div>`).join('') : showEmpty('No data-quality information available.'));
  }

  // Renders watchlists content in the page.
  function renderWatchlists() {
    const health = safeArray(reportData?.health_report?.watchlist);
    setHtml('healthWatchlist', health.length ? health.map(item => `<div class="watch-row">
      <strong>${text(item.animal_id)} · ${text(item.status)}</strong>
      <span>${text(item.breed)} — ${text(item.issue)}</span>
    </div>`).join('') : showEmpty('No health watchlist items detected.'));
    const dams = safeArray(reportData?.reproductive_report?.dam_watchlist);
    setHtml('damWatchlist', dams.length ? dams.map(item => `<div class="watch-row">
      <strong>${text(item.animal_id)} · ${item.success_rate ?? 0}% success</strong>
      <span>${item.attempts || 0} attempts · ${item.failures || 0} failures · ${item.live_offspring || 0} live offspring</span>
    </div>`).join('') : showEmpty('No dam fertility concerns detected.'));
  }

  // Renders sires and production content in the page.
  function renderSiresAndProduction() {
    const sires = safeArray(reportData?.reproductive_report?.sire_performance).slice(0, 5);
    setHtml('sirePerformanceList', sires.length ? sires.map((item, index) => `<div class="rank-row">
      <strong>#${index + 1} ${text(item.animal_id)}</strong>
      <span>${item.success_rate ?? 0}% success · ${item.live_offspring || 0} live offspring · ${item.attempts || 0} attempts</span>
    </div>`).join('') : showEmpty('No sire performance data yet.'));
    const p = reportData?.production_report || {};
    const productionRows = [
      ['Animals with production records', p.animals_with_production_records ?? 0],
      ['Average daily milk yield', p.average_daily_milk_yield == null ? 'Not recorded' : `${p.average_daily_milk_yield} L`],
      ['Average daily gain', p.average_daily_gain == null ? 'Not recorded' : `${p.average_daily_gain} kg/day`],
      ['Average annual egg count', p.average_annual_egg_count == null ? 'Not recorded' : p.average_annual_egg_count],
    ];
    setHtml('productionSummary', productionRows.map(([label, value]) => `<div class="production-row"><strong>${value}</strong><span>${label}</span></div>`).join(''));
  }

  // Renders hero content in the page.
  function renderHero() {
    const farm = reportData?.farm_profile || {};
    setHtml('reportFarmTitle', `${text(farm.farm_name, 'Farm')} Intelligence Report`);
    setHtml('reportFarmSubtitle', `${text(farm.breeder_name, 'Breeder')} · ${text(farm.location, 'Location not set')} · Generated ${dateText(farm.generated_on)}`);
  }

  // Renders reports content in the page.
  function renderReports() {
    renderHero();
    renderKpis(reportData?.summary || {});
    renderActions(reportData?.recommended_actions || []);
    renderHorizontalBars('outcomeChart', reportData?.reproductive_report?.outcome_breakdown || {}, 'No breeding outcomes recorded yet.');
    renderTrendChart();
    renderMethodPerformance();
    renderHorizontalBars('breedChart', reportData?.animal_breakdown?.by_breed || {}, 'No breed data recorded yet.');
    renderHorizontalBars('ageChart', reportData?.animal_breakdown?.age_groups || {}, 'No age-group data available.');
    renderQuality();
    renderWatchlists();
    renderSiresAndProduction();
  }

  // Loads report data data from the API or page state.
  async function fetchReportData() {
    const token = getToken();
    const [summary, animals, events] = await Promise.all([
      apiFetch(`/api/breeders/${breederId}/report-summary`, { headers: { Authorization: `Bearer ${token}` } }),
      apiFetch(`/api/breeders/${breederId}/animals`, { headers: { Authorization: `Bearer ${token}` } }),
      apiFetch(`/api/breeders/${breederId}/breeding-events`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    reportData = summary || {};
    reportAnimals = animals || [];
    reportEvents = events || [];
    allAnimals = reportAnimals;
    return reportData;
  }

  // Loads reports page data from the API or page state.
  async function loadReportsPage() {
    try {
      setHtml('reportKpiGrid', '<div class="report-card">Loading report intelligence…</div>');
      await fetchReportData();
      renderReports();
      bindReportButtons();
    } catch (err) {
      console.error(err);
      showToast(`Failed to load reports: ${err.message}`, 'error');
      setHtml('reportKpiGrid', `<div class="report-card empty-state">Failed to load reports: ${err.message}</div>`);
    }
  }

  // Handles bind report buttons behavior for this page.
  function bindReportButtons() {
    if (window.__reportsBound) return;
    window.__reportsBound = true;
    document.getElementById('refreshReportsBtn')?.addEventListener('click', async () => { await loadReportsPage(); showToast('Reports refreshed.', 'success'); });
    document.getElementById('generateFarmReportBtn')?.addEventListener('click', () => generateFarmIntelligencePdf());
    document.getElementById('generateBreedingReportBtn')?.addEventListener('click', () => generateBreedingPerformanceReport());
    document.getElementById('generateDataQualityReportBtn')?.addEventListener('click', () => generateDataQualityPdf());
    document.getElementById('exportAllAnimalsCsvBtn')?.addEventListener('click', () => exportAllAnimalsCsv());
    document.getElementById('exportAllEventsCsvBtn')?.addEventListener('click', () => exportAllEventsCsv());
    document.getElementById('exportDataQualityCsvBtn')?.addEventListener('click', () => exportDataQualityCsv());
  }

  // Handles ensure pdf ready behavior for this page.
  function ensurePdfReady() {
    if (!window.jspdf?.jsPDF) {
      showToast('PDF library is still loading. Please refresh or try again.', 'error');
      return false;
    }
    return true;
  }

  // Handles add report header behavior for this page.
  function addReportHeader(doc, titleText) {
    const farm = reportData?.farm_profile || {};
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text(titleText, 14, 15);
    doc.setFontSize(9);
    doc.text(`${text(farm.farm_name, 'Farm')} · ${text(farm.breeder_name, 'Breeder')} · ${dateText(farm.generated_on)}`, 14, 24);
    doc.setTextColor(15, 23, 42);
  }

  // Handles add summary cards table behavior for this page.
  function addSummaryCardsTable(doc, y = 42) {
    const s = reportData?.summary || {};
    doc.autoTable({
      startY: y,
      head: [['Metric', 'Value', 'Management meaning']],
      body: [
        ['Total animals', s.total_animals || 0, 'Registered herd population'],
        ['Active pregnancies', s.active_pregnancies || 0, 'Pregnancies currently being monitored'],
        ['Pending pregnancy checks', s.pending_pregnancy_checks || 0, 'Served events that need confirmation'],
        ['Closed success rate', `${s.closed_success_rate || 0}%`, 'Live births among closed successful/failed outcomes'],
        ['Live offspring total', s.live_offspring_total || 0, 'Live offspring recorded from delivery outcomes'],
        ['Data quality score', `${s.overall_data_quality || 0}%`, 'Completeness level for genetics and management confidence'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9, cellPadding: 2.8 },
    });
  }

  // Handles generate farm intelligence pdf behavior for this page.
  function generateFarmIntelligencePdf() {
    if (!ensurePdfReady() || !reportData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    addReportHeader(doc, 'Farm Intelligence Report');
    addSummaryCardsTable(doc);
    const actions = safeArray(reportData.recommended_actions).map(a => [title(a.priority), text(a.title), text(a.description)]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Priority', 'Action', 'Reason']],
      body: actions.length ? actions : [['Normal', 'No urgent actions', 'Current records do not show urgent issues.']],
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });

    doc.addPage();
    addReportHeader(doc, 'Animal Population & Data Quality');
    doc.autoTable({
      startY: 42,
      head: [['Data area', 'Complete', 'Total', 'Rate', 'Why it matters']],
      body: safeArray(reportData.data_quality?.items).map(i => [i.label, i.complete, i.total, `${i.rate}%`, i.why]),
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 8, cellPadding: 2.4 },
    });
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Animal ID', 'Type', 'Breed', 'Gender', 'DOB', 'Weight', 'Health', 'Fertility']],
      body: reportAnimals.map(a => [a.animal_id, a.animal_type, a.breed, a.gender, dateText(a.date_of_birth), a.current_weight ?? '—', title(a.health_status), title(a.fertility_status)]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 7.5, cellPadding: 2 },
    });

    doc.save(`farm_intelligence_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // Handles generate breeding performance report behavior for this page.
  function generateBreedingPerformanceReport() {
    if (!ensurePdfReady() || !reportData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    addReportHeader(doc, 'Breeding & Pregnancy Performance Report');
    addSummaryCardsTable(doc);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Method', 'Attempts', 'Successes', 'Failures', 'Success Rate', 'Live Offspring']],
      body: safeArray(reportData.reproductive_report?.method_performance).map(m => [m.method, m.attempts, m.successes, m.failures, `${m.success_rate}%`, m.live_offspring]),
      theme: 'grid',
      headStyles: { fillColor: [219, 39, 119] },
      styles: { fontSize: 8.5, cellPadding: 2.6 },
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Sire', 'Attempts', 'Successes', 'Failures', 'Success Rate', 'Live Offspring']],
      body: safeArray(reportData.reproductive_report?.sire_performance).map(s => [s.animal_id, s.attempts, s.successes, s.failures, `${s.success_rate}%`, s.live_offspring]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8, cellPadding: 2.3 },
    });

    doc.addPage();
    addReportHeader(doc, 'Breeding Event Register');
    doc.autoTable({
      startY: 42,
      head: [['Date', 'Due', 'Dam', 'Sire', 'Method', 'Status', 'Outcome', 'Live']],
      body: reportEvents.map(e => { const map = new Map(reportAnimals.map(a => [a.id, a.animal_id])); return [dateText(e.breeding_date), dateText(e.expected_due_date), e.dam_animal_id || map.get(e.dam_id) || e.dam_id, e.sire_animal_id || map.get(e.sire_id) || e.sire_id || '—', title(e.breeding_method), title(e.status), title(e.outcome), e.live_offspring_count ?? '—']; }),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 7.5, cellPadding: 2 },
    });
    doc.save(`breeding_performance_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // Handles generate data quality pdf behavior for this page.
  function generateDataQualityPdf() {
    if (!ensurePdfReady() || !reportData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    addReportHeader(doc, 'Data Quality & Genetics Confidence Report');
    doc.setFontSize(11);
    doc.text(`Overall score: ${reportData.data_quality?.overall_score || 0}%`, 14, 44);
    doc.autoTable({
      startY: 52,
      head: [['Area', 'Complete', 'Total', 'Rate', 'Management impact']],
      body: safeArray(reportData.data_quality?.items).map(i => [i.label, i.complete, i.total, `${i.rate}%`, i.why]),
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 9, cellPadding: 2.8 },
    });
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Recommended action', 'Reason']],
      body: safeArray(reportData.recommended_actions).map(a => [a.title, a.description]),
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });
    doc.save(`data_quality_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // Handles export all animals csv behavior for this page.
  async function exportAllAnimalsCsv() {
    if (!reportAnimals.length) await fetchReportData();
    if (!reportAnimals.length) return showToast('No animals to export.', 'warning');
    const map = new Map(reportAnimals.map(a => [a.id, a.animal_id]));
    downloadCsv(`animals_report_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Animal ID', 'Type', 'Breed', 'Gender', 'DOB', 'Current Weight', 'Health', 'Fertility', 'Production Type', 'Sire', 'Dam', 'Created'],
      reportAnimals.map(a => [a.animal_id, a.animal_type, a.breed, a.gender, a.date_of_birth, a.current_weight, a.health_status, a.fertility_status, a.production_type, a.sire_id ? map.get(a.sire_id) || a.sire_id : '', a.dam_id ? map.get(a.dam_id) || a.dam_id : '', a.created_at])
    );
  }

  // Handles export all events csv behavior for this page.
  async function exportAllEventsCsv() {
    if (!reportEvents.length) await fetchReportData();
    if (!reportEvents.length) return showToast('No breeding events to export.', 'warning');
    const map = new Map(reportAnimals.map(a => [a.id, a.animal_id]));
    downloadCsv(`breeding_report_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Event ID', 'Breeding Date', 'Expected Due', 'Dam', 'Sire', 'Method', 'Status', 'Outcome', 'Pregnancy Confirmed', 'Offspring Count', 'Live Offspring', 'Notes'],
      reportEvents.map(e => [e.id, e.breeding_date, e.expected_due_date, e.dam_animal_id || map.get(e.dam_id) || e.dam_id, e.sire_animal_id || map.get(e.sire_id) || e.sire_id || '', e.breeding_method, e.status, e.outcome, e.pregnancy_confirmed, e.offspring_count, e.live_offspring_count, e.notes || e.outcome_notes || ''])
    );
  }

  // Handles export data quality csv behavior for this page.
  function exportDataQualityCsv() {
    if (!reportData) return showToast('Report data is not loaded yet.', 'warning');
    downloadCsv(`data_quality_report_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Area', 'Complete', 'Total', 'Rate', 'Why It Matters'],
      safeArray(reportData.data_quality?.items).map(i => [i.label, i.complete, i.total, `${i.rate}%`, i.why])
    );
  }

  // Handles toggle menu behavior for this page.
  function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.toggle('active');
  }

  document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    if (window.innerWidth <= 768 && sidebar && menuToggle) {
      if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) sidebar.classList.remove('active');
    }
  });

  window.loadReportsPage = loadReportsPage;
  window.exportAllAnimalsCsv = exportAllAnimalsCsv;
  window.exportAllEventsCsv = exportAllEventsCsv;
  window.generateComprehensiveFarmReport = generateFarmIntelligencePdf;
  window.generateBreedingPerformanceReport = generateBreedingPerformanceReport;
  window.toggleMenu = toggleMenu;
})();
