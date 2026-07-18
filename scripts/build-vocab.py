#!/usr/bin/env python3
"""Parse the GregMat CSV and enrich words with dictionary data."""

from __future__ import annotations

import asyncio
import csv
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SOURCE = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else "/Users/dablu/Downloads/Greg Mat Vocab List (37 Groups, 1,110 Words) - Word List.csv"
)
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "vocab.json"
API = "https://api.dictionaryapi.dev/api/v2/entries/en/"


def parse_words() -> list[dict[str, object]]:
    with SOURCE.open(newline="", encoding="utf-8-sig") as source:
        rows = list(csv.reader(source))

    words: list[dict[str, object]] = []
    group_by_column: dict[int, int] = {}
    seen: set[str] = set()

    for row in rows:
        for column, raw in enumerate(row):
            value = raw.strip()
            group_match = re.fullmatch(r"Group (\d+)", value)
            if group_match:
                group_by_column[column] = int(group_match.group(1))
                continue
            if (
                not value
                or value.startswith("Take Test")
                or value.startswith("For Vocab")
                or column not in group_by_column
            ):
                continue
            key = value.lower()
            if key in seen:
                continue
            seen.add(key)
            words.append(
                {
                    "id": f"g{group_by_column[column]}-{re.sub(r'[^a-z0-9]+', '-', key).strip('-')}",
                    "word": value,
                    "group": group_by_column[column],
                }
            )
    return words


def fallback_example(word: str, part: str) -> str:
    if part == "verb":
        return f"After careful debate, the committee decided to {word} the original proposal."
    if part in {"adjective", "adverb"}:
        return f"The speaker's {word} manner left a strong impression on the audience."
    if part == "noun":
        return f"The unexpected {word} soon became the central issue in the discussion."
    return f"The context made the meaning of “{word}” clear to every careful reader."


def fetch_entry(word: str) -> tuple[str, str, str]:
    url = API + urllib.parse.quote(word)
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            entries = json.load(response)
        for entry in entries:
            for meaning in entry.get("meanings", []):
                part = meaning.get("partOfSpeech", "")
                for definition in meaning.get("definitions", []):
                    text = definition.get("definition", "").strip()
                    if not text:
                        continue
                    example = definition.get("example", "").strip()
                    return (
                        text[0].upper() + text[1:],
                        example or fallback_example(word, part),
                        part,
                    )
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        pass
    return (
        "A word used to express a precise idea or quality in formal English.",
        fallback_example(word, ""),
        "",
    )


async def enrich(word: dict[str, object], semaphore: asyncio.Semaphore) -> dict[str, object]:
    async with semaphore:
        definition, example, part = await asyncio.to_thread(fetch_entry, str(word["word"]))
        return {**word, "partOfSpeech": part, "definition": definition, "example": example}


async def main() -> None:
    words = parse_words()
    semaphore = asyncio.Semaphore(12)
    enriched = await asyncio.gather(*(enrich(word, semaphore) for word in words))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(enriched, indent=2, ensure_ascii=False) + "\n")
    fallback_count = sum(
        item["definition"].startswith("A word used") for item in enriched
    )
    print(f"Wrote {len(enriched)} unique words to {OUTPUT}")
    print(f"Dictionary misses: {fallback_count}")


if __name__ == "__main__":
    asyncio.run(main())
