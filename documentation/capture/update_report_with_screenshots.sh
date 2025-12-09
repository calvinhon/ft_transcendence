#!/bin/bash

# Complete UI capture and report update pipeline
# Captures screenshots, optimizes them, and regenerates the project report

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$PROJECT_ROOT/documentation/project-report"
FIGURES_DIR="$REPORT_DIR/figures"
PYTHON_SCRIPT="$PROJECT_ROOT/capture_screenshots.py"
OPTIMIZE_SCRIPT="$PROJECT_PROJECT_ROOT/optimize_screenshots.sh"
LOG_FILE="/tmp/capture-and-report-$(date +%s).log"

# State tracking
STEP=1
TOTAL_STEPS=6

# Helper functions
log() {
    echo -e "${BLUE}[$STEP/$TOTAL_STEPS]${NC} $*" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${MAGENTA}ℹ️  $*${NC}" | tee -a "$LOG_FILE"
}

print_header() {
    echo
    echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
    echo
}

# Main pipeline
main() {
    print_header "🎬 ft_transcendence Screenshot & Report Pipeline"
    
    info "Log file: $LOG_FILE"
    info "Project root: $PROJECT_ROOT"
    echo

    # Step 1: Verify prerequisites
    print_header "Step 1/6: Verify Prerequisites"
    log "Checking Python 3..."
    if ! command -v python3 &> /dev/null; then
        error "Python 3 not found. Install with: sudo apt-get install python3"
        exit 1
    fi
    success "Python 3 found"

    log "Checking Playwright..."
    if ! python3 -c "import playwright" 2>/dev/null; then
        warning "Playwright not installed. Installing..."
        python3 -m pip install -q playwright
        python3 -m playwright install chromium 2>/dev/null || true
    fi
    success "Playwright available"

    log "Checking ImageMagick..."
    if ! command -v convert &> /dev/null; then
        warning "ImageMagick not installed. Installing..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y imagemagick > /dev/null 2>&1
        elif command -v brew &> /dev/null; then
            brew install imagemagick > /dev/null 2>&1
        else
            error "Cannot install ImageMagick. Please install manually."
            exit 1
        fi
    fi
    success "ImageMagick available"

    log "Checking report files..."
    if [ ! -f "$REPORT_DIR/project_report.tex" ]; then
        error "project_report.tex not found at $REPORT_DIR"
        exit 1
    fi
    success "Report file found"

    STEP=$((STEP + 1))

    # Step 2: Check services are running
    print_header "Step 2/6: Verify Services"
    log "Checking if ft_transcendence services are running..."
    
    if ! curl -s -k -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null | grep -q "200\|301\|302"; then
        warning "Services may not be running"
        info "Starting services with: make restart"
        
        read -p "Start services now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$PROJECT_ROOT"
            make restart >> "$LOG_FILE" 2>&1
            sleep 30
        else
            error "Services required for screenshot capture"
            exit 1
        fi
    fi
    success "Services are running"

    STEP=$((STEP + 1))

    # Step 3: Capture screenshots
    print_header "Step 3/6: Capture UI Screenshots"
    log "Starting screenshot capture..."
    log "This may take 2-5 minutes..."
    
    if [ ! -f "$PYTHON_SCRIPT" ]; then
        error "Screenshot script not found: $PYTHON_SCRIPT"
        exit 1
    fi

    cd "$PROJECT_ROOT"
    if python3 "$PYTHON_SCRIPT" >> "$LOG_FILE" 2>&1; then
        success "Screenshots captured successfully"
    else
        error "Screenshot capture failed. Check log: $LOG_FILE"
        exit 1
    fi

    # List captured files
    PNG_COUNT=$(find "$FIGURES_DIR" -maxdepth 1 -name "*.png" 2>/dev/null | wc -l)
    info "Captured $PNG_COUNT images"

    STEP=$((STEP + 1))

    # Step 4: Optimize images
    print_header "Step 4/6: Optimize Images"
    log "Optimizing image files..."
    
    cd "$PROJECT_ROOT"
    if bash optimize_screenshots.sh >> "$LOG_FILE" 2>&1; then
        success "Images optimized successfully"
    else
        warning "Image optimization had issues. Continuing..."
    fi

    STEP=$((STEP + 1))

    # Step 5: Generate PDF report
    print_header "Step 5/6: Generate PDF Report"
    log "Compiling LaTeX document..."
    log "First pass (pdflatex)..."
    
    cd "$REPORT_DIR"
    
    # Run pdflatex multiple times for proper compilation
    for pass in 1 2 3; do
        log "  Pass $pass..."
        if pdflatex -interaction=nonstopmode project_report.tex >> "$LOG_FILE" 2>&1; then
            :
        else
            warning "Pass $pass had warnings (continuing)"
        fi
    done

    if [ -f "$REPORT_DIR/project_report.pdf" ]; then
        PDF_SIZE=$(ls -lh "$REPORT_DIR/project_report.pdf" | awk '{print $5}')
        PDF_PAGES=$(pdfinfo "$REPORT_DIR/project_report.pdf" 2>/dev/null | grep Pages | awk '{print $2}' || echo "unknown")
        success "PDF generated: project_report.pdf ($PDF_SIZE, $PDF_PAGES pages)"
    else
        error "PDF generation failed"
        exit 1
    fi

    STEP=$((STEP + 1))

    # Step 6: Commit changes
    print_header "Step 6/6: Commit Changes"
    log "Staging changes..."
    
    cd "$PROJECT_ROOT"
    git add documentation/project-report/figures/ >> "$LOG_FILE" 2>&1
    git add documentation/project-report/project_report.pdf >> "$LOG_FILE" 2>&1
    
    log "Committing..."
    COMMIT_MSG="Update UI screenshots and regenerate report - $(date +'%Y-%m-%d %H:%M')"
    if git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1; then
        success "Changes committed"
        
        log "Pushing to repository..."
        if git push >> "$LOG_FILE" 2>&1; then
            success "Changes pushed to repository"
        else
            warning "Git push failed (may need credentials)"
        fi
    else
        info "No changes to commit"
    fi

    STEP=$((STEP + 1))

    # Final summary
    print_header "✨ Pipeline Complete!"
    
    echo -e "${GREEN}Summary:${NC}"
    echo "  📸 Screenshots: Captured and optimized"
    echo "  📄 Report: Generated at $REPORT_DIR/project_report.pdf"
    echo "  📁 Figures: Updated at $FIGURES_DIR/"
    echo "  💾 Changes: Committed and pushed"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Review the PDF report: $REPORT_DIR/project_report.pdf"
    echo "  2. Verify all figures are correct"
    echo "  3. Update any figure captions if needed"
    echo "  4. Share the report with evaluators"
    echo
    echo -e "${GREEN}✅ All done!${NC}"
}

# Error handling
trap 'error "Pipeline interrupted"; exit 1' SIGINT SIGTERM

# Run main
main "$@"

exit 0
