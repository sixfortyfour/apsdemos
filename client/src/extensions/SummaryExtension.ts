import { BaseExtension } from './BaseExtension.js';

class SummaryExtension extends BaseExtension {
    constructor(viewer: any, options: any) {
        super(viewer, options);
    }

    load() {
        super.load();
        console.log('SummaryExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        console.log('SummaryExtension unloaded.');
        return true;
    }

    onModelLoaded(model: any) {
        super.onModelLoaded(model);
        this.update();
    }

    onSelectionChanged(model: any, dbids: any) {
        super.onSelectionChanged(model, dbids);
        this.update();
    }

    onIsolationChanged(model: any, dbids: any) {
        super.onIsolationChanged(model, dbids);
        this.update();
    }

    async update() {
        // TODO
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SummaryExtension', SummaryExtension);