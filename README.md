WARING! The plugin is still in beta.
---
You should backup your vault before using this plugin !

# 功能介绍视频

【synonym插件功能展示】 https://www.bilibili.com/video/BV1Db421a7sC

# 功能
- 为一篇笔记添加多个同义词组，根据AI从笔记提取出来的关键词，和用户设置的同义词组
  - 打开新文件时自动导入，也可以手动运行导入命令
- 管理同义词组
  - 合并存在交集的多个同义词组为一个
  - 快速集中编辑被分散在多个笔记中的同义词组

# 安装
- 从https://github.com/qql2/synonym/releases 下载全部内容，在`.obsidian/plugin/`下新建一个名为`synonym`的文件夹，并将内容放进去
- 打开obsidian设置，在`社区插件`中启用`synonym`
- 填写相关配置即可

# 使用手册
- 使用obsidian官方的标签作为载体，一个同义词组用一个标签表示
## 1. 同义词组标签语法
### 1.1. 实例
- `#关键字1-关键词2-（注释标签1-注释标签2）关键词3`
- `#aa-bb-（ee-（gg-hh，ii-jj；kk-）ff）cc-dd`
### 1.2. 说明
- 一定要有横杠, 这个标签才会被视为同义词标签
#### 注释标签
- 必须使用中文的圆括号，并紧跟在指定同义词前面
- 用于解释的同义词标签**不能具有层级**
	- 直接用最子标签单独表示即可
- 注释标签可以嵌套使用
- 可以有多个注释标签
- 多个注释标签之间使用逻辑运算符连接
	- `！`等同于js的`!`
	- `，`等同于js的`&&`
	- `；`等同于js的`||`
	- 不区分大小写
	- 可以使用`【】`调整逻辑运算的优先级
## 新建同义词组
- 直接在谋篇笔记中按照同义词组语法，新建一个obsidian标签即可
