#!/bin/bash

# Script to systematically replace user.userId with (user.userId || user.id)
# This fixes OAuth user compatibility across the frontend

cd /home/honguyen/ft_transcendence/frontend/src

# Backup files first
echo "Creating backups..."
find . -name "*.ts" -exec cp {} {}.bak \;

# Replace patterns - be careful with regex to avoid double-replacement
# Pattern 1: user.userId followed by any non-pipe character
find . -name "*.ts" -type f -print0 | while IFS= read -r -d '' file; do
    # Skip files that are backups
    if [[ $file == *.bak ]]; then
        continue
    fi
    
    echo "Processing: $file"
    
    # Use perl for more precise replacement
    perl -i -pe '
        # Skip lines that already have the fix
        next if /user\.userId\s*\|\|\s*user\.id/;
        
        # Replace user.userId (but not if already fixed)
        s/\buser\.userId\b/\(user.userId || user.id\)/g;
    ' "$file"
done

echo "Done! Backups saved with .bak extension"
echo "To restore backups: find . -name '*.bak' -exec sh -c 'mv \"\$1\" \"\${1%.bak}\"' _ {} \;"
