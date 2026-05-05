import os

# 🔥 أسماء الفولدرات (عدّليهم إذا عندك أسماء مختلفة)
DATASETS = [
    "speed_limits",
    "stop_sign",
    "no_entry",
    "pedestrian_sign",
    "speed_bump1",
    "speed_bump2",
    "speed_bump3"
]

for dataset in DATASETS:

    for split in ["train", "valid", "test"]:

        path = os.path.join(dataset, split, "labels")

        if not os.path.exists(path):
            continue

        print(f"Processing: {path}")

        for file in os.listdir(path):

            file_path = os.path.join(path, file)

            # 🔥 حل المشكلة (إذا الملف مش موجود)
            if not os.path.exists(file_path):
                continue

            with open(file_path, "r") as f:
                lines = f.readlines()

            new_lines = []

            for line in lines:
                parts = line.strip().split()

                if len(parts) == 0:
                    continue

                # 🔴 stop_sign (بس الكلاس 2)
                if dataset == "stop_sign":
                    if parts[0] != "2":
                        continue
                    parts[0] = "3"

                # 🟢 no_entry
                elif dataset == "no_entry":
                    parts[0] = "4"

                # 🟢 speed_limits
                elif dataset == "speed_limits":
                    parts[0] = "5"

                # 🟢 pedestrian
                elif dataset == "pedestrian_sign":
                    parts[0] = "6"

                # 🟢 bumps (كل الأنواع)
                elif "speed_bump" in dataset:
                    parts[0] = "7"

                new_lines.append(" ".join(parts))

            # ✏️ إعادة كتابة الملف
            with open(file_path, "w") as f:
                f.write("\n".join(new_lines))

print("🔥 DONE FIXING ALL DATASETS")