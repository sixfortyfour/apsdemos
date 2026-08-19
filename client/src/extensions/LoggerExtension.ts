/// <reference path="../lib/autodesk.d.ts" />
import { BaseExtension } from './BaseExtension';

class LoggerExtension extends BaseExtension {
    load(): boolean {
        super.load();
        console.log('LoggerExtension loaded.');
        return true;
    }

    unload(): boolean {
        super.unload();
        console.log('LoggerExtension unloaded.');
        return true;
    }

    async onModelLoaded(model: any) {
        super.onModelLoaded(model);
        const props = await this.findPropertyNames(this.viewer.model);
        console.log('New model has been loaded. Its objects contain the following properties:', props);
    }

    async onSelectionChanged(model: any, dbids: any) {
        super.onSelectionChanged(model, dbids);
        console.log('Selection has changed', dbids);
    }

    onIsolationChanged(model: any, dbids: any) {
        super.onIsolationChanged(model, dbids);
        console.log('Isolation has changed', dbids);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LoggerExtension', LoggerExtension);
