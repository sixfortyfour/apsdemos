/// <reference path="../lib/autodesk.d.ts" />

export class BaseExtension extends Autodesk.Viewing.Extension {
    _onObjectTreeCreated: (ev: any) => void;
    _onSelectionChanged: (ev: any) => void;
    _onIsolationChanged: (ev: any) => void;
    _onToolbarCreated: (ev: any) => void;

    constructor(viewer: any, options: any) {
        super(viewer, options);
        this._onObjectTreeCreated = (ev: any) => this.onModelLoaded(ev.model);
        this._onSelectionChanged = (ev: any) => this.onSelectionChanged(ev.model, ev.dbIdArray);
        this._onIsolationChanged = (ev: any) => this.onIsolationChanged(ev.model, ev.nodeIdArray);
        this._onToolbarCreated = () => this.onToolbarCreated();
    }

    load(): boolean {
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        if (this.viewer.toolbar) {
            this.onToolbarCreated();
        } else {
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this._onToolbarCreated);
        }
        return true;
    }

    unload(): boolean {
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this._onToolbarCreated);
        return true;
    }

    onModelLoaded(_model: any) {}

    onSelectionChanged(_model: any, _dbids: any) {}

    onIsolationChanged(_model: any, _dbids: any) {}

    onToolbarCreated() {}

    findLeafNodes(model: any): Promise<any[]> {
        return new Promise(function (resolve, reject) {
            model.getObjectTree(function (tree: any) {
                let leaves: any[] = [];
                tree.enumNodeChildren(tree.getRootId(), function (dbid: any) {
                    if (tree.getChildCount(dbid) === 0) {
                        leaves.push(dbid);
                    }
                }, true /* recursively enumerate children's children as well */);
                resolve(leaves);
            }, reject);
        });
    }

    async findPropertyNames(model: any): Promise<string[]> {
        const dbids = await this.findLeafNodes(model);
        return new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, {}, function (results: any[]) {
                let propNames = new Set<string>();
                for (const result of results) {
                    for (const prop of result.properties) {
                        propNames.add(prop.displayName);
                    }
                }
                resolve(Array.from(propNames.values()));
            }, reject);
        });
    }

    createToolbarButton(buttonId: string, buttonIconUrl: string, buttonTooltip: string) {
        let group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        if (!group) {
            group = new Autodesk.Viewing.UI.ControlGroup('dashboard-toolbar-group');
            this.viewer.toolbar.addControl(group);
        }
        const button = new Autodesk.Viewing.UI.Button(buttonId);
        button.setToolTip(buttonTooltip);
        group.addControl(button);
        const icon = button.container.querySelector('.adsk-button-icon');
        if (icon) {
            icon.style.backgroundImage = `url(${buttonIconUrl})`; 
            icon.style.backgroundSize = `24px`; 
            icon.style.backgroundRepeat = `no-repeat`; 
            icon.style.backgroundPosition = `center`; 
        }
        return button;
    }

    removeToolbarButton(button: any) {
        const group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        group.removeControl(button);
    }
}
