import os
import sys
import cv2
import pandas as pd


def generateFrameImageFromVideo(second, frame_start=0, frame_end=0):
    print("#" * 80)
    print("read video files from video folder")
    print("#" * 80)

    # 当前 python file 所在目录
    current_dir = os.path.dirname(__file__)

    # 原始视频文件目录
    video_dir = os.path.join(current_dir, "01.videos")
    # 抽取出来的图像保存路径
    images_dir = os.path.join(current_dir, "02.images")
    # 工具类保存的项目目录
    projects_dir = os.path.join(current_dir, "03.projects")

    # 按目录中所有视频文件，进行遍历
    step_no = 0
    for root, dirs, video_files in os.walk(video_dir):
        for video_file in video_files:
            if video_file.endswith(".mp4"):
                step_no += 1
                video_name_without_extension = os.path.splitext(video_file)[0]
                # 项目
                project_folder_path = os.path.join(
                    projects_dir, video_name_without_extension
                )

                if not os.path.exists(project_folder_path):
                    os.makedirs(project_folder_path)
                # 图像
                image_folder_path = os.path.join(
                    images_dir, video_name_without_extension
                )

                if not os.path.exists(image_folder_path):
                    print(f"{step_no: 04d}: 创建图像文件夹 {image_folder_path}")
                    os.makedirs(image_folder_path)
                else:
                    print(
                        f"视频 {video_file} 已经存在图像序列文件夹 {image_folder_path}，已经跳过"
                    )
                    break

                print(
                    f"{step_no: 04d}: 开始从视频 {video_file} 按 {second} 秒一帧的方式抽取图像"
                )
                # 抽帧
                video_file_path = os.path.join(root, video_file)
                saveFrameImage(video_file_path, image_folder_path, second)


def saveFrameImage(video_file, images_dir, second=1, frame_start=0, frame_end=0):
    step_no = 0
    # 重新获取视频文件名
    video_file_fullname = os.path.basename(video_file)
    # video 输出 images 时的保存路径
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)

    # 打开视频文件
    video = cv2.VideoCapture(video_file)
    frame_rate = video.get(cv2.CAP_PROP_FPS)
    total_frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
    
    if frame_end <= 0:
        frame_end = total_frames

    print(f"\t{step_no: 04d}: 视频信息.文件路径 {video_file}")
    print(f"\t{step_no: 04d}: 视频信息.帧率 {video_file}")
    print(f"\t{step_no: 04d}: 视频信息.总帧数 {video_file}")
    print(f"Video total frames: {total_frames}, rate: {frame_rate}")

    frame = frame_start
    image_count = 0

    df_360 = pd.DataFrame()
    pre_frame_condition = True

    print(f"\t{step_no: 04d}: 开始处理")

    # 设置视频从指定的时间或帧开始播放
    video.set(cv2.CAP_PROP_POS_FRAMES, frame)

    while True:

        if frame_end >= 0 and frame > frame_end:
            break

        step_no += 1
        # 读取视频帧
        success, frame_video = video.read()

        if not success:
            print(f"\t{step_no: 04d}: 播放结束或失败")
            break
        else:
            is_target_frame = frame % (second * frame_rate) == 0
            if is_target_frame:
                # 总计秒数
                second_num = int(frame / frame_rate)
                # 计算出当前时第几分钟
                minute_num = int(second_num / 60)
                # 计算出当前应该显示的是第几秒
                second_display = second_num - minute_num * 60
                # 保存图像
                time_index = f"{minute_num:02d}{second_display:02d}"
                output_fileName = f"{video_file_fullname}.{frame:06d}.{second_num:06d}.{time_index}.jpg"
                output_path = os.path.join(images_dir, output_fileName)
                image_count += 1

                # 补个换行
                if pre_frame_condition:
                    pass
                else:
                    print("")

                # 保存图像
                if os.path.exists(output_path) == False:
                    result = cv2.imwrite(output_path, frame_video)
                    print(
                        f"\t\t{step_no: 04d}: 视频帧 {frame} 保存为 {output_fileName}"
                    )
                else:
                    print(f"\t\t{step_no: 04d}: 视频帧 {frame} 已存在")
            else:
                if pre_frame_condition:
                    print(f"\t\t{step_no: 04d}: 跳过视频帧: ", end="")
                else:
                    print(f"{frame}", end="\t")

            pre_frame_condition = is_target_frame
            frame += 1

            # if frame > 240/5:
            #     break
            #     # exit while

    # 释放视频对象
    video.release()
    print(f"\t{step_no: 04d}: 处理完毕，图像数量 {image_count}")


if __name__ == "__main__":
    # generateFrameImageFromVideo(
    #     second=1,
    # )

    # 前30s
    generateFrameImageFromVideo(
        second=0.5,
        frame_start=0,
        frame_end=30 * 24,
    )  # 前 30s

    # 后 30s
    generateFrameImageFromVideo(
        second=0.5,
        frame_start=(180 - 30) * 24,
    )
