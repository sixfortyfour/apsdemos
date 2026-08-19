/// <reference path="./autodesk.d.ts" />
import '../extensions/LoggerExtension';

async function getAccessToken(callback: (token: string, expiresIn: number) => void) {
  try {
    const resp = await fetch('/api/auth/token');
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const { access_token, expires_in } = await resp.json();
    callback(access_token, expires_in);
  } catch (err) {
    alert('Could not obtain access token. See the console for more details.');
    console.error(err);
  }
}

export function initViewer(container: HTMLElement): Promise<any> {
  return new Promise(function (resolve) {
    Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
      const config = {
        extensions: ['Autodesk.DocumentBrowser', 'LoggerExtension'],
      };
      const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
      viewer.start();
      viewer.setTheme('light-theme');
      resolve(viewer);
    });
  });
}

export function loadModel(viewer: any, urn: string) {
  return new Promise(function (resolve, reject) {
    function onDocumentLoadSuccess(doc: any) {
      resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
    }
    function onDocumentLoadFailure(code: number, message: string, errors: any[]) {
      reject({ code, message, errors });
    }
    viewer.setLightPreset(0);
    Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
  });
}
