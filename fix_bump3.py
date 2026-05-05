import os

labels_path = "speed_bump3/test/labels"

for file in os.listdir(labels_path):
    file_path = os.path.join(labels_path, file)

    with open(file_path, "r") as f:
        lines = f.readlines()

    new_lines = []

    for line in lines:
        parts = line.strip().split()

        # 🔥 كل شي يصير class 7
        parts[0] = "7"
        new_lines.append(" ".join(parts))

    with open(file_path, "w") as f:
        f.write("\n".join(new_lines))

print("DONE bump3 🔥")