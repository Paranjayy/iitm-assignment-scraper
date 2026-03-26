import re
import os
from itertools import islice

def distill_dom(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by level 2 headers (individual page captures)
    sections = re.split(r'\n## ', content)
    
    cleaned_output = []
    
    for section in sections:
        if not section.strip():
            continue
            
        parts = section.split('\n', 1)
        title = parts[0].strip()
        body = parts[1] if len(parts) > 1 else ""
        
        # 1. STRIP HIGH NOISE
        body = re.sub(r'<script.*?>.*?</script>', '', body, flags=re.DOTALL)
        body = re.sub(r'<style.*?>.*?</style>', '', body, flags=re.DOTALL)
        body = re.sub(r'<svg.*?>.*?</svg>', '[SVG_ICON]', body, flags=re.DOTALL) # SVGs are huge clutter
        body = re.sub(r'<!--.*?-->', '', body, flags=re.DOTALL)
        
        # 2. STRIP ANNOYING ATTRIBUTES (aria, data-v, etc.)
        # Keep id, class, href, value, type
        body = re.sub(r'\s(aria-|data-|jsaction|jsshadow|ng-|style=)[^>\s]*', '', body)
        
        lines = body.split('\n')
        semantic_lines = []
        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
                
            # Filter for semantic utility
            if '<' in line and '>' in line:
                # Keep if it has class, id, or structural keyword
                if any(kw in line.lower() for kw in ['class=', 'id=', 'href=', 'button', 'input', 'mat-', 'units__', 'gcb-']):
                    # Condense whitespace
                    line = re.sub(r'\s+', ' ', line)
                    if len(line) < 1500: # Ignore massive lines
                        semantic_lines.append(line)
            else:
                # Keep plain text (might be labels/scores)
                if len(line) < 400:
                    semantic_lines.append(line)
                    
        # Cap results per section using islice to avoid slice linting errors
        distilled_body = "\n".join(islice(semantic_lines, 300))
        cleaned_output.append(f"## {title}\n{distilled_body}")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# IITM Academic Engine: Distilled Intelligence\n")
        f.write("# Generated to prevent 'DOM Fucks' - Optimized for Agent reasoning\n\n")
        f.write("\n\n".join(cleaned_output))
    
    print(f"✅ Distilled {len(sections)} sections to {output_path} (Noise Cleared)")

if __name__ == "__main__":
    # Use standard paths
    distill_dom("new doms.md", "distilled_doms.md")
