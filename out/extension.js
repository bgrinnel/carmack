"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const cats = {
    'Carmack': ''
};
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('carmack.start', () => {
        CatCodingPanel.createOrShow(context.extensionUri);
    }));
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel, state) {
                console.log(`Got state: ${state}`);
                // Reset the webview options so we use latest uri for `localResourceRoots`.
                webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                CatCodingPanel.revive(webviewPanel, context.extensionUri);
            }
        });
    }
}
exports.activate = activate;
function getWebviewOptions(extensionUri) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };
}
/**
 * Manages cat coding webview panels
 */
class CatCodingPanel {
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(CatCodingPanel.viewType, 'Carmack', column || vscode.ViewColumn.One, getWebviewOptions(extensionUri));
        CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
    }
    static revive(panel, extensionUri) {
        CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
    }
    dispose() {
        CatCodingPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        // Vary the webview's content based on where it is located in the editor.
        switch (this._panel.viewColumn) {
            case vscode.ViewColumn.One:
            default:
                this._updateForCat(webview, 'Carmack');
                return;
        }
    }
    _updateForCat(webview, catName) {
        this._panel.title = catName;
        this._panel.webview.html = this._getHtmlForWebview(webview, "Carmack");
    }
    _getHtmlForWebview(webview, catGifPath) {
        // And the uri we use to load this script in the webview
        const logo = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'carmack_logo.png'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const languageUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'language.js'));
        const speechRecognitionUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'speechRecognition.js'));
        const mainCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
		<html lang="en">
		  <head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<link rel="stylesheet" href="${mainCssUri}">
			<link
			  href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css"
			  rel="stylesheet"
			  integrity="sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1"
			  crossorigin="anonymous"
			/>
			<title>Speech To Text</title>
		  </head>
		  <body class="container pt-5 bg-dark">
			<div class="mt-4" id="div_language">
				<div class="logo-container">
					<img class="logo" src="${logo}">
		  		</div>
			  <h2 class="mb-3 text-light">Select Language</h2>
			  <select class="form-select bg-secondary text-light" id="select_language" onchange="updateCountry()"></select>
			  <select class="form-select bg-secondary text-light mt-2" id="select_dialect"></select>
			</div>
			<h2 class="mt-4 text-light">Transcript</h2>
			<div class="p-3" style="border: 1px solid gray; height: 300px; border-radius: 8px;">
			  <span id="final" class="text-light"></span>
			  <span id="interim" class="text-secondary"></span>
			</div>
			<div class="mt-4">
			  <button class="btn btn-success" id="start">Start</button>
			  <button class="btn btn-danger" id="stop">Stop</button>
			  <p id="status" class="lead mt-3 text-light" style="display: none">Listenting ...</p>
			</div>
			<script src="${languageUri}"></script>
			<script src="${speechRecognitionUri}"></script>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		  </body>
		</html>`;
    }
}
CatCodingPanel.viewType = 'carmack';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map