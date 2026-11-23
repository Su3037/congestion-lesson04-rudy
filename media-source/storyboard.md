# Storyboard · 分镜

Four films, each in a Chinese and an English version, 1920×1080, 30 fps. Times come from
`site/data/films/<id>.clock.<lang>.json` (built by `scripts/build-films.mjs`). Every frame is `Scene(stateAt(t))`;
boards are drawn by the same `Board()` as the lab. Caption text: `content/films/<id>.json` (source `tools/films_src.py`).

## 科普 · 哪里会堵 · Popular science · Where will it jam?

cut to “We Never (Remix)（若如初见）”, Hi Noise / 秋成; cues start at fixed times in the track. Duration zh 3:09.8, en 3:09.8.

| Ch | Cue | Scene | zh start | en start | Title | First line (zh) |
|---|---|---|---|---|---|---|
| 00 出行 | s01 | city | 0:00.0 | 0:00.0 | 街区 · The blocks | 修路之前，先要猜：哪里会堵？ |
| 00 出行 | s02 | city_box | 0:10.8 | 0:10.8 | 一个矩形 · One rectangle | 把一趟出行，平均摊进它的矩形盖住的街区。 |
| 01 一 · 一个盒子 | s03 | chip_turn | 0:17.4 | 0:17.4 | 芯片上的同一个问题 · The same question on a chip | 芯片布线之前，问的是同一个问题。 |
| 01 一 · 一个盒子 | s04 | title_story | 0:32.0 | 0:32.0 | RUDY · RUDY |  |
| 01 一 · 一个盒子 | s05 | onenet_story | 0:40.6 | 0:40.6 | 一个线网 · One net | 一个线网：宽 7，高 4，HPWL = 11。 |
| 01 一 · 一个盒子 | s06 | deposit_story | 0:49.1 | 0:49.1 | 平均分 · Equal shares | 每格分到 11 ÷ 6。 |
| 02 二 · 叠起来 | s07 | accumulate_story | 0:53.3 | 0:53.3 | 叠起来 · Stacking | 六个线网，一个一个叠上去。 |
| 02 二 · 叠起来 | s08 | capacity_story | 1:03.1 | 1:03.1 | 容量 · Capacity | 每格只能装 2：多出来的就是溢出。 |
| 02 二 · 叠起来 | s09 | final_story | 1:08.2 | 1:08.2 | 展开的摆法 · Spread out | 展开的摆法：总溢出 22。 |
| 03 三 · 两种摆法 | s10 | cluster_story | 1:20.2 | 1:20.2 | 挤到中间 · Into the middle | 全部挤到中间呢？ |
| 03 三 · 两种摆法 | s11 | cluster_hold | 1:37.2 | 1:37.2 | 两种摆法 · Two layouts | 总数变小，热点更尖。 |
| 04 四 · 规则与模型 | s12 | boundary_story | 1:42.5 | 1:42.5 | 压在线上 · On the line | 引脚压在格子的边线上，算哪一格？ |
| 04 四 · 规则与模型 | s13 | modelA_story | 1:59.3 | 1:59.3 | 按面积分 · Shared by area | 工具里的 RUDY，按重叠面积分。 |
| 05 五 · 在芯片上 | s14 | chip_wide | 2:14.2 | 2:14.2 | 在真实芯片上 · On a real chip | 真实芯片有上百万个线网。 |
| 05 五 · 在芯片上 | s15 | end_story | 2:50.6 | 2:50.6 | 去实验台 · To the lab | 去实验台，亲手拖一拖这些引脚。 |

## 精讲 · RUDY 拥塞估计 · Concise · RUDY congestion estimate

narrated (Kokoro-82M: zh zf_039, en af_heart); each cue's clock is set by the measured takes. Duration zh 2:37.2, en 2:32.3.

| Ch | Cue | Scene | zh start | en start | Title | First line (zh) |
|---|---|---|---|---|---|---|
| 01 问题 | k01 | title | 0:00.0 | 0:00.0 | 开场 · Opening | 这一讲用几分钟讲清 RUDY：布线之前，怎样估计哪里会挤。 |
| 01 问题 | k02 | problem | 0:12.3 | 0:11.0 | 为什么要估计 · Why estimate | 老师的例子：12 × 8 的芯片，六个引脚，六个线网。 |
| 02 布线格 | k03 | grid | 0:27.4 | 0:23.9 | 布线格 · Routing tiles | 所以把芯片切成 4 × 2 个布线格，每格宽 3、高 4。 |
| 03 一个线网 | k04 | onenet | 0:43.1 | 0:38.3 | 一个线网 · One net | 先看一个线网 ABCD：包围盒宽 7、高 4，HPWL = 11。 |
| 03 一个线网 | k05 | deposit | 1:02.8 | 1:00.0 | 平均分配 · Equal shares | RUDY 把 11 平均分给这 6 格：每格加 11/6。 |
| 04 需求图 | k06 | accumulate | 1:18.7 | 1:14.6 | 叠成需求图 · Building the map | 六个线网依次加进来：AB、CD、AC、BD、ABCD、EF。 |
| 05 容量与溢出 | k07 | capacity | 1:38.1 | 1:32.7 | 容量与溢出 · Capacity and overflow | 和容量 2 比：需求 ÷ 容量是比值，超出的部分叫溢出。 |
| 06 写成代码 | k08 | pseudocode | 1:56.3 | 1:51.5 | 伪代码 · Pseudocode | 写成代码，先检查输入：网格、容量、引脚都要合法。 |
| 06 写成代码 | k09 | takeaway | 2:17.0 | 2:12.1 | 小结 · Summary | 记住：一个线网，一个盒子，盒子里的格子平分它的线长。 |

## 进阶 · RUDY 的边界 · Advanced · The limits of RUDY

silent reading film with the original score; captions timed by reading speed. Duration zh 2:23.5, en 2:23.5.

| Ch | Cue | Scene | zh start | en start | Title | First line (zh) |
|---|---|---|---|---|---|---|
| 01 边界规则 | a01 | title | 0:00.0 | 0:00.0 | 进阶：RUDY 的边界 · Advanced: the limits of RUDY | 精讲片给出了算法。这一片问：边界在哪里？ |
| 01 边界规则 | a02 | edge_move | 0:11.0 | 0:11.0 | 压线的点 · A point on the edge | Q 从 x = 2.5 移到 x = 3：线长从 1.5 变成 2。 |
| 01 边界规则 | a03 | boundary_teacher | 0:27.8 | 0:27.8 | 老师例子里的边界 · The edge in the teacher's example | 把 A 从 x = 1 移到 x = 3：AC 选中的格从 2 个变成 4 个。 |
| 02 比较两种摆法 | a04 | compare | 0:39.2 | 0:39.2 | 展开与聚集 · Spread and cluster | 同一把色尺，比较老师的两种摆法。 |
| 02 比较两种摆法 | a05 | capacity_change | 0:55.5 | 0:55.5 | 改变容量 · Changing capacity | 容量从 2 改成 1：需求图一个数都不变。 |
| 03 按面积的 RUDY | a06 | modelA | 1:07.0 | 1:07.0 | 模型 A：按面积 · Model A: by area | 模型 A 按盒子与格子的重叠面积分配，DREAMPlace 与 OpenROAD 都这样算。 |
| 03 按面积的 RUDY | a07 | flip | 1:30.1 | 1:30.1 | 排序反过来 · The ranking flips | 用模型 A，展开的最大溢出是 5.54，超过聚集的 5。 |
| 04 局限 | a08 | limits | 1:43.4 | 1:43.4 | 它不能告诉你什么 · What it cannot tell you | RUDY 是布线之前的估计，不是布线结果。 |
| 04 局限 | a09 | takeaway | 2:02.8 | 2:02.8 | 小结 · Summary | 一个线网，一个盒子；格子平分 HPWL，需求总和等于 HPWL 总和。 |

## 实验演示 · RUDY 实验台 · Lab walkthrough · The RUDY lab

narrated (Kokoro-82M: zh zf_039, en af_heart); each cue's clock is set by the measured takes. Duration zh 1:06.8, en 1:01.6.

| Ch | Cue | Scene | zh start | en start | Title | First line (zh) |
|---|---|---|---|---|---|---|
| 01 实验台 | w01 | walk | 0:00.0 | 0:00.0 | 打开实验台 · Open the lab | 这是实验台。打开时载入老师的展开布局：需求图，容量 2。 |
| 01 实验台 | w02 | walk | 0:07.5 | 0:07.8 | 选择线网 · Pick a net | 点一个线网，它的包围盒和选中的格子会高亮，每格加多少也写在格子里。 |
| 02 改变布局 | w03 | walk | 0:15.9 | 0:14.6 | 拖动引脚 · Drag a pin | 直接拖动引脚。把 A 拖到 x = 3，整张图当场重算。 |
| 02 改变布局 | w04 | walk | 0:22.4 | 0:21.4 | 键盘 · Keyboard | 也可以用键盘：选中引脚后按方向键；撤销随时退回上一步。 |
| 02 改变布局 | w05 | walk | 0:29.6 | 0:28.5 | 逐个加入线网 · Add nets one by one | “逐个加入线网”一次加一个，看需求怎样累加。 |
| 02 改变布局 | w06 | walk | 0:35.5 | 0:33.3 | 容量与图层 · Capacity and layers | 切换图层看比值和溢出；改容量，需求不变，溢出跟着变。 |
| 03 从影片进入 | w07 | walk | 0:42.2 | 0:41.0 | 试试这一帧 · Try this frame | 看片时随时按“在实验台中打开此帧”，实验台会接过画面上的真实坐标。 |
| 04 挑战与 Python | w08 | walk | 0:50.9 | 0:47.5 | 挑战 · Challenges | 挑战检查你在实验台里的真实布局，不同的正确摆法都能通过。 |
| 04 挑战与 Python | w09 | walk | 0:58.6 | 0:53.6 | Python 练习 · Python practice | 最后下载 Python 练习包，补全函数，用检查脚本验证。 |
