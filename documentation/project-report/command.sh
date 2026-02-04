#!/bin/bash

# Complete LaTeX compilation script with bibliography and SyncTeX support
# Ensures bidirectional synchronization between LaTeX source and PDF

set -e  # Exit on any error

echo "=== LaTeX Compilation with Bibliography and SyncTeX ==="
echo "Starting compilation at: $(date)"
echo ""

# Document name (without .tex extension)
DOC_NAME="project_report_revised"

# Step 1: Clean all auxiliary files to avoid stale references and encoding issues
echo "1. Cleaning auxiliary files..."
chown -f $USER:$USER *.aux *.log *.toc *.out *.bbl *.blg *.fdb_latexmk *.fls *.synctex.gz *.nav *.snm *.vrb 2>/dev/null || true

rm -f *.aux *.log *.toc *.out *.bbl *.blg *.fdb_latexmk *.fls *.synctex.gz *.nav *.snm *.vrb
echo "   ✓ Auxiliary files cleaned"

# Step 2: First LaTeX compilation (generates .aux file for bibliography)
echo "2. First LaTeX compilation..."
pdflatex -synctex=1 -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape ${DOC_NAME}.tex
if [ $? -eq 0 ]; then
    echo "   ✓ First compilation successful"
else
    echo "   ✗ First compilation failed"
    exit 1
fi

# Step 3: Check if bibliography file exists and process it
echo "3. Processing bibliography..."
if [ -f "${DOC_NAME}.aux" ] && grep -q "\\citation" "${DOC_NAME}.aux" 2>/dev/null; then
    bibtex -terse ${DOC_NAME}
    if [ $? -eq 0 ]; then
        echo "   ✓ BibTeX processing successful"
        BIB_PROCESSED=true
    else
        echo "   ✗ BibTeX processing failed"
        exit 1
    fi
else
    echo "   ℹ No citations found, skipping BibTeX"
    BIB_PROCESSED=false
fi

# Step 4: Second LaTeX compilation (integrates bibliography)
echo "4. Second LaTeX compilation..."
pdflatex -synctex=1 -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape ${DOC_NAME}.tex
if [ $? -eq 0 ]; then
    echo "   ✓ Second compilation successful"
else
    echo "   ✗ Second compilation failed"
    exit 1
fi

# Step 5: Final LaTeX compilation (resolves all cross-references and citations)
echo "5. Final LaTeX compilation..."
pdflatex -synctex=1 -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape ${DOC_NAME}.tex
if [ $? -eq 0 ]; then
    echo "   ✓ Final compilation successful"
else
    echo "   ✗ Final compilation failed"
    exit 1
fi

# Step 6: Verification and summary
echo ""
echo "=== Compilation Summary ==="

# Check PDF generation
if [ -f "${DOC_NAME}.pdf" ]; then
    PDF_SIZE=$(stat -c%s "${DOC_NAME}.pdf" 2>/dev/null || echo 0)
    PDF_SIZE_MB=$(echo "scale=2; $PDF_SIZE/1024/1024" | bc 2>/dev/null || echo "unknown")
    echo "✓ PDF generated: ${DOC_NAME}.pdf (${PDF_SIZE_MB} MB)"
else
    echo "✗ PDF generation failed"
    exit 1
fi

# Check SyncTeX generation
if [ -f "${DOC_NAME}.synctex.gz" ]; then
    echo "✓ SyncTeX file generated: ${DOC_NAME}.synctex.gz"
    echo "   → Bidirectional synchronization enabled"
else
    echo "⚠ SyncTeX file not found - forward/inverse search may not work"
fi

# Check bibliography integration
if [ "$BIB_PROCESSED" = true ] && [ -f "${DOC_NAME}.bbl" ]; then
    BIB_ENTRIES=$(grep -c "\\bibitem{" "${DOC_NAME}.bbl" 2>/dev/null || echo 0)
    echo "✓ Bibliography integrated: $BIB_ENTRIES reference(s)"
else
    echo "ℹ No bibliography processed"
fi

# Check for warnings
if [ -f "${DOC_NAME}.log" ]; then
    WARNINGS=$(grep -c "LaTeX Warning" "${DOC_NAME}.log" 2>/dev/null || echo 0)
    ERRORS=$(grep -c "LaTeX Error" "${DOC_NAME}.log" 2>/dev/null || echo 0)
    
    if [ "$ERRORS" -gt 0 ]; then
        echo "⚠ $ERRORS error(s) found - check ${DOC_NAME}.log"
    elif [ "$WARNINGS" -gt 0 ]; then
        echo "⚠ $WARNINGS warning(s) found - check ${DOC_NAME}.log"
    else
        echo "✓ No errors or warnings detected"
    fi
fi

echo ""
echo "🎉 Compilation completed successfully!"
echo "📄 Output: ${DOC_NAME}.pdf"
echo "🔗 SyncTeX: ${DOC_NAME}.synctex.gz"
echo "📚 Bibliography: ${DOC_NAME}.bbl"
echo "📋 Log: ${DOC_NAME}.log"
echo ""
echo "✅ Ready for viewing with bidirectional SyncTeX support"
echo "   • Forward search: Ctrl+Click in editor → jumps to PDF location"
echo "   • Inverse search: Ctrl+Click in PDF → jumps to source location"