import os
import sys
import cv2
import pandas as pd

# 已知数据
frame_total = 191256 # 总帧数
frame_section = 7969 # 每段帧数
frame_count = 24     # 24 段
frame_rate = 24      # 每秒 24 帧
second = 0.5           # 每 xx 秒取一张照片

# 执行提取帧的操作
if __name__ == "__main__":
    python_dir = os.path.dirname(__file__)
    current_dir = os.path.dirname(python_dir)
    storage_dir = os.path.join(current_dir, 'pointclouds')

    project_folder_name = 'sz_yssz'
    project_dir = os.path.join(storage_dir, project_folder_name)
    if not os.path.exists(project_dir):
        os.makedirs(project_dir)

    video_dir = 'F:/迅雷下载/BaiduDisk/【项目】滢水山庄/第一次录制'
    video_filename = 'VID_20250107_103505_00_023.mp4'
    video_name = os.path.splitext(video_filename)[0]
    video_filepath = os.path.join(video_dir, video_filename)

    # video 输出 images 时的保存路径
    export_images_dir = os.path.join(project_dir, video_name)
    if not os.path.exists(export_images_dir):
        os.makedirs(export_images_dir)

    # 打开视频文件
    video = cv2.VideoCapture(video_filepath)
    frame_rate = video.get(cv2.CAP_PROP_FPS)
    total_frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
    print(f"Video total frames: {total_frames}, rate: {frame_rate}")

    frame = 0
    image_count = 0

    df_360 = pd.DataFrame()

    while True:
        # 读取视频帧
        success, frame_video = video.read()
        if not success:
            break

        is_target_frame = (frame % (second * frame_rate) == 0)

        if(is_target_frame):
            # 总计秒数
            second_num = int(frame / frame_rate)
            # 计算出当前时第几分钟
            minute_num = int(second_num / 60)
            # 计算出当前应该显示的是第几秒
            second_display = second_num - minute_num * 60
            # 保存图片
            time_index = f'{minute_num:02d}{second_display:02d}'
            output_fileName = f'{video_filename}.{frame:06d}.{time_index}.jpg'
            output_path = os.path.join(export_images_dir, output_fileName)
            print(output_path)
            result = cv2.imwrite(output_path, frame_video)
            image_count += 1
        frame += 1

        # if frame > 240/5:
        #     break
        #     # exit while
    
    # 释放视频对象
    video.release()
    print(f"已完成提取，共保存了 {image_count} 张图片")
