import cv2
import os

videos_folder = "videos"
output_path = "dataset/images/train"

os.makedirs(output_path, exist_ok=True)

videos = [f"video{i}.mp4" for i in range(1, 33)]

saved = 0
TARGET_FPS = 3

for video_file in videos:

    video_path = os.path.join(videos_folder, video_file)

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        continue

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps / TARGET_FPS)

    count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if count % frame_interval == 0:
            filename = f"{output_path}/frame_clean_{saved}.jpg"
            cv2.imwrite(filename, frame)
            saved += 1

        count += 1

    cap.release()

print(f"DONE: {saved}")