import os
import random
import shutil
from pathlib import Path

images_path = Path("dataset/images/train")
labels_path = Path("dataset/labels/train")

backup_images = Path("backup/images")
backup_labels = Path("backup/labels")

backup_images.mkdir(parents=True, exist_ok=True)
backup_labels.mkdir(parents=True, exist_ok=True)

CAR_CLASS_ID = 1

moved = 0
kept = 0

for label_file in labels_path.glob("*.txt"):
    with open(label_file, "r") as f:
        lines = f.readlines()

    if not lines:
        continue

    classes = [int(line.split()[0]) for line in lines]
    car_count = classes.count(CAR_CLASS_ID)

    if car_count > 0:
        # 🔥 أقوى من قبل بس مش تدميري
        prob_remove = min(0.8, 0.2 + car_count * 0.15)

        if random.random() < prob_remove:
            img_file = images_path / (label_file.stem + ".jpg")

            if img_file.exists():
                shutil.move(str(img_file), backup_images / img_file.name)

            shutil.move(str(label_file), backup_labels / label_file.name)

            moved += 1
        else:
            kept += 1
    else:
        kept += 1

print(f"Moved: {moved}")
print(f"Kept: {kept}")