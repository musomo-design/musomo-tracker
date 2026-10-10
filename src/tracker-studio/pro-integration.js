/** Screenshot ↔ Studio wiring (keeps app.js hooks minimal). */
window.MusomoProIntegration = (() => {
  let api = null;

  function screenshotDeps() {
    const a = api || {};
    return {
      tr: a.tr,
      invoke: a.invoke,
      escapeHtml: a.escapeHtml,
      getState: a.getState,
      formatDisplayDate: a.formatDisplayDate,
      formatClockDisplay: a.formatClockDisplay,
      todayIsoDate: a.todayIsoDate,
      normalizeClockString: a.normalizeClockString,
      timerHasOpenSession: a.timerHasOpenSession,
      alignTimerForScreenshotSession: a.alignTimerForScreenshotSession,
      setPage: a.setPage,
      saveBytesFile: a.saveBytesFile,
      savedFileName: a.savedFileName,
      openSavedFile: a.openSavedFile,
      loadJsPdf: a.loadJsPdf,
      reportBaseName: a.reportBaseName,
      exportReportPdfDefault: a.exportReportPdfDefault,
      exportReportDefault: a.exportReportDefault,
      reportXlsxBytes: a.reportXlsxBytes,
      zipStore: a.zipStore,
      getReportEntries: a.getReportEntries,
      renderNav: a.renderNav,
      supportUrl: a.supportUrl || 'https://ko-fi.com/musomo'
    };
  }

  function init(appApi) {
    api = appApi;
    window.MusomoProScreenshots?.init?.(screenshotDeps());
  }

  function onPageOpen(pageId) {
    if (pageId === 'work-screenshots') {
      window.MusomoProScreenshots?.onPageOpen?.();
      window.MusomoProScreenshots?.renderPage?.();
      return;
    }
    if (pageId === 'reports') {
      window.MusomoProScreenshots?.enhanceReportsPage?.();
    }
  }

  async function exportReport(kind) {
    if (window.MusomoProScreenshots?.exportReport) {
      return window.MusomoProScreenshots.exportReport(kind);
    }
    return api?.exportReportDefault?.(kind);
  }

  function openSessionScreenshots(sessionId) {
    window.MusomoProScreenshots?.openForSession?.(sessionId);
  }

  function openActiveTimerScreenshots() {
    window.MusomoProScreenshots?.openForActiveTimer?.();
  }

  function captureFromTimer(anchor) {
    void window.MusomoProScreenshots?.captureFromMain?.(anchor);
  }

  return {
    init,
    onPageOpen,
    exportReport,
    openSessionScreenshots,
    openActiveTimerScreenshots,
    captureFromTimer
  };
})();
