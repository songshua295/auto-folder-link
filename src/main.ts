import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  normalizePath,
} from "obsidian";
import { t } from "./i18n";

interface AutoNamespaceSettings {
  autoMoveNewLinks: boolean;
  syncRenameFolder: boolean;
  folderBlacklist: string[];
}

const DEFAULT_SETTINGS: AutoNamespaceSettings = {
  autoMoveNewLinks: true,
  syncRenameFolder: false,
  folderBlacklist: [],
};

export default class AutoNamespaceCreator extends Plugin {
  settings: AutoNamespaceSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "move-current-file-to-source-folder",
      name: t("commandMoveToSource"),
      callback: () => this.moveCurrentFileToSourceFolder(),
    });

    this.addSettingTab(new AutoNamespaceSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.handleFileCreate(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.handleRename(file, oldPath);
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[.#%&{}\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .trim();
  }

  private isInBlacklist(filePath: string): boolean {
    return this.settings.folderBlacklist.some((blocked) =>
      filePath.startsWith(blocked)
    );
  }

  private async handleFileCreate(file: TFile) {
    if (!this.settings.autoMoveNewLinks) return;
    if (!(file instanceof TFile)) return;
    if (file.extension !== "md") return;
    if (this.isInBlacklist(file.path)) return;

    const sourceNote = this.findSourceNoteByUnresolvedLink(file.basename);
    if (!sourceNote) return;

    const targetFolder = this.calculateTargetFolder(sourceNote);
    const newPath = `${targetFolder}/${file.basename}.md`;
    const normalizedNewPath = normalizePath(newPath);

    if (file.path === normalizedNewPath) return;

    const existingFile = this.app.vault.getFileByPath(normalizedNewPath);
    if (existingFile && existingFile.path !== file.path) return;

    try {
      await this.ensureFolderExists(targetFolder);
    } catch (error) {
      console.error("Error creating folder:", error);
      return;
    }

    setTimeout(async () => {
      try {
        const currentFile = this.app.vault.getFileByPath(file.path);
        if (!currentFile) return;
        await this.app.fileManager.renameFile(currentFile, newPath);
        new Notice(`${t("noticeMoved")}${targetFolder}`);
      } catch (error) {
        console.error("Error moving file:", error);
      }
    }, 100);
  }

  private findSourceNoteByUnresolvedLink(linkText: string): TFile | null {
    const unresolvedLinks = this.app.metadataCache.unresolvedLinks;
    const normalizedLinkText = this.sanitizeFolderName(linkText);

    for (const [sourcePath, links] of Object.entries(unresolvedLinks)) {
      for (const key of Object.keys(links)) {
        if (this.sanitizeFolderName(key) === normalizedLinkText) {
          const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
          if (sourceFile instanceof TFile) {
            return sourceFile;
          }
        }
      }
    }

    return null;
  }

  private calculateTargetFolder(sourceNote: TFile): string {
    const sourceDir = sourceNote.parent?.path || "";
    const folderName = this.sanitizeFolderName(sourceNote.basename);
    return sourceDir ? `${sourceDir}/${folderName}` : folderName;
  }

  private async ensureFolderExists(folderPath: string): Promise<TFolder> {
    const existingFolder = this.app.vault.getFolderByPath(folderPath);
    if (existingFolder) return existingFolder;

    const pathParts = folderPath.split("/").filter((p) => p.length > 0);
    let currentPath = "";

    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!this.app.vault.getFolderByPath(currentPath)) {
        await this.app.vault.createFolder(currentPath);
      }
    }

    return this.app.vault.getFolderByPath(folderPath)!;
  }

  private async moveCurrentFileToSourceFolder() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView?.file) {
      new Notice(t("noticeNoActiveFile"));
      return;
    }

    const currentFile = activeView.file;
    if (this.isInBlacklist(currentFile.path)) {
      new Notice(t("noticeFileInBlacklist"));
      return;
    }

    const sourceNote = this.findSourceNoteByUnresolvedLink(currentFile.basename);
    if (!sourceNote) {
      new Notice(t("noticeCannotFindSource"));
      return;
    }

    try {
      const targetFolder = this.calculateTargetFolder(sourceNote);
      await this.ensureFolderExists(targetFolder);

      const newPath = `${targetFolder}/${currentFile.basename}.md`;
      const normalizedNewPath = normalizePath(newPath);
      const existingFile = this.app.vault.getFileByPath(normalizedNewPath);

      if (existingFile && existingFile.path !== currentFile.path) {
        new Notice(t("noticeTargetExists"));
        return;
      }

      await this.app.fileManager.renameFile(currentFile, newPath);
      new Notice(`${t("noticeMoved")}${targetFolder}`);
    } catch (error) {
      console.error("Error moving file:", error);
      new Notice(`${t("noticeFailed")}${error}`);
    }
  }

  private async handleRename(file: TFile, oldPath: string) {
    if (!this.settings.syncRenameFolder) return;
    if (!(file instanceof TFile)) return;

    const oldDir = oldPath.substring(0, oldPath.lastIndexOf("/"));
    const oldBasename = oldPath
      .substring(oldPath.lastIndexOf("/") + 1)
      .replace(/\.md$/, "");

    const oldFolderPath = oldDir
      ? `${oldDir}/${this.sanitizeFolderName(oldBasename)}`
      : this.sanitizeFolderName(oldBasename);

    const folder = this.app.vault.getFolderByPath(oldFolderPath);
    if (!folder) return;

    const newFolderPath = oldDir
      ? `${oldDir}/${this.sanitizeFolderName(file.basename)}`
      : this.sanitizeFolderName(file.basename);

    try {
      await this.app.fileManager.renameFolder(folder, newFolderPath);
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  }
}

class AutoNamespaceSettingTab extends PluginSettingTab {
  plugin: AutoNamespaceCreator;

  constructor(app: App, plugin: AutoNamespaceCreator) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t("settingAutoMove"))
      .setDesc(t("settingAutoMoveDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoMoveNewLinks)
          .onChange(async (value) => {
            this.plugin.settings.autoMoveNewLinks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingSyncRename"))
      .setDesc(t("settingSyncRenameDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncRenameFolder)
          .onChange(async (value) => {
            this.plugin.settings.syncRenameFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingBlacklist"))
      .setDesc(t("settingBlacklistDesc"))
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.folderBlacklist.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.folderBlacklist = value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }
}