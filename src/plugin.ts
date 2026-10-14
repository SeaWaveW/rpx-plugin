import path from 'node:path'

import { callerDir, resolveDesignWidth } from './config'
import { convertLengthPx, type PxToRpxOptions } from './convert'

interface Decl {
	value: string
}

interface AtRule {
	params: string
}

interface Root {
	/** 当前这份样式的路径。配置文件旁边没有 package.json 时，再从这里往上找 */
	source?: { input?: { file?: string } }
	walkDecls(callback: (decl: Decl) => void): void
	walkAtRules(callback: (atRule: AtRule) => void): void
}

/** PostCSS 插件实例。宿主已经加载 PostCSS，这里不依赖 postcss 包 */
export interface PxToRpxPlugin {
	postcssPlugin: 'px-to-rpx'
	Once(root: Root): void
}

export interface PxToRpxCreator {
	(options?: PxToRpxOptions): PxToRpxPlugin
	/**
	 * PostCSS 靠这个标记把函数当成插件工厂。
	 * 漏了会把函数本身塞进插件列表，样式不会被换。
	 */
	postcss: true
}

/**
 * 样式块和 @import 进来的 scss，sass 编完后再换。
 * 只换小写 px。写成 1Px / 1PX 表示这是物理像素，不跟屏幕宽度走。
 */
export const pxToRpx: PxToRpxCreator = (options) => {
	// 调用发生在 postcss.config.js 里。记下它所在目录，就不用再传 __dirname
	const configDir = callerDir()
	return {
		postcssPlugin: 'px-to-rpx',
		Once(root) {
			const file = root.source?.input?.file
			// 和模板插件读同一份 package.json。这里每份样式算一次，改了稿宽下一份就能跟上
			const designWidth = resolveDesignWidth(options, [
				configDir,
				file ? path.dirname(file) : undefined,
			])
			root.walkDecls((decl) => {
				decl.value = convertLengthPx(decl.value, designWidth)
			})
			// 媒体查询里的宽度也是设计稿尺寸，和声明用同一套比例
			root.walkAtRules((atRule) => {
				if (atRule.params) {
					atRule.params = convertLengthPx(atRule.params, designWidth)
				}
			})
		},
	}
}

pxToRpx.postcss = true
