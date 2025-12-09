#!/bin/bash

# Image optimization and conversion script for ft_transcendence screenshots
# Optimizes PNG/JPG files to reduce file size while maintaining quality

set -e

FIGURES_DIR="./documentation/project-report/figures"
OUTPUT_LOG="/tmp/optimize_figures.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not installed. Install with:${NC}"
    echo "   sudo apt-get install imagemagick"
    exit 1
fi

# Create output log
: > "$OUTPUT_LOG"

echo -e "${BLUE}🖼️  Image Optimization Tool${NC}"
echo -e "${BLUE}📁 Target directory: $FIGURES_DIR${NC}"
echo

# Check if directory exists
if [ ! -d "$FIGURES_DIR" ]; then
    echo -e "${RED}❌ Directory not found: $FIGURES_DIR${NC}"
    exit 1
fi

# Count files
PNG_COUNT=$(find "$FIGURES_DIR" -maxdepth 1 -name "*.png" | wc -l)
JPG_COUNT=$(find "$FIGURES_DIR" -maxdepth 1 -name "*.jpg" -o -name "*.jpeg" | wc -l)
TOTAL=$((PNG_COUNT + JPG_COUNT))

if [ $TOTAL -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No image files found in $FIGURES_DIR${NC}"
    exit 0
fi

echo -e "${YELLOW}Found: $PNG_COUNT PNG files, $JPG_COUNT JPG files${NC}"
echo -e "${YELLOW}Processing...${NC}"
echo

PROCESSED=0
TOTAL_SIZE_BEFORE=0
TOTAL_SIZE_AFTER=0

# Process PNG files
echo -e "${BLUE}Processing PNG files...${NC}"
for img in "$FIGURES_DIR"/*.png; do
    if [ ! -f "$img" ]; then
        continue
    fi

    filename=$(basename "$img")
    size_before=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img")
    TOTAL_SIZE_BEFORE=$((TOTAL_SIZE_BEFORE + size_before))

    # Optimize PNG: reduce colors, strip metadata, optimize compression
    # Quality 85 is optimal for screenshots - maintains clarity while reducing size
    convert "$img" \
        -quality 85 \
        -strip \
        -interlace Plane \
        -define png:compression-level=9 \
        "$img" 2>> "$OUTPUT_LOG"

    size_after=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img")
    TOTAL_SIZE_AFTER=$((TOTAL_SIZE_AFTER + size_after))

    reduction=$(( (size_before - size_after) * 100 / size_before ))
    
    if [ $reduction -gt 0 ]; then
        printf "  %-45s ${GREEN}✓${NC} %d%% smaller\n" "$filename" "$reduction"
    else
        printf "  %-45s ${YELLOW}~${NC} No change\n" "$filename"
    fi

    PROCESSED=$((PROCESSED + 1))
done

# Process JPG files (convert to PNG if needed)
echo -e "${BLUE}Processing JPG files...${NC}"
for img in "$FIGURES_DIR"/*.{jpg,jpeg} 2>/dev/null || true; do
    if [ ! -f "$img" ]; then
        continue
    fi

    filename=$(basename "$img")
    
    # Convert JPG to PNG for better quality
    png_file="${img%.*}.png"
    echo "  Converting $filename to PNG..."
    convert "$img" "$png_file"
    
    # Optimize the new PNG
    convert "$png_file" \
        -quality 90 \
        -strip \
        -interlace Plane \
        "$png_file" 2>> "$OUTPUT_LOG"
    
    # Remove original JPG
    rm "$img"
    printf "  %-45s ${GREEN}✓${NC} Converted to PNG\n" "$filename"
    
    PROCESSED=$((PROCESSED + 1))
done

echo

# Calculate statistics
if [ $TOTAL_SIZE_BEFORE -gt 0 ]; then
    TOTAL_REDUCTION=$(( (TOTAL_SIZE_BEFORE - TOTAL_SIZE_AFTER) * 100 / TOTAL_SIZE_BEFORE ))
    SIZE_BEFORE_MB=$(echo "scale=2; $TOTAL_SIZE_BEFORE / 1048576" | bc)
    SIZE_AFTER_MB=$(echo "scale=2; $TOTAL_SIZE_AFTER / 1048576" | bc)
    
    echo -e "${GREEN}✅ Optimization Complete!${NC}"
    echo -e "  ${BLUE}Files processed:${NC} $PROCESSED"
    echo -e "  ${BLUE}Size before:${NC} ${SIZE_BEFORE_MB} MB"
    echo -e "  ${BLUE}Size after:${NC} ${SIZE_AFTER_MB} MB"
    echo -e "  ${BLUE}Total reduction:${NC} ${GREEN}${TOTAL_REDUCTION}%${NC}"
else
    echo -e "${YELLOW}⚠️  No files were processed${NC}"
fi

echo

# Generate file list
echo -e "${BLUE}📋 Generated files:${NC}"
ls -lh "$FIGURES_DIR"/*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

# Optional: Remove backup files if ImageMagick created any
find "$FIGURES_DIR" -name "*.png~" -delete 2>/dev/null || true

echo -e "${GREEN}✨ Done!${NC}"
