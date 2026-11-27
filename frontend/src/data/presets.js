export const CUSTOM_CHIPS_KEY = 'comfy_studio_custom_chips_v1';
export const ACTIVE_BATCH_KEY = 'comfy_studio_active_batch_v1';

export const HOME_STYLE_OPTIONS = [
  {
    id: 'watercolor_book',
    label: '温暖水彩绘本（纯画风）',
    prefix:
      "Soft watercolor children's picture book illustration, hand-painted paper texture, warm pastel colors, gentle lighting, no text",
  },
  {
    id: 'flat_vector',
    label: '扁平绘本插画（纯画风）',
    prefix:
      "Flat vector children's book illustration style, clean simple shapes, warm amber and soft teal palette, no text",
  },
  {
    id: 'ghibli_anime',
    label: '治愈日系动画（纯画风）',
    prefix:
      'Anime background art style, hand-painted cel shading, lush natural scenery, warm golden hour sunlight, nostalgic healing atmosphere, no text',
  },
  {
    id: 'crayon_storybook',
    label: '蜡笔童话质感（纯画风）',
    prefix:
      'Crayon and colored pencil texture illustration, whimsical storybook art, soft cream background, cozy organic lines, no text',
  },
  {
    id: 'editorial_science',
    label: '科普扁平矢量（纯画风）',
    prefix:
      'Modern flat vector editorial illustration, clean geometric shapes, rich deep navy and vibrant coral color palette, soft gradients, educational infographic art style, no text',
  },
];

export const STYLE_CHIPS = [
  {
    id: 'flat_cat',
    label: '扁平绘本 · 橘猫',
    prefix:
      "Flat vector illustration, children's book illustration style, clean simple shapes, warm amber and soft teal palette, no text. A ginger tabby cat with a white chest and green eyes",
  },
  {
    id: 'watercolor_shiba',
    label: '水彩绘本 · 柴犬',
    prefix:
      "Soft watercolor children's picture book illustration, hand-painted paper texture, warm pastel colors, gentle lighting, no text. A chubby Shiba Inu puppy wearing a red scarf",
  },
  {
    id: 'ghibli_girl',
    label: '治愈动画 · 小女孩',
    prefix:
      'Anime background art style, hand-painted cel shading, lush natural scenery, warm golden hour sunlight, nostalgic healing atmosphere, no text. A 6-year-old girl with short brown bob hair and a yellow sundress',
  },
  {
    id: 'crayon_bunny',
    label: '蜡笔童话 · 小兔子',
    prefix:
      'Crayon and colored pencil texture illustration, whimsical storybook art, soft cream background, cozy organic lines, no text. A little white bunny with long floppy ears and a blue knitted sweater',
  },
  {
    id: 'editorial_science',
    label: '科普扁平矢量',
    prefix:
      'Modern flat vector editorial illustration, clean geometric shapes, rich deep navy and vibrant coral color palette, soft gradients, educational infographic art style, no text.',
  },
];

export const DEFAULT_NEGATIVE_PROMPT =
  'photorealistic, 3d render, blurry, low quality, distorted anatomy, deformed hands, extra limbs, text, watermark, signature, letters';

export const IDEA_SUGGESTIONS = [
  '一只怕黑的小橘猫，在夏夜跟着萤火虫学会了勇敢',
  '一颗小水滴从大海出发，变成云朵和春雨回到麦田的旅行',
  '小机器人修理森林里的旧时钟，帮动物们找回春天',
  '为什么天空是蓝色的，日落时却变成温柔的橘红色（儿童科普）',
];

export const MIN_SHOT_COUNT = 2;
export const MAX_SHOT_COUNT = 30;
export const MIN_TARGET_DURATION = 10;
export const MAX_TARGET_DURATION = 300;

export const SHOT_COUNT_OPTIONS = [
  { value: 4, label: '4 镜' },
  { value: 6, label: '6 镜' },
  { value: 8, label: '8 镜' },
  { value: 12, label: '12 镜' },
];

export const TARGET_DURATION_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 分钟' },
  { value: 300, label: '5 分钟' },
];

export const ASPECT_RATIOS = [
  { value: '1344x768', shortLabel: '16:9', hint: '1344×768', width: 1344, height: 768 },
  { value: '768x1344', shortLabel: '9:16', hint: '768×1344', width: 768, height: 1344 },
  { value: '1024x1024', shortLabel: '1:1', hint: '1024×1024', width: 1024, height: 1024 },
  { value: '1152x896', shortLabel: '4:3', hint: '1152×896', width: 1152, height: 896 },
  { value: '896x1152', shortLabel: '3:4', hint: '896×1152', width: 896, height: 1152 },
];

export const MOTION_OPTIONS = [
  { value: 'zoom_in', label: '缓慢放大', sub: 'Zoom-in', icon: 'ZoomIn' },
  { value: 'zoom_out', label: '缓慢缩小', sub: 'Zoom-out', icon: 'ZoomOut' },
  { value: 'pan_right', label: '向右平移', sub: 'Pan Right', icon: 'MoveRight' },
  { value: 'pan_left', label: '向左平移', sub: 'Pan Left', icon: 'MoveLeft' },
  { value: 'static', label: '固定机位', sub: 'Static', icon: 'Pause' },
];

export const DURATION_OPTIONS = [
  { value: 3, label: '3s' },
  { value: 4, label: '4s' },
  { value: 5, label: '5s' },
  { value: 8, label: '8s' },
  { value: 10, label: '10s' },
  { value: 12, label: '12s' },
];

export const NARRATION_STYLES = [
  { value: '绘本故事', label: '绘本故事', badge: '温暖口语' },
  { value: '科普解说', label: '科普解说', badge: '清晰干练' },
  { value: '电影旁白', label: '电影旁白', badge: '克制抒情' },
  { value: '幽默吐槽', label: '轻松日常', badge: '活泼俏皮' },
];

export const TRANSITION_OPTIONS = [
  { value: 'fade', label: '淡入淡出', badge: 'Fade' },
  { value: 'dissolve', label: '交叉溶解', badge: 'Dissolve' },
  { value: 'wipeleft', label: '平滑擦除', badge: 'Wipe' },
  { value: 'none', label: '直接硬切', badge: 'Cut' },
];

export const DEFAULT_TTS_VOICES = [
  { value: 'Cherry', label: 'Cherry · 阳光女声', badge: '百炼' },
  { value: 'Serena', label: 'Serena · 温柔女声', badge: '百炼' },
  { value: 'Ethan', label: 'Ethan · 温暖男声', badge: '百炼' },
  { value: 'Chelsie', label: 'Chelsie · 灵动女声', badge: '百炼' },
];

export const MOTION_CYCLE = ['zoom_in', 'pan_right', 'zoom_out', 'pan_left'];
