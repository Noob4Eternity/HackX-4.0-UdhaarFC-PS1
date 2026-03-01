import * as vscode from 'vscode';
import { SidebarProvider } from './sidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  // Register the webview sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'vibecheck-sidebar',
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Command: trigger scan from command palette
  context.subscriptions.push(
    vscode.commands.registerCommand('vibecheck.scan', () => {
      // Focus the sidebar first, then trigger scan
      vscode.commands.executeCommand('vibecheck-sidebar.focus');
      // Small delay to allow webview to initialize
      setTimeout(() => {
        sidebarProvider.triggerScan();
      }, 500);
    })
  );

  // Command: open full report in an editor tab
  context.subscriptions.push(
    vscode.commands.registerCommand('vibecheck.openReport', () => {
      const result = sidebarProvider.getLastResult();
      if (!result) {
        vscode.window.showWarningMessage('No scan results available. Run a scan first.');
        return;
      }
      // Open JSON result in a new editor
      vscode.workspace
        .openTextDocument({ content: JSON.stringify(result, null, 2), language: 'json' })
        .then(doc => vscode.window.showTextDocument(doc));
    })
  );

  console.log('VibeCheck Security extension activated');
}

export function deactivate() {
  // Cleanup if needed
}
