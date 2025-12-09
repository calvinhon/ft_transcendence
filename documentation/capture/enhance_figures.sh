#!/bin/bash

# Enhance figure quality by increasing DPI and resolution
# This improves print quality while maintaining reasonable file sizes

set -e

FIGURES_DIR="./documentation/project-report/figures"
BACKUP_DIR="$FIGURES_DIR/../figures_backup/figures_enhanced_$(date +%s)"
OUTPUT_LOG="/tmp/enhance_figures.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check ImageMagick
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not installed${NC}"
    exit 1
fi

echo -e "${BLUE}🖼️  Figure Quality Enhancement Tool${NC}"
echo -e "${BLUE}📁 Target directory: $FIGURES_DIR${NC}"
echo

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp "$FIGURES_DIR"/*.png "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
echo

# Count files
PNG_COUNT=$(find "$FIGURES_DIR" -maxdepth 1 -name "*.png" | wc -l)
echo -e "${BLUE}Processing $PNG_COUNT PNG files...${NC}"
echo

: > "$OUTPUT_LOG"

PROCESSED=0
TOTAL_SIZE_BEFORE=0
TOTAL_SIZE_AFTER=0

# Enhancement parameters
# For diagrams: higher resolution
# For screenshots: balanced quality and size
TARGET_DPI=300  # Print quality DPI

for img in "$FIGURES_DIR"/*.png; do
    if [ ! -f "$img" ]; then
        continue
    fi

    filename=$(basename "$img")
    size_before=$(stat -c%s "$img")
    TOTAL_SIZE_BEFORE=$((TOTAL_SIZE_BEFORE + size_before))

    echo -n "  ⚙️  $filename ... "

    # Get current dimensions
    width=$(identify -format "%w" "$img")
    height=$(identify -format "%h" "$img")

    # Determine enhancement strategy based on file size
    # Large files (diagrams) - enhance more aggressively
    # Small files (screenshots) - enhance carefully
    
    if [ "$size_before" -gt 100000 ]; then
        # Diagram file - apply heavy enhancement
        echo -n "[diagram] "
        
        # Upscale to 150% for better print quality
        new_width=$((width * 150 / 100))
        new_height=$((height * 150 / 100))
        
        convert "$img" \
            -filter Lanczos \
            -resize "${new_width}x${new_height}" \
            -quality 95 \
            -density "${TARGET_DPI}x${TARGET_DPI}" \
            -units PixelsPerInch \
            "$img" 2>> "$OUTPUT_LOG"
            
    else
        # Screenshot file - light enhancement
        echo -n "[screenshot] "
        
        # Upscale to 120% for better clarity
        new_width=$((width * 120 / 100))
        new_height=$((height * 120 / 100))
        
        convert "$img" \
            -filter Lanczos \
            -resize "${new_width}x${new_height}" \
            -enhance \
            -sharpen 0.5x1 \
            -quality 92 \
            -density "${TARGET_DPI}x${TARGET_DPI}" \
            -units PixelsPerInch \
            "$img" 2>> "$OUTPUT_LOG"
    fi

    size_after=$(stat -c%s "$img")
    TOTAL_SIZE_AFTER=$((TOTAL_SIZE_AFTER + size_after))

    size_change=$(( (size_after - size_before) * 100 / size_before ))
    
    if [ "$size_change" -gt 0 ]; then
        printf "${GREEN}✓${NC} (+${size_change}%%)\n"
    else
        printf "${GREEN}✓${NC} (${size_change}%%)\n"
    fi

    PROCESSED=$((PROCESSED + 1))
done

echo
echo -e "${GREEN}✅ Enhancement Complete!${NC}"
echo -e "  ${BLUE}Files processed:${NC} $PROCESSED"
echo -e "  ${BLUE}Size before:${NC} $(echo "scale=2; $TOTAL_SIZE_BEFORE / 1048576" | bc) MB"
echo -e "  ${BLUE}Size after:${NC} $(echo "scale=2; $TOTAL_SIZE_AFTER / 1048576" | bc) MB"
echo -e "  ${BLUE}DPI set to:${NC} ${TARGET_DPI}x${TARGET_DPI}"
echo

echo -e "${BLUE}📊 Enhanced files:${NC}"
ls -lh "$FIGURES_DIR"/*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo
echo -e "${GREEN}✨ All figures enhanced for print quality!${NC}"
