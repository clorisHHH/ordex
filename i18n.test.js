import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLocale,translate,translateError} from './i18n.js';

test('语言仅支持中文和英文，并以中文为默认值',()=>{
 assert.equal(normalizeLocale('en'),'en');
 assert.equal(normalizeLocale('fr'),'zh');
 assert.equal(translate('zh','myProjects'),'我的项目');
 assert.equal(translate('en','myProjects'),'My Projects');
});

test('动态文案和底层错误会随语言转换',()=>{
 assert.equal(translate('en','workspaceCount',{files:3,sections:2}),'3 files · 2 sections');
 assert.equal(translateError('en','文件夹不能成为文件的下一级'),'A folder cannot be nested under a file');
 assert.equal(translateError('zh','文件夹不能成为文件的下一级'),'文件夹不能成为文件的下一级');
});

test('缺失项目状态和移除确认在中英文下都明确',()=>{
 assert.equal(translate('zh','projectFolderMissing'),'项目文件夹已丢失');
 assert.equal(translate('en','projectFolderMissing'),'Project folder is missing');
 assert.equal(translate('zh','removeMissingQuestion',{name:'测试'}),'移除“测试”的项目卡片？');
 assert.equal(translate('en','removeCard'),'Remove Card');
});

test('清空回收站说明 Ordex 副本会删除，原文件和项目目录仍保留',()=>{
 assert.match(translate('zh','emptyCannotUndo'),/导入副本/);
 assert.match(translate('zh','emptyCannotUndo'),/原文件与项目文件夹仍会保留/);
 assert.match(translate('en','emptyCannotUndo'),/original files and project folders remain/);
 assert.equal(translate('zh','confirmEmptyTrash'),'清空回收站');
});

test('单项永久删除也说明原文件和项目目录不会随之删除',()=>{
 assert.match(translate('zh','cannotUndo'),/原文件及本地项目文件夹不会随之删除/);
 assert.match(translate('en','cannotUndo'),/original files and local project folder are not deleted/);
 assert.equal(translate('zh','confirmPermanentDelete'),'永久删除');
 assert.equal(translate('en','confirmPermanentDelete'),'Delete Permanently');
});
