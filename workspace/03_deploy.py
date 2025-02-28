import paramiko
import os

def upload_directory(local_path, remote_path, hostname, username, password):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname, username=username, password=password)

    sftp = ssh.open_sftp()
    for root, dirs, files in os.walk(local_path):
        remote_root = os.path.join(remote_path, os.path.relpath(root, local_path))
        try:
            sftp.mkdir(remote_root)
        except IOError:
            pass  # 目录已存在
        for file in files:
            sftp.put(os.path.join(root, file), os.path.join(remote_root, file))
    
    sftp.close()
    ssh.close()

# 使用示例
upload_directory('c:\\abc', '/home', '10.0.0.1', 'username', 'password')
