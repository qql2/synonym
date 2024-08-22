/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable no-async-promise-executor */

import { Notice } from "obsidian";
import Synonym from "main";
import { pollObj } from "enhanced-dom";
import type { BT_BCAPI } from "better-breadcrumb/src/BT_BCAPI";

declare global {
	interface Window {
		BT_BCAPI: BT_BCAPI | undefined;
	}
}

enum TagRenameQuery {
	INPUT = "div.modal > div.modal-content > div.is-mobile > input[type=text]",
	OK = "div.modal > div.modal-button-container > button.mod-cta",
	CONFIRM = "div.modal > div.modal-button-container > button.mod-cta.mod-warning",
	TITLE = "div.modal > div.modal-title",
	CANCEL = "div.modal > div.modal-button-container > button:nth-child(2)",
}

export class Tag {
	plugin: Synonym;
	autoRenameRst: true | Error;
	constructor(plugin: Synonym) {
		this.plugin = plugin;
		this.renameErrorListener = this.renameErrorListener.bind(this);
		this.init();
	}
	init() {
		this.plugin.ErrorListener.removeListener(this.renameErrorListener);
		this.plugin.ErrorListener.addListener(this.renameErrorListener);
	}
	protected renameErrorListener(...args: any[]) {
		let secCaller = new Error().stack?.split("\n")[4]?.trim().split(" ")[1];
		// console.log('secCaller:\n', secCaller)
		if (secCaller && secCaller.search("rename") != -1) {
			this.autoRenameRst = new Error(...args);
		}
	}
	static searchTag(rgx: RegExp, source: string[]) {
		const rst = [];
		for (const t of source) {
			if (t.search(rgx) != -1) rst.push(t);
		}
		return rst;
	}
	async renameTagAndAnnota(name: string) {
		if (!name) {
			new Notice("Nothing selected");
			return;
		}
		this.renameTag(name);
		//await Kit.sleep(1000);
		let newtag: string = undefined;
		try {
			newtag = await this.getUserInput();
		} catch (error) {
			this.exitRename();
			return false;
		}

		// console.log('newtag:\n', newtag);
		// if (!(await this.waitConfirm())) return false;
		await this.autoRenameTagAndAnnota(name, newtag);
		return true;
	}
	waitConfirm() {
		return new Promise<boolean>(async (resolve, reject) => {
			let confirm = await pollObj(TagRenameQuery.CONFIRM, undefined, 200);
			if (!confirm) resolve(true);
			confirm.addEventListener("click", (evt) => {
				evt.stopImmediatePropagation();
				resolve(true);
			});
			let activeEl = document.activeElement as HTMLElement;
			activeEl.addEventListener("keydown", (evt) => {
				if (evt.key == "Enter") {
					evt.stopImmediatePropagation();
					resolve(true);
				}
			});
			setTimeout(() => {
				resolve(false);
			}, 10000);
		});
	}
	exitRename(method: "button" | "esc" = "esc") {
		if (method == "button") return this.clickCancel();
		// 给正在聚焦的元素按下esc键退出重命名
		const obj = document.activeElement as HTMLElement;
		if (!obj) return false;
		obj.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		return true;
	}
	/** 从弹出的标签重命名框中截取最终输入的内容, 并取消重命名 */
	async getUserInput() {
		return new Promise<string>(async (resolve, reject) => {
			const obj = (await pollObj(
				TagRenameQuery.INPUT
			)) as HTMLInputElement;
			//console.log('obj:\n', obj);
			if (!obj) reject(new Error("No interface!"));
			obj.addEventListener("keydown", async (evt) => {
				//console.log(evt.key);
				if (evt.key == "Enter") {
					evt.stopImmediatePropagation();
					await this.exitRename();
					resolve(obj.value);
				}
			});
			const button = (await pollObj(TagRenameQuery.OK)) as HTMLElement;
			button.addEventListener("click", async (evt) => {
				evt.stopImmediatePropagation();
				await this.exitRename();
				resolve(obj.value);
			});
		});
	}
	private async clickCancel() {
		const obj = (await pollObj(TagRenameQuery.CANCEL)) as HTMLElement;
		const click = new MouseEvent("click");
		obj.dispatchEvent(click);
		return true;
	}
	private async renameTag(name: string) {
		//@ts-ignore
		const tag_w = this.plugin.app.plugins.plugins["tag-wrangler"];
		if (!tag_w) {
			let messge = "I need plugin: tag-wrange!";
			let error = new Error(messge);
			throw error;
		}
		const p = tag_w.rename(name) as Promise<void>;
		return p;
	}
	static getVaultTags(plugin: Synonym) {
		// @ts-ignore
		const obj = plugin.app.metadataCache.getTags();
		return Object.keys(obj).map((v) => v.replace("#", ""));
	}
	async autoRenameTagAndAnnota(oldSnippet: string, newSnippet: string) {
		if (oldSnippet == newSnippet) {
			new Notice("No change!");
			return;
		}
		// debugger;
		let rst1, rst2;
		for (const t of Tag.getTagsByLastSnippet(
			oldSnippet,
			Tag.getVaultTags(this.plugin)
		)) {
			const newtag = t.replace(
				Tag.getLstSnippetRgx(oldSnippet),
				newSnippet
			);
			/* 不能并发以下两个,会有bug */
			rst1 = await this.autoRenameTag(t, newtag);
			rst2 = await this.autoRenameAnnotaTag(t, newtag);
		}
		let rst3 = await this.autoRenameAnnotaTag(oldSnippet, newSnippet);
		let rst = [rst1, rst2, rst3];
		if (window.BT_BCAPI) {
			new Notice("start rename BCNoteTag");
			let _rst = await window.BT_BCAPI.renameBCNoteTag(
				oldSnippet,
				newSnippet
			);
			if (_rst.every((v) => v.done)) rst.push(true);
		}
		new Notice("All renamed!");
		let errors = rst.filter((v) => v !== true);
		if (errors.length == 0) return true;
		return errors;
	}
	static getTagsByLastSnippet(lstSnippet: string, source: string[]) {
		const rst = [];
		for (const t of source) {
			if (t.search(this.getLstSnippetRgx(lstSnippet)) != -1) rst.push(t);
		}
		return rst;
	}
	static getLstSnippetRgx(lstSnippet: string): RegExp {
		// eslint-disable-next-line no-useless-escape
		return new RegExp(`(?<=\/|^)${lstSnippet}(?=$)`);
	}
	async autoRenameAnnotaTag(tag: string, newAnnota: string) {
		for (const t of Tag.getVaultTags(this.plugin)) {
			const rgxStr = `(?<=（)${tag}(?=）)`;
			const rgx = new RegExp(rgxStr, "g");
			const newtag = t.replace(rgx, () => {
				return newAnnota;
			});
			if (newtag == t) continue;
			return await this.autoRenameTag(t, newtag);
		}
	}
	async autoRenameTag(t: string, newtag: string) {
		const promise = this.renameTag(t);
		await this.startrename(newtag);
		console.log("have startrenamed!");
		this.autoRenameRst = true;
		await promise;
		console.log("have endrenamed!");
		return this.autoRenameRst;
	}
	private async startrename(newtag: string) {
		//debugger
		let obj;
		obj = (await pollObj(TagRenameQuery.INPUT)) as HTMLInputElement;
		// console.log(obj);
		if (!obj) throw Error("No Input Interface!");
		obj.value = newtag;
		await this.clickOk();
		obj = await pollObj(TagRenameQuery.TITLE);
		if (obj?.innerText == "WARNING: No Undo!") await this.clickConfirm();
	}
	private async clickConfirm() {
		const obj = (await pollObj(TagRenameQuery.CONFIRM)) as HTMLElement;
		const click = new MouseEvent("click");
		obj.dispatchEvent(click);
	}
	private async clickOk() {
		const obj = (await pollObj(TagRenameQuery.OK)) as HTMLElement;
		const click = new MouseEvent("click");
		obj.dispatchEvent(click);
	}
	/** @param lst 最后一级标签的名字 */
	static getTagsByLastLevel(lst: string, source: string[]) {
		const rst = [];
		for (const t of source) {
			if (Tag.getLstOfTag(t) == lst) rst.push(t);
		}
		return rst;
	}
	static getLstOfTag(tag: string): string {
		if (!tag) return tag;
		return tag
			.split("/")
			.filter((v) => v)
			.slice(-1)[0];
	}
}
