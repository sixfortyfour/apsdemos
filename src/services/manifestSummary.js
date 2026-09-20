// The root manifest's `progress` only updates in coarse steps (or lags behind
// entirely while sitting at "0% complete"). Each derivative/child carries its
// own `progress` too, and updates more granularly, so prefer it over a stale
// root value. A translation can request multiple views (e.g. 2D and 3D) that
// finish at different times, so when there's more than one, report the
// *slowest* one rather than the fastest - otherwise a single finished view
// would make the whole job look "complete" while a sibling is still running.
function parseProgressPercent(progress) {
    if (!progress) return null;
    if (progress === 'complete') return 100;
    const match = /^(\d+)%/.exec(progress);
    return match ? Number(match[1]) : null;
}

function summarizeManifest(manifest) {
    if (!manifest) {
        return { status: 'n/a' };
    }
    let messages = [];
    let slowest = null;

    function considerProgress(candidate) {
        const percent = parseProgressPercent(candidate);
        if (percent !== null && (slowest === null || percent < slowest.percent)) {
            slowest = { percent, progress: candidate };
        }
    }

    if (manifest.derivatives) {
        for (const derivative of manifest.derivatives) {
            messages = messages.concat(derivative.messages || []);
            considerProgress(derivative.progress);
            if (derivative.children) {
                for (const child of derivative.children) {
                    messages = messages.concat(child.messages || []);
                    considerProgress(child.progress);
                }
            }
        }
    }

    const rootPercent = parseProgressPercent(manifest.progress);
    const progress = slowest !== null && (rootPercent === null || slowest.percent > rootPercent)
        ? slowest.progress
        : manifest.progress;

    return { status: manifest.status, progress, messages };
}

// The Model Derivative webhook fires the instant a job truly finishes, which can beat a manifest
// read reflecting that same completion. If the webhook has already reported a final outcome for
// this urn but the manifest we just read still looks unfinished, trust the webhook instead of
// making the caller wait out another poll for the manifest to catch up.
function applyWebhookStatus(summary, webhookStatus) {
    if (!webhookStatus) {
        return summary;
    }
    if (summary.status === 'inprogress' || summary.status === 'pending' || summary.status === 'n/a') {
        return { ...summary, status: webhookStatus, progress: 'complete' };
    }
    return summary;
}

module.exports = { summarizeManifest, applyWebhookStatus };
