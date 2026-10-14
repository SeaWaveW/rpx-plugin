/**
 * 没有读到项目配置时的设计稿宽度。
 * 375 宽的稿：24px → 48rpx，375 宽的屏幕上仍是 24px。
 * 稿不是 375 时写在项目 package.json 的 rpx-plugin.designWidth，不要改这个常量。
 */
export const DESIGN_WIDTH = 375

/**
 * rpx 规定全屏是 750 份，和设计稿宽、屏幕实际宽度都无关。
 * 不读配置。要改的是设计稿宽度，不是这个基准。
 */
export const RPX_BASE = 750

export interface PxToRpxOptions {
	/**
	 * 设计稿宽度。传了就用这个数，不再读 package.json。
	 * Vite 和 PostCSS 各传一次会对不上，稿宽写在项目 package.json 的 rpx-plugin.designWidth。
	 */
	designWidth?: number
}

/**
 * 只换小写 px。1Px / 1PX 是物理像素，不跟屏幕宽度走。
 * url() 和引号里的文字不动，避免把文件名、content 里的 px 换掉。
 */
const lengthPx =
	/url\([^)]*\)|"[^"]*"|'[^']*'|(?<![A-Za-z])(-?(?:\d+\.\d+|\d+|\.\d+))px\b/g

/** 模板属性值本身就是一段样式，引号里的 px 也要换 */
const lengthPxInStyleAttr =
	/url\([^)]*\)|(?<![A-Za-z])(-?(?:\d+\.\d+|\d+|\.\d+))px\b/g

/** 去掉二进制浮点尾巴，保留四位小数里的有效数字 */
const formatRpx = (value: number) => {
	const rounded = Math.round(value * 10000) / 10000
	return String(rounded)
}

/**
 * 把一段样式里的 px 换成 rpx。
 * @param value 声明值、媒体查询参数，或模板 style 属性的值
 * @param designWidth 设计稿宽度。不传用 {@link DESIGN_WIDTH}，不读 package.json。插件会先读配置再把宽度传进来
 * @param inStyleAttr 模板 style 属性里，引号包的是样式不是文案
 */
export const convertLengthPx = (
	value: string,
	designWidth: number = DESIGN_WIDTH,
	inStyleAttr = false,
) => {
	if (!value.includes('px')) return value
	const ratio = RPX_BASE / designWidth
	const pattern = inStyleAttr ? lengthPxInStyleAttr : lengthPx
	// 全局正则的 lastIndex 会留到下一次。上次中途停过就会从中间开始，漏掉前面的 px
	pattern.lastIndex = 0
	return value.replace(pattern, (match, num: string | undefined) => {
		// 情况1：url() 或引号，没有数字捕获
		if (num == null) return match
		const px = Number(num)
		// 情况2：0 不带单位，避免写出 0rpx
		if (px === 0) return '0'
		return `${formatRpx(px * ratio)}rpx`
	})
}
