import os

label_path = "dataset/labels/train"

# 🔥 تعريف أسماء الكلاسات
CLASS_NAMES = {
    "0": "person",
    "1": "car",
    "2": "traffic_light",
    "3": "stop_sign",
    "4": "no_entry",
    "5": "speed_limit",
    "6": "pedestrian_crossing",
    "7": "speed_bump"
}

found_classes = set()

for file in os.listdir(label_path):

    file_path = os.path.join(label_path, file)

    if not os.path.exists(file_path):
        continue

    with open(file_path, "r") as f:
        lines = f.readlines()

    for line in lines:
        parts = line.strip().split()
        if len(parts) > 0:
            found_classes.add(parts[0])

print("\n🎯 Classes Found:\n")

for cls_id in sorted(CLASS_NAMES.keys(), key=int):
    if cls_id in found_classes:
        print(f"{CLASS_NAMES[cls_id]} : {cls_id}")
    else:
        print(f"{CLASS_NAMES[cls_id]} : ❌ NOT FOUND")

print("\n🔥 DONE")