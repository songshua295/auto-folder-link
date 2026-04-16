export const translations = {
  en: {
    commandMoveToSource: "Move current file to source folder",
    settingAutoMove: "Auto move new link notes",
    settingAutoMoveDesc:
      "When enabled, clicking an unresolved link to create a new note will automatically move it to a folder named after the source note.",
    settingSyncRename: "Sync rename folder",
    settingSyncRenameDesc:
      "When the source note is renamed, automatically rename the corresponding folder. Use with caution.",
    settingBlacklist: "Folder blacklist",
    settingBlacklistDesc:
      "Folders where the auto-move logic should not be applied. Enter one path per line.",
    noticeNoActiveFile: "No active file found",
    noticeFileInBlacklist: "File is in blacklist",
    noticeCannotFindSource: "Cannot find source note that references this file",
    noticeTargetExists: "Target file already exists",
    noticeMoved: "Moved to folder: ",
    noticeFailed: "Failed to move file: ",
  },
  zh: {
    commandMoveToSource: "移动当前文件到源文件夹",
    settingAutoMove: "自动移动新链接笔记",
    settingAutoMoveDesc:
      "启用后，点击未解析链接创建新笔记时，会自动将其移动到以源笔记命名的文件夹中。",
    settingSyncRename: "同步重命名文件夹",
    settingSyncRenameDesc:
      "当源笔记重命名时，自动重命名对应的文件夹。请谨慎使用。",
    settingBlacklist: "文件夹黑名单",
    settingBlacklistDesc:
      "不应用自动移动逻辑的文件夹。每行输入一个路径。",
    noticeNoActiveFile: "未找到活动文件",
    noticeFileInBlacklist: "文件在黑名单中",
    noticeCannotFindSource: "找不到引用此文件的源笔记",
    noticeTargetExists: "目标文件已存在",
    noticeMoved: "已移动到文件夹：",
    noticeFailed: "移动文件失败：",
  },
  "zh-cn": {
    commandMoveToSource: "移动当前文件到源文件夹",
    settingAutoMove: "自动移动新链接笔记",
    settingAutoMoveDesc:
      "启用后，点击未解析链接创建新笔记时，会自动将其移动到以源笔记命名的文件夹中。",
    settingSyncRename: "同步重命名文件夹",
    settingSyncRenameDesc:
      "当源笔记重命名时，自动重命名对应的文件夹。请谨慎使用。",
    settingBlacklist: "文件夹黑名单",
    settingBlacklistDesc:
      "不应用自动移动逻辑的文件夹。每行输入一个路径。",
    noticeNoActiveFile: "未找到活动文件",
    noticeFileInBlacklist: "文件在黑名单中",
    noticeCannotFindSource: "找不到引用此文件的源笔记",
    noticeTargetExists: "目标文件已存在",
    noticeMoved: "已移动到文件夹：",
    noticeFailed: "移动文件失败：",
  },
};

export type TranslationKey = keyof typeof translations.en;

export function createTranslator(lang: string) {
  const language = lang.startsWith("zh") ? "zh-cn" : "en";
  return (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };
}

export function getI18n() {
  const lang = navigator.language;
  return createTranslator(lang);
}

export function t(key: TranslationKey): string {
  return getI18n()(key);
}