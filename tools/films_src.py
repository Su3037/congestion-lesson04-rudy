"""Source of content/films/*.json (kept as Python for readable bilingual lines). Run: python3 tools/films_src.py"""
import json
from pathlib import Path

def L(zh, en, hold=None, sz=None, se=None):
    d = {"zh": zh, "en": en}
    if hold is not None: d["hold"] = hold
    if sz: d["speak_zh"] = sz
    if se: d["speak_en"] = se
    return d

def C(id, scene, chapter, layout, tzh, ten, lines, at=None):
    d = {"id": id, "scene": scene, "chapter": chapter, "layout": layout, "title": {"zh": tzh, "en": ten}, "lines": lines}
    if at is not None: d["at"] = at
    return d

story = {"id": "story", "kind": "music", "music": "wenever",
 "title": {"zh": "科普 · 哪里会堵", "en": "Popular science · Where will it jam?"},
 "chapters": {"00": {"zh": "出行", "en": "Trips"}, "01": {"zh": "一 · 一个盒子", "en": "I · One box"}, "02": {"zh": "二 · 叠起来", "en": "II · Stacking"},
              "03": {"zh": "三 · 两种摆法", "en": "III · Two layouts"}, "04": {"zh": "四 · 规则与模型", "en": "IV · Rules and models"}, "05": {"zh": "五 · 在芯片上", "en": "V · On a chip"}},
 "cues": [
  C("s01", "city", "00", "wide", "街区", "The blocks", [L("修路之前，先要猜：哪里会堵？", "Before building roads, guess: where will it jam?", 4), L("手里只有每趟出行的起点和终点。", "All we know is where each trip starts and ends.", 3)], 0.0),
  C("s02", "city_box", "00", "wide", "一个矩形", "One rectangle", [L("把一趟出行，平均摊进它的矩形盖住的街区。", "Spread each trip evenly over the blocks its rectangle covers.", 3)], 10.75),
  C("s03", "chip_turn", "01", "board", "芯片上的同一个问题", "The same question on a chip", [L("芯片布线之前，问的是同一个问题。", "Before routing a chip, we ask the same question.", 3), L("引脚是起点和终点，线网是要连起来的一组。", "Pins are the stops; a net is a group to be linked.", 3), L("线还没画，先估计哪里会挤。", "No wires yet; where will they crowd?", 3)], 17.41),
  C("s04", "title_story", "01", "title", "RUDY", "RUDY", [L("", "", 6.0)], 32.03),
  C("s05", "onenet_story", "01", "board", "一个线网", "One net", [L("一个线网：宽 7，高 4，HPWL = 11。", "One net: 7 wide, 4 tall, HPWL = 11.", 2.5), L("它的盒子盖住 6 个格子。", "Its box covers 6 tiles.", 2.5)], 40.6),
  C("s06", "deposit_story", "01", "board", "平均分", "Equal shares", [L("每格分到 11 ÷ 6。", "Each tile gets 11 ÷ 6.", 2.5)], 49.06),
  C("s07", "accumulate_story", "02", "board", "叠起来", "Stacking", [L("六个线网，一个一个叠上去。", "Six nets, stacked one by one.", 5), L("颜色越亮，越挤。", "The brighter, the more crowded.", 2.5), L("", "", 0.5)], 53.3),
  C("s08", "capacity_story", "02", "board", "容量", "Capacity", [L("每格只能装 2：多出来的就是溢出。", "Each tile carries 2; the rest is overflow.", 3)], 63.15),
  C("s09", "final_story", "02", "board", "展开的摆法", "Spread out", [L("展开的摆法：总溢出 22。", "Spread out: total overflow 22.", 2.5), L("最挤的一格，多出 14/3。", "The worst tile is 14/3 over.", 3), L("需求加起来 34，正好是线长总和。", "Demand adds up to 34: the total wirelength.", 3)], 68.2),
  C("s10", "cluster_story", "03", "board", "挤到中间", "Into the middle", [L("全部挤到中间呢？", "Crowd everything into the middle?", 2.5), L("总溢出只剩 5。", "Total overflow drops to 5.", 3), L("可一个格子要装 7。", "But one tile must carry 7.", 3.5)], 80.16),
  C("s11", "cluster_hold", "03", "compare", "两种摆法", "Two layouts", [L("总数变小，热点更尖。", "A smaller total, a sharper hotspot.", 3)], 97.19),
  C("s12", "boundary_story", "04", "board", "压在线上", "On the line", [L("引脚压在格子的边线上，算哪一格？", "A pin sits on a tile edge: which tile?", 3.5), L("向下取整：x = 3 归右边那一格。", "Round down: x = 3 belongs to the tile on the right.", 4.5), L("规则写清楚，数字才能复现。", "Write the rule down, and the numbers repeat.", 3.5)], 102.5),
  C("s13", "modelA_story", "04", "board", "按面积分", "Shared by area", [L("工具里的 RUDY，按重叠面积分。", "Tools share demand by overlap area.", 4), L("这样算，最挤的一格反而是展开：5.54 对 5。", "Then spread has the worse tile: 5.54 vs 5.", 5), L("", "", 0.5)], 119.27),
  C("s14", "chip_wide", "05", "wide", "在真实芯片上", "On a real chip", [L("真实芯片有上百万个线网。", "A real chip has millions of nets.", 2.5), L("布局器每走一步，就把这张图重算一遍。", "A placer redraws this map at every step.", 3.5), L("所以它必须便宜：每个线网只看一个盒子。", "So it must be cheap: one box per net.", 3.5), L("它不布线，不分层，也不看方向。", "It does not route, and ignores layers and direction.", 3.5), L("它只是布线之前的一张天气预报。", "It is a weather forecast before routing.", 4), L("真正布线之后，热点还在那里吗？", "After real routing, will the hotspots still be there?", 4)], 134.16),
  C("s15", "end_story", "05", "title", "去实验台", "To the lab", [L("去实验台，亲手拖一拖这些引脚。", "Go to the lab and drag these pins yourself.", 3.5), L("音乐：We Never (Remix)（若如初见）· Hi Noise / 秋成", "Music: We Never (Remix) · Hi Noise / Qiucheng", 4)], 170.6),
 ]}

HZ = "半周长线长"
concise = {"id": "concise", "kind": "voice",
 "title": {"zh": "精讲 · RUDY 拥塞估计", "en": "Concise · RUDY congestion estimate"},
 "chapters": {"01": {"zh": "问题", "en": "The problem"}, "02": {"zh": "布线格", "en": "Routing tiles"}, "03": {"zh": "一个线网", "en": "One net"}, "04": {"zh": "需求图", "en": "The demand map"}, "05": {"zh": "容量与溢出", "en": "Capacity and overflow"}, "06": {"zh": "写成代码", "en": "In code"}},
 "cues": [
  C("k01", "title", "01", "title", "开场", "Opening", [
    L("这一讲用几分钟讲清 RUDY：布线之前，怎样估计哪里会挤。", "In a few minutes: RUDY, a way to estimate where wires will crowd before routing.", 3, "这一讲用几分钟，讲清鲁迪：布线之前，怎样估计哪里会挤。", "In a few minutes: Rudy, a way to estimate where wires will crowd, before routing."),
    L("RUDY 是“矩形均匀布线密度”的英文缩写。", "RUDY stands for Rectangular Uniform wire DensitY.", 3, "鲁迪，是矩形均匀布线密度的英文缩写。", "Rudy stands for rectangular uniform wire density.")]),
  C("k02", "problem", "01", "board", "为什么要估计", "Why estimate", [
    L("老师的例子：12 × 8 的芯片，六个引脚，六个线网。", "The teacher's example: a 12 by 8 chip, six pins, six nets.", 3, "老师的例子：12 乘 8 的芯片，六个引脚，六个线网。"),
    L("六个线网的 HPWL 加起来是 34。", "The six nets' HPWL adds up to 34.", 2.5, f"六个线网的{HZ}，加起来是 34。", "The six nets' H P W L adds up to thirty-four."),
    L("可这个总数说不出：线会挤在哪里。", "But a total cannot say where the wires will crowd.", 2.5)]),
  C("k03", "grid", "02", "board", "布线格", "Routing tiles", [
    L("所以把芯片切成 4 × 2 个布线格，每格宽 3、高 4。", "So cut the chip into 4 by 2 routing tiles, each 3 wide and 4 tall.", 3, "所以把芯片切成 4 乘 2 个布线格，每格宽 3、高 4。"),
    L("需求存成 demand[x][y]：先列，后行。", "Demand is stored as demand[x][y]: column first, then row.", 3, "需求按先列、后行的顺序存，写成 demand x y。", "Demand is stored as demand x, y: column first, then row."),
    L("每格能承受的布线量叫容量，这里是 2。", "What a tile can carry is its capacity; here it is 2.", 2.5)]),
  C("k04", "onenet", "03", "board", "一个线网", "One net", [
    L("先看一个线网 ABCD：包围盒宽 7、高 4，HPWL = 11。", "Take one net, ABCD: its box is 7 wide and 4 tall, so HPWL = 11.", 3.5, f"先看一个线网，A B C D。它的包围盒宽 7、高 4，{HZ}等于 11。", "Take one net, A B C D. Its box is seven wide and four tall, so H P W L is eleven."),
    L("左下角 (1, 1) 落在格 (0, 0)，右上角 (8, 5) 落在格 (2, 1)。", "The lower-left corner (1, 1) is in tile (0, 0); the upper-right (8, 5) is in tile (2, 1).", 4, "左下角 1、1，落在格子 0、0；右上角 8、5，落在格子 2、1。", "The lower-left corner, one, one, is in tile zero, zero. The upper-right corner, eight, five, is in tile two, one."),
    L("两角之间的格子全部选中：3 × 2 = 6 格。", "Every tile between the two corners is selected: 3 by 2, six tiles.", 4, "两角之间的格子全部选中：3 乘 2，一共 6 格。")]),
  C("k05", "deposit", "03", "board", "平均分配", "Equal shares", [
    L("RUDY 把 11 平均分给这 6 格：每格加 11/6。", "RUDY shares the 11 equally: each tile gets 11/6.", 3.5, "鲁迪把 11 平均分给这 6 格，每格加六分之十一。", "Rudy shares the eleven equally: each tile gets eleven sixths."),
    L("格子的下标先向下取整，再夹到网格里面。", "Tile indices are rounded down, then clamped into the grid.", 3),
    L("所以压在 x = 3 边线上的点，归右边一格。", "So a point exactly on x = 3 belongs to the tile on its right.", 3.5, "所以压在 x 等于 3 这条边线上的点，归右边那一格。", "So a point exactly on x equals three belongs to the tile on its right.")]),
  C("k06", "accumulate", "04", "board", "叠成需求图", "Building the map", [
    L("六个线网依次加进来：AB、CD、AC、BD、ABCD、EF。", "Add the six nets in turn: AB, CD, AC, BD, ABCD, EF.", 8, "六个线网依次加进来：A B，C D，A C，B D，A B C D，E F。", "Add the six nets in turn: A B, C D, A C, B D, A B C D, and E F."),
    L("最后一个加完之前，看到的只是部分累加。", "Until the last one is in, the map is only a partial sum.", 2.5),
    L("八格加起来是 34，正好等于 HPWL 总和。", "The eight tiles add up to 34, exactly the total HPWL.", 3, f"八个格子加起来是 34，正好等于{HZ}的总和。", "The eight tiles add up to thirty-four, exactly the total H P W L.")]),
  C("k07", "capacity", "05", "board", "容量与溢出", "Capacity and overflow", [
    L("和容量 2 比：需求 ÷ 容量是比值，超出的部分叫溢出。", "Against capacity 2: demand over capacity is the ratio, and the excess is overflow.", 3.5, "和容量 2 比：需求除以容量是比值，超出的部分叫溢出。"),
    L("六格溢出，总溢出 22，最挤的一格多出 14/3。", "Six tiles overflow: 22 in total, the worst one 14/3 over.", 3.5, "六个格子溢出，总溢出 22，最挤的一格多出三分之十四。", "Six tiles overflow, twenty-two in total; the worst one is fourteen thirds over."),
    L("把容量改成 1，需求一个数都不变，总溢出变成 28。", "Set capacity to 1: no demand changes, but total overflow becomes 28.", 3.5)]),
  C("k08", "pseudocode", "06", "code", "伪代码", "Pseudocode", [
    L("写成代码，先检查输入：网格、容量、引脚都要合法。", "In code, validate first: the grid, the capacity and the pins must all be valid.", 3),
    L("然后对每个线网求盒子和两角所在的格，把 HPWL 平均加进中间每一格。", "Then for each net, find its box and its corner tiles, and add HPWL equally to every tile between.", 6, f"然后对每个线网，求包围盒和两角所在的格子，把{HZ}平均加进中间的每一格。", "Then for each net, find its box and its corner tiles, and add H P W L equally to every tile between."),
    L("最后用容量读出比值和溢出；容量不会改变需求。", "Finally read ratio and overflow against capacity; capacity never changes demand.", 3)]),
  C("k09", "takeaway", "06", "summary", "小结", "Summary", [
    L("记住：一个线网，一个盒子，盒子里的格子平分它的线长。", "Remember: one net, one box, and the box's tiles share its length equally.", 3),
    L("需求守恒：图的总和等于 HPWL 总和；溢出要看容量。", "Demand is conserved: the map sums to total HPWL; overflow depends on capacity.", 3, f"需求守恒：图的总和等于{HZ}的总和；溢出要看容量。", "Demand is conserved: the map sums to the total H P W L, and overflow depends on capacity."),
    L("进阶片讲按面积分的 RUDY，以及结论为什么会反过来。", "The advanced film covers area-weighted RUDY, and why conclusions can flip.", 3, "进阶片讲按面积分的鲁迪，以及结论为什么会反过来。", "The advanced film covers area-weighted Rudy, and why conclusions can flip.")]),
 ]}

advanced = {"id": "advanced", "kind": "reading",
 "title": {"zh": "进阶 · RUDY 的边界", "en": "Advanced · The limits of RUDY"},
 "chapters": {"01": {"zh": "边界规则", "en": "The boundary rule"}, "02": {"zh": "比较两种摆法", "en": "Comparing layouts"}, "03": {"zh": "按面积的 RUDY", "en": "Area-weighted RUDY"}, "04": {"zh": "局限", "en": "Limits"}},
 "cues": [
  C("a01", "title", "01", "title", "进阶：RUDY 的边界", "Advanced: the limits of RUDY", [L("精讲片给出了算法。这一片问：边界在哪里？", "The concise film gave the algorithm. This one asks: where are its limits?", 3), L("每一节都用实际计算回答一个问题。", "Each section answers one question with real computation.", 3)]),
  C("a02", "edge_move", "01", "board", "压线的点", "A point on the edge", [L("Q 从 x = 2.5 移到 x = 3：线长从 1.5 变成 2。", "Move Q from x = 2.5 to x = 3: the length goes from 1.5 to 2.", 4), L("可选中的格从 1 个变成 2 个：每格反而从 3/2 降到 1。", "But the selected tiles go from 1 to 2: each tile drops from 3/2 to 1.", 4), L("x = 12 在芯片右边缘：⌊12 ÷ 3⌋ = 4，被夹回最后一列 3。", "x = 12 is the right chip edge: ⌊12 ÷ 3⌋ = 4, clamped back to the last column, 3.", 4)]),
  C("a03", "boundary_teacher", "01", "board", "老师例子里的边界", "The edge in the teacher's example", [L("把 A 从 x = 1 移到 x = 3：AC 选中的格从 2 个变成 4 个。", "Move A from x = 1 to x = 3: AC now selects 4 tiles instead of 2.", 4), L("最大溢出从 14/3 变成 29/6；需求总和仍是 34。", "Max overflow goes from 14/3 to 29/6; total demand is still 34.", 4)]),
  C("a04", "compare", "02", "compare", "展开与聚集", "Spread and cluster", [L("同一把色尺，比较老师的两种摆法。", "One colour scale for the teacher's two layouts.", 3), L("总溢出 22 对 5；最大溢出 14/3 对 5。", "Total overflow 22 vs 5; max overflow 14/3 vs 5.", 3.5), L("按总量，聚集更好；按最挤一格，展开更好。先说用哪个指标。", "By total, cluster wins; by the worst tile, spread wins. Name the metric first.", 4)]),
  C("a05", "capacity_change", "02", "board", "改变容量", "Changing capacity", [L("容量从 2 改成 1：需求图一个数都不变。", "Capacity from 2 to 1: not one demand number changes.", 4), L("变的只有比值和溢出：总溢出 22 → 28，最大 14/3 → 17/3。", "Only ratio and overflow change: total 22 → 28, max 14/3 → 17/3.", 4)]),
  C("a06", "modelA", "03", "board", "模型 A：按面积", "Model A: by area", [L("模型 A 按盒子与格子的重叠面积分配，DREAMPlace 与 OpenROAD 都这样算。", "Model A shares by the overlap of box and tile, as DREAMPlace and OpenROAD do.", 4), L("ABCD 的盒子面积 28：中间的格分得多，边角的格分得少；总和仍是 34。", "ABCD's box has area 28: middle tiles get more, edge tiles less; the sum is still 34.", 5), L("还能拆成水平与垂直两张图：宽 × 重叠 / 面积，高 × 重叠 / 面积。", "It also splits into horizontal and vertical maps: w × overlap / area and h × overlap / area.", 4)]),
  C("a07", "flip", "03", "compare", "排序反过来", "The ranking flips", [L("用模型 A，展开的最大溢出是 5.54，超过聚集的 5。", "Under model A, the spread's max overflow is 5.54, above the cluster's 5.", 4), L("同样的引脚，换一种 RUDY，排序就反过来。报告时写明模型。", "Same pins, another RUDY, and the ranking flips. Always state the model.", 4)]),
  C("a08", "limits", "04", "wide", "它不能告诉你什么", "What it cannot tell you", [L("RUDY 是布线之前的估计，不是布线结果。", "RUDY is a pre-routing estimate, not a routing result.", 3), L("真实容量分方向、分金属层；多引脚线网实际更长，RISA 会乘系数。", "Real capacity is split by direction and layer; multi-pin nets run longer, and RISA scales them up.", 4), L("它的长处是快：每个线网一个盒子，给布局及时的反馈。", "Its strength is speed: one box per net, quick feedback for placement.", 3)]),
  C("a09", "takeaway", "04", "summary", "小结", "Summary", [L("一个线网，一个盒子；格子平分 HPWL，需求总和等于 HPWL 总和。", "One net, one box; tiles share HPWL equally, and demand sums to total HPWL.", 3), L("边界规则、容量和模型都会改变结论：先写清楚再比较。", "The edge rule, capacity and model all change conclusions: state them before comparing.", 3), L("下面的实验台可以从任意一帧接着操作。", "The lab below can continue from any frame.", 3)]),
 ]}

def W(id, ch, tzh, ten, zh, en, hold, sz=None, se=None):
    return {"id": id, "chapter": ch, "title": {"zh": tzh, "en": ten}, "lines": [L(zh, en, hold, sz, se)], "scene": "walk"}

lab = {"id": "lab", "kind": "voice",
 "title": {"zh": "实验演示 · RUDY 实验台", "en": "Lab walkthrough · The RUDY lab"},
 "chapters": {"01": {"zh": "实验台", "en": "The lab"}, "02": {"zh": "改变布局", "en": "Change the layout"}, "03": {"zh": "从影片进入", "en": "From the film"}, "04": {"zh": "挑战与 Python", "en": "Challenges and Python"}},
 "cues": [
  W("w01", "01", "打开实验台", "Open the lab", "这是实验台。打开时载入老师的展开布局：需求图，容量 2。", "This is the lab. It opens on the teacher's spread layout: a demand map with capacity 2.", 3),
  W("w02", "01", "选择线网", "Pick a net", "点一个线网，它的包围盒和选中的格子会高亮，每格加多少也写在格子里。", "Click a net: its box and selected tiles light up, with each tile's share written inside.", 3),
  W("w03", "02", "拖动引脚", "Drag a pin", "直接拖动引脚。把 A 拖到 x = 3，整张图当场重算。", "Drag a pin. Move A to x = 3 and the whole map is recomputed on the spot.", 4, "直接拖动引脚。把 A 拖到 x 等于 3，整张图当场重算。", "Drag a pin. Move A to x equals three, and the whole map is recomputed on the spot."),
  W("w04", "02", "键盘", "Keyboard", "也可以用键盘：选中引脚后按方向键；撤销随时退回上一步。", "Or use the keyboard: select a pin and press the arrow keys; Undo steps back at any time.", 3.5),
  W("w05", "02", "逐个加入线网", "Add nets one by one", "“逐个加入线网”一次加一个，看需求怎样累加。", "Add nets one by one, and watch the demand accumulate.", 4, "逐个加入线网，一次加一个，看需求怎样累加。"),
  W("w06", "02", "容量与图层", "Capacity and layers", "切换图层看比值和溢出；改容量，需求不变，溢出跟着变。", "Switch layers to see ratio and overflow. Change capacity: demand stays, overflow moves.", 4),
  W("w07", "03", "试试这一帧", "Try this frame", "看片时随时按“在实验台中打开此帧”，实验台会接过画面上的真实坐标。", "While watching, press Try this frame, and the lab takes the frame's actual coordinates.", 4, "看片时随时按，在实验台中打开此帧，实验台会接过画面上的真实坐标。"),
  W("w08", "04", "挑战", "Challenges", "挑战检查你在实验台里的真实布局，不同的正确摆法都能通过。", "Challenges check your actual layout in the lab; any correct arrangement passes.", 4),
  W("w09", "04", "Python 练习", "Python practice", "最后下载 Python 练习包，补全函数，用检查脚本验证。", "Finally, download the Python pack, fill in the functions, and check them with the script.", 3.5),
 ]}

out = Path(__file__).resolve().parents[1] / "content" / "films"
out.mkdir(parents=True, exist_ok=True)
for f in (story, concise, advanced, lab):
    (out / f"{f['id']}.json").write_text(json.dumps(f, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("wrote", [f["id"] for f in (story, concise, advanced, lab)])
