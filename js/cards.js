"use strict";

// 正式IDと既存画像を維持。採用済み亜種は4枚目で解放。
window.REWARD_CARDS = Object.freeze([
  {
    "id": "001",
    "name": "ランゾロ",
    "image": "images/recolored/001_ランゾロ.jpg",
    "variantName": "蛍森亜種",
    "variantImage": "images/variants/001_ランゾロ_蛍森亜種.jpg"
  },
  {
    "id": "002",
    "name": "ランデルコ",
    "image": "images/recolored/002_ランデルコ.jpg",
    "variantName": "蛍森亜種",
    "variantImage": "images/variants/002_ランデルコ_蛍森亜種.jpg"
  },
  {
    "id": "003",
    "name": "トウリュウ",
    "image": "images/recolored/003_トウリュウ.jpg",
    "variantName": "蛍森亜種",
    "variantImage": "images/variants/003_トウリュウ_蛍森亜種.jpg"
  },
  {
    "id": "004",
    "name": "ジュエリ",
    "image": "images/recolored/004_ジュエリ.jpg",
    "variantName": "海晶亜種",
    "variantImage": "images/variants/004_ジュエリ_海晶亜種.jpg"
  },
  {
    "id": "005",
    "name": "ギアウル",
    "image": "images/recolored/005_ギアウル.jpg",
    "variantName": "氷結亜種",
    "variantImage": "images/variants/005_ギアウル_氷結亜種.jpg"
  },
  {
    "id": "006",
    "name": "ギアルフ",
    "image": "images/recolored/006_ギアルフ.jpg",
    "variantName": "氷結亜種",
    "variantImage": "images/variants/006_ギアルフ_氷結亜種.jpg"
  },
  {
    "id": "007",
    "name": "カサクラ",
    "image": "images/recolored/007_カサクラ.jpg",
    "variantName": "紅葉亜種",
    "variantImage": "images/variants/007_カサクラ_紅葉亜種.jpg"
  },
  {
    "id": "008",
    "name": "シロカブト",
    "image": "images/recolored/008_シロカブト.jpg",
    "variantName": "黒曜亜種",
    "variantImage": "images/variants/008_シロカブト_黒曜亜種.jpg"
  },
  {
    "id": "009",
    "name": "グランカブト",
    "image": "images/recolored/009_グランカブト.jpg",
    "variantName": "黒曜亜種",
    "variantImage": "images/variants/009_グランカブト_黒曜亜種.jpg"
  },
  {
    "id": "010",
    "name": "モチウサ",
    "image": "images/recolored/010_モチウサ.jpg",
    "variantName": "和菓子亜種",
    "variantImage": "images/variants/010_モチウサ_和菓子亜種.jpg"
  },
  {
    "id": "011",
    "name": "トケフクロ",
    "image": "images/recolored/011_トケフクロ.jpg",
    "variantName": "星空亜種",
    "variantImage": "images/variants/011_トケフクロ_星空亜種.jpg"
  },
  {
    "id": "012",
    "name": "クロノウル",
    "image": "images/recolored/012_クロノウル.jpg",
    "variantName": "星空亜種",
    "variantImage": "images/variants/012_クロノウル_星空亜種.jpg"
  },
  {
    "id": "013",
    "name": "カギネコ",
    "image": "images/recolored/013_カギネコ.jpg",
    "variantName": "深海亜種",
    "variantImage": "images/variants/013_カギネコ_深海亜種.jpg"
  },
  {
    "id": "014",
    "name": "ニャントム",
    "image": "images/recolored/014_ニャントム.jpg",
    "variantName": "深海亜種",
    "variantImage": "images/variants/014_ニャントム_深海亜種.jpg"
  },
  {
    "id": "015",
    "name": "ユキカメ",
    "image": "images/recolored/015_ユキカメ.jpg",
    "variantName": "桜花亜種",
    "variantImage": "images/variants/015_ユキカメ_桜花亜種.jpg"
  },
  {
    "id": "016",
    "name": "イチゴバチ",
    "image": "images/recolored/016_イチゴバチ.jpg",
    "variantName": "宝石亜種",
    "variantImage": "images/variants/016_イチゴバチ_宝石亜種.jpg"
  },
  {
    "id": "017",
    "name": "メンガ",
    "image": "images/recolored/017_メンガ.jpg",
    "variantName": "月光亜種",
    "variantImage": "images/variants/017_メンガ_月光亜種.jpg"
  },
  {
    "id": "018",
    "name": "マジエイ",
    "image": "images/recolored/018_マジエイ.jpg",
    "variantName": "砂漠亜種",
    "variantImage": "images/variants/018_マジエイ_砂漠亜種.jpg"
  },
  {
    "id": "019",
    "name": "キカンサイ",
    "image": "images/recolored/019_キカンサイ.jpg",
    "variantName": "森林亜種",
    "variantImage": "images/variants/019_キカンサイ_森林亜種.jpg"
  },
  {
    "id": "020",
    "name": "ゴウキサイ",
    "image": "images/recolored/020_ゴウキサイ.jpg",
    "variantName": "森林亜種",
    "variantImage": "images/variants/020_ゴウキサイ_森林亜種.jpg"
  },
  {
    "id": "021",
    "name": "ツボタコ",
    "image": "images/recolored/021_ツボタコ.jpg",
    "variantName": "古代亜種",
    "variantImage": "images/variants/021_ツボタコ_古代亜種.jpg"
  },
  {
    "id": "022",
    "name": "パレットン",
    "image": "images/recolored/022_パレットン.jpg",
    "variantName": "オーロラ亜種",
    "variantImage": "images/variants/022_パレットン_オーロラ亜種.jpg"
  },
  {
    "id": "023",
    "name": "ラッパタツ",
    "image": "images/recolored/023_ラッパタツ.jpg",
    "variantName": "珊瑚亜種",
    "variantImage": "images/variants/023_ラッパタツ_珊瑚亜種.jpg"
  },
  {
    "id": "024",
    "name": "フラミランプ",
    "image": "images/recolored/024_フラミランプ_軽量版.jpg",
    "variantName": "氷灯亜種",
    "variantImage": "images/variants/024_フラミランプ_氷灯亜種.jpg"
  },
  {
    "id": "025",
    "name": "マグサソリ",
    "image": "images/recolored/025_マグサソリ.jpg",
    "variantName": "花晶亜種",
    "variantImage": "images/variants/025_マグサソリ_花晶亜種.jpg"
  },
  {
    "id": "026",
    "name": "タネモグラ",
    "image": "images/recolored/026_タネモグラ.jpg",
    "variantName": "火山亜種",
    "variantImage": "images/variants/026_タネモグラ_火山亜種.jpg"
  },
  {
    "id": "027",
    "name": "ダイコンモグ",
    "image": "images/recolored/027_ダイコンモグ.jpg",
    "variantName": "火山亜種",
    "variantImage": "images/variants/027_ダイコンモグ_火山亜種.jpg"
  },
  {
    "id": "028",
    "name": "アワロトル",
    "image": "images/recolored/028_アワロトル.jpg",
    "variantName": "雲海亜種",
    "variantImage": "images/variants/028_アワロトル_雲海亜種.jpg"
  },
  {
    "id": "029",
    "name": "アシザル",
    "image": "images/recolored/029_アシザル.jpg",
    "variantName": "雷雲亜種",
    "variantImage": "images/variants/029_アシザル_雷雲亜種.jpg"
  },
  {
    "id": "030",
    "name": "チンムシャ",
    "image": "images/recolored/030_チンムシャ.jpg",
    "variantName": "雷雲亜種",
    "variantImage": "images/variants/030_チンムシャ_雷雲亜種.jpg"
  },
  {
    "id": "031",
    "name": "ゴリカブト",
    "image": "images/recolored/031_ゴリカブト.jpg",
    "variantName": "雷雲亜種",
    "variantImage": "images/variants/031_ゴリカブト_雷雲亜種.jpg"
  },
  {
    "id": "SECRET01",
    "name": "テンセイリュウ",
    "image": "images/recolored/SECRET01_テンセイリュウ.jpg",
    "variantName": "日輪亜種",
    "variantImage": "images/variants/SECRET01_テンセイリュウ_日輪亜種.jpg"
  },
  {
    "id": "SECRET02",
    "name": "ジクロノス",
    "image": "images/recolored/SECRET02_ジクロノス.jpg",
    "variantName": "月蝕亜種",
    "variantImage": "images/variants/SECRET02_ジクロノス_月蝕亜種.jpg"
  }
].map(Object.freeze));
