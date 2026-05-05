import os

for split in ["train", "valid", "test"]:

    path = os.path.join("stop_sign", split, "labels")

    if not os.path.exists(path):
        continue

    print(f"Processing: {path}")

    for file in os.listdir(path):

        file_path = os.path.join(path, file)

        with open(file_path, "r") as f:
            lines = f.readlines()

        new_lines = []

        for line in lines:
            parts = line.strip().split()

            if len(parts) == 0:
                continue

            # 🔁 تحويل من 0 → 3
            parts[0] = "3"

            new_lines.append(" ".join(parts))

        with open(file_path, "w") as f:
            f.write("\n".join(new_lines))

print("🔥 DONE STOP FIX")