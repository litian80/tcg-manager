from PIL import Image
import os
import sys

def compress_image(path, max_size=(512, 512), quality=80):
    try:
        if not os.path.exists(path):
            print(f"File not found: {path}", file=sys.stderr)
            return

        print(f"Processing {path}...")
        initial_size = os.path.getsize(path) / 1024 / 1024
        print(f"Initial size: {initial_size:.2f} MB")

        with Image.open(path) as img:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            img.save(path, optimize=True, quality=quality)
        
        final_size = os.path.getsize(path) / 1024 / 1024
        print(f"Final size: {final_size:.2f} MB")
        print(f"Reduced by: {(initial_size - final_size) / initial_size * 100:.1f}%")

    except Exception as e:
        print(f"Error processing {path}: {e}", file=sys.stderr)

if __name__ == "__main__":
    base_dir = os.getcwd()
    target_files = [
        os.path.join(base_dir, 'app', 'icon.png'),
        os.path.join(base_dir, 'public', 'logo.png')
    ]

    for file_path in target_files:
        compress_image(file_path)
