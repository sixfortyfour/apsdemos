// Definitive completion outcomes reported by the Model Derivative webhook, keyed by urn. The
// webhook can beat a subsequent manifest read reflecting the same completion (see
// manifestSummary.applyWebhookStatus), so this is consulted before trusting a manifest that still
// looks unfinished. In-memory only, which is fine for this single-instance demo app.
const finishedTranslations = new Map();

function recordFinished(urn, status) {
    finishedTranslations.set(urn, status);
}

function getFinished(urn) {
    return finishedTranslations.get(urn);
}

module.exports = { recordFinished, getFinished };
