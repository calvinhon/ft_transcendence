#!/usr/bin/env python3
"""
Advanced image management tool for ft_transcendence
- Analyze existing screenshots
- Generate thumbnail gallery
- Compare image sizes before/after optimization
- Create image manifest for documentation
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime
import subprocess
import sys

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow not installed. Install with: pip3 install Pillow")
    sys.exit(1)


class ImageManager:
    def __init__(self, figures_dir="./documentation/project-report/figures"):
        self.figures_dir = Path(figures_dir)
        self.images = []
        self.load_images()

    def load_images(self):
        """Load all image files from directory"""
        if not self.figures_dir.exists():
            print(f"❌ Directory not found: {self.figures_dir}")
            return

        for img_path in sorted(self.figures_dir.glob("*.png")):
            self.images.append(img_path)

    def get_image_info(self, img_path):
        """Extract image metadata"""
        try:
            img = Image.open(img_path)
            size = img_path.stat().st_size
            
            return {
                "filename": img_path.name,
                "path": str(img_path),
                "size_bytes": size,
                "size_mb": size / (1024 * 1024),
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "dpi": img.info.get('dpi', (72, 72)),
            }
        except Exception as e:
            return {"filename": img_path.name, "error": str(e)}

    def analyze(self):
        """Analyze all images and print statistics"""
        print("\n" + "=" * 80)
        print("📊 IMAGE ANALYSIS REPORT")
        print("=" * 80 + "\n")

        if not self.images:
            print("❌ No images found!")
            return

        print(f"📁 Directory: {self.figures_dir}")
        print(f"📸 Total images: {len(self.images)}\n")

        total_size = 0
        dimensions = {}
        formats = {}

        print(f"{'Filename':<45} {'Size':<12} {'Dimensions':<15} {'DPI'}")
        print("-" * 90)

        for img_path in self.images:
            info = self.get_image_info(img_path)
            
            if "error" not in info:
                total_size += info["size_bytes"]
                
                dim_key = f"{info['width']}x{info['height']}"
                dimensions[dim_key] = dimensions.get(dim_key, 0) + 1
                
                fmt = info["format"]
                formats[fmt] = formats.get(fmt, 0) + 1
                
                size_str = f"{info['size_mb']:.2f} MB"
                dim_str = f"{info['width']}x{info['height']}"
                dpi = info['dpi'][0] if isinstance(info['dpi'], tuple) else info['dpi']
                
                print(f"{info['filename']:<45} {size_str:<12} {dim_str:<15} {dpi}")

        print("-" * 90)
        print(f"{'TOTAL':<45} {total_size / (1024*1024):.2f} MB\n")

        print("📐 Dimensions Summary:")
        for dim, count in sorted(dimensions.items(), key=lambda x: -x[1]):
            print(f"   {dim}: {count} image(s)")

        print(f"\n🎨 Format Summary:")
        for fmt, count in sorted(formats.items(), key=lambda x: -x[1]):
            print(f"   {fmt}: {count} image(s)")

        print(f"\n💾 Average size: {total_size / len(self.images) / (1024*1024):.2f} MB")
        print(f"📊 Total size: {total_size / (1024*1024):.2f} MB\n")

    def generate_manifest(self, output_file="figures_manifest.json"):
        """Generate JSON manifest of all figures"""
        manifest = {
            "generated": datetime.now().isoformat(),
            "directory": str(self.figures_dir),
            "image_count": len(self.images),
            "images": []
        }

        for img_path in self.images:
            info = self.get_image_info(img_path)
            if "error" not in info:
                manifest["images"].append({
                    "filename": info["filename"],
                    "size_mb": round(info["size_mb"], 2),
                    "dimensions": f"{info['width']}x{info['height']}",
                    "format": info["format"],
                })

        output_path = self.figures_dir.parent / output_file
        with open(output_path, 'w') as f:
            json.dump(manifest, f, indent=2)

        print(f"✅ Manifest generated: {output_path}")

    def generate_gallery_html(self, output_file="figures_gallery.html"):
        """Generate HTML gallery preview"""
        html = """<!DOCTYPE html>
<html>
<head>
    <title>ft_transcendence - Screenshots Gallery</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .image-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .image-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .image-card img {
            width: 100%;
            height: auto;
            display: block;
        }
        .image-info {
            padding: 12px;
            background: #fafafa;
        }
        .filename {
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
        }
        .dimensions {
            font-size: 12px;
            color: #666;
        }
        .generated-time {
            color: #999;
            font-size: 12px;
            text-align: right;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>📸 ft_transcendence Screenshots Gallery</h1>
    <p>Auto-generated from figures/ directory</p>
    <div class="gallery">
"""

        for img_path in self.images:
            info = self.get_image_info(img_path)
            if "error" not in info:
                rel_path = f"figures/{info['filename']}"
                html += f"""        <div class="image-card">
            <img src="{rel_path}" alt="{info['filename']}">
            <div class="image-info">
                <div class="filename">{info['filename']}</div>
                <div class="dimensions">{info['width']}×{info['height']} • {info['size_mb']:.2f}MB</div>
            </div>
        </div>
"""

        html += """    </div>
    <div class="generated-time">Generated: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</div>
</body>
</html>
"""

        output_path = self.figures_dir.parent / output_file
        with open(output_path, 'w') as f:
            f.write(html)

        print(f"✅ Gallery generated: {output_path}")
        print(f"   Open in browser: {output_path.as_uri()}")

    def compare_latex_references(self):
        """Check if all figures are referenced in LaTeX"""
        tex_file = self.figures_dir.parent / "project_report.tex"
        
        if not tex_file.exists():
            print(f"❌ LaTeX file not found: {tex_file}")
            return

        with open(tex_file, 'r') as f:
            tex_content = f.read()

        print("\n" + "=" * 80)
        print("🔍 LATEX REFERENCES CHECK")
        print("=" * 80 + "\n")

        referenced = set()
        for img_path in self.images:
            if img_path.name in tex_content:
                referenced.add(img_path.name)
                print(f"✅ {img_path.name}")
            else:
                print(f"❌ {img_path.name} (NOT REFERENCED IN LATEX)")

        not_referenced = set(img.name for img in self.images) - referenced
        
        print(f"\n📊 Summary:")
        print(f"   Total figures: {len(self.images)}")
        print(f"   Referenced: {len(referenced)}")
        print(f"   Not referenced: {len(not_referenced)}")

        if not_referenced:
            print(f"\n⚠️  Unreferenced figures:")
            for filename in not_referenced:
                print(f"   - {filename}")

    def find_duplicates(self):
        """Find duplicate or similar images"""
        print("\n" + "=" * 80)
        print("🔍 FINDING DUPLICATE IMAGES")
        print("=" * 80 + "\n")

        try:
            from PIL import ImageChops
            import hashlib
        except ImportError:
            print("❌ PIL not available for duplicate detection")
            return

        hashes = {}
        for img_path in self.images:
            try:
                img = Image.open(img_path)
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Create hash of image content
                img_hash = hashlib.md5(img.tobytes()).hexdigest()
                
                if img_hash in hashes:
                    print(f"⚠️  Potential duplicate:")
                    print(f"   {hashes[img_hash].name}")
                    print(f"   {img_path.name}")
                else:
                    hashes[img_hash] = img_path
            except Exception as e:
                print(f"⚠️  Could not process {img_path.name}: {e}")

        if len(hashes) == len(self.images):
            print("✅ No duplicates found!")


def main():
    parser = argparse.ArgumentParser(description="Image management tool for ft_transcendence")
    parser.add_argument("--analyze", action="store_true", help="Analyze all images")
    parser.add_argument("--manifest", action="store_true", help="Generate JSON manifest")
    parser.add_argument("--gallery", action="store_true", help="Generate HTML gallery")
    parser.add_argument("--check-latex", action="store_true", help="Check LaTeX references")
    parser.add_argument("--find-duplicates", action="store_true", help="Find duplicate images")
    parser.add_argument("--all", action="store_true", help="Run all analyses")
    parser.add_argument("--figures-dir", default="./documentation/project-report/figures",
                        help="Path to figures directory")

    args = parser.parse_args()

    manager = ImageManager(args.figures_dir)

    if args.all or (not any([args.analyze, args.manifest, args.gallery, args.check_latex, args.find_duplicates])):
        args.analyze = args.manifest = args.gallery = args.check_latex = args.find_duplicates = True

    if args.analyze:
        manager.analyze()

    if args.manifest:
        manager.generate_manifest()

    if args.gallery:
        manager.generate_gallery_html()

    if args.check_latex:
        manager.compare_latex_references()

    if args.find_duplicates:
        manager.find_duplicates()


if __name__ == "__main__":
    main()
