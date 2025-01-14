import os
import sys
import cv2
import pandas as pd

# 执行提取帧的操作
if __name__ == "__main__":
    python_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(python_dir)
    workspace_dir = os.path.join(parent_dir, 'workspace')

    data_line = "X Y Z Scalar_field Scalar_field_#2 Scalar_field_#3 Scalar_field_#4 Scalar_field_#5 Scalar_field_#6 Scalar_field_#7 Scalar_field_#8 Scalar_field_#9 Nx Ny Nz"
    data_array = data_line.split()  # 将字符串按空格分隔成数组
    print(data_array)  # 打印数组以验证结果

    camera_moved = os.path.join(workspace_dir, 'camera.csv')
    df_camera_data = pd.read_csv(camera_moved, 
                              skiprows=2, 
                              names=data_array,
                              delimiter=' ',
                              )
    print(df_camera_data)

    data_line = "PhotoID X Y Z Omega Phi Kappa r11 r12 r13 r21 r22 r23 r31 r32 r33"
    data_array = data_line.split()  # 将字符串按空格分隔成数组
    camera_source = os.path.join(workspace_dir, 'coordinates.txt')
    df_camera_source = pd.read_csv(camera_source, 
                              skiprows=2, 
                              names=data_array,
                              delimiter='\t',
                              )
    print(df_camera_source)

    df_camera_source['X'] = df_camera_data['X']
    df_camera_source['Y'] = df_camera_data['Y']
    df_camera_source['Z'] = df_camera_data['Z']

    print(df_camera_source)

    df_camera_source.to_csv(os.path.join(parent_dir, '360/coordinates.txt'), index=False)


