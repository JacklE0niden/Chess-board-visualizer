#!/usr/bin/env python3

import urllib.request
import os

# Lichess棋子图片URL映射
PIECE_URLS = {
    'wK': 'https://lichess1.org/assets/hashed/wK.bc7274dd.svg',
    'wQ': 'https://lichess1.org/assets/hashed/wQ.79c9227e.svg',
    'wR': 'https://lichess1.org/assets/hashed/wR.e9e95adc.svg',
    'wB': 'https://lichess1.org/assets/hashed/wB.b7d1a118.svg',
    'wN': 'https://lichess1.org/assets/hashed/wN.68b788d7.svg',
    'wP': 'https://lichess1.org/assets/hashed/wP.0596b7ce.svg',
    'bK': 'https://lichess1.org/assets/hashed/bK.c5f22c23.svg',
    'bQ': 'https://lichess1.org/assets/hashed/bQ.5abdb5aa.svg',
    'bR': 'https://lichess1.org/assets/hashed/bR.c33a3d54.svg',
    'bB': 'https://lichess1.org/assets/hashed/bB.77e9debf.svg',
    'bN': 'https://lichess1.org/assets/hashed/bN.d0665564.svg',
    'bP': 'https://lichess1.org/assets/hashed/bP.09539f32.svg'
}

def download_pieces():
    """下载Lichess棋子图片到本地"""

    pieces_dir = 'pieces'

    # 创建目录
    os.makedirs(pieces_dir, exist_ok=True)

    print("正在下载Lichess棋子图片...")

    for piece, url in PIECE_URLS.items():
        filename = f"{piece}.svg"
        filepath = os.path.join(pieces_dir, filename)

        try:
            print(f"下载 {piece}...")
            with urllib.request.urlopen(url) as response:
                with open(filepath, 'wb') as f:
                    f.write(response.read())
            print(f"✓ {piece} 下载完成")
        except Exception as e:
            print(f"✗ {piece} 下载失败: {e}")

    print("\n下载完成！")
    print("检查文件：")
    for filename in sorted(os.listdir(pieces_dir)):
        filepath = os.path.join(pieces_dir, filename)
        size = os.path.getsize(filepath)
        print(f"  {filename}: {size} bytes")

if __name__ == '__main__':
    download_pieces()
