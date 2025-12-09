#!/usr/bin/env python3
"""Create PPTX from PDF-converted images"""
import os
import shutil
import zipfile
from pathlib import Path
from xml.dom import minidom

def create_minimal_pptx(images_dir, output_file):
    """Create minimal PPTX with images as slides"""
    
    # Get all PNG images
    images = sorted(Path(images_dir).glob("pdf_page-*.png"))
    if not images:
        print(f"No images found in {images_dir}")
        return False
    
    print(f"Found {len(images)} images")
    
    # Create temporary directory for PPTX structure
    pptx_temp = "/tmp/pptx_temp"
    if os.path.exists(pptx_temp):
        shutil.rmtree(pptx_temp)
    os.makedirs(pptx_temp)
    
    # Create directory structure
    os.makedirs(f"{pptx_temp}/_rels")
    os.makedirs(f"{pptx_temp}/ppt/slides/_rels")
    os.makedirs(f"{pptx_temp}/ppt/slideLayouts/_rels")
    os.makedirs(f"{pptx_temp}/ppt/slideMasters/_rels")
    os.makedirs(f"{pptx_temp}/ppt/media")
    os.makedirs(f"{pptx_temp}/docProps")
    os.makedirs(f"{pptx_temp}/xl/_rels")
    
    # Copy images
    for i, img_path in enumerate(images, 1):
        dest = f"{pptx_temp}/ppt/media/image{i}.png"
        shutil.copy(str(img_path), dest)
        print(f"  Copied image {i}")
    
    # Create [Content_Types].xml
    content_types_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>'''
    
    # Write basic XML files
    with open(f"{pptx_temp}/[Content_Types].xml", "w") as f:
        f.write(content_types_xml)
    
    # Generate slides
    for i in range(1, len(images) + 1):
        slide_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:off x="0" y="0"/>
          <a:ext cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="2" name="image{i}.png"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId{i}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:off x="0" y="0"/>
            <a:ext cx="9144000" cy="6858000"/>
          </a:xfrm>
          <a:prstGeom prst="rect" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:avLst/>
          </a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></p:clrMapOvr>
</p:sld>'''
        with open(f"{pptx_temp}/ppt/slides/slide{i}.xml", "w") as f:
            f.write(slide_xml)
    
    print("✓ Created PPTX structure")
    print("Note: For a fully functional PPTX, use LibreOffice with an ODP intermediate format")
    return True

if __name__ == "__main__":
    create_minimal_pptx("/tmp", "capstone_final.pptx")
