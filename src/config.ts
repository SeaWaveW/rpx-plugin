import fs from 'node:fs'
import path from 'node:path'

import { DESIGN_WIDTH, type PxToRpxOptions } from './convert'

/**
 * 项目 package.json 里的字段名。
 * Vite 和 PostCSS 都读这一处，稿宽不会各写一个。
 */
const PACKAGE_FIELD = 'rpx-plugin'

/** 本包根目录。调用栈里这个目录下的帧是插件自己，不能拿来当项目根 */
const packageRoot = path.resolve(__dirname, '..')

interface CacheEntry {
	mtimeMs: number
	designWidth: number
}

/** 按 package.json 的路径和修改时间缓存。改稿宽后下一份样式就能读到，不用重启 */
const cache = new Map<string, CacheEntry>()

const assertWidth = (width: unknown, where: string) => {
	if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
		return width
	}
	throw new Error(
		`[rpx-plugin] ${where} 必须是正数，当前是 ${String(width)}`,
	)
}

/**
 * `pxToRpx()` 被调用时所在文件的目录。
 * 一般就是 postcss.config.js 旁边，用来找 package.json，调用方不用传路径。
 */
export const callerDir = () => {
	const stack = new Error().stack ?? ''
	for (const line of stack.split('\n')) {
		const matched =
			line.match(/\((.*):\d+:\d+\)$/) ?? line.match(/at (.*):\d+:\d+$/)
		const file = matched?.[1]
		if (!file) continue
		const resolved = path.resolve(file)
		const insidePackage =
			resolved === packageRoot ||
			resolved.startsWith(packageRoot + path.sep)
		// 情况1：插件自己的文件，继续往外找调用方
		if (insidePackage) continue
		// 情况2：依赖包里的转发，不是使用方的配置文件
		if (resolved.includes(`${path.sep}node_modules${path.sep}`)) continue
		return path.dirname(resolved)
	}
	return undefined
}

/**
 * 从 startDir 往上找项目自己的 package.json。
 * node_modules 里的 package.json 是依赖的，跳过，否则会读成依赖自己的稿宽。
 */
const findProjectPackageJson = (startDir: string) => {
	let dir = path.resolve(startDir)
	const fsRoot = path.parse(dir).root
	while (true) {
		const inNodeModules = dir.split(path.sep).includes('node_modules')
		const file = path.join(dir, 'package.json')
		// 情况1：项目根。有 package.json 就停，再往上会读到别的仓库
		if (!inNodeModules && fs.existsSync(file)) return file
		if (dir === fsRoot) return null
		const parent = path.dirname(dir)
		if (parent === dir) return null
		dir = parent
	}
}

/** 读 rpx-plugin.designWidth。没有这个字段时用 375，不把缺省当成错误 */
const readDesignWidth = (file: string) => {
	const mtimeMs = fs.statSync(file).mtimeMs
	const hit = cache.get(file)
	if (hit && hit.mtimeMs === mtimeMs) return hit.designWidth

	let parsed: unknown
	try {
		parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`[rpx-plugin] 无法读取 ${file}：${message}`)
	}

	let designWidth = DESIGN_WIDTH
	if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
		const section = (parsed as Record<string, unknown>)[PACKAGE_FIELD]
		// 情况1：没写 rpx-plugin，按默认稿宽
		if (section != null) {
			if (typeof section !== 'object' || Array.isArray(section)) {
				throw new Error(
					`[rpx-plugin] ${file} 的 ${PACKAGE_FIELD} 要是对象，例如 { "designWidth": 750 }`,
				)
			}
			const width = (section as { designWidth?: unknown }).designWidth
			// 情况2：写了字段但没写 designWidth，仍按默认稿宽
			if (width != null) {
				designWidth = assertWidth(
					width,
					`${file} 的 ${PACKAGE_FIELD}.designWidth`,
				)
			}
		}
	}

	cache.set(file, { mtimeMs, designWidth })
	return designWidth
}

/**
 * 稿宽。调用方传了 designWidth 就用那个数，不再读 package.json。
 * 否则按 startDirs、当前工作目录的顺序找项目 package.json。
 * 都找不到时用 {@link DESIGN_WIDTH}。
 */
export const resolveDesignWidth = (
	options?: PxToRpxOptions,
	startDirs: Array<string | undefined> = [],
) => {
	// 显式传入只影响这一次调用。Vite 和 PostCSS 各传一个就会不一致
	if (options?.designWidth != null) {
		return assertWidth(options.designWidth, 'designWidth')
	}

	const dirs = [...startDirs, process.cwd()]
	for (const dir of dirs) {
		if (!dir) continue
		const file = findProjectPackageJson(dir)
		// 找到项目就停。没有 rpx-plugin 也是 375，不再往别的目录找
		if (file) return readDesignWidth(file)
	}
	return DESIGN_WIDTH
}
