const express = require('express');
const { getManifest } = require('../services/aps');
const { summarizeManifest, applyWebhookStatus } = require('../services/manifestSummary');
const { getFinished, onFinished } = require('../services/webhookEvents');

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(['success', 'failed', 'timeout']);

let router = express.Router();

// Pushes translation status updates for a urn as Server-Sent Events, instead of making the
// client poll /api/models/:urn/status itself. Under the hood this still polls the Model
// Derivative manifest on the same interval the client used to, but a completion reported by the
// webhook (see webhookHandlers.js) short-circuits that wait, so the browser finds out as soon as
// the job actually finishes rather than up to a poll interval later.
router.get('/api/models/:urn/status/stream', function (req, res) {
    const urn = req.params.urn;
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
    });
    res.flushHeaders();

    let closed = false;
    let pollTimeout;

    function send(summary) {
        res.write(`data: ${JSON.stringify(summary)}\n\n`);
    }

    async function poll() {
        if (closed) return;
        if (pollTimeout) clearTimeout(pollTimeout);
        try {
            const manifest = await getManifest(urn);
            if (closed) return;
            const summary = applyWebhookStatus(summarizeManifest(manifest), getFinished(urn));
            send(summary);
            if (TERMINAL_STATUSES.has(summary.status)) {
                close();
                return;
            }
        } catch (err) {
            if (!closed) send({ status: 'n/a' });
        }
        if (!closed) {
            pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
        }
    }

    function close() {
        if (closed) return;
        closed = true;
        if (pollTimeout) clearTimeout(pollTimeout);
        unsubscribe();
        res.end();
    }

    const unsubscribe = onFinished((finishedUrn) => {
        if (finishedUrn === urn) poll();
    });

    req.on('close', close);
    poll();
});

module.exports = router;
