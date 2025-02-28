scp -r ../potree root@8.140.48.78:~/potree

scp -r ./VID_20250228_065241_00_041 xz@8.222.180.47:~/
mv ./VID_20250228_065241_00_041 ~/www/viewer/sz_yssz
sudo chown www-data:www-data VID_20250228_065241_00_041


scp -r ./VID_20250228_065436_00_042 xz@8.222.180.47:~/

mv ./VID_20250228_065436_00_042 ~/www/viewer/sz_yssz
sudo chown www-data:www-data ~/www/viewer/sz_yssz/VID_20250228_065436_00_042
sudo chown www-data:www-data VID_20250228_065436_00_042

scp -r c:\Users\zhong\git\potree\workspace\04.html\VID_20250228_065241_00_041\ xz@8.222.180.47:~/

sudo chmod 755 *
sudo chown -R www-data:www-data *

