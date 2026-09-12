function summarizeManifest(manifest) {
    if (!manifest) {
        return { status: 'n/a' };
    }
    let messages = [];
    if (manifest.derivatives) {
        for (const derivative of manifest.derivatives) {
            messages = messages.concat(derivative.messages || []);
            if (derivative.children) {
                for (const child of derivative.children) {
                    messages = messages.concat(child.messages || []);
                }
            }
        }
    }
    return { status: manifest.status, progress: manifest.progress, messages };
}

module.exports = { summarizeManifest };
