import { BaseExtension } from './BaseExtension.js';

class SummaryExtension extends BaseExtension {
    _button: any;

    constructor(viewer: any, options: any) {
        super(viewer, options);
        this._button = null;
    }

    load(): boolean {
        super.load();
        console.log('SummaryExtension loaded.');
        return true;
    }

    unload(): boolean {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        console.log('SummaryExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._button = this.createToolbarButton('summary-button', 'https://img.icons8.com/small/32/brief.png', 'Show Model Summary');
        this._button.onClick = () => {
            // TODO
        };
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