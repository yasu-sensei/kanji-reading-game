"""提供CSVの構造と原本の保持を検証する。読みの意味的な正しさは判定しない。"""
import csv
import hashlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/kanji_400_final.csv"
EXPECTED_SHA256 = "d4b0be69f2f43415221ed42973bd6a747e5ba2a42eb221cc8aa75c0d16b05d73"
KANJI = set("一二三四五六七八九十百千上下左右中大小月日年早木林山川土空田天生花草虫犬人名女男子目耳口手足見音力気円入出立休先夕本正文字学校村町森水火玉王石竹糸貝車金雨赤青白")
HEADERS = ["番号", "対象漢字", "出題語彙", "正しい読み", "間違い①（候補）", "間違い②（候補）", "確認状況"]


def validate():
    if hashlib.sha256(PATH.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise ValueError("提供原本から変更されています。明示的な変更承認と履歴を確認してください。")
    with PATH.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames != HEADERS:
            raise ValueError("列構成が一致しません")
        rows = list(reader)
    if len(rows) != 400 or sorted(int(row["番号"]) for row in rows) != list(range(1, 401)):
        raise ValueError("400問の問題番号に欠番・重複があります")
    counts = Counter(row["対象漢字"] for row in rows)
    if set(counts) != KANJI or set(counts.values()) != {5}:
        raise ValueError("配当漢字80字×各5問と一致しません")
    for row in rows:
        if None in row or any(not row.get(key, "").strip() for key in HEADERS):
            raise ValueError(f"{row['番号']}: 空欄または不正な列数")
        choices = [row[key] for key in HEADERS[3:6]]
        if len(set(choices)) != 3:
            raise ValueError(f"{row['番号']}: 選択肢が重複しています")
        if row["対象漢字"] not in row["出題語彙"]:
            raise ValueError(f"{row['番号']}: 出題語彙に対象漢字がありません")
    print("PASS: 原本一致、400問、番号1〜400、80字×各5問、空欄なし、三択重複なし")
    print("確認状況:", dict(Counter(row["確認状況"] for row in rows)))


if __name__ == "__main__":
    validate()
