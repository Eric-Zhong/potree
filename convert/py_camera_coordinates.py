import os
import sys
import cv2
import pandas as pd

# 执行提取帧的操作
if __name__ == "__main__":
    python_dir = os.path.dirname(__file__)
    current_dir = os.path.dirname(python_dir)
    storage_dir = os.path.join(current_dir, 'pointclouds')

    project_folder_name = 'sz_yssz'
    project_dir = os.path.join(storage_dir, project_folder_name)
    if not os.path.exists(project_dir):
        os.makedirs(project_dir)
