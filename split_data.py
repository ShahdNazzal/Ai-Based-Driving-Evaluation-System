import os
import random
import shutil

images_train = "dataset/images/train"
labels_train = "dataset/labels/train"

images_val = "dataset/images/val"
labels_val = "dataset/labels/val"

os.makedirs(images_val, exist_ok=True)
os.makedirs(labels_val, exist_ok=True)

images = [f for f in os.listdir(images_train) if f.endswith(".jpg")]

val_size = int(len(images) * 0.2)
val_samples = random.sample(images, val_size)

for img_name in val_samples:

    img_src = os.path.join(images_train, img_name)
    label_src = os.path.join(labels_train, img_name.replace(".jpg", ".txt"))

    img_dst = os.path.join(images_val, img_name)
    label_dst = os.path.join(labels_val, img_name.replace(".jpg", ".txt"))

    shutil.move(img_src, img_dst)

    if os.path.exists(label_src):
        shutil.move(label_src, label_dst)

print(f"MOVED {val_size}")