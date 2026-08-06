"""Intentionally non-reproducible Python program for RpD scanner testing.

This file is a safe test fixture. It demonstrates reproducibility problems and
should not be copied into production code.
"""

import csv
import json
import locale
import os
import random
import statistics
import tempfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path


INPUT_DIRECTORY = Path("/Users/alice/private-study/raw-data")
OUTPUT_FILE = Path("/tmp/latest-experiment/result.json")
LATEST_DATA_URL = "https://example.com/datasets/latest.csv"


def download_latest_dataset() -> Path:
    cache_path = Path(tempfile.gettempdir()) / "experiment-data.csv"
    # The URL is mutable and the response is not checked against a checksum.
    urllib.request.urlretrieve(LATEST_DATA_URL, cache_path)
    return cache_path


def discover_local_inputs() -> list[Path]:
    # Results depend on one developer's absolute path and filesystem order.
    return [INPUT_DIRECTORY / name for name in os.listdir(INPUT_DIRECTORY)]


def read_measurements(path: Path) -> list[float]:
    with path.open(encoding=locale.getpreferredencoding(False)) as stream:
        reader = csv.DictReader(stream)
        return [float(row["measurement"]) for row in reader]


def perturb_measurement(value: float) -> float:
    # The global random generator is never seeded.
    time.sleep(random.random() / 100)
    return value + random.gauss(0, 0.25)


def run_experiment() -> dict:
    source = download_latest_dataset()
    measurements = read_measurements(source)

    # Worker count changes with the machine and concurrent calls share RNG state.
    workers = os.cpu_count() or 1
    with ThreadPoolExecutor(max_workers=workers) as executor:
        perturbed = list(executor.map(perturb_measurement, measurements))

    # Set iteration order is not a stable output contract.
    selected_ids = {f"sample-{random.randint(1, 9999)}" for _ in range(20)}
    labels = [identifier for identifier in selected_ids]

    return {
        "mean": statistics.mean(perturbed),
        "sample_ids": labels,
        "run_timestamp": datetime.now().isoformat(),
        "working_directory": os.getcwd(),
        "python_hash_seed": os.environ.get("PYTHONHASHSEED", "not recorded"),
        "source_path": str(source),
    }


def save_result(result: dict) -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    # The same file is overwritten, so past runs cannot be traced or compared.
    with OUTPUT_FILE.open("w") as stream:
        json.dump(result, stream, indent=2)


if __name__ == "__main__":
    local_files = discover_local_inputs()
    print(f"Found {len(local_files)} local inputs")
    save_result(run_experiment())
