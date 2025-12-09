#!/usr/bin/env python3
"""
Convert Beamer PDF to PowerPoint PPTX
"""
import os
import subprocess
import sys

def pdf_to_pptx(pdf_path, pptx_path):
    """Convert PDF to PPTX using LibreOffice Impress"""
    try:
        # Method 1: Try libreoffice command
        cmd = [
            'libreoffice',
            '--headless',
            '--convert-to', 'pptx',
            '--outdir', os.path.dirname(pptx_path),
            pdf_path
        ]
        print(f"Converting {pdf_path} to PPTX...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            # LibreOffice creates file with same name but .pptx extension
            base_name = os.path.splitext(os.path.basename(pdf_path))[0]
            generated_pptx = os.path.join(os.path.dirname(pptx_path), f"{base_name}.pptx")
            
            if os.path.exists(generated_pptx):
                # Rename if needed
                if generated_pptx != pptx_path:
                    os.rename(generated_pptx, pptx_path)
                print(f"✓ Successfully created: {pptx_path}")
                print(f"  File size: {os.path.getsize(pptx_path) / 1024:.1f} KB")
                return True
        else:
            print(f"LibreOffice error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("Conversion timeout")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    pdf_file = "/home/honguyen/ft_transcendence/documentation/capstone_final.pdf"
    pptx_file = "/home/honguyen/ft_transcendence/documentation/capstone_final.pptx"
    
    if not os.path.exists(pdf_file):
        print(f"Error: PDF file not found: {pdf_file}")
        sys.exit(1)
    
    success = pdf_to_pptx(pdf_file, pptx_file)
    sys.exit(0 if success else 1)
