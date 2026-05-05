import os

label_folders = [
    "dataset/labels/train",
    "dataset/labels/val"
]

mapping = {
    0: 0,  # person
    2: 1,  # car
    9: 2   # traffic light
}

for folder in label_folders:
    for file in os.listdir(folder):
        path = os.path.join(folder, file)

        new_lines = []
        with open(path, "r") as f:
            for line in f:
                parts = line.strip().split()
                cls = int(parts[0])

                if cls in mapping:
                    parts[0] = str(mapping[cls])
                    new_lines.append(" ".join(parts))

        with open(path, "w") as f:
            f.write("\n".join(new_lines))

print("Labels fixed 🔥")