#!/bin/sh
# Нова версія для всіх файлів сайту, щоб браузери не тримали старі копії.
# Запуск: sh tools/bump.sh
cd "$(dirname "$0")/.." || exit 1
V=$(date +%Y%m%d%H%M)
sed -i '' -E "s#(css/main\.css|js/main\.js)(\?v=[0-9a-z]+)?\"#\1?v=$V\"#g" index.html
for f in js/*.js; do
  sed -i '' -E "s#from '(\./[a-z0-9]+\.js)(\?v=[0-9a-z]+)?'#from '\1?v=$V'#g" "$f"
done
echo "версія $V"
