'use strict';

// Auto Folder Link Plugin: Automatically organizes linked notes into folders
// 自动文件夹链接插件：自动将链接笔记组织到文件夹中
const { Plugin, TFile, normalizePath, PluginSettingTab, Setting } = require("obsidian");

class AutoFolderLinkSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Auto Folder Link 设置" });

        new Setting(containerEl)
            .setName("自动移动新建链接笔记")
            .setDesc("开启后，点击 [[b]] 创建 b 时，会自动移动到 a 文件夹下")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoMove)
                .onChange(async (value) => {
                    this.plugin.settings.autoMove = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}

module.exports = class AutoFolderLinkPlugin extends Plugin {
    async onload() {
        console.log("AutoFolderLink loaded");

        // 默认设置
        this.settings = Object.assign({
            autoMove: true,
        }, await this.loadData());

        // 注册设置面板
        this.addSettingTab(new AutoFolderLinkSettingTab(this.app, this));

        // 注册命令：手动移动当前文件
        this.addCommand({
            id: "auto-folder-link-move-current",
            name: "手动移动当前文件到引用源文件夹",
            callback: async () => {
                const file = this.app.workspace.getActiveFile();
                if (!file) {
                    new Notice("未找到当前文件");
                    return;
                }
                await this.tryMoveFile(file);
            }
        });

        // 监听文件创建
        this.registerEvent(
            this.app.vault.on("create", async (file) => {
                if (!this.settings.autoMove) return; // 若关闭自动移动，则不执行

                if (!(file instanceof TFile)) return;
                if (!file.path.endsWith(".md")) return;

                await this.tryMoveFile(file);
            })
        );
    }

    async tryMoveFile(file) {
        try {
            const newBase = file.basename; // b

            // 正则匹配 [[b]]、[[b|alias]]、[[path/b]] 等
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const linkPattern = new RegExp(
                "\\[\\[\\s*(?:[^\\]|]*\\/)?"+esc(newBase)+"(?:#[^\\]|]*)?(?:\\|[^\\]]*)?\\s*\\]\\]",
                "i"
            );

            // 扫描 vault 查找引用 [[b]] 的来源笔记 a
            const files = this.app.vault.getMarkdownFiles();
            let sourceA = null;

            for (const f of files) {
                if (f.path === file.path) continue;
                try {
                    const txt = await this.app.vault.read(f);
                    if (linkPattern.test(txt)) {
                        sourceA = f;
                        break;
                    }
                } catch {}
            }

            if (!sourceA) {
                console.log("AutoFolderLink: no source note found for", newBase);
                return false;
            }

            // 构建 a 文件夹路径
            const aFolderName = sourceA.basename;
            const aParent = sourceA.parent?.path || "";
            const aFolderPath = normalizePath(`${aParent}/${aFolderName}`);

            // 若文件夹不存在则创建
            if (!this.app.vault.getAbstractFileByPath(aFolderPath)) {
                await this.app.vault.createFolder(aFolderPath);
            }

            // 移动 b.md → a/b.md
            const destPath = normalizePath(`${aFolderPath}/${file.name}`);
            await this.app.fileManager.renameFile(file, destPath);
            // 移动提示
            new Notice(`已将笔记「${file.basename}」移动到「${aFolderPath}」`);
            console.log(`AutoFolderLink: moved ${file.path} → ${destPath}`);
            return true;

        } catch (err) {
            console.error("AutoFolderLink error:", err);
            return false;
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onunload() {
        console.log("AutoFolderLink unloaded");
    }
};
