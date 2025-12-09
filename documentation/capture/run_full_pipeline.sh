#!/bin/bash

# Simple wrapper for full capture and report pipeline
# Usage: ./documentation/capture/run_full_pipeline.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_SCRIPT="$SCRIPT_DIR/update_report_with_screenshots.sh"

if [ ! -f "$PIPELINE_SCRIPT" ]; then
    echo "❌ Pipeline script not found: $PIPELINE_SCRIPT"
    exit 1
fi

# Run the full pipeline
bash "$PIPELINE_SCRIPT" "$@"
