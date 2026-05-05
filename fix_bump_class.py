import os

base_path = "speed_bump4"  # 🔥 عدّلي حسب اسم الفولدر عندك

folders = ["train", "valid", "test"]

for folder in folders:

    labels_path = os.path.join(base_path, folder, "labels")

    print(f"Processing: {labels_path}")

    for file in os.listdir(labels_path):

        file_path = os.path.join(labels_path, file)

        if not os.path.exists(file_path):
            continue

        with open(file_path, "r") as f:
            lines = f.readlines()

        new_lines = []

        for line in lines:
            parts = line.strip().split()

            # 🔥 غيّر الكلاس من 0 → 7
            parts[0] = "7"

            new_lines.append(" ".join(parts))

        with open(file_path, "w") as f:
            f.write("\n".join(new_lines))

print("🔥 DONE - speed bump = 7")