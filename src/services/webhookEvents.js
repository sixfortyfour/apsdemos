const EventEmitter = require('events');

// Definitive completion outcomes reported by the Model Derivative webhook, keyed by urn. The
// webhook can beat a subsequent manifest read reflecting the same completion (see
// manifestSummary.applyWebhookStatus), so this is consulted before trusting a manifest that still
// looks unfinished. In-memory only, which is fine for this single-instance demo app.
const finishedTranslations = new Map();

const emitter = new EventEmitter();
// Every open SSE stream (routes/statusEvents.js) subscribes for the lifetime of its request, and
// several translations can be in flight at once - the default limit of 10 is easily hit.
emitter.setMaxListeners(0);

function recordFinished(urn, status) {
    finishedTranslations.set(urn, status);
    emitter.emit('finished', urn, status);
}

function getFinished(urn) {
    return finishedTranslations.get(urn);
}

// Lets an SSE stream react the instant the webhook reports completion for the urn it's watching,
// instead of waiting out the rest of its poll interval. Returns an unsubscribe function.
function onFinished(listener) {
    emitter.on('finished', listener);
    return () => emitter.off('finished', listener);
}

module.exports = { recordFinished, getFinished, onFinished };
