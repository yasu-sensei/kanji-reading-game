"""Create a self-contained GAS HTML-service distribution with embedded images."""
import importlib.util
from pathlib import Path
import tempfile
import zipfile
import argparse
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('preview', ROOT / 'scripts/build-preview.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temp:
    preview.build(Path(temp), embed_images=True)
    html = (Path(temp) / 'kanji-preview.html').read_text()
    (args.output / 'Game.html').write_text(html)
    (args.output / 'Game.txt').write_text(html)
for name in ['Code.gs', 'README.md']:
    (args.output / name).write_text((ROOT / 'gas' / name).read_text())
with zipfile.ZipFile(args.output / 'kanji-gas.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ['Game.html', 'Code.gs', 'README.md']:
        z.write(args.output / name, name)
print('GAS package:', args.output / 'kanji-gas.zip')
