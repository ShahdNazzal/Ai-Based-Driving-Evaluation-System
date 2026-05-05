import os
import shutil
from pathlib import Path

images_path = Path("dataset/images/train")
labels_path = Path("dataset/labels/train")

backup_images = Path("backup_filtered/images")
backup_labels = Path("backup_filtered/labels")

backup_images.mkdir(parents=True, exist_ok=True)
backup_labels.mkdir(parents=True, exist_ok=True)

REMOVE_CLASSES = {0, 1, 2, 3}  # person, car, traffic light, stop

moved = 0
kept = 0

for label_file in labels_path.glob("*.txt"):
    with open(label_file, "r") as f:
        lines = f.readlines()

    classes = [int(line.split()[0]) for line in lines]

    # إذا في أي كلاس من المطلوب حذفهم
    if any(c in REMOVE_CLASSES for c in classes):
        img_file = images_path / (label_file.stem + ".jpg")

        # نقل الصورة
        if img_file.exists():
            shutil.move(str(img_file), backup_images / img_file.name)

        # نقل الليبل
        shutil.move(str(label_file), backup_labels / label_file.name)

        moved += 1
    else:
        kept += 1

print(f"Moved: {moved}")
print(f"Kept: {kept}")