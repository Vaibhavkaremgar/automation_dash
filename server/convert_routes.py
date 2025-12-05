#!/usr/bin/env python3
"""
Automated PostgreSQL to SQLite Route Converter
Converts pool.query() calls to SQLite get/run/all helpers
"""

import re
import os

def convert_file(filepath):
    """Convert a single file from PostgreSQL to SQLite syntax"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Step 1: Replace imports
    content = re.sub(
        r"const pool = require\('\.\.\/\.\.\/db'\);",
        "const { get, run, all } = require('../db/connection');",
        content
    )
    
    # Step 2: Convert pool.query with RETURNING (INSERT/UPDATE)
    # Pattern: await pool.query('...RETURNING...', [...])
    def replace_returning_query(match):
        indent = match.group(1)
        query = match.group(2)
        params = match.group(3)
        
        # Check if it's INSERT or UPDATE
        if 'INSERT' in query.upper():
            return f"{indent}const result = await run({query}, {params});"
        elif 'UPDATE' in query.upper() or 'DELETE' in query.upper():
            return f"{indent}const result = await run({query}, {params});"
        else:
            return match.group(0)
    
    content = re.sub(
        r"(\s+)(?:const result = )?await pool\.query\(([^,]+RETURNING[^,]+),\s*(\[[^\]]*\])\)",
        replace_returning_query,
        content,
        flags=re.IGNORECASE
    )
    
    # Step 3: Convert pool.query for SELECT single row
    # Pattern: const result = await pool.query('SELECT...', [...])
    #          const user = result.rows[0]
    content = re.sub(
        r"const result = await pool\.query\(([^,]+),\s*(\[[^\]]*\])\);\s*\n\s*const (\w+) = result\.rows\[0\];",
        r"const \3 = await get(\1, \2);",
        content
    )
    
    # Step 4: Convert pool.query for SELECT multiple rows
    # Pattern: const result = await pool.query('SELECT...', [...])
    #          ... result.rows
    content = re.sub(
        r"const result = await pool\.query\(([^,]+),\s*(\[[^\]]*\])\);",
        r"const result = await all(\1, \2);",
        content
    )
    
    # Step 5: Replace result.rows with result (for all() calls)
    content = re.sub(r"result\.rows", "result", content)
    
    # Step 6: Replace result.rowCount with result.changes
    content = re.sub(r"result\.rowCount", "result.changes", content)
    
    # Step 7: Convert $1, $2, $3 placeholders to ?
    def replace_placeholders(match):
        query = match.group(0)
        # Count how many $N placeholders
        max_placeholder = 0
        for m in re.finditer(r'\$(\d+)', query):
            max_placeholder = max(max_placeholder, int(m.group(1)))
        
        # Replace all $N with ?
        for i in range(max_placeholder, 0, -1):
            query = query.replace(f'${i}', '?')
        
        return query
    
    # Find all SQL queries and replace placeholders
    content = re.sub(
        r"'[^']*\$\d+[^']*'",
        replace_placeholders,
        content
    )
    content = re.sub(
        r'`[^`]*\$\d+[^`]*`',
        replace_placeholders,
        content
    )
    
    # Step 8: Replace ILIKE with LIKE
    content = re.sub(r'\bILIKE\b', 'LIKE', content, flags=re.IGNORECASE)
    
    # Step 9: Remove pool.connect() transaction blocks
    content = re.sub(
        r"const client = await pool\.connect\(\);[\s\S]*?try\s*\{[\s\S]*?await client\.query\('BEGIN'\);",
        "try {",
        content
    )
    content = re.sub(
        r"await client\.query\('COMMIT'\);",
        "",
        content
    )
    content = re.sub(
        r"await client\.query\('ROLLBACK'\);",
        "",
        content
    )
    content = re.sub(
        r"client\.release\(\);",
        "",
        content
    )
    
    # Step 10: Fix paramIndex patterns (PostgreSQL specific)
    content = re.sub(
        r"let paramIndex = \d+;[\s\S]*?paramIndex\+\+;",
        "",
        content
    )
    content = re.sub(
        r"\$\{paramIndex\}",
        "?",
        content
    )
    
    # Only write if changes were made
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Convert all route files"""
    routes_dir = os.path.join(os.path.dirname(__file__), 'src', 'routes')
    
    files_to_convert = [
        'admin.js',
        'jobs.js',
        'email.js',
        'analytics.js'
    ]
    
    converted = []
    for filename in files_to_convert:
        filepath = os.path.join(routes_dir, filename)
        if os.path.exists(filepath):
            if convert_file(filepath):
                converted.append(filename)
                print(f"[OK] Converted {filename}")
            else:
                print(f"[SKIP] Skipped {filename} (no changes needed)")
        else:
            print(f"[ERROR] File not found: {filename}")
    
    print(f"\n[DONE] Conversion complete! {len(converted)} files updated.")

if __name__ == '__main__':
    main()
