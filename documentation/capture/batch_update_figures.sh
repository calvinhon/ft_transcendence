#!/bin/bash

# Batch figure update script
# Captures selected figures, optimizes, and updates report
# Usage: bash batch_update_figures.sh [category] [--no-optimize] [--no-pdf]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/documentation/project-report"
FIGURES_DIR="$REPORT_DIR/figures"
CAPTURE_SCRIPT="$SCRIPT_DIR/capture_screenshots_enhanced.py"
OPTIMIZE_SCRIPT="$SCRIPT_DIR/optimize_screenshots.sh"

# Parse arguments
CATEGORY="${1:-all}"
NO_OPTIMIZE=false
NO_PDF=false

for arg in "$@"; do
    case $arg in
        --no-optimize) NO_OPTIMIZE=true ;;
        --no-pdf) NO_PDF=true ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_header() {
    echo
    echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
    echo
}

log() {
    echo -e "${BLUE}▸${NC} $*"
}

success() {
    echo -e "${GREEN}✅${NC} $*"
}

error() {
    echo -e "${RED}❌${NC} $*"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $*"
}

# Step 1: List available categories if requested
if [ "$CATEGORY" = "list" ]; then
    echo -e "${MAGENTA}Available capture categories:${NC}"
    python3 "$CAPTURE_SCRIPT" --list-categories
    exit 0
fi

if [ "$CATEGORY" = "list-flows" ]; then
    python3 "$CAPTURE_SCRIPT" --list-flows
    exit 0
fi

print_header "Batch Figure Update Pipeline"

log "Configuration:"
log "  Category: ${CATEGORY:-all}"
log "  Optimize: ${NO_OPTIMIZE:-true}"
log "  PDF Update: ${NO_PDF:-true}"
echo

# Step 2: Capture figures
print_header "Step 1: Capture Screenshots"

log "Starting capture process..."

if [ "$CATEGORY" = "all" ]; then
    python3 "$CAPTURE_SCRIPT" 2>&1 | tee /tmp/capture_output.log
else
    log "Capturing category: $CATEGORY"
    python3 "$CAPTURE_SCRIPT" --category "$CATEGORY" 2>&1 | tee /tmp/capture_output.log
fi

if [ $? -ne 0 ]; then
    error "Screenshot capture failed"
    exit 1
fi

success "Screenshots captured"

# Step 3: Optimize images
if [ "$NO_OPTIMIZE" = false ]; then
    print_header "Step 2: Optimize Images"
    
    log "Optimizing images..."
    bash "$OPTIMIZE_SCRIPT" 2>&1 | tail -20
    
    if [ $? -ne 0 ]; then
        warning "Image optimization had issues, continuing..."
    else
        success "Images optimized"
    fi
else
    log "Skipping image optimization (--no-optimize)"
fi

# Step 4: Update PDF report
if [ "$NO_PDF" = false ]; then
    print_header "Step 3: Regenerate PDF Report"
    
    log "Compiling LaTeX document..."
    cd "$REPORT_DIR"
    
    # Run pdflatex
    if pdflatex -interaction=nonstopmode project_report.tex > /tmp/pdflatex.log 2>&1; then
        success "PDF compiled successfully"
    else
        warning "PDF compilation had issues"
        tail -20 /tmp/pdflatex.log
    fi
    
    if [ -f "$REPORT_DIR/project_report.pdf" ]; then
        PDF_SIZE=$(ls -lh "$REPORT_DIR/project_report.pdf" | awk '{print $5}')
        success "Report updated: $PDF_SIZE"
    fi
else
    log "Skipping PDF regeneration (--no-pdf)"
fi

# Step 5: Summary
print_header "Update Complete"

log "Updated figures:"
ls -lh "$FIGURES_DIR"/*.png 2>/dev/null | wc -l
echo " images"

log "Report location:"
ls -lh "$REPORT_DIR/project_report.pdf" 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

success "All done!"
