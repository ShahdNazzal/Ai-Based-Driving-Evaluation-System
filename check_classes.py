import os

# 🔥 كل مصادر الداتا عندك
PATHS = {
    "video_frames": "dataset/labels/train",

    "speed_limits": "speed_limits/train/labels",
    "stop_sign": "stop_sign/train/labels",
    "no_entry": "no_entry/train/labels",
    "pedestrian": "pedestrian_sign/train/labels",
    "speed_bump1": "speed_bump1/train/labels",
    "speed_bump2": "speed_bump2/train/labels",
    "speed_bump3": "speed_bump3/train/labels",
}

for name, path in PATHS.items():

    if not os.path.exists(path):
        print(f"{name}: ❌ path not found")
        continue

    classes = set()

    for file in os.listdir(path):
        file_path = os.path.join(path, file)

        if not os.path.exists(file_path):
            continue

        with open(file_path, "r") as f:
            lines = f.readlines()

        for line in lines:
            parts = line.strip().split()
            if len(parts) > 0:
                classes.add(parts[0])

    print(f"{name}: {classes}")