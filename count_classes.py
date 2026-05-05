from pathlib import Path
from collections import Counter

labels_path = Path("dataset/labels/train")

class_counts = Counter()

for label_file in labels_path.glob("*.txt"):
    with open(label_file, "r") as f:
        lines = f.readlines()

    for line in lines:
        class_id = int(line.split()[0])
        class_counts[class_id] += 1

print("Class counts:\n")
for cls, count in sorted(class_counts.items()):
    print(f"Class {cls}: {count}")