from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "extension" / "icons" / "icon.svg"
TMP = Path("/tmp/icon.svg.png")

TARGETS = [
    (16, ROOT / "extension" / "icons" / "icon-16.png"),
    (32, ROOT / "extension" / "icons" / "icon-32.png"),
    (48, ROOT / "extension" / "icons" / "icon-48.png"),
    (128, ROOT / "extension" / "icons" / "icon-128.png"),
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    run(["qlmanage", "-t", "-s", "512", "-o", "/tmp", str(SVG)])
    for size, output in TARGETS:
        output.parent.mkdir(parents=True, exist_ok=True)
        run(["sips", "-z", str(size), str(size), str(TMP), "--out", str(output)])


if __name__ == "__main__":
    main()
