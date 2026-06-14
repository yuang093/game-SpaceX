"""
恢復 heavy 與 block1 使用色度去背
（rembg AI 在煙霧複雜場景中表現不佳）
"""
import sys
sys.path.insert(0, r'D:\game\assets\rockets')
from _process import process_one, MAPPING

# 強制重做 heavy 和 block1
print('=== 恢復 heavy 與 block1 色度去背 ===')
process_one('heavy', MAPPING['heavy'])
process_one('starship_block1', MAPPING['starship_block1'])
print('✅ 完成')
