// The root manifest's `progress` only updates in coarse steps (or lags behind
// entirely while sitting at "0% complete"). Each derivative/child carries its
// own `progress` too, and updates more granularly, so report whichever one is
// furthest along instead of just the root's.
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
    let progress = manifest.progress;
    let progressPercent = parseProgressPercent(manifest.progress);

    function considerProgress(candidate) {
        const percent = parseProgressPercent(candidate);
        if (percent !== null && (progressPercent === null || percent > progressPercent)) {
            progressPercent = percent;
            progress = candidate;
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
    return { status: manifest.status, progress, messages };
}

module.exports = { summarizeManifest };
