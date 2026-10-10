/** Screenshot & report helpers — Musomo Tracker is fully free; no license gate. */
window.MusomoPro = (() => {
  const status = {
    licensed: true,
    trialDaysLeft: 0,
    canUse: true,
    trialExpired: false
  };

  async function refresh() {
    return { ...status };
  }

  function getStatus() {
    return { ...status };
  }

  function isEnabled() {
    return true;
  }

  function trialBadge() {
    return '';
  }

  async function init() {}

  return { init, refresh, getStatus, isEnabled, trialBadge };
})();
