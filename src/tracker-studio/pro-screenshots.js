/** PRO — Screenshot lavoro (modular; loaded separately from app.js). */
window.MusomoProScreenshots = (() => {
  let deps = null;
  const view = {
    clientId: 'all',
    projectId: 'all',
    sessionId: 'all',
    dateFrom: '',
    dateTo: '',
    sort: 'time-asc',
    focusSessionId: '',
    openedFromSession: false,
    items: [],
    thumbUrls: {}
  };

  function d() {
    return deps || {};
  }

  function tr(key, vars) {
    return d().tr?.(key, vars) ?? key;
  }

  async function invoke(cmd, args = {}) {
    const fn = d().invoke || window.__TAURI__?.core?.invoke;
    if (typeof fn !== 'function') throw new Error('Tauri invoke unavailable');
    return fn(cmd, args);
  }

  function escapeHtml(value) {
    return d().escapeHtml?.(value) ?? String(value ?? '');
  }

  function state() {
    return d().getState?.() || {};
  }

  function buildOpenSessionKey(timer) {
    const t = timer || state().timer || {};
    if (t.captureSegmentId) return String(t.captureSegmentId);
    const day = t.day || '';
    const start = d().normalizeClockString?.(t.dayStart) || String(t.dayStart || '').trim();
    const projectId = t.projectId || '';
    if (!projectId || !day) return '';
    return `open:${projectId}:${day}:${start}`;
  }

  function mimeFromPath(path) {
    const lower = String(path || '').toLowerCase();
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/png';
  }

  function formatCapturedTime(capturedAt) {
    const ms = Number(capturedAt);
    if (!Number.isFinite(ms)) return '—';
    const dt = new Date(ms);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
  }

  function formatCapturedDate(capturedAt, fallbackDate) {
    const fmt = d().formatDisplayDate;
    const ms = Number(capturedAt);
    if (Number.isFinite(ms) && fmt) {
      const dt = new Date(ms);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      return fmt(iso);
    }
    return fallbackDate && fmt ? fmt(fallbackDate) : fallbackDate || '—';
  }

  function sessionLabel(item) {
    if (item.sessionId) {
      const session = (state().timer?.sessions || []).find(s => s.id === item.sessionId);
      if (session) {
        const desc = String(session.description || '').trim();
        const projectName = String(session.project || item.project || '').trim();
        if (desc && desc !== projectName) return desc;
        const start = d().formatClockDisplay?.(session.start) || session.start || '';
        const end = session.end ? d().formatClockDisplay?.(session.end) || session.end : '';
        if (start && end) return `${start}–${end}`;
        if (start) return start;
      }
    }
    if (item.openSessionKey) return tr('proScreensOpenSession');
    return tr('proScreensUnlinked');
  }

  function captureDescription(project, client, focused) {
    if (focused) {
      const desc = String(focused.description || '').trim();
      const projectName = String(project?.name || '').trim();
      if (desc && desc !== projectName) return desc;
    }
    const clientName = client?.company || project?.client || '';
    return [clientName, project?.name].filter(Boolean).join(' · ');
  }

  function truncateTwoLines(text, max = 120) {
    const s = String(text || '').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
  }

  async function loadThumb(item) {
    const cacheKey = item?.id || item?.filePath;
    if (cacheKey && view.thumbUrls[cacheKey]) return view.thumbUrls[cacheKey];
    try {
      const dataUrl = await invoke('tracker_screenshot_thumb_data_url', {
        filePath: item.filePath,
        thumbPath: item.thumbPath || ''
      });
      if (cacheKey) view.thumbUrls[cacheKey] = dataUrl;
      return dataUrl;
    } catch (_) {
      return '';
    }
  }

  function mergeScreenshotItems(primary, extra) {
    const out = [...(primary || [])];
    const seen = new Set(out.map(i => i.id));
    for (const item of extra || []) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    out.sort((a, b) => {
      const order = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (order !== 0) return order;
      return String(a.capturedAt || '').localeCompare(String(b.capturedAt || ''));
    });
    return out;
  }

  function filterItemsByView(items) {
    const st = state();
    return (items || []).filter(item => {
      if (view.clientId !== 'all') {
        const proj = st.projects?.items?.find(p => p.id === item.projectId);
        const client = st.clients?.items?.find(c => c.id === view.clientId);
        const clientMatch =
          (proj && proj.clientId === view.clientId) ||
          (client && String(item.client || '').trim() === String(client.company || '').trim());
        if (!clientMatch) return false;
      }
      if (view.projectId !== 'all' && item.projectId !== view.projectId) return false;
      const iso = String(item.date || '').trim();
      if (view.dateFrom && iso && iso < view.dateFrom) return false;
      if (view.dateTo && iso && iso > view.dateTo) return false;
      return true;
    });
  }

  function timerOpenSessionKey(st) {
    return buildOpenSessionKey(st?.timer || state());
  }

  async function refreshItems() {
    const filter = {
      clientId: view.clientId,
      projectId: view.projectId,
      sessionId: view.sessionId,
      dateFrom: view.dateFrom,
      dateTo: view.dateTo,
      sort: view.sort
    };
    let items = (await invoke('tracker_list_work_screenshots', { filter })) || [];

    const st = state();
    const activeSessionId =
      view.sessionId !== 'all' ? view.sessionId : view.focusSessionId;
    const activeSession = activeSessionId
      ? st.timer?.sessions?.find(s => s.id === activeSessionId)
      : null;
    const timerActive = !!d().timerHasOpenSession?.();
    const timerProjectId = st.timer?.projectId || '';
    const timingElsewhere =
      timerActive &&
      timerProjectId &&
      activeSession?.projectId &&
      timerProjectId !== activeSession.projectId;
    const viewingClosedSession =
      !!activeSession?.end && view.sessionId !== 'all';

    const segmentKey = timerOpenSessionKey(st);
    if (segmentKey && !timingElsewhere && !viewingClosedSession) {
      const openItems =
        (await invoke('tracker_list_work_screenshots', {
          filter: {
            clientId: 'all',
            projectId: 'all',
            sessionId: 'all',
            dateFrom: '',
            dateTo: '',
            sort: view.sort,
            openSessionKey: segmentKey
          }
        })) || [];
      items = mergeScreenshotItems(items, openItems);
    }

    if (activeSessionId) {
      const session = activeSession;
      if (session?.projectId && session.date && !timingElsewhere) {
        if (session.start) {
          const legacyKey = `open:${session.projectId}:${session.date}:${d().normalizeClockString?.(session.start) || String(session.start).trim()}`;
          const unlinked =
            (await invoke('tracker_list_work_screenshots', {
              filter: {
                clientId: 'all',
                projectId: 'all',
                sessionId: 'all',
                dateFrom: '',
                dateTo: '',
                sort: view.sort,
                openSessionKey: legacyKey
              }
            })) || [];
          items = mergeScreenshotItems(items, unlinked);
        }

        const orphans =
          (await invoke('tracker_list_work_screenshots', {
            filter: {
              clientId: 'all',
              projectId: session.projectId,
              sessionId: 'all',
              dateFrom: session.date,
              dateTo: session.date,
              sort: view.sort
            }
          })) || [];
        items = mergeScreenshotItems(
          items,
          orphans.filter(item => !item.sessionId)
        );
      }
    }

    view.items = filterItemsByView(items);
    return view.items;
  }

  function bindLazyThumbs(root) {
    const grid = root?.querySelector('#proScreensGrid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.pro-screens-card[data-shot-id]');
    const loadCard = async (card, attempt = 0) => {
      if (card.dataset.thumbLoaded === '1') return;
      const id = card.getAttribute('data-shot-id');
      const item = view.items.find(i => i.id === id);
      if (!item) return;
      const imgHost = card.querySelector('.pro-screens-card__img');
      if (!imgHost || imgHost.querySelector('img')) return;
      const src = await loadThumb(item);
      if (src) {
        card.dataset.thumbLoaded = '1';
        imgHost.innerHTML = `<img src="${src}" alt="">`;
        return;
      }
      if (attempt < 2) {
        window.setTimeout(() => void loadCard(card, attempt + 1), 400 * (attempt + 1));
        return;
      }
      card.dataset.thumbLoaded = '0';
      imgHost.innerHTML = `<span class="pro-screens-card__missing">${escapeHtml(tr('proScreensImageMissing'))}</span>`;
    };
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            void loadCard(entry.target).then(() => {
              if (entry.target.dataset.thumbLoaded === '1') observer.unobserve(entry.target);
            });
          });
        },
        { rootMargin: '120px' }
      );
      cards.forEach(card => observer.observe(card));
      return;
    }
    cards.forEach(card => void loadCard(card));
  }

  function closeCaptureMenu() {
    document.getElementById('proCaptureMenu')?.remove();
    document.getElementById('proMonitorMenu')?.remove();
  }

  function showMonitorMenu(anchor, monitors) {
    closeCaptureMenu();
    const menu = document.createElement('div');
    menu.id = 'proMonitorMenu';
    menu.className = 'pro-capture-menu';
    menu.innerHTML = monitors
      .map(
        m =>
          `<button type="button" data-index="${m.index}">${escapeHtml(m.name || tr('proScreensMonitorDefault', { n: m.index + 1 }))} (${m.width}×${m.height})</button>`
      )
      .join('');
    document.body.appendChild(menu);
    positionCaptureMenu(menu, anchor);
    return new Promise(resolve => {
      let settled = false;
      const finish = index => {
        if (settled) return;
        settled = true;
        document.removeEventListener('pointerdown', onDoc, true);
        closeCaptureMenu();
        resolve(index === null || index === undefined ? null : Number(index));
      };
      menu.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          finish(btn.getAttribute('data-index'));
        });
      });
      const onDoc = e => {
        if (menu.contains(e.target) || e.target === anchor) return;
        finish(null);
      };
      requestAnimationFrame(() => document.addEventListener('pointerdown', onDoc, true));
    });
  }

  function openSessionKeyForSession(session) {
    if (!session || session.end) return '';
    const day = session.date || '';
    const start = d().normalizeClockString?.(session.start) || String(session.start || '').trim();
    const projectId = session.projectId || '';
    if (!projectId || !day || !start) return '';
    return `open:${projectId}:${day}:${start}`;
  }

  function showCaptureModeMenu(anchor) {
    closeCaptureMenu();
    const menu = document.createElement('div');
    menu.id = 'proCaptureMenu';
    menu.className = 'pro-capture-menu';
    menu.innerHTML = `
      <button type="button" data-mode="window">${escapeHtml(tr('proScreensModeWindow'))}</button>
      <button type="button" data-mode="fullscreen">${escapeHtml(tr('proScreensModeFull'))}</button>`;
    document.body.appendChild(menu);
    positionCaptureMenu(menu, anchor);
    return new Promise(resolve => {
      let settled = false;
      const finish = mode => {
        if (settled) return;
        settled = true;
        document.removeEventListener('pointerdown', onDoc, true);
        closeCaptureMenu();
        resolve(mode || null);
      };
      menu.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          finish(btn.getAttribute('data-mode'));
        });
      });
      const onDoc = e => {
        if (menu.contains(e.target) || e.target === anchor) return;
        finish(null);
      };
      requestAnimationFrame(() => document.addEventListener('pointerdown', onDoc, true));
    });
  }

  async function showCaptureMenu(anchor) {
    closeCaptureMenu();
    const mode = await showCaptureModeMenu(anchor);
    if (!mode) return null;
    let monitorIndex = 0;
    if (mode === 'fullscreen') {
      try {
        const monitors = (await invoke('tracker_list_capture_monitors')) || [];
        if (monitors.length > 1) {
          const picked = await showMonitorMenu(anchor, monitors);
          if (picked === null) return null;
          monitorIndex = picked;
        }
      } catch (_) {}
    }
    return { mode, monitorIndex };
  }

  async function openImportDialog() {
    const dialog = window.__TAURI__?.dialog;
    if (dialog?.open) {
      const selected = await dialog.open({
        multiple: true,
        title: tr('proScreensImportTitle'),
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      });
      if (!selected) return [];
      return Array.isArray(selected) ? selected : [selected];
    }
    return [];
  }

  async function importFromFiles(anchor) {
    const paths = await openImportDialog();
    if (!paths.length) return;
    try {
      await invoke('tracker_import_work_screenshots', {
        paths,
        req: await capturePayload({})
      });
      await renderPage();
    } catch (err) {
      alert(tr('proScreensImportFailed', { error: String(err?.message || err || '') }));
    }
  }

  function isMiniContext() {
    return !!document.querySelector('.mini');
  }

  function positionCaptureMenu(menu, anchor) {
    const rect = anchor?.getBoundingClientRect?.();
    if (!rect) return;
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    const menuWidth = Math.max(menu.offsetWidth || 190, 190);
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))}px`;
    const menuHeight = menu.offsetHeight || 120;
    const wouldClipBelow = rect.bottom + 6 + menuHeight > window.innerHeight - 8;
    const openAbove = isMiniContext() || wouldClipBelow;
    menu.style.top = openAbove
      ? `${Math.max(8, rect.top - menuHeight - 6)}px`
      : `${rect.bottom + 6}px`;
  }

  function showNoteModal(item) {
    const overlay = document.createElement('div');
    overlay.className = 'pro-screens-modal';
    overlay.innerHTML = `
      <div class="pro-screens-modal__panel" role="dialog" aria-modal="true">
        <h3>${escapeHtml(tr('proScreensNoteDetail'))}</h3>
        <p class="pro-screens-modal__meta">${escapeHtml(formatCapturedDate(item.capturedAt, item.date))} · ${escapeHtml(formatCapturedTime(item.capturedAt))} · ${escapeHtml(item.client)} · ${escapeHtml(item.project)}</p>
        <label>${escapeHtml(tr('proScreensDescriptionLabel'))}</label>
        <input type="text" id="modalDesc" value="${escapeHtml(item.description || '')}" />
        <label>${escapeHtml(tr('proScreensNotePlaceholder'))}</label>
        <textarea id="modalNote" rows="5">${escapeHtml(item.note || '')}</textarea>
        <div class="pro-screens-modal__actions">
          <button type="button" class="btn" data-action="cancel">${escapeHtml(tr('cancel'))}</button>
          <button type="button" class="btn btn-primary" data-action="save">${escapeHtml(tr('save'))}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const description = String(overlay.querySelector('#modalDesc')?.value || '').trim();
      const note = String(overlay.querySelector('#modalNote')?.value || '').trim();
      await invoke('tracker_update_work_screenshot', { id: item.id, description, note });
      overlay.remove();
      void renderPage();
    });
  }

  function sessionOptionsHtml() {
    const sessions = (state().timer?.sessions || [])
      .filter(s => {
        if (view.clientId !== 'all') {
          const proj = state().projects?.items?.find(p => p.id === s.projectId);
          if (!proj || proj.clientId !== view.clientId) return false;
        }
        if (view.projectId !== 'all' && s.projectId !== view.projectId) return false;
        return true;
      })
      .slice(0, 200);
    return [
      `<option value="all">${escapeHtml(tr('allSessions'))}</option>`,
      ...sessions.map(s => {
        const label = `${d().formatDisplayDate?.(s.date) || s.date} · ${d().formatClockDisplay?.(s.start) || s.start}`;
        return `<option value="${escapeHtml(s.id)}"${view.sessionId === s.id ? ' selected' : ''}>${escapeHtml(label)}</option>`;
      })
    ].join('');
  }

  function pdfHeaderLine(item) {
    return [item.client, item.project, sessionLabel(item), formatCapturedDate(item.capturedAt, item.date)]
      .filter(Boolean)
      .join(' · ');
  }

  function pdfCellMetaRows(item) {
    const rows = [];
    const clientProject = [item.client, item.project].filter(Boolean).join(' · ');
    if (clientProject) rows.push({ text: clientProject, kind: 'title' });
    const when = [formatCapturedDate(item.capturedAt, item.date), formatCapturedTime(item.capturedAt)]
      .filter(Boolean)
      .join(' · ');
    if (when) rows.push({ text: when, kind: 'meta' });
    const session = sessionLabel(item);
    if (session) {
      rows.push({ text: `${tr('navSessions')}: ${session}`, kind: 'meta' });
    }
    const desc = String(item.description || '').trim();
    if (desc && desc !== clientProject) rows.push({ text: desc, kind: 'desc' });
    const note = String(item.note || '').trim();
    if (note && note !== desc) rows.push({ text: note, kind: 'note' });
    return rows;
  }

  function wrapPdfText(pdf, text, maxWidth) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    if (typeof pdf.splitTextToSize === 'function') {
      return pdf.splitTextToSize(raw, maxWidth);
    }
    return clampPdfLines(raw, 99, Math.max(20, Math.floor(maxWidth / 2)))
      .split('\n')
      .filter(Boolean);
  }

  function paginatePdfItems(items, defaultPerPage, pageLayouts) {
    const pages = [];
    let idx = 0;
    let pageNum = 0;
    while (idx < items.length) {
      const layout = Math.min(Math.max(1, pageLayouts[pageNum] || defaultPerPage), 4);
      pages.push({ layout, items: items.slice(idx, idx + layout) });
      idx += layout;
      pageNum += 1;
    }
    return pages;
  }

  function pdfImageFormat(dataUrl) {
    const src = String(dataUrl || '');
    if (src.includes('image/webp')) return 'WEBP';
    if (src.includes('image/png')) return 'PNG';
    return 'JPEG';
  }

  async function loadPdfImageDataUrl(item) {
    return invoke('tracker_screenshot_image_data_url', { path: item.filePath });
  }

  async function drawPdfCell(pdf, item, x, y, cellW, cellH, margin) {
    const padX = 2;
    const maxTextW = Math.max(24, cellW - padX * 2);
    let lineY = y + 4;
    for (const row of pdfCellMetaRows(item)) {
      const fontSize = row.kind === 'title' ? 8 : row.kind === 'note' ? 7 : 7.5;
      const lineH = row.kind === 'note' ? 2.8 : 3.1;
      const maxLines = row.kind === 'note' ? 3 : row.kind === 'desc' ? 2 : 2;
      pdf.setFontSize(fontSize);
      pdf.setFont(undefined, row.kind === 'title' ? 'bold' : 'normal');
      if (row.kind === 'note') pdf.setTextColor(90, 90, 90);
      else pdf.setTextColor(0, 0, 0);
      const wrapped = wrapPdfText(pdf, row.text, maxTextW);
      const lines = wrapped.slice(0, maxLines);
      if (wrapped.length > maxLines && lines.length) {
        const last = lines[lines.length - 1];
        lines[lines.length - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : `${last}…`;
      }
      for (const line of lines) {
        pdf.text(line, x + padX, lineY);
        lineY += lineH;
      }
    }
    pdf.setTextColor(0, 0, 0);
    const imgTop = lineY + 1.5;
    const imgMaxH = y + cellH - imgTop - 2;
    const imgMaxW = cellW - 4;
    try {
      const dataUrl = await loadPdfImageDataUrl(item);
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });
      const scale = Math.min(imgMaxW / img.width, imgMaxH / img.height, 1);
      pdf.addImage(
        dataUrl,
        pdfImageFormat(dataUrl),
        x + 2,
        imgTop,
        img.width * scale,
        img.height * scale,
        undefined,
        'FAST'
      );
    } catch (_) {
      pdf.setFont(undefined, 'normal');
      pdf.text(tr('proScreensImageMissing'), x + 4, imgTop + 6);
    }
  }

  async function drawPdfPageLayout(pdf, page, margin, pageNumber) {
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2 - 6;
    const layout = page.layout;
    const items = page.items;
    if (layout === 1) {
      await drawPdfCell(pdf, items[0], margin, margin, contentW, contentH, margin);
    } else if (layout === 2) {
      const cellW = contentW / 2 - 2;
      for (let i = 0; i < items.length; i += 1) {
        await drawPdfCell(pdf, items[i], margin + i * (cellW + 4), margin, cellW, contentH, margin);
      }
    } else if (layout === 3) {
      const cellW = contentW / 3 - 2;
      for (let i = 0; i < items.length; i += 1) {
        await drawPdfCell(pdf, items[i], margin + i * (cellW + 3), margin, cellW, contentH, margin);
      }
    } else {
      const cellW = contentW / 2 - 2;
      const cellH = contentH / 2 - 2;
      for (let i = 0; i < items.length; i += 1) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        await drawPdfCell(
          pdf,
          items[i],
          margin + col * (cellW + 4),
          margin + row * (cellH + 4),
          cellW,
          cellH,
          margin
        );
      }
    }
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(130, 130, 130);
    pdf.text(String(pageNumber), pageW - margin, pageH - 4, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }

  function showPdfExportModal(items) {
    return new Promise(resolve => {
      const state = { defaultPerPage: 1, pageLayouts: {} };
      const pages = () => paginatePdfItems(items, state.defaultPerPage, state.pageLayouts);
      const overlay = document.createElement('div');
      overlay.className = 'pro-screens-modal pro-pdf-modal';
      const renderPreview = () => {
        const pageList = pages();
        const preview = pageList
          .map((page, pageIndex) => {
            const options = [1, 2, 3, 4]
              .map(
                n =>
                  `<option value="${n}"${(state.pageLayouts[pageIndex] || state.defaultPerPage) === n ? ' selected' : ''}>${n}</option>`
              )
              .join('');
            const cells = page.items
              .map(
                item =>
                  `<div class="pro-pdf-preview__cell"><span>${escapeHtml(truncateTwoLines(pdfHeaderLine(item), 48))}</span></div>`
              )
              .join('');
            return `<div class="pro-pdf-preview__page" data-page="${pageIndex}">
              <div class="pro-pdf-preview__head">
                <span>${escapeHtml(tr('proScreensPdfPage', { n: pageIndex + 1 }))}</span>
                <label>${escapeHtml(tr('proScreensPdfPerPage'))}
                  <select data-page-layout="${pageIndex}">${options}</select>
                </label>
              </div>
              <div class="pro-pdf-preview__grid is-layout-${page.layout}">${cells}</div>
            </div>`;
          })
          .join('');
        const host = overlay.querySelector('#pdfPreviewHost');
        if (host) host.innerHTML = preview || `<p class="hint">${escapeHtml(tr('proScreensEmpty'))}</p>`;
        overlay.querySelectorAll('[data-page-layout]').forEach(select => {
          select.onchange = () => {
            state.pageLayouts[Number(select.getAttribute('data-page-layout'))] = Number(select.value);
            renderPreview();
          };
        });
      };
      overlay.innerHTML = `
        <div class="pro-screens-modal__panel pro-pdf-modal__panel" role="dialog" aria-modal="true">
          <h3>${escapeHtml(tr('proScreensPdfPreviewTitle'))}</h3>
          <p class="hint">${escapeHtml(tr('proScreensPdfPreviewHint'))}</p>
          <div class="field">
            <label for="pdfDefaultPerPage">${escapeHtml(tr('proScreensPdfDefaultLayout'))}</label>
            <select id="pdfDefaultPerPage">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div class="pro-screens-modal__actions pro-pdf-modal__actions">
            <button type="button" class="btn" data-action="cancel">${escapeHtml(tr('cancel'))}</button>
            <button type="button" class="btn btn-primary" data-action="export">${escapeHtml(tr('proScreensExportPdf'))}</button>
          </div>
          <div id="pdfPreviewHost" class="pro-pdf-preview"></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#pdfDefaultPerPage')?.addEventListener('change', e => {
        state.defaultPerPage = Number(e.target.value) || 1;
        state.pageLayouts = {};
        renderPreview();
      });
      renderPreview();
      overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.querySelector('[data-action="export"]')?.addEventListener('click', () => {
        const config = { defaultPerPage: state.defaultPerPage, pageLayouts: { ...state.pageLayouts } };
        overlay.remove();
        resolve(config);
      });
    });
  }

  async function drawPdfPage(pdf, item, margin) {
    await drawPdfPageLayout(pdf, { layout: 1, items: [item] }, margin, pdf.internal.getNumberOfPages());
  }

  async function moveScreenshot(id, direction) {
    const ids = view.items.map(i => i.id);
    const index = ids.indexOf(id);
    if (index < 0) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return;
    ids.splice(index, 1);
    ids.splice(target, 0, id);
    view.items = ids.map(sid => view.items.find(i => i.id === sid)).filter(Boolean);
    try {
      await invoke('tracker_reorder_work_screenshots', { ids });
    } catch (_) {}
    void renderPage();
  }

  async function reorderGalleryItems(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return false;
    const ids = view.items.map(i => i.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return false;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    view.items = ids.map(sid => view.items.find(i => i.id === sid)).filter(Boolean);
    try {
      await invoke('tracker_reorder_work_screenshots', { ids });
      return true;
    } catch (err) {
      console.warn('reorderGalleryItems', err);
      return false;
    }
  }

  function bindGalleryDnD(grid) {
    if (!grid) return;
    let dragId = null;
    let dragCard = null;

    const clearHighlight = () => {
      grid.querySelectorAll('.pro-screens-card').forEach(c => c.classList.remove('is-drag-over'));
    };

    const cardAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest?.('.pro-screens-card') || null;
    };

    const finishDrag = async (targetCard, sourceCard) => {
      clearHighlight();
      sourceCard?.classList.remove('is-dragging');
      if (!dragId || !targetCard || targetCard === sourceCard) return;
      const targetId = targetCard.getAttribute('data-shot-id');
      if (!targetId) return;
      const ok = await reorderGalleryItems(dragId, targetId);
      if (ok) void renderPage();
    };

    grid.querySelectorAll('.pro-screens-card').forEach(card => {
      const handle = card.querySelector('.pro-screens-card__handle');
      if (!handle) return;

      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        dragId = card.getAttribute('data-shot-id');
        dragCard = card;
        card.classList.add('is-dragging');
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      });

      handle.addEventListener('pointermove', e => {
        if (!dragId || !handle.hasPointerCapture(e.pointerId)) return;
        clearHighlight();
        const target = cardAt(e.clientX, e.clientY);
        if (target && target !== dragCard) {
          target.classList.add('is-drag-over');
        }
      });

      handle.addEventListener('pointerup', e => {
        if (!dragId) return;
        const target = cardAt(e.clientX, e.clientY);
        void finishDrag(target, dragCard);
        dragId = null;
        dragCard = null;
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch (_) {}
      });

      handle.addEventListener('pointercancel', () => {
        dragCard?.classList.remove('is-dragging');
        dragId = null;
        dragCard = null;
        clearHighlight();
      });
    });
  }

  async function renderPage() {
    const root = document.getElementById('page-work-screenshots');
    if (!root) return;
    await refreshItems();
    const ctx = sessionContextLabel();
    const dateLabel = ctx.date ? d().formatDisplayDate?.(ctx.date) || ctx.date : '—';
    const timeLabel =
      ctx.start && ctx.end
        ? `${d().formatClockDisplay?.(ctx.start) || ctx.start} – ${d().formatClockDisplay?.(ctx.end) || ctx.end}`
        : ctx.start
          ? d().formatClockDisplay?.(ctx.start) || ctx.start
          : '—';
    const clientOptions = [
      `<option value="all">${escapeHtml(tr('allClients'))}</option>`,
      ...(state().clients?.items || [])
        .filter(c => !c.archived)
        .map(c => `<option value="${escapeHtml(c.id)}"${view.clientId === c.id ? ' selected' : ''}>${escapeHtml(c.company)}</option>`)
    ].join('');
    const projects = (state().projects?.items || []).filter(p => view.clientId === 'all' || p.clientId === view.clientId);
    const projectOptions = [
      `<option value="all">${escapeHtml(tr('allProjects'))}</option>`,
      ...projects.map(p => `<option value="${escapeHtml(p.id)}"${view.projectId === p.id ? ' selected' : ''}>${escapeHtml(p.name)}</option>`)
    ].join('');
    const cards = view.items.length
      ? view.items
          .map(item => {
            const notePreview = truncateTwoLines(item.note);
            const noteTitle = item.note ? escapeHtml(item.note) : '';
            return `<article class="pro-screens-card" data-shot-id="${escapeHtml(item.id)}">
              <span class="pro-screens-card__handle" role="button" tabindex="0" aria-label="${escapeHtml(tr('proScreensDragHandle'))}">⋮⋮</span>
              <div class="pro-screens-card__img" data-action="open" data-path="${escapeHtml(item.filePath)}" title="${escapeHtml(tr('proScreensOpen'))}">
                <span>${escapeHtml(tr('loading'))}</span>
              </div>
              <div class="pro-screens-card__body">
                <div class="pro-screens-card__meta">
                  <span>${escapeHtml(formatCapturedDate(item.capturedAt, item.date))} · ${escapeHtml(formatCapturedTime(item.capturedAt))}</span>
                  <span>${escapeHtml(item.client)} · ${escapeHtml(item.project)}</span>
                  <span>${escapeHtml(tr('navSessions'))}: ${escapeHtml(sessionLabel(item))}</span>
                </div>
                <input class="pro-screens-card__desc" data-desc-id="${escapeHtml(item.id)}" value="${escapeHtml(item.description || '')}" placeholder="${escapeHtml(tr('proScreensDescriptionPlaceholder'))}" />
                <p class="pro-screens-card__note${item.note ? '' : ' is-empty'}" data-action="note" data-id="${escapeHtml(item.id)}" title="${noteTitle}">${notePreview ? escapeHtml(notePreview) : escapeHtml(tr('proScreensNoteEmpty'))}</p>
                <div class="pro-screens-card__actions">
                  <button type="button" class="btn" data-action="move-up" data-id="${escapeHtml(item.id)}" title="${escapeHtml(tr('proScreensMoveBefore'))}">↑</button>
                  <button type="button" class="btn" data-action="move-down" data-id="${escapeHtml(item.id)}" title="${escapeHtml(tr('proScreensMoveAfter'))}">↓</button>
                  <button type="button" class="btn" data-action="note" data-id="${escapeHtml(item.id)}">${escapeHtml(tr('edit'))}</button>
                  <button type="button" class="btn" data-action="delete" data-id="${escapeHtml(item.id)}">${escapeHtml(tr('delete'))}</button>
                </div>
              </div>
            </article>`;
          })
          .join('')
      : `<p class="hint">${escapeHtml(tr('proScreensEmpty'))}</p>`;

    root.innerHTML = `
      <div class="pro-screens-session">
        <div class="pro-screens-session__meta">
          <div><span>${escapeHtml(tr('customer'))}:</span> <strong>${escapeHtml(ctx.client)}</strong></div>
          <div><span>${escapeHtml(tr('project'))}:</span> <strong>${escapeHtml(ctx.project)}</strong></div>
          <div><span>${escapeHtml(tr('colDate'))}:</span> <strong>${escapeHtml(dateLabel)}</strong></div>
          <div><span>${escapeHtml(tr('period'))}:</span> <strong>${escapeHtml(timeLabel)}</strong></div>
        </div>
        <div class="pro-screens-session__capture">
          <button type="button" class="btn btn-primary" id="btnCaptureScreenshot">${escapeHtml(tr('proScreensCapture'))}</button>
          <button type="button" class="btn" id="btnImportScreenshot">${escapeHtml(tr('proScreensImport'))}</button>
        </div>
      </div>
      <div class="pro-screens-stack">
        <div class="pro-screens-filters pro-screens-strip">
          <h3 class="pro-screens-strip__title">${escapeHtml(tr('reportFilters'))}</h3>
          <div class="pro-screens-strip__fields">
            <div class="pro-screens-strip__field"><label for="wsClient">${escapeHtml(tr('client'))}</label><select id="wsClient">${clientOptions}</select></div>
            <div class="pro-screens-strip__field"><label for="wsProject">${escapeHtml(tr('project'))}</label><select id="wsProject">${projectOptions}</select></div>
            <div class="pro-screens-strip__field"><label for="wsSession">${escapeHtml(tr('navSessions'))}</label><select id="wsSession">${sessionOptionsHtml()}</select></div>
            <div class="pro-screens-strip__field"><label for="wsDateFrom">${escapeHtml(tr('dateFrom'))}</label><input type="date" id="wsDateFrom" value="${escapeHtml(view.dateFrom)}"></div>
            <div class="pro-screens-strip__field"><label for="wsDateTo">${escapeHtml(tr('dateTo'))}</label><input type="date" id="wsDateTo" value="${escapeHtml(view.dateTo)}"></div>
            <div class="pro-screens-strip__field"><label for="wsSort">${escapeHtml(tr('proScreensSort'))}</label>
              <select id="wsSort">
                <option value="time-asc"${view.sort === 'time-asc' ? ' selected' : ''}>${escapeHtml(tr('proScreensSortAsc'))}</option>
                <option value="time-desc"${view.sort === 'time-desc' ? ' selected' : ''}>${escapeHtml(tr('proScreensSortDesc'))}</option>
              </select>
            </div>
          </div>
          <button type="button" class="btn pro-screens-strip__action" id="btnWsApply">${escapeHtml(tr('generatePreview'))}</button>
        </div>
        <div class="pro-screens-export pro-screens-strip">
          <div class="pro-screens-strip__meta">
            <h3 class="pro-screens-strip__title">${escapeHtml(tr('proScreensExportTitle'))}</h3>
            <p class="hint">${escapeHtml(tr('proScreensExportHint'))}</p>
          </div>
          <div class="pro-screens-strip__actions">
            <button type="button" class="btn btn-primary" id="btnExportScreensPdf">${escapeHtml(tr('proScreensExportPdf'))}</button>
            <span class="pro-screens-strip__note">✓ ${escapeHtml(tr('proScreensPdfHint'))}</span>
          </div>
        </div>
        <section class="pro-screens-gallery pro-screens-gallery--full">
          <div class="pro-screens-gallery__head">
            <h3 style="margin:0">${escapeHtml(tr('proScreensGalleryTitle'))} <span class="pro-screens-badge">${view.items.length}</span></h3>
          </div>
          <div class="pro-screens-grid" id="proScreensGrid">${cards}</div>
          <p class="hint pro-screens-gallery__foot">${escapeHtml(tr('proScreensExportInfo'))}</p>
        </section>
      </div>`;

    const applyFilters = () => {
      applyFiltersFromRoot(root);
      void renderPage();
    };
    root.querySelector('#btnWsApply')?.addEventListener('click', applyFilters);
    ['#wsClient', '#wsProject', '#wsSession', '#wsDateFrom', '#wsDateTo', '#wsSort'].forEach(sel => {
      root.querySelector(sel)?.addEventListener('change', applyFilters);
    });
    root.querySelector('#btnCaptureScreenshot')?.addEventListener('click', e => {
      void captureFromMain(e.currentTarget);
    });
    root.querySelector('#btnImportScreenshot')?.addEventListener('click', e => {
      void importFromFiles(e.currentTarget);
    });
    root.querySelector('#btnExportScreensPdf')?.addEventListener('click', () => {
      void exportScreensPdf();
    });
    bindGalleryDnD(root.querySelector('#proScreensGrid'));
    bindLazyThumbs(root);
    root.querySelectorAll('[data-action="open"]').forEach(el => {
      el.addEventListener('click', () => {
        const path = el.getAttribute('data-path');
        if (path) void invoke('open_file', { path });
      });
    });
    root.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id || !confirm(tr('proScreensDeleteConfirm'))) return;
        await invoke('tracker_delete_work_screenshot', { id });
        void renderPage();
      });
    });
    root.querySelectorAll('[data-action="move-up"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) void moveScreenshot(id, 'up');
      });
    });
    root.querySelectorAll('[data-action="move-down"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) void moveScreenshot(id, 'down');
      });
    });
    root.querySelectorAll('[data-desc-id]').forEach(input => {
      input.addEventListener('blur', async () => {
        const id = input.getAttribute('data-desc-id');
        const item = view.items.find(i => i.id === id);
        if (!id || !item) return;
        const description = String(input.value || '').trim();
        await invoke('tracker_update_work_screenshot', {
          id,
          description,
          note: String(item.note || '').trim()
        });
      });
    });
    root.querySelectorAll('[data-action="note"]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        const item = view.items.find(i => i.id === id);
        if (item) showNoteModal(item);
      });
    });
  }

  function syncViewFromSession(session) {
    if (!session) return;
    const st = state();
    const proj = st.projects?.items?.find(p => p.id === session.projectId);
    view.focusSessionId = session.id;
    view.sessionId = session.id;
    view.projectId = session.projectId || proj?.id || 'all';
    view.clientId = proj?.clientId || 'all';
    view.dateFrom = session.date || '';
    view.dateTo = session.date || '';
    void persistCaptureContext(session);
  }

  async function persistCaptureContext(session) {
    if (!session?.projectId && !session?.project) return;
    await d().alignTimerForScreenshotSession?.(session);
    const st = state();
    const proj = st.projects?.items?.find(p => p.id === session.projectId);
    const client = st.clients?.items?.find(c => c.id === proj?.clientId);
    const segmentKey = timerOpenSessionKey(st);
    try {
      await invoke('tracker_set_screenshot_capture_context', {
        ctx: {
          sessionId: session.id || '',
          projectId: session.projectId || proj?.id || '',
          project: proj?.name || session.project || '',
          client: client?.company || session.client || proj?.client || '',
          date: session.date || st.timer?.day || d().todayIsoDate?.() || '',
          pinned: true,
          openSessionKey: segmentKey || openSessionKeyForSession(session)
        }
      });
    } catch (err) {
      console.warn('persistCaptureContext', err);
    }
  }

  async function persistCaptureContextFromProject(projectId, clientId = 'all') {
    const st = state();
    const proj = st.projects?.items?.find(p => p.id === projectId);
    if (!proj) return;
    await d().alignTimerForScreenshotSession?.({
      projectId: proj.id,
      project: proj.name,
      client: proj.client || ''
    });
    const segmentKey = timerOpenSessionKey(st);
    const client = st.clients?.items?.find(c => c.id === (clientId !== 'all' ? clientId : proj.clientId));
    try {
      await invoke('tracker_set_screenshot_capture_context', {
        ctx: {
          sessionId: view.sessionId !== 'all' ? view.sessionId : '',
          projectId: proj.id,
          project: proj.name,
          client: client?.company || proj.client || '',
          date: view.dateFrom || st.timer?.day || d().todayIsoDate?.() || '',
          pinned: true,
          openSessionKey: segmentKey
        }
      });
    } catch (err) {
      console.warn('persistCaptureContextFromProject', err);
    }
  }

  async function persistCaptureContextFromTimer() {
    const st = state();
    const proj = st.projects?.items?.find(p => p.id === st.timer?.projectId);
    if (!proj?.id) {
      try {
        await invoke('tracker_clear_screenshot_capture_context');
      } catch (_) {}
      return;
    }
    const client = st.clients?.items?.find(c => c.id === proj.clientId);
    try {
      await invoke('tracker_set_screenshot_capture_context', {
        ctx: {
          sessionId: '',
          projectId: proj.id,
          project: proj.name,
          client: client?.company || proj.client || '',
          date: st.timer?.day || d().todayIsoDate?.() || '',
          pinned: false,
          openSessionKey: buildOpenSessionKey(st.timer)
        }
      });
    } catch (err) {
      console.warn('persistCaptureContextFromTimer', err);
    }
  }

  async function syncCaptureContextToTimer() {
    await persistCaptureContextFromTimer();
  }

  async function readCaptureContext() {
    try {
      const ctx = await invoke('tracker_get_screenshot_capture_context');
      if (ctx?.projectId) return ctx;
    } catch (_) {}
    return null;
  }

  function syncViewToActiveTimer() {
    const st = state();
    view.focusSessionId = '';
    view.sessionId = 'all';
    const proj = st.projects?.items?.find(p => p.id === st.timer?.projectId);
    if (proj?.id) {
      view.clientId = proj.clientId || 'all';
      view.projectId = proj.id;
    } else {
      view.clientId = 'all';
      view.projectId = 'all';
    }
    const hasOpen = d().timerHasOpenSession?.() ?? !!st.timer?.dayStart;
    if (hasOpen && st.timer?.day) {
      view.dateFrom = st.timer.day;
      view.dateTo = st.timer.day;
    } else {
    view.dateFrom = '';
    view.dateTo = '';
    }
    void persistCaptureContextFromTimer();
  }

  async function onPageOpen() {
    if (view.openedFromSession) {
      view.openedFromSession = false;
      return;
    }
    const ctx = await readCaptureContext();
    if (ctx?.pinned) return;
    syncViewToActiveTimer();
  }

  function sessionContextLabel() {
    const st = state();
    const session = view.focusSessionId
      ? st.timer?.sessions?.find(s => s.id === view.focusSessionId)
      : null;
    if (session) {
      return {
        client: session.client,
        project: session.project,
        date: session.date,
        start: session.start,
        end: session.end
      };
    }
    if (view.projectId !== 'all') {
      const proj = st.projects?.items?.find(p => p.id === view.projectId);
      const client =
        st.clients?.items?.find(c => c.id === view.clientId) ||
        st.clients?.items?.find(c => c.id === proj?.clientId);
      return {
        client: client?.company || proj?.client || '—',
        project: proj?.name || '—',
        date: view.dateFrom || st.timer?.day || '',
        start: view.sessionId === 'all' ? st.timer?.dayStart || '' : '',
        end: ''
      };
    }
    const first = view.items[0];
    if (first) {
      return { client: first.client, project: first.project, date: first.date, start: '', end: '' };
    }
    const proj = st.projects?.items?.find(p => p.id === st.timer?.projectId);
    const client = st.clients?.items?.find(c => c.id === proj?.clientId);
    return {
      client: client?.company || '—',
      project: proj?.name || tr('miniNoProject'),
      date: st.timer?.day || '',
      start: st.timer?.dayStart || '',
      end: ''
    };
  }

  async function capturePayload(extra = {}) {
    const st = state();
    const ctx = await readCaptureContext();
    const timerActive = !!d().timerHasOpenSession?.();
    const timerProjectId = st.timer?.projectId || '';

    const payloadFrom = (fields, focused = null) => {
      const project = st.projects?.items?.find(p => p.id === fields.projectId);
      const client =
        st.clients?.items?.find(c => c.id === project?.clientId) ||
        (fields.client ? { company: fields.client } : null);
      const segmentKey =
        fields.openSessionKey || timerOpenSessionKey(st) || buildOpenSessionKey(st.timer);
      return {
        sessionId: fields.sessionId || '',
        openSessionKey: segmentKey,
        projectId: fields.projectId,
        project: fields.project || project?.name || '',
        client: fields.client || client?.company || project?.client || '',
        date: fields.date || st.timer?.day || d().todayIsoDate?.() || '',
        captureMode: extra.captureMode || 'fullscreen',
        monitorIndex: extra.monitorIndex ?? 0,
        description: extra.description || captureDescription(project, client, focused)
      };
    };

    // Active timer always wins — gallery pin is for browsing, not for hijacking captures.
    if (timerActive && timerProjectId) {
      const project = st.projects?.items?.find(p => p.id === timerProjectId);
      const client = st.clients?.items?.find(c => c.id === project?.clientId);
      if (project) {
        return payloadFrom({
          sessionId: '',
          openSessionKey: timerOpenSessionKey(st),
          projectId: project.id,
          project: project.name,
          client: client?.company || project.client || '',
          date: st.timer?.day || d().todayIsoDate?.() || ''
        });
      }
    }

    if (ctx?.pinned && ctx.projectId) {
      const session = ctx.sessionId
        ? st.timer?.sessions?.find(s => s.id === ctx.sessionId)
        : null;
      return payloadFrom(
        {
          sessionId: session?.id || ctx.sessionId || '',
          openSessionKey:
            timerOpenSessionKey(st) || ctx.openSessionKey || openSessionKeyForSession(session),
          projectId: ctx.projectId,
          project: ctx.project,
          client: ctx.client,
          date: ctx.date
        },
        session
      );
    }

    const fromMini = extra.fromMini === true;
    const focused =
      !fromMini && view.focusSessionId
        ? st.timer?.sessions?.find(s => s.id === view.focusSessionId)
        : null;

    if (focused) {
      const project = st.projects?.items?.find(p => p.id === focused.projectId);
      const client = st.clients?.items?.find(c => c.id === project?.clientId);
      if (!project) throw new Error(tr('sessionImportSelectProject'));
      return payloadFrom(
        {
          sessionId: focused.id,
          openSessionKey: openSessionKeyForSession(focused),
          projectId: project.id,
          project: project.name,
          client: client?.company || focused.client || project.client || '',
          date: focused.date || ''
        },
        focused
      );
    }

    if (ctx?.projectId) {
      return payloadFrom({
        sessionId: ctx.sessionId || '',
        openSessionKey: ctx.openSessionKey || buildOpenSessionKey(st.timer),
        projectId: ctx.projectId,
        project: ctx.project,
        client: ctx.client,
        date: ctx.date
      });
    }

    const project = st.projects?.items?.find(p => p.id === (extra.projectId || st.timer?.projectId));
    const client = st.clients?.items?.find(c => c.id === project?.clientId);
    if (!project) throw new Error(tr('sessionImportSelectProject'));
    return payloadFrom({
      sessionId: '',
      openSessionKey: extra.openSessionKey || buildOpenSessionKey(st.timer),
      projectId: project.id,
      project: project.name,
      client: client?.company || project.client || '',
      date: extra.date || st.timer?.day || d().todayIsoDate?.() || ''
    });
  }

  async function showCaptureFeedback(item, anchor = null) {
    if (!item) return;
    const host = document.createElement('div');
    host.className = 'pro-capture-flash';
    const img = document.createElement('img');
    img.alt = '';
    host.appendChild(img);
    document.body.appendChild(host);
    if (anchor && typeof anchor.getBoundingClientRect === 'function') {
      const rect = anchor.getBoundingClientRect();
      host.style.left = `${Math.max(12, rect.left - 24)}px`;
      host.style.top = `${Math.max(12, rect.top - 120)}px`;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    }
    try {
      const src = await loadThumb(item);
      if (src) img.src = src;
    } catch (_) {}
    requestAnimationFrame(() => {
      host.classList.add('is-visible');
      window.setTimeout(() => host.classList.add('is-shrink'), 100);
      window.setTimeout(() => host.classList.add('is-hide'), 850);
      window.setTimeout(() => host.remove(), 1350);
    });
  }

  async function captureWithMode(selection, anchor = null) {
    const captureMode = typeof selection === 'string' ? selection : selection?.mode;
    const monitorIndex = typeof selection === 'object' ? selection?.monitorIndex ?? 0 : 0;
    if (!captureMode) return null;
    try {
      const item = await invoke('tracker_capture_work_screenshot', {
        req: await capturePayload({ captureMode, monitorIndex, fromMini: isMiniContext() })
      });
      await showCaptureFeedback(item, anchor);
      return item;
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (/cancelled/i.test(msg)) return null;
      if (/permission was denied|Screen Recording/i.test(msg)) {
        alert(tr('proScreensPermissionDenied'));
        return null;
      }
      alert(tr('proScreensCaptureFailed', { error: msg }));
      return null;
    }
  }

  async function captureFromMini(anchor) {
    if (typeof d().syncTimerRuntime === 'function') {
      await d().syncTimerRuntime();
    }
    const selection = await showCaptureMenu(anchor || document.getElementById('btnCamera'));
    if (!selection) return;
    await captureWithMode(selection, anchor);
  }

  async function captureFromMain(anchor) {
    const selection = await showCaptureMenu(anchor);
    if (!selection) return;
    const item = await captureWithMode(selection, anchor);
    if (item && d().getState?.()?.page === 'work-screenshots') await renderPage();
  }

  async function linkOpenSession(openSessionKey, sessionId, legacyKey = '') {
    if (!sessionId) return 0;
    const keys = [openSessionKey, legacyKey].filter(Boolean);
    const seen = new Set();
    let linked = 0;
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        linked += Number(await invoke('tracker_link_work_screenshots', { openSessionKey: key, sessionId })) || 0;
      } catch (err) {
        console.warn('linkOpenSession', key, err);
      }
    }
    return linked;
  }

  function openForSession(sessionId) {
    const session = state().timer?.sessions?.find(s => s.id === sessionId);
    if (session) syncViewFromSession(session);
    else {
      view.focusSessionId = sessionId || '';
      view.sessionId = sessionId || 'all';
    }
    view.openedFromSession = true;
    if (session) void persistCaptureContext(session);
    d().setPage?.('work-screenshots');
    if (session?.id) {
      const legacyKey = buildOpenSessionKey({
        projectId: session.projectId,
        day: session.date,
        dayStart: session.start
      });
      void linkOpenSession('', session.id, legacyKey).then(() => renderPage());
    }
  }

  function openForActiveTimer() {
    syncViewToActiveTimer();
    view.openedFromSession = false;
    void persistCaptureContextFromTimer();
    d().setPage?.('work-screenshots');
    void renderPage();
  }

  function applyFiltersFromRoot(root) {
    if (!root) return;
    view.clientId = root.querySelector('#wsClient')?.value || 'all';
    view.projectId = root.querySelector('#wsProject')?.value || 'all';
    view.sessionId = root.querySelector('#wsSession')?.value || 'all';
    view.dateFrom = root.querySelector('#wsDateFrom')?.value || '';
    view.dateTo = root.querySelector('#wsDateTo')?.value || '';
    view.sort = root.querySelector('#wsSort')?.value || 'time-asc';
    view.focusSessionId = view.sessionId !== 'all' ? view.sessionId : '';
    const st = state();
    if (view.sessionId !== 'all') {
      const session = st.timer?.sessions?.find(s => s.id === view.sessionId);
      if (session) void persistCaptureContext(session);
    } else if (view.projectId !== 'all') {
      void persistCaptureContextFromProject(view.projectId, view.clientId);
    } else if (d().timerHasOpenSession?.()) {
      void persistCaptureContextFromTimer();
    } else {
      void invoke('tracker_clear_screenshot_capture_context').catch(() => {});
    }
  }

  async function loadItemsForReportFilter() {
    const st = state();
    return (
      (await invoke('tracker_list_work_screenshots', {
        filter: {
          clientId: st.reports?.clientId || 'all',
          projectId: st.reports?.projectId || 'all',
          dateFrom: st.reports?.dateFrom || '',
          dateTo: st.reports?.dateTo || '',
          sort: 'time-asc'
        }
      })) || []
    );
  }

  function clampPdfLines(text, maxLines = 2, maxWidth = 82) {
    const JsPdf = null;
    void JsPdf;
    const raw = String(text || '').trim();
    if (!raw) return '';
    const words = raw.split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
      if (lines.length >= maxLines) break;
    }
    if (lines.length < maxLines && current) lines.push(current);
    if (lines.length > maxLines) lines.length = maxLines;
    if (words.join(' ').length > lines.join(' ').length && lines.length === maxLines) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxWidth - 1)}…`;
    }
    return lines.join('\n');
  }

  async function exportScreensPdf(items = null, skipPreview = false) {
    const list = items || view.items;
    if (!list.length) {
      alert(tr('proScreensEmpty'));
      return;
    }
    const config = skipPreview ? { defaultPerPage: 1, pageLayouts: {} } : await showPdfExportModal(list);
    if (!config) return;
    const pages = paginatePdfItems(list, config.defaultPerPage, config.pageLayouts);
    const JsPdfCtor = await d().loadJsPdf?.();
    const pdf = new JsPdfCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 14;
    for (let i = 0; i < pages.length; i += 1) {
      if (i > 0) pdf.addPage();
      await drawPdfPageLayout(pdf, pages[i], margin, i + 1);
    }
    const bytes = new Uint8Array(pdf.output('arraybuffer'));
    const base = d().reportBaseName?.() || 'Screenshot_progetto';
    const saved = await d().saveBytesFile?.(`${base}_screenshots.pdf`, bytes);
    alert(tr('proScreensExportDone', { path: d().savedFileName?.(saved) || 'Screenshot_progetto.pdf' }));
    await d().openSavedFile?.(saved);
  }

  function enhanceReportsPage() {
    const bar = document.querySelector('.export-bar');
    if (!bar || document.getElementById('exportScreenshotsToo')) return;
    const wrap = document.createElement('label');
    wrap.className = 'pro-report-export-opt';
    wrap.innerHTML = `<input type="checkbox" id="exportScreenshotsToo" /> ${escapeHtml(tr('proScreensAlsoExportReport'))}`;
    bar.parentElement?.insertBefore(wrap, bar.nextSibling);
  }

  async function exportReportWithScreenshots(kind) {
    if (kind === 'pdf') {
      await d().exportReportPdfDefault?.({ openAfter: true });
      if (document.getElementById('exportScreenshotsToo')?.checked) {
        const shots = await loadItemsForReportFilter();
        if (shots.length) await exportScreensPdf(shots);
      }
      return;
    }
    return d().exportReportDefault?.(kind);
  }

  async function exportReport(kind) {
    if (kind === 'pdf') return exportReportWithScreenshots('pdf');
    return d().exportReportDefault?.(kind);
  }

  function init(appDeps) {
    deps = appDeps;
  }

  return {
    init,
    onPageOpen,
    renderPage,
    captureFromMini,
    captureFromMain,
    captureWithMode,
    showCaptureMenu,
    importFromFiles,
    linkOpenSession,
    openForSession,
    openForActiveTimer,
    buildOpenSessionKey,
    syncCaptureContextToTimer,
    enhanceReportsPage,
    exportReport,
    exportScreensPdf,
    truncateTwoLines,
    clampPdfLines,
    paginatePdfItems
  };
})();
