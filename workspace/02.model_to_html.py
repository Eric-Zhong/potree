import os
import sys
import cv2
import pandas as pd
import shutil

def main():
    print("#" * 80)
    print("Generate HTML for all projects")

    # 当前 python file 所在目录
    current_dir = os.path.dirname(__file__)

    # 工具类保存的项目目录
    projects_dir = os.path.join(current_dir, "03.projects")

    # 按目录中所有视频文件，进行遍历
    step_no = 0
    video_names = [d for d in os.listdir(projects_dir) if os.path.isdir(os.path.join(projects_dir, d))]
    step_no = 0
    for video_name in video_names:
        print(f'{step_no:02d}. 开始处理 {video_name}')
        publishHtml(video_name)

def publishHtml(video_name):
    # 当前 python file 所在目录
    current_dir = os.path.dirname(__file__)
    # 原始视频文件目录
    video_dir = os.path.join(current_dir, "01.videos")
    # 抽取出来的图像保存路径
    images_dir = os.path.join(current_dir, "02.images")
    # 项目保存的项目目录
    projects_dir = os.path.join(current_dir, "03.projects")
    # 项目HTML目录
    html_dir = os.path.join(current_dir, "04.html")
    step_no = 0
    if os.path.exists(html_dir) == False:
        step_no += 1
        print(f'\t{step_no:02d}.创建目录 {html_dir}')
        os.makedirs(html_dir)
        
    video_html_dir = os.path.join(html_dir, video_name)
    if os.path.exists(video_html_dir):
        step_no += 1
        print(f'\t{step_no:02d}.项目 {video_name} 已经存在 {video_html_dir}')
    else:
        # 模型目录
        model_dir = os.path.join(projects_dir, video_name)
        if os.path.exists(model_dir) == False:
            step_no += 1
            print(f'\t{step_no:02d}.ERROR: 模型文件不存在 {model_dir}')
            return
        # 待发布的点云源文件
        pointcloud_filename = video_name + '.publish.las'
        pointcloud_file_path = os.path.join(model_dir, pointcloud_filename)
        if os.path.exists(pointcloud_file_path) == False:
            step_no += 1
            print(f'\t{step_no:02d}.ERROR: 文件不存在 {pointcloud_file_path}')
            return
        # 360位置
        image360_filename = video_name + '.images.publish.csv'
        image360_filename_path = os.path.join(model_dir, image360_filename)
        if os.path.exists(image360_filename_path) == False:
            step_no += 1
            print(f'\t{step_no:02d}.ERROR: 文件不存在 {image360_filename_path}')
            return

        # potree convert后的存储目录
        output_video_dir = os.path.join(html_dir, video_name)
        if os.path.exists(output_video_dir) == False:
            os.makedirs(output_video_dir)
        output_model_dir = os.path.join(output_video_dir, 'model')
        if os.path.exists(output_model_dir) == False:
            os.makedirs(output_model_dir)
        # 调用应用程序
        potree_convert_app = 'PotreeConverter.exe'
        potree_convert_app_path = os.path.join(current_dir, '99.tools/potree_converter')
        # -- PotreeConverter.exe file.las -o 04.html/<video_name>/model
        command = f"{potree_convert_app} {pointcloud_file_path} -o {output_model_dir}"
        os.system(f"cd {potree_convert_app_path} && {command}")
        print(f'Potree模型文件已生成: {output_model_dir}')
        # 处理 360 coordinate 文件
        output_360_dir = os.path.join(output_video_dir, '360')
        if os.path.exists(output_360_dir) == False:
            os.makedirs(output_360_dir)
        # 复制360坐标文件到指定目录并重命名
        # with open(image360_filename_path, 'r') as f_in, open(os.path.join(output_360_dir, 'coordinates.txt'), 'w') as f_out:
        #     f_out.write(f_in.read())
        file_360_coordinate = os.path.join(output_360_dir, 'coordinates.txt')
        # shutil.copy(image360_filename_path, file_360_coordinate)
        # 处理成标准的 dataframe 格式数据
        image360Coordinate(image360_filename_path, file_360_coordinate)
        print(f'Camera轨迹已生成: {file_360_coordinate}')
        # 复制 99.tools/template/index.html 文件到 output_video_dir 目录下
        template_index_html = os.path.join(current_dir, '99.tools/template/index.html')
        output_index_html = os.path.join(output_video_dir, 'index.html')
        shutil.copy(template_index_html, output_index_html)
        print(f'HTML文件创建成功: {output_index_html}')


def image360Coordinate(file_OmegaPhiKappa, file_dataframe):
    data_line = "PhotoID X Y Z Omega Phi Kappa r11 r12 r13 r21 r22 r23 r31 r32 r33"
    data_array = data_line.split()  # 将字符串按空格分隔成数组

    df_camera_source = pd.read_csv(file_OmegaPhiKappa, 
                            skiprows=2, 
                            names=data_array,
                            delimiter='\t',
                            )
    df_camera_source.to_csv(file_dataframe, index=False)

if __name__ == "__main__":
    main()
    