"""Build an offline, single-file preview without changing source assets."""
import argparse
import base64
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def embedded(value):
    return json.dumps(value, ensure_ascii=False).replace("</", "<\\/")


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    source = (ROOT / "js/cards.js").read_text()
    cards = json.loads(source.split("Object.freeze(", 1)[1].rsplit(".map(Object.freeze)", 1)[0])
    for card in cards:
        card["image"] = "data:image/jpeg;base64," + base64.b64encode((ROOT / card["image"]).read_bytes()).decode()
    screens = {}
    styles = {}
    for screen, filename, css in [
        ("preparation", "index.html", "style.css"),
        ("quiz", "quiz.html", "quiz.css"),
        ("gacha", "gacha.html", "rewards.css"),
        ("collection", "collection.html", "rewards.css"),
    ]:
        body = (ROOT / filename).read_text().split("<body", 1)[1].split(">", 1)[1].split("</body>", 1)[0]
        for name, target in [("index.html", "#preparation"), ("gacha.html", "#gacha"), ("collection.html", "#collection")]:
            body = body.replace(f'href="{name}"', f'href="{target}"')
        screens[screen] = body
        styles[screen] = (ROOT / "css" / css).read_text()
    rewards = (ROOT / "js/rewards.js").read_text().replace('window.addEventListener("storage",', 'previewListen("storage",')
    preparation = (ROOT / "js/preparation.js").read_text().replace('location.href = `quiz.html?${params}`;', 'location.hash = `quiz?${params}`;')
    quiz = (ROOT / "js/quiz.js").read_text().replace('new URLSearchParams(location.search)', 'new URLSearchParams(location.hash.split("?")[1] || "")')
    html = '''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>かんじの ぼうけん おためし</title><style id="screen-style"></style></head><body><script>
'''
    html += "window.REWARD_CARDS = " + embedded(cards) + ";\n"
    html += (ROOT / "js/questions.js").read_text() + "\n"
    html += "const screens = " + embedded(screens) + ";\n"
    html += "const styles = " + embedded(styles) + ";\n"
    html += "const questionCSV = " + embedded((ROOT / "data/kanji_400_final.csv").read_text(encoding="utf-8-sig")) + ";\n"
    html += "function initPreparation(){\n" + preparation + "\n}\n"
    html += "function initQuiz(fetch){\n" + quiz + "\n}\n"
    html += "function initRewards(setTimeout,previewListen){\n" + rewards + "\n}\n"
    html += '''
let timers = [], listeners;
function showScreen() {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
  listeners?.abort(); listeners = new AbortController();
  const requested = location.hash.slice(1).split('?')[0];
  const screen = Object.hasOwn(screens, requested) ? requested : 'preparation';
  document.body.dataset.page = screen;
  document.getElementById('screen-style').textContent = styles[screen];
  document.body.innerHTML = screens[screen];
  if (screen === 'preparation') initPreparation();
  else if (screen === 'quiz') initQuiz(async () => new Response(questionCSV, {status: 200}));
  else initRewards((fn, ms) => {const timer = window.setTimeout(fn, ms); timers.push(timer); return timer;}, (event, fn) => window.addEventListener(event, fn, {signal: listeners.signal}));
  scrollTo(0, 0);
}
window.addEventListener('hashchange', () => {if (Object.hasOwn(screens, location.hash.slice(1).split('?')[0])) showScreen();});
showScreen();
</script></body></html>
'''
    target = output / "kanji-preview.html"
    target.write_text(html)
    with zipfile.ZipFile(output / "kanji-preview.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(target, target.name)
    print(f"Created {target} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    build(parser.parse_args().output)
