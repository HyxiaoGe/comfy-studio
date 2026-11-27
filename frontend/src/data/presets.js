export const CUSTOM_CHIPS_KEY = 'comfy_studio_custom_chips_v1';
export const ACTIVE_BATCH_KEY = 'comfy_studio_active_batch_v1';

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

export const STORY_PRESETS = [
  {
    id: 'kitchen_cat',
    name: '清晨厨房的猫',
    badge: '6 镜 · 扁平插画',
    prefix:
      "Flat vector illustration, children's book illustration style, clean simple shapes, warm amber and soft teal palette, no text. A ginger tabby cat with a white chest and green eyes",
    negative:
      'photorealistic, 3d render, blurry, low quality, distorted anatomy, text, watermark, deformed paws',
    seed: 42,
    prompts: [
      'sits on a sunny windowsill in a cozy morning kitchen, steam rising from a black kettle on the stove, wooden floor, potted herbs on open shelves, warm golden sunlight streaming through a tall window, dust motes in the sunbeam.',
      'close-up, green eyes watching a floating dust mote, ears perked, whiskers catching the light, warm morning sun on its fur, soft teal shadows in the background.',
      'sits on the windowsill turning its head toward the kitchen counter where a hand pours dark coffee from a glass carafe into a cream ceramic mug, steam rising in a thin ribbon, tail tip flicking.',
      'leaps down from the windowsill, mid-air, tail held high, paws tucked, morning light stripes across the wooden floor below.',
      'low angle at floor level, pads toward the camera across the wooden floor, tail held high, a blue ceramic food bowl waiting ahead, warm sunlight and long soft shadows.',
      'eats from a small blue ceramic bowl, a hand sets down a white plate beside it, morning light across the kitchen, kettle steaming on the stove, cozy and calm.',
    ],
  },
  {
    id: 'shiba_rain',
    name: '雨天散步的柴犬',
    badge: '5 镜 · 温馨水彩',
    prefix:
      "Soft watercolor children's picture book illustration, hand-painted paper texture, warm pastel colors, gentle lighting, no text. A chubby Shiba Inu puppy wearing a yellow raincoat",
    negative:
      'photorealistic, 3d render, blurry, low quality, distorted anatomy, text, watermark, deformed paws',
    seed: 108,
    prompts: [
      'sits by the glass front door looking out at gentle rain falling on a cobblestone street, curious tilted head, soft blue rainy light outside, warm cozy hallway inside.',
      'steps outside onto the wet cobblestone sidewalk, looking up at falling raindrops with ears perked, reflections of warm streetlamps on the wet ground.',
      'splashes joyfully into a shallow rain puddle, tiny water droplets flying in the air, happy wagging curled tail, blooming hydrangeas along a garden fence.',
      'shakes water off its fur under a red striped awning outside a small bakery, warm golden light glowing through the bakery window.',
      'trots happily back home along the wet path as the rain stops and a soft rainbow appears in the clearing pastel sky.',
    ],
  },
  {
    id: 'bunny_stars',
    name: '屋顶看星星的小兔',
    badge: '5 镜 · 蜡笔童话',
    prefix:
      'Crayon and colored pencil texture illustration, whimsical storybook art, soft organic lines, deep indigo and warm starlight palette, no text. A little white bunny with long floppy ears and a blue knitted sweater',
    negative:
      'photorealistic, 3d render, blurry, low quality, distorted anatomy, text, watermark, deformed paws',
    seed: 2026,
    prompts: [
      'climbs up a wooden ladder onto a cozy attic rooftop at dusk, carrying a small brass telescope, first stars twinkling in the twilight sky.',
      'sets up the brass telescope on the flat wooden roof beside a glowing warm lantern, looking excitedly up at a bright crescent moon.',
      'peeks through the brass telescope with one eye closed, surrounded by a dreamy swirl of glowing constellations and floating stardust.',
      'sits on a warm wool blanket on the roof sipping from a tiny red mug, watching a bright shooting star streak across the night sky.',
      'falls asleep curled up beside the lantern and telescope under the starry sky, a soft crescent moon smiling down.',
    ],
  },
  {
    id: 'space_science',
    name: '火箭发射全过程',
    badge: '5 镜 · 矢量科普',
    prefix:
      'Modern flat vector editorial illustration, clean geometric shapes, rich deep navy and vibrant coral color palette, soft gradients, educational science art style, no text.',
    negative:
      'photorealistic, 3d render, blurry, low quality, messy sketch, text, watermark, letters, numbers',
    seed: 42,
    prompts: [
      'A tall white and orange space rocket standing on a launchpad at dawn, gantry towers beside it, venting white vapor clouds, distant mountains and glowing sunrise horizon.',
      'Ignition moment at the launchpad, bright golden and coral exhaust flames roaring downward, massive billowing clouds of white smoke expanding around the base.',
      'The rocket ascending steeply through blue sky into the upper atmosphere, leaving a long bright white contrail curve against the darkening blue stratosphere.',
      'First stage booster separation in high orbit, glowing thrusters firing in the dark starry space, curved blue edge of Earth visible below.',
      'A sleek satellite deploying golden solar panels in quiet deep orbit above the illuminated night-and-day terminator line of Earth.',
    ],
  },
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

export const MOTION_CYCLE = ['zoom_in', 'pan_right', 'zoom_out', 'pan_left'];
