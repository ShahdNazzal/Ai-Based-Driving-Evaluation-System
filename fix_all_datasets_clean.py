import os

# 📁 كل الفولدرات
folders = [
    "dataset/labels/train",
    "dataset/labels/val"
]

for labels_path in folders:

    print(f"Processing: {labels_path}")

    for file in os.listdir(labels_path):

        if not file.endswith(".txt"):
            continue

        file_path = os.path.join(labels_path, file)

        with open(file_path, "r") as f:
            lines = f.readlines()

        new_lines = []

        for line in lines:
            parts = line.strip().split()
            if len(parts) == 0:
                continue

            cls = int(parts[0])

            # 🧠 هون القرار الذكي
            # إذا الكلاس > 7 → غالبًا speed_limit
            if cls > 7:
                parts[0] = "5"  # speed_limit

            # إذا الكلاس أصلاً ضمن 0-7 → خليه زي ما هو
            else:
                parts[0] = str(cls)

            new_lines.append(" ".join(parts))

        with open(file_path, "w") as f:
            f.write("\n".join(new_lines))

print("🔥 CLEAN FIX DONE")
