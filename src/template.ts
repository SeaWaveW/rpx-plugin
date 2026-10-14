import path from 'node:path'

import { callerDir, resolveDesignWidth } from './config'
import { convertLengthPx, type PxToRpxOptions } from './convert'

/** Vite 插件实例。不依赖 vite 包，uni() 后面挂上即可 */
export interface PxToRpxTemplatePlugin {
	name: 'px-to-rpx-template'
	enforce: 'pre'
	/** Vite 的 root 就是项目根。用它找 package.json，不依赖进程 cwd */
	configResolved?: (config: { root: string }) => void
	transform(
		code: string,
		id: string,
	): { code: string; map: null } | undefined
}

/**
 * 模板上的 style="24px" 不进 PostCSS。
 * 只改 template，style 块留给 PostCSS 插件，避免换两次。
 */
export const pxToRpxTemplate = (
	options?: PxToRpxOptions,
): PxToRpxTemplatePlugin => {
	// 调用发生在 vite.config.js 里。configResolved 还会再给一次项目根，以那次为准
	const configDir = callerDir()
	// configResolved 比 transform 早。先记住 Vite root，样式文件在子目录时也能找到项目根
	let projectRoot: string | undefined
	return {
		name: 'px-to-rpx-template',
		enforce: 'pre',
		configResolved(config) {
			projectRoot = config.root
		},
		transform(code, id) {
			if (!/\.(uvue|vue)(\?|$)/.test(id) || !code.includes('px')) return
			// 查询串不是路径。去掉再取目录，否则找不到 package.json
			const filePath = id.split('?')[0]
			const designWidth = resolveDesignWidth(options, [
				projectRoot,
				configDir,
				filePath ? path.dirname(filePath) : undefined,
			])
			const next = code.replace(
				/<template(\s[^>]*)?>([\s\S]*?)<\/template>/g,
				(full, attrs: string = '', body: string) => {
					const converted = body.replace(
						/(\s(?::)?style\s*=\s*)(["'])([\s\S]*?)\2/g,
						(attr, prefix: string, quote: string, value: string) =>
							prefix +
							quote +
							convertLengthPx(value, designWidth, true) +
							quote,
					)
					return `<template${attrs}>${converted}</template>`
				},
			)
			if (next === code) return
			return { code: next, map: null }
		},
	}
}
