// --- Constants & Config ---
const CONFIG = {
    cols: 6,
    rows: 5,
    orbTypes: 7, // 0:Red, 1:Green, 2:Yellow, 3:Blue, 4:White, 5:Black, 6:Heart
    moveTime: 6000,
    aoeThreshold: 5,
    shopInterval: 5
};

const ELEMENTS = {
    RED: 0, GREEN: 1, YELLOW: 2, BLUE: 3, WHITE: 4, BLACK: 5, HEART: 6
};

const GACHA_CONFIG = {
    PROBABILITY: { 1: 60, 2: 25, 3: 15 },
    COST: 5000,
    BATCH_COST: 5000
};

const RARITY_STATS = (function () {
    const stats = {
        1: { hp: 150, atk: 80 },
        2: { hp: 250, atk: 120 },
        3: { hp: 350, atk: 200 }
    };
    for (let r = 4; r <= 10; r++) {
        stats[r] = {
            hp: stats[3].hp + (r - 3) * 150,
            atk: stats[3].atk + (r - 3) * 50
        };
    }
    return stats;
})();

const ITEMS = {
    'hourglass': { name: '砂時計', price: 3000, desc: '3ターンの間操作時間が2倍になる' },
    'oil': { name: 'オイリーオイル', price: 4000, desc: 'ライフを50％回復する' },
    'red_crystal': { name: '赤の水晶', price: 500, desc: '赤オーラのモンスターのガッツを20回復する', element: ELEMENTS.RED },
    'green_crystal': { name: '緑の水晶', price: 500, desc: '緑オーラのモンスターのガッツを20回復する', element: ELEMENTS.GREEN },
    'yellow_crystal': { name: '黄の水晶', price: 500, desc: '黄オーラのモンスターのガッツを20回復する', element: ELEMENTS.YELLOW },
    'blue_crystal': { name: '青の水晶', price: 500, desc: '青オーラのモンスターのガッツを20回復する', element: ELEMENTS.BLUE },
    'white_crystal': { name: '白の水晶', price: 500, desc: '白オーラのモンスターのガッツを20回復する', element: ELEMENTS.WHITE },
    'black_crystal': { name: '黒の水晶', price: 500, desc: '黒オーラのモンスターのガッツを20回復する', element: ELEMENTS.BLACK }
};

const MONSTER_SKILLS = {
    'ヒノトリ': [
        { name: 'フレイムライン', cost: 25, type: 'damage_row', val: 500, row: 'center', color: ELEMENTS.RED, desc: '敵単体に中ダメージ＋盤面中央横一列を赤ディスクに変換' },
        { name: 'ファイアウェーブ', cost: 43, type: 'convert_dual', color1: ELEMENTS.RED, color2: ELEMENTS.HEART, desc: '全ディスクを赤ディスクと回復ディスクに変換' }
    ],
    'モノリス': [
        { name: '大たおれこみ', cost: 18, type: 'damage_shield', val: 300, shield: 0.5, desc: '敵単体に小ダメージ＋次のターンまでダメージを軽減' },
        { name: 'オーロラゲート', cost: 34, type: 'damage_convert', val: 1000, from: ELEMENTS.WHITE, to: ELEMENTS.BLACK, desc: '敵全体に大ダメージ＋白ディスクを黒ディスクに変換' }
    ],
    'プラント': [
        { name: 'ミツ', cost: 26, type: 'delay', delay: 1, desc: '敵1体の行動を1ターン遅らせる' },
        { name: 'フラワービーム', cost: 42, type: 'damage_spawn', val: 800, spawnColor: ELEMENTS.GREEN, spawnCount: 8, target: 'all', desc: '敵全体に大ダメージ＋緑ディスクを8個生成' }
    ],
    'ウンディーネ': [
        { name: 'アクアウェイブ', cost: 19, type: 'spawn', spawnColor: ELEMENTS.BLUE, spawnCount: 6, desc: '青ディスクを6個生成' },
        { name: 'クリスタルアロー', cost: 37, type: 'damage_col_convert', val: 800, target: 'all', color: ELEMENTS.BLUE, desc: '敵全体に大ダメージ＋左右の端の列を青ディスクに変換' }
    ],
    'スエゾー': [
        { name: 'なめる', cost: 22, type: 'damage_delay', val: 300, delay: 1, desc: '敵1体に小ダメージ＋1ターン遅延' },
        { name: 'ベロビンタ', cost: 35, type: 'damage_delay', val: 600, delay: 1, desc: '中ダメージ＋1ターン遅延' }
    ],
    'ガリ': [
        { name: 'ナックル', cost: 18, type: 'damage_spawn', val: 300, spawnColor: ELEMENTS.WHITE, spawnCount: 1, desc: '敵単体に小ダメージ＋白ディスクを1個生成' },
        { name: 'ゴッドライジング', cost: 40, type: 'variable_damage_ensure', val: 250, desc: '盤面の色の数に応じて大ダメージ＋全色3つ以上になるように生成' }
    ]
};

const MONSTER_SPECIES = [
    'アローヘッド', 'アーク', 'イルミネ', 'ウンディーネ',
    'カワズモー', 'ガリ', 'キジン', 'キュービ', 'グジラ',
    'ケンタウロス', 'ゲル', 'ゴースト', 'ゴーレム', 'シンリュウ', 'ジョーカー',
    'スエゾー', 'ディノ', 'デュラハン', 'ドラゴン', 'ナーガ', 'ニャー',
    'ネンドロ', 'ハム', 'ヒノトリ', 'ピクシー', 'プラント', 'ヘンガー',
    'メタルナー', 'モッチー', 'モノリス', 'ユグドラシル', 'ライガー', 'ワーム'
];

const ENEMY_IMAGES = MONSTER_SPECIES.map(name => name + '.png');

const MONSTER_AURAS = {
    'アーク': '青', 'アローヘッド': '赤', 'イルミネ': '黒', 'ウンディーネ': '青',
    'ガリ': '白', 'カワズモー': '緑', 'キジン': '黄色', 'キュービ': '白',
    'グジラ': '青', 'ゲル': '青', 'ケンタウロス': '緑', 'ゴースト': '黄色',
    'ゴーレム': '黒', 'ジョーカー': '黒', 'シンリュウ': '青', 'スエゾー': '黄色',
    'ディノ': '緑', 'デュラハン': '白', 'ドラゴン': '赤', 'ナーガ': '黒',
    'ニャー': '白', 'ネンドロ': '黄色', 'ハム': '黄色', 'ピクシー': '赤',
    'ヒノトリ': '赤', 'プラント': '緑', 'ヘンガー': '黄色', 'メタルナー': '白',
    'モッチー': '赤', 'モノリス': '黒', 'ユグドラシル': '緑', 'ライガー': '青',
    'ワーム': '黄色'
};

const AURA_TO_ELEMENT = {
    '赤': ELEMENTS.RED, '緑': ELEMENTS.GREEN, '青': ELEMENTS.BLUE,
    '黄色': ELEMENTS.YELLOW, '白': ELEMENTS.WHITE, '黒': ELEMENTS.BLACK
};

const BACKGROUND_IMAGES = [
    'bg_coast.png', 'bg_forest.png', 'bg_desert.png', 'bg_volcano.png', 'bg_snow.png'
];

const AURA_COLORS = {
    '青': '#4444ff', '赤': '#ff4444', '黒': '#333333',
    '白': '#ffffff', '緑': '#44ff44', '黄色': '#ffff44'
};
