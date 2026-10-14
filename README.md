# @saco/rpx-plugin

将样式中的小写 `px` 转换为 `rpx`。样式块由 PostCSS 插件处理，模板中的 `style` 由 Vite 插件处理。

## 安装

Node.js `>=20`。

```bash
npm install @saco/rpx-plugin
```

```bash
pnpm add @saco/rpx-plugin
```

## 配置

设计稿宽度读取项目 `package.json` 的 `rpx-plugin.designWidth`。未配置时默认为 `375`，此时 `24px` 转换为 `48rpx`。`rpx` 的基准为 `750`，不随该项改变。

PostCSS 插件与 Vite 插件读取同一份配置。

```json
{
	"rpx-plugin": {
		"designWidth": 750
	}
}
```

`designWidth` 为 `750` 时，`1px` 等于 `1rpx`。

## PostCSS

### `pxToRpx(options?)`

返回一个 PostCSS 插件，加入项目自身的 `plugins`。可与其他插件并列。插件从配置文件所在目录定位 `package.json`。

`options.designWidth` 为可选项。传入后不再读取 `package.json`。PostCSS 与 Vite 应使用同一宽度。

```js
const { pxToRpx } = require('@saco/rpx-plugin')

module.exports = {
	plugins: [pxToRpx()],
}
```

声明值与媒体查询中的长度按同一比例换算。

## Vite

### `pxToRpxTemplate(options?)`

返回一个 Vite 插件。模板中的 `style` 与 `:style` 不经过 PostCSS，由该插件转换。设计稿宽度取自 Vite 项目根目录的 `package.json`，字段与 PostCSS 插件相同。

仅处理 `<template>` 内的 `style` 与 `:style`。`<style>` 块由 PostCSS 插件处理，以避免重复转换。

`options.designWidth` 的含义与 `pxToRpx` 相同。

```js
import { defineConfig } from 'vite'
import { pxToRpxTemplate } from '@saco/rpx-plugin'

export default defineConfig({
	plugins: [pxToRpxTemplate()],
})
```

## 转换规则

| 输入 | 输出 |
| --- | --- |
| `24px`（设计稿宽度 `375`） | `48rpx` |
| `0px` | `0` |
| `1Px`、`1PX` | 保持原样，表示物理像素 |
| `url(icon.px.png)` | 保持原样 |
| `content: "12px"` | 保持原样。引号内按文本处理 |
| 模板属性 `style="width: 12px"` | 转换为 `rpx`。引号内按样式处理 |

## 其他导出

```js
const {
	pxToRpx,
	pxToRpxTemplate,
	convertLengthPx,
	DESIGN_WIDTH,
	RPX_BASE,
} = require('@saco/rpx-plugin')
```

### `convertLengthPx(value, designWidth?, inStyleAttr?)`

转换一段样式字符串。未传入 `designWidth` 时使用 `375`，不读取 `package.json`。`inStyleAttr` 为 `true` 时，引号内的 `px` 一并转换，用于模板属性值。

`DESIGN_WIDTH` 为 `375`。`RPX_BASE` 为 `750`。
